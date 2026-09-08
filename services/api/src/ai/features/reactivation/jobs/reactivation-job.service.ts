import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { ReactivationWorkflowService } from '../workflows/reactivation-workflow.service';
import { RecoveryPlanStatus } from '@fitcore/types';

@Injectable()
export class ReactivationJobService {
  private readonly logger = new Logger(ReactivationJobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: ReactivationWorkflowService,
  ) {}

  /**
   * Sweeps and expires all overdue recovery plans that passed their expiresAt timestamp.
   */
  async expireOverduePlans(organisationId?: string): Promise<{ expiredCount: number }> {
    const now = new Date();

    const overduePlans = await this.prisma.memberRecoveryPlan.findMany({
      where: {
        ...(organisationId ? { organisationId } : {}),
        status: { in: ['PENDING_APPROVAL', 'APPROVED', 'IN_PROGRESS'] },
        expiresAt: { lt: now },
      },
      select: { id: true, organisationId: true },
    });

    let expiredCount = 0;
    for (const plan of overduePlans) {
      try {
        await this.workflowService.transitionPlan({
          planId: plan.id,
          organisationId: plan.organisationId,
          targetStatus: 'EXPIRED',
          actorUserId: 'SYSTEM_SCHEDULER',
          notes: 'Plan expired due to exceeding validity window without completion.',
          now,
        });
        expiredCount++;
      } catch (err: any) {
        this.logger.error(`Failed to expire recovery plan ${plan.id}: ${err.message}`);
      }
    }

    this.logger.log(`Expired ${expiredCount} overdue recovery plans.`);
    return { expiredCount };
  }

  /**
   * Alias for plan sweep job.
   */
  async sweepExpiredPlans(organisationId?: string): Promise<{ expiredCount: number }> {
    return this.expireOverduePlans(organisationId);
  }
}
