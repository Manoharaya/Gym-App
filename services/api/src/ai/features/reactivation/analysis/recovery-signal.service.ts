import { Injectable, Logger } from '@nestjs/common';
import {
  RecoveryState,
  ReactivationPositiveSignalItem,
  PersonalBaselineDto,
} from '@fitcore/types';
import { REACTIVATION_THRESHOLDS } from '../reactivation.constants';
import { MeaningfulActivity } from './inactivity-analysis.service';

@Injectable()
export class RecoverySignalService {
  private readonly logger = new Logger(RecoverySignalService.name);

  /**
   * Evaluates positive recovery signals and deterministically calculates the member's recovery state.
   */
  evaluateRecoveryState(params: {
    activities: MeaningfulActivity[];
    daysInactive: number;
    baseline?: PersonalBaselineDto;
    now?: Date;
  }): {
    recoveryState: RecoveryState;
    positiveSignals: ReactivationPositiveSignalItem[];
    reengagementDetectedAt: Date | null;
  } {
    const { activities, baseline, now = new Date() } = params;
    const d14Ago = new Date(
      now.getTime() - REACTIVATION_THRESHOLDS.REENGAGEMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const recentActivities = activities.filter((a) => a.timestamp >= d14Ago);
    const positiveSignals: ReactivationPositiveSignalItem[] = [];

    if (recentActivities.length === 0) {
      return {
        recoveryState: 'NO_RECOVERY_SIGNAL',
        positiveSignals: [],
        reengagementDetectedAt: null,
      };
    }

    const visits = recentActivities.filter((a) =>
      ['GYM_VISIT', 'CLASS_ATTENDANCE', 'PT_SESSION'].includes(a.type),
    );
    const workouts = recentActivities.filter((a) => a.type === 'WORKOUT_COMPLETION');
    const bookings = recentActivities.filter((a) => a.type === 'BOOKING');
    const checkIns = recentActivities.filter((a) => a.type === 'DAILY_CHECKIN');
    const appEvents = recentActivities.filter((a) => a.type === 'APP_ACTIVITY');
    const goals = recentActivities.filter((a) => a.type === 'GOAL_ACTIVITY');

    const reengagementDetectedAt =
      recentActivities[recentActivities.length - 1]?.timestamp || recentActivities[0]?.timestamp;

    if (visits.length > 0) {
      positiveSignals.push({
        type: 'RECENT_VISIT',
        observation: `Attended ${visits.length} facility visit(s) in the last 14 days`,
        evidence: visits.map((v) => `${v.type} at ${v.timestamp.toISOString().split('T')[0]}`),
        detectedAt: visits[0].timestamp.toISOString(),
      });
    }

    if (bookings.length > 0) {
      positiveSignals.push({
        type: 'CLASS_BOOKED',
        observation: `Booked ${bookings.length} class session(s) in the re-engagement window`,
        evidence: bookings.map((b) => `Booking recorded on ${b.timestamp.toISOString().split('T')[0]}`),
        detectedAt: bookings[0].timestamp.toISOString(),
      });
    }

    if (workouts.length > 0) {
      positiveSignals.push({
        type: 'RECENT_WORKOUT',
        observation: `Logged ${workouts.length} workout(s) in training journal`,
        evidence: workouts.map((w) => `Workout on ${w.timestamp.toISOString().split('T')[0]}`),
        detectedAt: workouts[0].timestamp.toISOString(),
      });
    }

    if (checkIns.length > 0) {
      positiveSignals.push({
        type: 'RECENT_CHECKIN',
        observation: `Completed ${checkIns.length} daily wellness check-in(s)`,
        evidence: checkIns.map((c) => `Check-in on ${c.timestamp.toISOString().split('T')[0]}`),
        detectedAt: checkIns[0].timestamp.toISOString(),
      });
    }

    if (appEvents.length > 0) {
      positiveSignals.push({
        type: 'APP_REENGAGEMENT',
        observation: 'Reopened mobile app to view workout schedule',
        evidence: ['Mobile app session recorded'],
        detectedAt: appEvents[0].timestamp.toISOString(),
      });
    }

    if (goals.length > 0) {
      positiveSignals.push({
        type: 'GOAL_ACTIVITY',
        observation: 'Updated or calibrated fitness targets',
        evidence: goals.map((g) => g.details || 'Goal update logged'),
        detectedAt: goals[0].timestamp.toISOString(),
      });
    }

    const baselineVisits = baseline?.baselineVisitsPerWeek ?? 2.0;
    const isBaselineMet = visits.length >= Math.max(2, baselineVisits * 1.5);

    let recoveryState: RecoveryState = 'EARLY_REENGAGEMENT';

    if (visits.length >= 4 || isBaselineMet) {
      recoveryState = 'REENGAGED';
    } else if (
      visits.length >= REACTIVATION_THRESHOLDS.MINIMUM_RECOVERY_ATTENDANCE ||
      (visits.length >= 1 && workouts.length >= REACTIVATION_THRESHOLDS.MINIMUM_RECOVERY_WORKOUTS)
    ) {
      recoveryState = 'STABLE_REENGAGEMENT';
    } else if (
      visits.length >= 1 ||
      (bookings.length >= 1 && (appEvents.length > 0 || checkIns.length > 0)) ||
      workouts.length >= 1
    ) {
      recoveryState = 'PARTIAL_REENGAGEMENT';
    } else {
      recoveryState = 'EARLY_REENGAGEMENT';
    }

    return {
      recoveryState,
      positiveSignals,
      reengagementDetectedAt,
    };
  }
}
