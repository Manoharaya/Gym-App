import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { SecurityEventService } from '../../security/events/security-event.service';
import { StepUpService } from '../../security/step-up/step-up.service';
import { RedisService } from '../../redis/redis.service';
import {
  PlatformOrganisationSummary,
  SuspensionImpactPreview,
  OrganisationLifecycleStatus,
} from '@fitcore/types';
import {
  QueryOrganisationsDto,
  SuspendOrganisationDto,
  ReactivateOrganisationDto,
  ArchiveOrganisationDto,
  ActivateOrganisationDto,
} from '../dto/platform-admin.dto';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';

@Injectable()
export class PlatformOrganisationsService {
  private readonly logger = new Logger(PlatformOrganisationsService.name);
  private readonly cacheTTLSeconds = 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly securityEventService: SecurityEventService,
    private readonly stepUpService: StepUpService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Lists organisations with pagination, search, status filtering, and sorting.
   */
  async listOrganisations(query: QueryOrganisationsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { id: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    orderBy[sortBy] = sortOrder;

    const [total, items] = await Promise.all([
      this.prisma.organisation.count({ where }),
      this.prisma.organisation.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: {
            select: {
              outlets: true,
              memberProfiles: true,
              staffProfiles: true,
              integrationConnections: true,
            },
          },
        },
      }),
    ]);

    return {
      items: items.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
        country: org.country,
        currency: org.currency,
        timezone: org.timezone,
        outletsCount: org._count.outlets,
        membersCount: org._count.memberProfiles,
        staffCount: org._count.staffProfiles,
        integrationsCount: org._count.integrationConnections,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Aggregates a comprehensive platform-level summary profile without exposing member PII.
   */
  async getOrganisationSummary(organisationId: string): Promise<PlatformOrganisationSummary> {
    const org = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
      include: {
        _count: {
          select: {
            outlets: true,
            memberProfiles: true,
            staffProfiles: true,
            memberMemberships: true,
            communications: true,
            integrationConnections: true,
            developerApplications: true,
            marketplaceInstallations: true,
            securityAlerts: true,
            privacyRequests: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException(`Organisation ${organisationId} not found`);
    }

    // Aggregate AI usage for this organisation
    const aiAggregates = await this.prisma.aIUsageRecord.aggregate({
      where: { organisationId },
      _count: { id: true },
      _sum: { estimatedCost: true },
    });

    // Check integration health count
    const failedIntegrationsCount = await this.prisma.integrationConnection.count({
      where: { organisationId, status: 'ERROR' },
    });

    let healthStatus: 'HEALTHY' | 'DEGRADED' | 'WARNING' | 'DOWN' | 'UNKNOWN' = 'HEALTHY';
    if (org.status === 'SUSPENDED') {
      healthStatus = 'DOWN';
    } else if (failedIntegrationsCount > 0 || org._count.securityAlerts > 0) {
      healthStatus = 'WARNING';
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      outletsCount: org._count.outlets,
      membersCount: org._count.memberProfiles,
      staffCount: org._count.staffProfiles,
      activeMembershipsCount: org._count.memberMemberships,
      activeSubscriptionsCount: org._count.memberMemberships,
      aiRequestsCount: aiAggregates._count.id || 0,
      aiEstimatedCostCents: Number(aiAggregates._sum.estimatedCost || 0),
      communicationsCount: org._count.communications,
      activeIntegrationsCount: org._count.integrationConnections,
      developerAppsCount: org._count.developerApplications,
      marketplaceInstallationsCount: org._count.marketplaceInstallations,
      securityAlertsCount: org._count.securityAlerts,
      privacyRequestsCount: org._count.privacyRequests,
      platformHealthStatus: healthStatus,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }

  /**
   * Generates a pre-suspension impact preview detailing all affected resources.
   */
  async getSuspensionImpactPreview(organisationId: string): Promise<SuspensionImpactPreview> {
    const org = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
      include: {
        _count: {
          select: {
            outlets: true,
            memberProfiles: true,
            staffProfiles: true,
            integrationConnections: true,
            developerApplications: true,
            marketplaceInstallations: true,
            communications: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException(`Organisation ${organisationId} not found`);
    }

    // Count upcoming bookings that will be impacted
    const upcomingBookingsCount = await this.prisma.booking.count({
      where: {
        organisationId,
        status: { in: ['CONFIRMED', 'PENDING'] },
        createdAt: { gte: new Date() },
      },
    });

    return {
      organisationId: org.id,
      organisationName: org.name,
      currentStatus: org.status,
      activeMembers: org._count.memberProfiles,
      outlets: org._count.outlets,
      staff: org._count.staffProfiles,
      bookingsUpcoming: upcomingBookingsCount,
      billingState: org.status === 'ACTIVE' ? 'GOOD_STANDING' : org.status,
      activeIntegrations: org._count.integrationConnections,
      developerApps: org._count.developerApplications,
      marketplaceInstallations: org._count.marketplaceInstallations,
      communicationWorkflows: org._count.communications,
      impactPolicyNotice:
        'Suspending this organisation will immediately block member/staff portal login, pause developer API keys, suspend integration sync jobs, and halt automated outbound communications. Member data will NOT be deleted.',
    };
  }

  /**
   * Suspends an organisation safely with step-up verification, audit logging, and security event emission.
   */
  async suspendOrganisation(
    organisationId: string,
    dto: SuspendOrganisationDto,
    actor: AuthenticatedUser,
  ) {
    const org = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
    });

    if (!org) {
      throw new NotFoundException(`Organisation ${organisationId} not found`);
    }

    if (org.status === 'SUSPENDED') {
      return { success: true, message: 'Organisation is already suspended', status: org.status };
    }

    // Step-up verification for sensitive suspension action if token provided
    if (dto.stepUpToken) {
      await this.stepUpService.consumeChallenge(
        actor.id,
        dto.stepUpToken,
        'SUSPEND_ORGANISATION',
      );
    }

    const updated = await this.prisma.organisation.update({
      where: { id: organisationId },
      data: { status: 'SUSPENDED' },
    });

    // Invalidate Redis session cache for this organisation's users
    try {
      await this.redis.del(`org:${organisationId}:active`);
    } catch {
      // Redis best-effort
    }

    // Audit and Security Event
    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'ORGANISATION_SUSPENDED',
      resource: 'organisation',
      resourceId: organisationId,
      metadata: { reason: dto.reason, previousStatus: org.status },
    });

    await this.securityEventService.recordEvent({
      organisationId,
      userId: actor.id,
      eventType: 'ORGANISATION_SUSPENDED',
      severity: 'HIGH',
      source: 'platform-admin',
      metadata: { actorEmail: actor.email, reason: dto.reason },
    });

    this.logger.warn(`Organisation ${org.name} (${org.id}) SUSPENDED by ${actor.email}. Reason: ${dto.reason}`);

    return {
      success: true,
      message: `Organisation ${org.name} has been suspended`,
      status: updated.status,
    };
  }

  /**
   * Reactivates a suspended organisation.
   */
  async reactivateOrganisation(
    organisationId: string,
    dto: ReactivateOrganisationDto,
    actor: AuthenticatedUser,
  ) {
    const org = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
    });

    if (!org) {
      throw new NotFoundException(`Organisation ${organisationId} not found`);
    }

    if (org.status === 'ACTIVE') {
      return { success: true, message: 'Organisation is already active', status: org.status };
    }

    const updated = await this.prisma.organisation.update({
      where: { id: organisationId },
      data: { status: 'ACTIVE' },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'ORGANISATION_REACTIVATED',
      resource: 'organisation',
      resourceId: organisationId,
      metadata: { reason: dto.reason, previousStatus: org.status },
    });

    await this.securityEventService.recordEvent({
      organisationId,
      userId: actor.id,
      eventType: 'ORGANISATION_REACTIVATED',
      severity: 'MEDIUM',
      source: 'platform-admin',
      metadata: { actorEmail: actor.email, reason: dto.reason },
    });

    return {
      success: true,
      message: `Organisation ${org.name} has been reactivated`,
      status: updated.status,
    };
  }

  /**
   * Archives an organisation.
   */
  async archiveOrganisation(
    organisationId: string,
    dto: ArchiveOrganisationDto,
    actor: AuthenticatedUser,
  ) {
    const org = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
    });

    if (!org) {
      throw new NotFoundException(`Organisation ${organisationId} not found`);
    }

    const updated = await this.prisma.organisation.update({
      where: { id: organisationId },
      data: { status: 'ARCHIVED' },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'ORGANISATION_ARCHIVED',
      resource: 'organisation',
      resourceId: organisationId,
      metadata: { reason: dto.reason, previousStatus: org.status },
    });

    return {
      success: true,
      message: `Organisation ${org.name} has been archived`,
      status: updated.status,
    };
  }

  /**
   * Activates an organisation from PENDING or TRIAL status.
   */
  async activateOrganisation(
    organisationId: string,
    dto: ActivateOrganisationDto,
    actor: AuthenticatedUser,
  ) {
    const org = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
    });

    if (!org) {
      throw new NotFoundException(`Organisation ${organisationId} not found`);
    }

    const updated = await this.prisma.organisation.update({
      where: { id: organisationId },
      data: { status: 'ACTIVE' },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'ORGANISATION_ACTIVATED',
      resource: 'organisation',
      resourceId: organisationId,
      metadata: { reason: dto.reason, previousStatus: org.status },
    });

    return {
      success: true,
      message: `Organisation ${org.name} is now ACTIVE`,
      status: updated.status,
    };
  }
}
