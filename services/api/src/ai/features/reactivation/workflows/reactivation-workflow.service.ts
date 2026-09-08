import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AuditService } from '../../../../audit/audit.service';
import { RecoveryPlanStatus } from '@fitcore/types';
import { ReactivationStateMachine } from './reactivation-state-machine';
import {
  REACTIVATION_AUDIT_ACTIONS,
} from '../reactivation.constants';

@Injectable()
export class ReactivationWorkflowService {
  private readonly logger = new Logger(ReactivationWorkflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Transitions a MemberRecoveryPlan to a new status with validation and audit logging.
   */
  async transitionPlan(params: {
    planId: string;
    organisationId: string;
    targetStatus: RecoveryPlanStatus;
    actorUserId: string;
    dismissalReason?: string;
    notes?: string;
    now?: Date;
  }) {
    const {
      planId,
      organisationId,
      targetStatus,
      actorUserId,
      dismissalReason,
      notes,
      now = new Date(),
    } = params;

    const plan = await this.prisma.memberRecoveryPlan.findFirst({
      where: { id: planId, organisationId },
    });

    if (!plan) {
      throw new NotFoundException(`Recovery plan with ID '${planId}' not found.`);
    }

    const currentStatus = plan.status as RecoveryPlanStatus;
    ReactivationStateMachine.validateTransition(currentStatus, targetStatus, { dismissalReason });

    const updateData: any = {
      status: targetStatus,
      updatedAt: now,
    };

    let auditAction: string = REACTIVATION_AUDIT_ACTIONS.RECOVERY_PLAN_STARTED;

    switch (targetStatus) {
      case 'APPROVED':
        updateData.approvedByStaffId = actorUserId;
        updateData.approvedAt = now;
        auditAction = REACTIVATION_AUDIT_ACTIONS.RECOVERY_PLAN_APPROVED;
        break;
      case 'IN_PROGRESS':
        updateData.startedAt = now;
        auditAction = REACTIVATION_AUDIT_ACTIONS.RECOVERY_PLAN_STARTED;
        break;
      case 'COMPLETED':
        updateData.completedAt = now;
        auditAction = REACTIVATION_AUDIT_ACTIONS.RECOVERY_PLAN_COMPLETED;
        break;
      case 'REENGAGED':
        updateData.completedAt = now;
        auditAction = REACTIVATION_AUDIT_ACTIONS.REENGAGEMENT_DETECTED;
        break;
      case 'DISMISSED':
        updateData.dismissedAt = now;
        updateData.dismissalReason = dismissalReason;
        auditAction = REACTIVATION_AUDIT_ACTIONS.RECOVERY_PLAN_DISMISSED;
        break;
      case 'EXPIRED':
        auditAction = REACTIVATION_AUDIT_ACTIONS.RECOVERY_PLAN_DISMISSED;
        break;
    }

    if (notes) {
      updateData.staffNotes = plan.staffNotes
        ? `${plan.staffNotes}\n[${now.toISOString().split('T')[0]}] ${notes}`
        : notes;
    }

    // Execute atomic update
    const updatedPlan = await this.prisma.memberRecoveryPlan.update({
      where: { id: planId },
      data: updateData,
    });

    // Update the corresponding MemberReactivationProfile
    await this.prisma.memberReactivationProfile.updateMany({
      where: {
        organisationId,
        memberId: plan.memberId,
      },
      data: {
        currentRecoveryPlanId: ReactivationStateMachine.isTerminal(targetStatus) ? null : planId,
        reactivationStatus:
          targetStatus === 'REENGAGED'
            ? 'REENGAGED'
            : targetStatus === 'IN_PROGRESS'
            ? 'PLAN_IN_PROGRESS'
            : targetStatus === 'APPROVED'
            ? 'PLAN_APPROVED'
            : targetStatus === 'DISMISSED'
            ? 'DISMISSED'
            : 'NEEDS_ATTENTION',
        recoveryState:
          targetStatus === 'REENGAGED'
            ? 'REENGAGED'
            : undefined,
        reengagementAchievedAt: targetStatus === 'REENGAGED' ? now : undefined,
        updatedAt: now,
      },
    });

    // Audit log
    await this.auditService.log({
      action: auditAction,
      resource: 'MemberRecoveryPlan',
      resourceId: planId,
      userId: actorUserId,
      organisationId,
      metadata: {
        previousStatus: currentStatus,
        newStatus: targetStatus,
        memberId: plan.memberId,
        dismissalReason,
      },
    });

    return updatedPlan;
  }
}
