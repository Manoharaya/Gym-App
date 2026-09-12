import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { SecurityEventService } from '../../security/events/security-event.service';
import { StepUpService } from '../../security/step-up/step-up.service';
import {
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  CreateFeatureFlagAssignmentDto,
} from '../dto/platform-admin.dto';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { PlatformFeatureFlagEvaluationResult } from '@fitcore/types';

@Injectable()
export class PlatformFeatureFlagsService {
  private readonly logger = new Logger(PlatformFeatureFlagsService.name);

  // Blacklist of security-critical keys that cannot be toggled off via flags
  private readonly restrictedSecurityFlagKeys = [
    'security.bypass_auth',
    'security.disable_mfa',
    'security.disable_tenant_isolation',
    'privacy.disable_consent',
    'billing.bypass_payment',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly securityEventService: SecurityEventService,
    private readonly stepUpService: StepUpService,
  ) {}

  /**
   * Deterministic hashing for stable percentage-based rollout (0 - 99).
   */
  private getDeterministicHash(flagKey: string, entityId: string): number {
    const hash = crypto.createHash('sha256').update(`${flagKey}:${entityId}`).digest('hex');
    const numeric = parseInt(hash.substring(0, 8), 16);
    return numeric % 100;
  }

  /**
   * Creates a platform feature flag.
   */
  async createFlag(dto: CreateFeatureFlagDto, actor: AuthenticatedUser) {
    if (this.restrictedSecurityFlagKeys.includes(dto.key.toLowerCase())) {
      throw new ForbiddenException(
        `Creating a feature flag to bypass core security/privacy ceiling (${dto.key}) is strictly prohibited.`,
      );
    }

    const existing = await this.prisma.platformFeatureFlag.findUnique({
      where: { key: dto.key },
    });

    if (existing) {
      throw new BadRequestException(`Feature flag with key '${dto.key}' already exists`);
    }

    const flag = await this.prisma.platformFeatureFlag.create({
      data: {
        key: dto.key,
        name: dto.name,
        description: dto.description,
        defaultValue: dto.defaultValue || false,
        status: (dto.rolloutPercentage && dto.rolloutPercentage > 0) || dto.defaultValue || dto.rolloutStrategy === 'ALL' ? 'ENABLED' : 'DISABLED',
        rolloutStrategy: dto.rolloutStrategy || 'ALL',
        rolloutPercentage: dto.rolloutPercentage || 0,
        isSecurityCritical: dto.isSecurityCritical || false,
      },
    });

    await this.auditService.log({
      userId: actor.id,
      action: 'FEATURE_FLAG_CREATED',
      resource: 'feature_flag',
      resourceId: flag.id,
      metadata: { key: flag.key, status: flag.status },
    });

    return flag;
  }

  /**
   * Lists all platform feature flags with assignment counts.
   */
  async listFlags() {
    return this.prisma.platformFeatureFlag.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { assignments: true } },
      },
    });
  }

  /**
   * Retrieves single feature flag with assignments.
   */
  async getFlag(flagId: string) {
    const flag = await this.prisma.platformFeatureFlag.findUnique({
      where: { id: flagId },
      include: {
        assignments: {
          include: {
            organisation: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!flag) {
      throw new NotFoundException(`Feature flag ${flagId} not found`);
    }

    return flag;
  }

  /**
   * Updates feature flag state, rollout strategy, or percentage.
   */
  async updateFlag(
    flagId: string,
    dto: UpdateFeatureFlagDto,
    actor: AuthenticatedUser,
  ) {
    const flag = await this.prisma.platformFeatureFlag.findUnique({
      where: { id: flagId },
    });

    if (!flag) {
      throw new NotFoundException(`Feature flag ${flagId} not found`);
    }

    // High-risk flag mutation requires step-up authentication if flag is security critical
    if (flag.isSecurityCritical && dto.stepUpToken) {
      await this.stepUpService.consumeChallenge(
        actor.id,
        dto.stepUpToken,
        'TOGGLE_CRITICAL_FEATURE_FLAG',
      );
    }

    const updated = await this.prisma.platformFeatureFlag.update({
      where: { id: flagId },
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status,
        rolloutStrategy: dto.rolloutStrategy,
        rolloutPercentage: dto.rolloutPercentage,
      },
    });

    await this.auditService.log({
      userId: actor.id,
      action: 'FEATURE_FLAG_UPDATED',
      resource: 'feature_flag',
      resourceId: flag.id,
      metadata: {
        key: flag.key,
        previousStatus: flag.status,
        newStatus: updated.status,
      },
    });

    await this.securityEventService.recordEvent({
      userId: actor.id,
      eventType: 'FEATURE_FLAG_CHANGED',
      severity: flag.isSecurityCritical ? 'HIGH' : 'LOW',
      source: 'platform-admin',
      metadata: { flagKey: flag.key, newStatus: updated.status },
    });

    return updated;
  }

  /**
   * Creates an assignment override for organisation, outlet, or user.
   */
  async createAssignment(
    flagId: string,
    dto: CreateFeatureFlagAssignmentDto,
    actor: AuthenticatedUser,
  ) {
    const flag = await this.prisma.platformFeatureFlag.findUnique({
      where: { id: flagId },
    });

    if (!flag) {
      throw new NotFoundException(`Feature flag ${flagId} not found`);
    }

    const assignment = await this.prisma.featureFlagAssignment.create({
      data: {
        flagId,
        scope: dto.scope,
        organisationId: dto.organisationId,
        outletId: dto.outletId,
        userId: dto.userId,
        enabled: dto.enabled ?? true,
        reason: dto.reason,
      },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId: dto.organisationId,
      action: 'FEATURE_FLAG_ASSIGNMENT_CREATED',
      resource: 'feature_flag_assignment',
      resourceId: assignment.id,
      metadata: { flagKey: flag.key, scope: dto.scope, enabled: dto.enabled },
    });

    return assignment;
  }

  /**
   * Removes an assignment override.
   */
  async deleteAssignment(
    flagId: string,
    assignmentId: string,
    actor: AuthenticatedUser,
  ) {
    const assignment = await this.prisma.featureFlagAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment || assignment.flagId !== flagId) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }

    await this.prisma.featureFlagAssignment.delete({
      where: { id: assignmentId },
    });

    await this.auditService.log({
      userId: actor.id,
      action: 'FEATURE_FLAG_ASSIGNMENT_REMOVED',
      resource: 'feature_flag_assignment',
      resourceId: assignmentId,
      metadata: { flagId },
    });

    return { success: true };
  }

  /**
   * Evaluates feature flag status following strict inheritance:
   * 1. User override (highest priority)
   * 2. Outlet override
   * 3. Organisation override
   * 4. Percentage rollout evaluation
   * 5. Platform default
   */
  async evaluateFlag(
    flagKey: string,
    context?: {
      organisationId?: string;
      outletId?: string;
      userId?: string;
    },
  ): Promise<PlatformFeatureFlagEvaluationResult> {
    const flag = await this.prisma.platformFeatureFlag.findUnique({
      where: { key: flagKey },
      include: { assignments: true },
    });

    if (!flag) {
      return {
        flagKey,
        enabled: false,
        evaluatedScope: 'PLATFORM',
        reason: 'Flag not found; defaults to disabled',
      };
    }

    // 1. User override
    if (context?.userId) {
      const userAssignment = flag.assignments.find(
        (a) => a.scope === 'USER' && a.userId === context.userId,
      );
      if (userAssignment) {
        return {
          flagKey,
          enabled: userAssignment.enabled,
          evaluatedScope: 'USER',
          reason: `Explicit user override (${userAssignment.reason || 'none'})`,
        };
      }
    }

    // 2. Outlet override
    if (context?.outletId) {
      const outletAssignment = flag.assignments.find(
        (a) => a.scope === 'OUTLET' && a.outletId === context.outletId,
      );
      if (outletAssignment) {
        return {
          flagKey,
          enabled: outletAssignment.enabled,
          evaluatedScope: 'OUTLET',
          reason: `Explicit outlet override (${outletAssignment.reason || 'none'})`,
        };
      }
    }

    // 3. Organisation override
    if (context?.organisationId) {
      const orgAssignment = flag.assignments.find(
        (a) => a.scope === 'ORGANISATION' && a.organisationId === context.organisationId,
      );
      if (orgAssignment) {
        return {
          flagKey,
          enabled: orgAssignment.enabled,
          evaluatedScope: 'ORGANISATION',
          reason: `Explicit organisation override (${orgAssignment.reason || 'none'})`,
        };
      }
    }

    if (flag.status === 'DISABLED') {
      return {
        flagKey,
        enabled: false,
        evaluatedScope: 'PLATFORM',
        reason: 'Flag disabled globally at platform level',
      };
    }

    // 4. Percentage rollout strategy
    if (flag.rolloutStrategy === 'PERCENTAGE' && flag.rolloutPercentage > 0) {
      const entityId = context?.userId || context?.organisationId || 'default';
      const hashScore = this.getDeterministicHash(flag.key, entityId);
      const isIncluded = hashScore < flag.rolloutPercentage;

      return {
        flagKey,
        enabled: isIncluded,
        evaluatedScope: 'PLATFORM',
        reason: `Deterministic percentage rollout (${hashScore} < ${flag.rolloutPercentage}%)`,
      };
    }

    // 5. Global platform default
    return {
      flagKey,
      enabled: flag.defaultValue || flag.status === 'ENABLED',
      evaluatedScope: 'PLATFORM',
      reason: 'Global platform default',
    };
  }
}
