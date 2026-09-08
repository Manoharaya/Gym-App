import { Injectable, Logger } from '@nestjs/common';
import {
  RetentionRiskFactor,
  RetentionPositiveSignal,
  RetentionInterventionRecommendation,
  RetentionRiskLevel,
  MemberLifecycleContext,
} from '@fitcore/types';

interface SelectionInputs {
  riskLevel: RetentionRiskLevel;
  riskFactors: RetentionRiskFactor[];
  positiveSignals: RetentionPositiveSignal[];
  hasAssignedTrainer: boolean;
  lifecycle: MemberLifecycleContext;
  hasActiveGoals: boolean;
  hasRecentNoShows: boolean;
  isExpiringSoon: boolean;
}

@Injectable()
export class InterventionSelectionService {
  private readonly logger = new Logger(InterventionSelectionService.name);

  /**
   * Deterministic rule-based intervention selection engine matching the controlled taxonomy.
   */
  selectInterventions(inputs: SelectionInputs): RetentionInterventionRecommendation[] {
    const {
      riskLevel,
      riskFactors,
      positiveSignals,
      hasAssignedTrainer,
      lifecycle,
      hasActiveGoals,
      hasRecentNoShows,
      isExpiringSoon,
    } = inputs;

    const recommendations: RetentionInterventionRecommendation[] = [];

    // 1. If Insufficient Data
    if (riskLevel === 'INSUFFICIENT_DATA') {
      return [
        {
          type: 'INSUFFICIENT_DATA',
          priority: 'LOW',
          reason: 'Member has insufficient historical activity to recommend an targeted retention intervention. Continue standard onboarding.',
        },
      ];
    }

    // 2. If Low Risk & Positive Signals
    if (riskLevel === 'LOW') {
      if (positiveSignals.length > 0) {
        return [
          {
            type: 'NO_ACTION',
            priority: 'LOW',
            reason: 'Member exhibits stable or improving engagement aligned with their baseline. No retention intervention needed.',
          },
        ];
      }
      return [
        {
          type: 'GENERAL_SUPPORT',
          priority: 'LOW',
          reason: 'Engagement is steady. Maintain standard facility welcome and periodic check-in cadence.',
        },
      ];
    }

    // 3. Commercial Expiration Imminent
    if (isExpiringSoon) {
      recommendations.push({
        type: 'MEMBERSHIP_CONVERSATION',
        priority: riskLevel === 'HIGH' || riskLevel === 'ELEVATED' ? 'HIGH' : 'MEDIUM',
        reason: 'Membership expiration date is approaching without auto-renew enabled alongside declining activity. Friendly conversation about membership options recommended.',
      });
    }

    // 4. Assigned Trainer Check-In
    const hasAttendanceDrop = riskFactors.some(
      (f) => f.type === 'ATTENDANCE_DECLINE' || f.type === 'LONG_INACTIVITY',
    );
    const hasWorkoutDrop = riskFactors.some((f) => f.type === 'WORKOUT_ADHERENCE_DECLINE');

    if (hasAssignedTrainer && (hasAttendanceDrop || hasWorkoutDrop)) {
      recommendations.push({
        type: 'TRAINER_CHECK_IN',
        priority: riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM',
        reason: 'Attendance and workout adherence have decreased relative to baseline. Assigned trainer should conduct an informal check-in to identify schedule friction.',
      });
    } else if (!hasAssignedTrainer && (hasAttendanceDrop || hasWorkoutDrop) && riskLevel === 'HIGH') {
      recommendations.push({
        type: 'PERSONAL_TRAINING_FOLLOW_UP',
        priority: 'HIGH',
        reason: 'Sustained decline in physical training consistency without assigned coach. Offer an introductory 1-on-1 PT touchpoint or technique session.',
      });
    }

    // 5. Goal Disengagement
    if (hasActiveGoals && hasWorkoutDrop) {
      recommendations.push({
        type: 'GOAL_REVIEW',
        priority: 'MEDIUM',
        reason: 'Active training goals exist but workout logging has paused. A short goal review session can help reset realistic milestones.',
      });
    }

    // 6. Missed Sessions / No-Shows
    if (hasRecentNoShows) {
      recommendations.push({
        type: 'CLASS_RECOMMENDATION',
        priority: 'MEDIUM',
        reason: 'Recent class no-shows suggest scheduling conflict or routine mismatch. Staff should recommend alternative class times or formats.',
      });
    }

    // 7. Long Inactivity (>28 days)
    const isLongInactive = riskFactors.some((f) => f.type === 'LONG_INACTIVITY');
    if (isLongInactive) {
      recommendations.push({
        type: 'TRAINING_RESTART',
        priority: 'HIGH',
        reason: 'Over 28 days since last facility check-in. Recommend a gentle "welcome back / restart" routine to lower barrier to re-entry.',
      });
    }

    // 8. New Member Early Drop-Off
    if (lifecycle.stage === 'NEW_MEMBER' || lifecycle.stage === 'EARLY_MEMBERSHIP') {
      recommendations.push({
        type: 'GENERAL_SUPPORT',
        priority: 'HIGH',
        reason: 'Early tenure member showing early attendance deceleration. Staff check-in during first 30-90 days is critical for long-term habit formation.',
      });
    }

    // 9. App Engagement Drop
    const hasAppDrop = riskFactors.some((f) => f.type === 'APP_ENGAGEMENT_DECLINE');
    if (hasAppDrop && recommendations.length < 2) {
      recommendations.push({
        type: 'APP_ENGAGEMENT',
        priority: 'LOW',
        reason: 'Digital mobile interactions have dropped. Encourage app check-ins or digital workout plan tracking.',
      });
    }

    // Fallback if no specific condition matched but risk is elevated/moderate
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'GENERAL_SUPPORT',
        priority: riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM',
        reason: 'General activity indicates a decline from normal routine. Front desk or trainer should offer a welcoming check-in upon next visit.',
      });
    }

    return recommendations;
  }
}
