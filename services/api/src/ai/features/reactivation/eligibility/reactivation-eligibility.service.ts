import { Injectable, Logger } from '@nestjs/common';
import {
  ReactivationLifecycleState,
  ReactivationStatus,
  RecoveryState,
} from '@fitcore/types';
import { REACTIVATION_THRESHOLDS } from '../reactivation.constants';
import { EligibilityEvaluationResult } from '../reactivation.types';

@Injectable()
export class ReactivationEligibilityService {
  private readonly logger = new Logger(ReactivationEligibilityService.name);

  /**
   * Deterministically evaluates member eligibility for Reactivation & Recovery workflows.
   */
  evaluateEligibility(params: {
    memberId: string;
    memberStatus: string;
    inactivityDays: number;
    lastMeaningfulActivityAt: Date | null;
    retentionRiskLevel: string;
    engagementDropPct: number;
    recoveryState: RecoveryState;
    hasActiveRecoveryPlan?: boolean;
  }): EligibilityEvaluationResult {
    const {
      memberStatus,
      inactivityDays,
      lastMeaningfulActivityAt,
      retentionRiskLevel,
      engagementDropPct,
      recoveryState,
      hasActiveRecoveryPlan = false,
    } = params;

    const terminalStatuses = ['DELETED', 'ARCHIVED', 'BANNED', 'TRANSFERRED'];
    if (terminalStatuses.includes(memberStatus.toUpperCase())) {
      return {
        eligible: false,
        lifecycleState: 'NOT_ELIGIBLE',
        reactivationStatus: 'NO_ACTION',
        primaryReasons: [`Member is in terminal status: ${memberStatus}`],
        inactivityDays,
        lastMeaningfulActivityAt,
      };
    }

    const reasons: string[] = [];
    let isEligible = false;

    // 1. Inactivity criteria
    const isInactive = inactivityDays >= REACTIVATION_THRESHOLDS.MINIMUM_INACTIVITY_DAYS;
    if (isInactive) {
      isEligible = true;
      reasons.push(
        `Inactive for ${inactivityDays} days (threshold: ${REACTIVATION_THRESHOLDS.MINIMUM_INACTIVITY_DAYS}d)`,
      );
    }

    // 2. High retention risk with steep drop criteria
    const isHighRiskWithDrop =
      ['HIGH', 'CRITICAL', 'ELEVATED'].includes(retentionRiskLevel.toUpperCase()) &&
      engagementDropPct >= REACTIVATION_THRESHOLDS.ENGAGEMENT_DECLINE_THRESHOLD_PCT;
    if (isHighRiskWithDrop) {
      isEligible = true;
      reasons.push(
        `Elevated retention risk (${retentionRiskLevel}) with ${Math.round(
          engagementDropPct,
        )}% drop in engagement vs baseline`,
      );
    }

    // 3. Positive recovery monitoring criteria
    const isRecovering =
      recoveryState !== 'NO_RECOVERY_SIGNAL' && recoveryState !== 'REENGAGED';
    if (isRecovering) {
      isEligible = true;
      reasons.push(
        `Member showing positive recovery signals (current state: ${recoveryState}) requiring staff support`,
      );
    }

    // 4. Existing active recovery plan criteria
    if (hasActiveRecoveryPlan) {
      isEligible = true;
      reasons.push('Member has an active recovery plan in progress');
    }

    // Determine Lifecycle State
    let lifecycleState: ReactivationLifecycleState = 'NOT_ELIGIBLE';
    if (!isEligible) {
      lifecycleState = 'NOT_ELIGIBLE';
    } else if (recoveryState === 'REENGAGED') {
      lifecycleState = 'REENGAGED';
    } else if (hasActiveRecoveryPlan) {
      lifecycleState = 'IN_REACTIVATION';
    } else {
      lifecycleState = 'ELIGIBLE';
    }

    // Determine Reactivation Status
    let reactivationStatus: ReactivationStatus = 'NO_ACTION';
    if (!isEligible) {
      reactivationStatus = 'NO_ACTION';
    } else if (recoveryState === 'REENGAGED') {
      reactivationStatus = 'REENGAGED';
    } else if (hasActiveRecoveryPlan) {
      reactivationStatus = 'FOLLOW_UP_IN_PROGRESS';
    } else {
      reactivationStatus = 'FOLLOW_UP_RECOMMENDED';
    }

    return {
      eligible: isEligible,
      lifecycleState,
      reactivationStatus,
      primaryReasons: reasons.length > 0 ? reasons : ['Member activity within normal parameters'],
      inactivityDays,
      lastMeaningfulActivityAt,
    };
  }
}
