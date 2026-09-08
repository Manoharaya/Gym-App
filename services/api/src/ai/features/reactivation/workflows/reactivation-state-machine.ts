import { BadRequestException } from '@nestjs/common';
import { RecoveryPlanStatus } from '@fitcore/types';

export class ReactivationStateMachine {
  private static readonly ALLOWED_TRANSITIONS: Record<RecoveryPlanStatus, RecoveryPlanStatus[]> = {
    DRAFT: ['PENDING_APPROVAL', 'DISMISSED', 'EXPIRED'],
    PENDING_APPROVAL: ['APPROVED', 'DISMISSED', 'EXPIRED'],
    APPROVED: ['IN_PROGRESS', 'DISMISSED', 'EXPIRED'],
    IN_PROGRESS: ['REENGAGED', 'COMPLETED', 'DISMISSED', 'EXPIRED'],
    REENGAGED: [],
    COMPLETED: [],
    DISMISSED: [],
    EXPIRED: [],
  };

  /**
   * Validates if a state transition is allowed according to the recovery workflow rules.
   */
  static validateTransition(
    currentStatus: RecoveryPlanStatus,
    targetStatus: RecoveryPlanStatus,
    metadata?: { dismissalReason?: string },
  ): void {
    if (currentStatus === targetStatus) {
      return;
    }

    const allowed = this.ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Invalid recovery plan status transition from '${currentStatus}' to '${targetStatus}'. Allowed next statuses: ${allowed.join(', ') || 'None (Terminal State)'}`,
      );
    }

    // Dismissal reason is strictly required when transitioning to DISMISSED
    if (targetStatus === 'DISMISSED') {
      if (!metadata?.dismissalReason || metadata.dismissalReason.trim().length === 0) {
        throw new BadRequestException(
          'A non-empty dismissalReason is strictly required to dismiss a recovery plan.',
        );
      }
    }
  }

  /**
   * Returns true if status is in a final, immutable terminal state.
   */
  static isTerminal(status: RecoveryPlanStatus): boolean {
    return ['REENGAGED', 'COMPLETED', 'DISMISSED', 'EXPIRED'].includes(status);
  }
}
