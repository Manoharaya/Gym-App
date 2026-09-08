import { Injectable, Logger } from '@nestjs/common';
import {
  ReactivationStrategyRecommendation,
  RecoveryState,
} from '@fitcore/types';
import { REACTIVATION_THRESHOLDS } from '../reactivation.constants';

export interface StrategyEvaluationContext {
  inactivityDays: number;
  recoveryState: RecoveryState;
  hasAssignedTrainer: boolean;
  hasActiveGoals: boolean;
  previousClassAttendanceCount: number;
  recentClassBooking: boolean;
  membershipExpiringSoon: boolean;
  totalHistoricalObservations: number;
  wearableFatigueDetected?: boolean;
}

@Injectable()
export class RecoveryStrategyService {
  private readonly logger = new Logger(RecoveryStrategyService.name);

  /**
   * Deterministically selects or validates the optimal recovery strategy from the controlled 13-item taxonomy.
   */
  evaluateStrategy(ctx: StrategyEvaluationContext): ReactivationStrategyRecommendation {
    // 1. Check data sufficiency
    if (ctx.totalHistoricalObservations < REACTIVATION_THRESHOLDS.MINIMUM_HISTORICAL_OBSERVATIONS) {
      return {
        type: 'INSUFFICIENT_DATA',
        priority: 'LOW',
        reason: 'Member has insufficient historical observations to form a personalized pattern',
        suggestedStaffMessage: 'Welcome to FitCore! Let us know how we can help you get started.',
        suggestedNextStep: 'Collect initial activity baseline through friendly front desk welcome',
      };
    }

    // 2. Check if already successfully re-engaged
    if (ctx.recoveryState === 'REENGAGED') {
      return {
        type: 'NO_ACTION',
        priority: 'LOW',
        reason: 'Member has successfully re-established their visit frequency baseline',
        suggestedNextStep: 'Allow member to maintain self-directed momentum without intervention',
      };
    }

    // 3. Membership status / renewal issue takes priority
    if (ctx.membershipExpiringSoon) {
      return {
        type: 'MEMBERSHIP_REVIEW',
        priority: 'HIGH',
        reason: 'Membership expiration is impending alongside decreased facility engagement',
        suggestedStaffMessage: 'Hi there! We wanted to check in regarding your membership renewal and see how we can best support your training.',
        suggestedNextStep: 'Conduct friendly membership review before plan expiry',
      };
    }

    // 4. Wearable recovery / fatigue detected
    if (ctx.wearableFatigueDetected) {
      return {
        type: 'RECOVERY_FOCUSED_RETURN',
        priority: 'MEDIUM',
        reason: 'Biometric recovery signals indicate member may need a lower-intensity return',
        suggestedStaffMessage: 'Hey! Hope you are doing well. Whenever you are ready to stop by, we have some great light mobility and recovery routines for you.',
        suggestedNextStep: 'Recommend gentle mobility, stretching, or active recovery session',
      };
    }

    // 5. Assigned Trainer Relationship
    if (ctx.hasAssignedTrainer && ctx.inactivityDays >= REACTIVATION_THRESHOLDS.MINIMUM_INACTIVITY_DAYS) {
      return {
        type: 'PERSONAL_TRAINER_CHECK_IN',
        priority: ctx.inactivityDays >= REACTIVATION_THRESHOLDS.HIGH_INACTIVITY_DAYS ? 'HIGH' : 'MEDIUM',
        reason: 'Member has an active trainer assignment; personal trainer outreach has the highest recovery rate',
        suggestedStaffMessage: 'Hey! Just thinking about your training progress and wanted to check in. When would be a good time for a quick catch-up?',
        suggestedNextStep: 'Have assigned coach reach out with a personal check-in and training check-up',
      };
    }

    // 6. Class booking or affinity
    if (ctx.recentClassBooking || ctx.previousClassAttendanceCount >= 3) {
      return {
        type: 'CLASS_REINTRODUCTION',
        priority: 'MEDIUM',
        reason: 'Member history shows positive engagement with group classes and community sessions',
        suggestedStaffMessage: 'Hi! We have some great upcoming classes on the schedule. Would love to see you back in the studio!',
        suggestedNextStep: 'Encourage attendance at preferred group fitness class with a warm welcome',
      };
    }

    // 7. Active goals stalled
    if (ctx.hasActiveGoals && ctx.inactivityDays >= 14) {
      return {
        type: 'GOAL_RESET',
        priority: 'MEDIUM',
        reason: 'Member has recorded fitness goals that stalled during recent inactivity',
        suggestedStaffMessage: 'Hey! Ready to recalibrate your goals? Drop by anytime for a quick 10-minute check-in with our coaching staff.',
        suggestedNextStep: 'Invite member for a quick 10-minute fitness goal reset and milestone calibration',
      };
    }

    // 8. Extended absence routine rebuild
    if (ctx.inactivityDays >= REACTIVATION_THRESHOLDS.HIGH_INACTIVITY_DAYS) {
      return {
        type: 'ROUTINE_REBUILD',
        priority: 'HIGH',
        reason: 'Member has been away for over 28 days; progressive ramp-up prevents immediate drop-off',
        suggestedStaffMessage: 'Hi! It has been a little while—let us help you ease back in with a light, simple ramp-up plan whenever you are ready.',
        suggestedNextStep: 'Propose a simplified 2-day/week ramp-up schedule to rebuild routine without overwhelm',
      };
    }

    // 9. Training restart
    if (ctx.inactivityDays >= REACTIVATION_THRESHOLDS.MINIMUM_INACTIVITY_DAYS) {
      return {
        type: 'TRAINING_RESTART',
        priority: 'MEDIUM',
        reason: 'Member was previously active in solo workouts and needs a structured restart session',
        suggestedStaffMessage: 'Hey! We put together a fresh restart routine in your app to help you hit the ground running.',
        suggestedNextStep: 'Provide a fresh workout template in the mobile app tailored for gym return',
      };
    }

    // Default general support
    return {
      type: 'GENERAL_SUPPORT',
      priority: 'LOW',
      reason: 'Early stage inactivity requiring gentle touchpoint',
      suggestedStaffMessage: 'Hi! Just checking in from the gym—hope you have a wonderful week ahead and hope to see you soon!',
      suggestedNextStep: 'Front desk or staff friendly greeting on next visit with support check-in',
    };
  }
}
