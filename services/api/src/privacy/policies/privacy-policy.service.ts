import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  PrivacyDataCategory,
  PrivacyDecision,
} from '@fitcore/types';
import { PrivacyRestrictionService } from '../restrictions/privacy-restriction.service';
import { PrivacyRetentionHoldService } from '../retention/privacy-retention-hold.service';

export interface PolicyEvaluationResult {
  decision: PrivacyDecision;
  reason: string;
  category: PrivacyDataCategory;
  dataset?: string;
  evaluatedAt: string;
}

@Injectable()
export class PrivacyPolicyService {
  private readonly logger = new Logger(PrivacyPolicyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly restrictionService: PrivacyRestrictionService,
    private readonly holdService: PrivacyRetentionHoldService,
  ) {}

  /**
   * Evaluates if data processing is permitted for a member, category, and purpose.
   */
  async canProcessData(
    organisationId: string,
    memberId: string,
    category: PrivacyDataCategory,
    purpose: string,
  ): Promise<PolicyEvaluationResult> {
    const timestamp = new Date().toISOString();

    // 1. Check if member has active privacy restriction on this category
    const isRestricted = await this.restrictionService.isFeatureRestricted(
      memberId,
      organisationId,
      category,
    );

    if (isRestricted) {
      return {
        decision: 'RESTRICTED',
        reason: `Member is under active privacy restriction for category '${category}'`,
        category,
        evaluatedAt: timestamp,
      };
    }

    // 2. Check if consent is required for sensitive categories
    if (category === 'WEARABLE') {
      const consent = await this.prisma.consentRecord.findFirst({
        where: {
          memberProfileId: memberId,
          consentType: { key: 'WEARABLE_DATA' },
        },
        orderBy: { consentedAt: 'desc' },
      });

      if (!consent || consent.status !== 'CONSENTED') {
        return {
          decision: 'REQUIRES_CONSENT',
          reason: 'Active member consent for WEARABLE_DATA is required',
          category,
          evaluatedAt: timestamp,
        };
      }
    }

    if (category === 'HEALTH') {
      const consent = await this.prisma.consentRecord.findFirst({
        where: {
          memberProfileId: memberId,
          consentType: { key: 'HEALTH_DATA_PROCESSING' },
        },
        orderBy: { consentedAt: 'desc' },
      });

      if (!consent || consent.status !== 'CONSENTED') {
        return {
          decision: 'REQUIRES_CONSENT',
          reason: 'Active consent for HEALTH_DATA_PROCESSING is required',
          category,
          evaluatedAt: timestamp,
        };
      }
    }

    return {
      decision: 'ALLOWED',
      reason: `Processing permitted for purpose '${purpose}'`,
      category,
      evaluatedAt: timestamp,
    };
  }

  /**
   * Evaluates whether a dataset can be used in AI context.
   */
  async canUseForAI(
    organisationId: string,
    memberId: string,
    category: PrivacyDataCategory,
  ): Promise<PolicyEvaluationResult> {
    const timestamp = new Date().toISOString();

    // 1. Check AI personalization preference
    const prefs = await this.prisma.memberPrivacyPreference.findUnique({
      where: { memberId },
    });

    if (prefs && !prefs.aiPersonalization) {
      return {
        decision: 'DENIED',
        reason: 'Member has opted out of AI Personalization in Privacy Preferences',
        category,
        evaluatedAt: timestamp,
      };
    }

    // 2. Check member restriction
    const isRestricted = await this.restrictionService.isFeatureRestricted(
      memberId,
      organisationId,
      'AI_PERSONALIZATION',
    );

    if (isRestricted) {
      return {
        decision: 'RESTRICTED',
        reason: 'AI processing restricted for this member',
        category,
        evaluatedAt: timestamp,
      };
    }

    // 3. For wearables, check wearable consent
    if (category === 'WEARABLE') {
      const consent = await this.prisma.consentRecord.findFirst({
        where: {
          memberProfileId: memberId,
          consentType: { key: 'WEARABLE_DATA' },
        },
        orderBy: { consentedAt: 'desc' },
      });

      if (!consent || consent.status !== 'CONSENTED') {
        return {
          decision: 'DENIED',
          reason: 'Wearable data consent is not granted or has been withdrawn',
          category,
          evaluatedAt: timestamp,
        };
      }
    }

    return {
      decision: 'ALLOWED',
      reason: 'AI usage allowed per preference and consent policy',
      category,
      evaluatedAt: timestamp,
    };
  }

  /**
   * Evaluates deletion eligibility for a category.
   */
  async canDeleteData(
    organisationId: string,
    memberId: string,
    category: PrivacyDataCategory,
  ): Promise<PolicyEvaluationResult> {
    const timestamp = new Date().toISOString();

    // 1. Check active retention hold
    const hasHold = await this.holdService.hasActiveHold(organisationId, category, memberId);
    if (hasHold) {
      return {
        decision: 'REQUIRES_RETENTION',
        reason: `Active retention hold is in effect for category '${category}'`,
        category,
        evaluatedAt: timestamp,
      };
    }

    // 2. Statutory categories
    if (['PAYMENT', 'FINANCIAL', 'AUDIT', 'CONSENT'].includes(category)) {
      return {
        decision: 'REQUIRES_RETENTION',
        reason: `Statutory legal and accounting requirements require retaining category '${category}'`,
        category,
        evaluatedAt: timestamp,
      };
    }

    return {
      decision: 'ALLOWED',
      reason: `Deletion permitted for category '${category}'`,
      category,
      evaluatedAt: timestamp,
    };
  }
}
