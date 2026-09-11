import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  PrivacyDeletionPlanDto,
  DeletionStrategyAction,
} from '@fitcore/types';
import { PrivacyDeletionOrchestratorService } from './privacy-deletion-orchestrator.service';

@Injectable()
export class PrivacyDeletionService {
  private readonly logger = new Logger(PrivacyDeletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: PrivacyDeletionOrchestratorService,
  ) {}

  /**
   * Generates a comprehensive deletion impact analysis and plan.
   * Never directly deletes database rows on user request.
   */
  async createDeletionPlan(
    organisationId: string,
    memberId: string,
    privacyRequestId?: string,
  ): Promise<PrivacyDeletionPlanDto> {
    const member = await this.prisma.memberProfile.findFirst({
      where: { id: memberId, organisationId },
      include: {
        paymentTransactions: { take: 1 },
        invoices: { take: 1 },
      },
    });

    if (!member) {
      throw new NotFoundException('Member profile not found in organisation');
    }

    // 1. Check for Active Retention Holds
    const activeHolds = await this.prisma.privacyRetentionHold.findMany({
      where: {
        organisationId,
        status: 'ACTIVE',
        OR: [{ memberId }, { memberId: null }],
      },
    });

    const isCategoryHeld = (cat: string) =>
      activeHolds.some((h) => h.dataCategory === 'ALL' || h.dataCategory === cat);

    // 2. Define domain deletion strategies
    const domainStrategies: {
      domain: string;
      entity: string;
      action: DeletionStrategyAction;
      retentionReason?: string;
      requiresReview?: boolean;
    }[] = [
      {
        domain: 'PROFILE',
        entity: 'MemberProfile',
        action: isCategoryHeld('PROFILE') ? 'RETAIN' : 'ANONYMIZE',
        retentionReason: isCategoryHeld('PROFILE') ? 'ACTIVE_RETENTION_HOLD' : undefined,
      },
      {
        domain: 'HEALTH',
        entity: 'HealthScreening',
        action: isCategoryHeld('HEALTH') ? 'RETAIN' : 'DELETE',
        retentionReason: isCategoryHeld('HEALTH') ? 'ACTIVE_RETENTION_HOLD' : undefined,
      },
      {
        domain: 'WEARABLES',
        entity: 'HealthDataRecord',
        action: isCategoryHeld('WEARABLE') ? 'RETAIN' : 'DELETE',
        retentionReason: isCategoryHeld('WEARABLE') ? 'ACTIVE_RETENTION_HOLD' : undefined,
      },
      {
        domain: 'TRAINING',
        entity: 'Workout',
        action: isCategoryHeld('TRAINING') ? 'RETAIN' : 'DELETE',
        retentionReason: isCategoryHeld('TRAINING') ? 'ACTIVE_RETENTION_HOLD' : undefined,
      },
      {
        domain: 'NUTRITION',
        entity: 'FoodLog',
        action: isCategoryHeld('NUTRITION') ? 'RETAIN' : 'DELETE',
        retentionReason: isCategoryHeld('NUTRITION') ? 'ACTIVE_RETENTION_HOLD' : undefined,
      },
      {
        domain: 'PAYMENTS',
        entity: 'PaymentTransaction',
        action: 'RETAIN',
        retentionReason: 'LEGAL_TAX_ACCOUNTING_REQUIREMENT (7 years statutory retention)',
      },
      {
        domain: 'COMMUNICATION',
        entity: 'Communication',
        action: isCategoryHeld('COMMUNICATION') ? 'RETAIN' : 'DELETE',
        retentionReason: isCategoryHeld('COMMUNICATION') ? 'ACTIVE_RETENTION_HOLD' : undefined,
      },
      {
        domain: 'AI',
        entity: 'AIRequest',
        action: 'DELETE',
      },
      {
        domain: 'DOCUMENTS',
        entity: 'MemberDocument',
        action: isCategoryHeld('DOCUMENT') ? 'RETAIN' : 'DELETE',
        retentionReason: isCategoryHeld('DOCUMENT') ? 'ACTIVE_RETENTION_HOLD' : undefined,
      },
      {
        domain: 'AUDIT',
        entity: 'AuditLog',
        action: 'RETAIN',
        retentionReason: 'LEGAL_AUDIT_TELEMETRY_REQUIREMENT',
      },
      {
        domain: 'ENGAGEMENT',
        entity: 'MemberEngagementProfile',
        action: 'DELETE',
      },
    ];

    const hasActiveHold = activeHolds.length > 0;
    const requiresReview = hasActiveHold;

    const plan = await this.prisma.privacyDeletionPlan.create({
      data: {
        organisationId,
        memberId,
        privacyRequestId: privacyRequestId || null,
        status: requiresReview ? 'REVIEW_REQUIRED' : 'APPROVED',
        requiresReview,
        reviewReason: hasActiveHold
          ? `Member or organisation is subject to ${activeHolds.length} active legal/operational retention holds.`
          : null,
        items: {
          create: domainStrategies.map((s) => ({
            domain: s.domain,
            entity: s.entity,
            action: s.action,
            status: 'PENDING',
            retentionReason: s.retentionReason || null,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    this.logger.log(
      `Created deletion plan ${plan.id} for member ${memberId} (Status: ${plan.status}, RequiresReview: ${requiresReview})`,
    );

    return this.mapPlanToDto(plan);
  }

  /**
   * Approves a deletion plan requiring review.
   */
  async approvePlan(
    planId: string,
    organisationId: string,
    staffUserId: string,
  ): Promise<PrivacyDeletionPlanDto> {
    const plan = await this.prisma.privacyDeletionPlan.findFirst({
      where: { id: planId, organisationId },
    });

    if (!plan) {
      throw new NotFoundException('Deletion plan not found');
    }

    if (!['REVIEW_REQUIRED', 'APPROVED', 'DRAFT'].includes(plan.status)) {
      throw new BadRequestException(`Plan cannot be approved (current status: ${plan.status})`);
    }

    const updated = await this.prisma.privacyDeletionPlan.update({
      where: { id: planId },
      data: {
        status: 'APPROVED',
        reviewedBy: staffUserId,
        reviewedAt: new Date(),
      },
      include: { items: true },
    });

    return this.mapPlanToDto(updated);
  }

  /**
   * Executes an approved deletion plan.
   */
  async executePlan(planId: string, organisationId: string): Promise<PrivacyDeletionPlanDto> {
    const plan = await this.prisma.privacyDeletionPlan.findFirst({
      where: { id: planId, organisationId },
      include: { items: true },
    });

    if (!plan) {
      throw new NotFoundException('Deletion plan not found');
    }

    if (plan.status !== 'APPROVED') {
      throw new BadRequestException(
        `Cannot execute deletion plan in '${plan.status}' status (must be APPROVED)`,
      );
    }

    return this.orchestrator.executePlan(plan);
  }

  /**
   * Retrieves deletion plan by ID.
   */
  async getPlan(planId: string, organisationId: string): Promise<PrivacyDeletionPlanDto> {
    const plan = await this.prisma.privacyDeletionPlan.findFirst({
      where: { id: planId, organisationId },
      include: { items: true },
    });

    if (!plan) {
      throw new NotFoundException('Deletion plan not found');
    }

    return this.mapPlanToDto(plan);
  }

  private mapPlanToDto(p: any): PrivacyDeletionPlanDto {
    return {
      id: p.id,
      privacyRequestId: p.privacyRequestId,
      organisationId: p.organisationId,
      memberId: p.memberId,
      status: p.status,
      requiresReview: p.requiresReview,
      reviewReason: p.reviewReason,
      reviewedBy: p.reviewedBy,
      reviewedAt: p.reviewedAt?.toISOString() || null,
      executedAt: p.executedAt?.toISOString() || null,
      completedAt: p.completedAt?.toISOString() || null,
      items: (p.items || []).map((i: any) => ({
        id: i.id,
        domain: i.domain,
        entity: i.entity,
        action: i.action,
        status: i.status,
        retentionReason: i.retentionReason,
        recordsAffected: i.recordsAffected,
        executedAt: i.executedAt?.toISOString() || null,
        errorMessage: i.errorMessage,
      })),
      createdAt: p.createdAt.toISOString(),
    };
  }
}
