import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SecurityEventService } from '../security/events/security-event.service';
import { PrivacyCatalogService } from './catalog/privacy-catalog.service';
import { PrivacyConsentService } from './consent/privacy-consent.service';
import { PrivacyPreferencesService } from './preferences/privacy-preferences.service';
import { PrivacyRequestService } from './requests/privacy-request.service';
import { PrivacyDataAccessService } from './access/privacy-data-access.service';
import { PrivacyExportService } from './export/privacy-export.service';
import { PrivacyDeletionService } from './deletion/privacy-deletion.service';
import { PrivacyRetentionService } from './retention/privacy-retention.service';
import { PrivacyRetentionHoldService } from './retention/privacy-retention-hold.service';
import { PrivacyRestrictionService } from './restrictions/privacy-restriction.service';
import { PrivacyDataQualityService } from './quality/privacy-data-quality.service';
import {
  PrivacyOverviewDto,
  PrivacyDataCategory,
  CreatePrivacyRequestDto,
} from '@fitcore/types';

@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly securityEvents: SecurityEventService,
    private readonly catalogService: PrivacyCatalogService,
    private readonly consentService: PrivacyConsentService,
    private readonly preferencesService: PrivacyPreferencesService,
    private readonly requestService: PrivacyRequestService,
    private readonly dataAccessService: PrivacyDataAccessService,
    private readonly exportService: PrivacyExportService,
    private readonly deletionService: PrivacyDeletionService,
    private readonly retentionService: PrivacyRetentionService,
    private readonly holdService: PrivacyRetentionHoldService,
    private readonly restrictionService: PrivacyRestrictionService,
    private readonly qualityService: PrivacyDataQualityService,
  ) {}

  /**
   * Helper: Resolves member ID from user ID in current organisation.
   */
  async resolveMemberId(userId: string, organisationId?: string): Promise<string> {
    const where: any = { userId };
    if (organisationId) {
      where.organisationId = organisationId;
    }
    const member = await this.prisma.memberProfile.findFirst({
      where,
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundException('Member profile not found for current user');
    }

    return member.id;
  }

  /**
   * Member Privacy Overview
   */
  async getMemberOverview(userId: string, organisationId: string): Promise<PrivacyOverviewDto> {
    const memberId = await this.resolveMemberId(userId, organisationId);

    const [consents, prefs, restriction, pendingRequestsCount, catalog] = await Promise.all([
      this.consentService.getMemberConsents(memberId),
      this.preferencesService.getPreferences(memberId, organisationId),
      this.restrictionService.getMemberRestriction(memberId, organisationId),
      this.prisma.privacyRequest.count({
        where: {
          memberId,
          organisationId,
          status: { in: ['SUBMITTED', 'IDENTITY_VERIFICATION_REQUIRED', 'PROCESSING', 'APPROVED'] },
        },
      }),
      this.catalogService.getCatalog(organisationId),
    ]);

    const activeConsentsCount = consents.filter((c) => c.memberStatus.consented).length;
    const humanReadable = this.catalogService.getHumanReadableCategories();

    return {
      memberId,
      organisationId,
      totalDataCategoriesCount: catalog.length,
      dataCategoriesSummary: humanReadable.map((h) => ({
        category: h.category,
        title: h.title,
        description: h.explanation,
        itemCount: 1,
      })),
      activeConsentsCount,
      preferences: prefs.privacy,
      privacyPreferences: prefs.privacy,
      pendingRequestsCount,
      restrictionStatus: restriction.status,
    };
  }

  /**
   * Disconnects a connected wearable safely without leaking credentials or deleting historical data.
   */
  async disconnectWearable(
    userId: string,
    organisationId: string,
    provider: string,
  ) {
    const memberId = await this.resolveMemberId(userId, organisationId);

    const connection = await this.prisma.wearableConnection.findFirst({
      where: { memberId, organisationId, provider },
    });

    if (connection) {
      await this.prisma.wearableConnection.update({
        where: { id: connection.id },
        data: {
          status: 'DISCONNECTED',
          encryptedAccessToken: null,
          encryptedRefreshToken: null,
          revokedAt: new Date(),
        },
      });
    }

    await this.securityEvents.recordEvent({
      organisationId,
      userId,
      eventType: 'SUSPICIOUS_ACTIVITY',
      severity: 'INFO',
      source: 'MEMBER',
      metadata: {
        action: 'WEARABLE_DISCONNECTED',
        provider,
        memberId,
      },
    });

    return {
      success: true,
      provider,
      status: 'DISCONNECTED',
      message: `${provider} has been disconnected. Future synchronization is disabled.`,
    };
  }

  /**
   * Retrieves wearable privacy details.
   */
  async getWearablesPrivacy(userId: string, organisationId: string) {
    const memberId = await this.resolveMemberId(userId, organisationId);

    const [connections, preferences] = await Promise.all([
      this.prisma.wearableConnection.findMany({
        where: { memberId, organisationId },
        select: {
          id: true,
          provider: true,
          status: true,
          connectedAt: true,
          lastSyncAt: true,
          scopes: true,
        },
      }),
      this.prisma.memberPrivacyPreference.findUnique({
        where: { memberId },
        select: { wearables: true },
      }),
    ]);

    return {
      wearableSharingEnabled: preferences?.wearables ?? true,
      connections: connections.map((c) => ({
        id: c.id,
        provider: c.provider,
        status: c.status,
        connectedAt: c.connectedAt?.toISOString() || null,
        lastSyncAt: c.lastSyncAt?.toISOString() || null,
        scopes: c.scopes,
        isSyncing: c.status === 'CONNECTED' || c.status === 'SYNCING',
      })),
    };
  }

  /**
   * Organisation Compliance Dashboard
   * Follows Section 37 KPI metrics.
   */
  async getAdminComplianceDashboard(organisationId: string) {
    const [
      openRequests,
      pendingVerification,
      activeExportJobs,
      deletionRequests,
      reviewRequiredRequests,
      activeHolds,
      privacyRestrictions,
      failedJobs,
      qualityReport,
    ] = await Promise.all([
      this.prisma.privacyRequest.count({
        where: { organisationId, status: { in: ['SUBMITTED', 'APPROVED', 'PROCESSING'] } },
      }),
      this.prisma.privacyRequest.count({
        where: { organisationId, status: 'IDENTITY_VERIFICATION_REQUIRED' },
      }),
      this.prisma.privacyExportJob.count({
        where: { organisationId, status: 'PROCESSING' },
      }),
      this.prisma.privacyRequest.count({
        where: { organisationId, type: 'DELETION', status: { notIn: ['COMPLETED', 'REJECTED', 'CANCELLED'] } },
      }),
      this.prisma.privacyDeletionPlan.count({
        where: { organisationId, status: 'REVIEW_REQUIRED' },
      }),
      this.prisma.privacyRetentionHold.count({
        where: { organisationId, status: 'ACTIVE' },
      }),
      this.prisma.memberPrivacyRestriction.count({
        where: { organisationId, status: { in: ['RESTRICTED', 'UNDER_REVIEW'] } },
      }),
      this.prisma.privacyRequest.count({
        where: { organisationId, status: 'FAILED' },
      }),
      this.qualityService.getQualityReport(organisationId),
    ]);

    return {
      totalRequests: openRequests + pendingVerification,
      dataCategoriesCount: 24,
      slaComplianceRate: 100,
      kpi: {
        openPrivacyRequests: openRequests,
        pendingVerification,
        activeExportJobs,
        deletionRequests,
        requestsRequiringReview: reviewRequiredRequests,
        retentionActionsDue: qualityReport.missingRetentionCount,
        activeRetentionHolds: activeHolds,
        privacyRestrictions,
        failedPrivacyJobs: failedJobs,
      },
      qualityReport,
    };
  }
}
