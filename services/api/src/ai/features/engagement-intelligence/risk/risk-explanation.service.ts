import { Injectable, Logger } from '@nestjs/common';
import { ObservedSignalItem } from '@fitcore/types';
import { EngagementSignalsBundle } from '../engagement-intelligence.types';
import { PersonalBaselineDto } from '@fitcore/types';

@Injectable()
export class RiskExplanationService {
  private readonly logger = new Logger(RiskExplanationService.name);

  /**
   * Constructs clear, explainable, observable contributing signals.
   * STRICT SEPARATION:
   * Formats exact observed behaviors (e.g. "Gym visits dropped from 3/week to 1/week")
   * without claiming certainty or using accusatory/punitive language.
   */
  generateExplanations(
    signals: EngagementSignalsBundle,
    baseline: PersonalBaselineDto,
  ): { observedSignals: ObservedSignalItem[]; contributingReasons: string[] } {
    const observedSignals: ObservedSignalItem[] = [];
    const contributingReasons: string[] = [];

    // 1. Attendance Observations
    if (signals.attendance.visitsDeltaPct <= -25 && baseline.baselineVisitsPerWeek > 0) {
      const obs = `Gym visits decreased from ${baseline.baselineVisitsPerWeek}/week to ${baseline.recentVisitsPerWeek}/week over the last 7 days.`;
      observedSignals.push({
        category: 'ATTENDANCE',
        observation: obs,
        timeframe: 'Last 7 days',
      });
      contributingReasons.push(obs);
    } else if (signals.attendance.visitsLast28d === 0) {
      const obs = 'No recorded gym visits or class check-ins in the last 28 days.';
      observedSignals.push({
        category: 'ATTENDANCE',
        observation: obs,
        timeframe: 'Last 28 days',
      });
      contributingReasons.push(obs);
    }

    // 2. Attendance No-Shows
    if (signals.attendance.noShowCountLast28d >= 2) {
      const obs = `${signals.attendance.noShowCountLast28d} missed class/session bookings (no-shows) in the last 28 days.`;
      observedSignals.push({
        category: 'ATTENDANCE',
        observation: obs,
        timeframe: 'Last 28 days',
      });
      contributingReasons.push(obs);
    }

    // 3. Workout Adherence
    if (signals.workout.workoutsScheduledLast28d >= 2 && signals.workout.workoutAdherencePct < 40) {
      const obs = `Workout completion is currently at ${signals.workout.workoutAdherencePct}% adherence (${signals.workout.workoutsCompletedLast28d} of ${signals.workout.workoutsScheduledLast28d} completed).`;
      observedSignals.push({
        category: 'TRAINING',
        observation: obs,
        timeframe: 'Last 28 days',
      });
      contributingReasons.push(obs);
    }

    // 4. Booking Frequency
    if (baseline.baselineBookingsPerWeek > 1 && baseline.recentBookingsPerWeek === 0) {
      const obs = 'No active class or PT bookings created in the last 7 days.';
      observedSignals.push({
        category: 'BOOKINGS',
        observation: obs,
        timeframe: 'Last 7 days',
      });
      contributingReasons.push(obs);
    }

    // 5. App Engagement Inactivity
    if (signals.app.eventsLast28d === 0) {
      const obs = 'Zero mobile app interactions recorded during the past 28 days.';
      observedSignals.push({
        category: 'APP_ACTIVITY',
        observation: obs,
        timeframe: 'Last 28 days',
      });
      contributingReasons.push(obs);
    } else if (signals.app.eventsDeltaPct <= -40 && baseline.baselineAppEventsPerWeek > 2) {
      const obs = `Mobile app activity dropped by ${Math.abs(signals.app.eventsDeltaPct)}% over the past week.`;
      observedSignals.push({
        category: 'APP_ACTIVITY',
        observation: obs,
        timeframe: 'Last 7 days',
      });
      contributingReasons.push(obs);
    }

    // 6. Check-In Disengagement
    if (signals.checkin.checkInsLast28d >= 3 && signals.checkin.checkInsLast7d === 0) {
      const obs = 'Daily check-in participation paused over the last 7 days.';
      observedSignals.push({
        category: 'CHECK_INS',
        observation: obs,
        timeframe: 'Last 7 days',
      });
      contributingReasons.push(obs);
    }

    // 7. Commercial Membership Signals (Read-only)
    if (signals.membership.isExpiringSoon) {
      const obs = `Membership is scheduled to expire in ${signals.membership.daysUntilExpiry} days without auto-renew.`;
      observedSignals.push({
        category: 'MEMBERSHIP',
        observation: obs,
        timeframe: 'Next 14 days',
      });
      contributingReasons.push(obs);
    } else if (signals.membership.isSuspended) {
      const obs = 'Membership is currently in SUSPENDED status.';
      observedSignals.push({
        category: 'MEMBERSHIP',
        observation: obs,
        timeframe: 'Current status',
      });
      contributingReasons.push(obs);
    }

    return { observedSignals, contributingReasons };
  }
}
