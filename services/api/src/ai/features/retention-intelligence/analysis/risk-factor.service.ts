import { Injectable, Logger } from '@nestjs/common';
import {
  RetentionRiskFactor,
  RetentionPositiveSignal,
  RetentionRiskTrend,
  PersonalBaselineDto,
} from '@fitcore/types';
import { EngagementSignalsBundle } from '../../engagement-intelligence/engagement-intelligence.types';

@Injectable()
export class RiskFactorService {
  private readonly logger = new Logger(RiskFactorService.name);

  /**
   * Evaluates structured risk factors comparing recent activity to the member's personal baseline.
   * STRICT SEPARATION OF OBSERVABLE FACTS FROM INTERPRETATION.
   */
  evaluateRiskFactors(
    signals: EngagementSignalsBundle,
    baseline: PersonalBaselineDto,
  ): RetentionRiskFactor[] {
    const factors: RetentionRiskFactor[] = [];

    // 1. ATTENDANCE_DECLINE
    if (signals.attendance.visitsDeltaPct <= -50 && baseline.baselineVisitsPerWeek >= 1.5) {
      factors.push({
        type: 'ATTENDANCE_DECLINE',
        severity: 'HIGH',
        observation: `Gym attendance decreased from normal baseline of ${baseline.baselineVisitsPerWeek} visits/week to ${baseline.recentVisitsPerWeek} visits/week.`,
        timeframe: 'Last 14-28 days',
        evidence: [
          `Historical Baseline: ${baseline.baselineVisitsPerWeek} visits/week`,
          `Recent Period: ${baseline.recentVisitsPerWeek} visits/week`,
          `Variance: ${signals.attendance.visitsDeltaPct}%`,
          `Total Visits Last 28 Days: ${signals.attendance.visitsLast28d}`,
        ],
      });
    } else if (signals.attendance.visitsDeltaPct <= -25 && baseline.baselineVisitsPerWeek >= 1) {
      factors.push({
        type: 'ATTENDANCE_DECLINE',
        severity: 'MEDIUM',
        observation: `Gym visits decreased by ${Math.abs(signals.attendance.visitsDeltaPct)}% relative to personal baseline.`,
        timeframe: 'Last 7-14 days',
        evidence: [
          `Baseline: ${baseline.baselineVisitsPerWeek} visits/week`,
          `Recent: ${baseline.recentVisitsPerWeek} visits/week`,
        ],
      });
    }

    // 2. LONG_INACTIVITY
    if (signals.attendance.visitsLast28d === 0 && baseline.baselineVisitsPerWeek > 0) {
      factors.push({
        type: 'LONG_INACTIVITY',
        severity: 'HIGH',
        observation: 'Zero gym visits recorded over the past 28 days.',
        timeframe: 'Last 28 days',
        evidence: [
          'Attendance access logs show 0 check-ins in the last 28 days',
          `Previous baseline: ${baseline.baselineVisitsPerWeek} visits/week`,
        ],
      });
    }

    // 3. RECENT_NO_SHOWS
    if (signals.attendance.noShowCountLast28d >= 3) {
      factors.push({
        type: 'RECENT_NO_SHOWS',
        severity: 'HIGH',
        observation: `${signals.attendance.noShowCountLast28d} booked classes or personal training sessions were missed (no-show) without prior cancellation.`,
        timeframe: 'Last 28 days',
        evidence: [
          `Recorded No-Shows: ${signals.attendance.noShowCountLast28d}`,
          'Session booking attendance records',
        ],
      });
    } else if (signals.attendance.noShowCountLast28d >= 1) {
      factors.push({
        type: 'RECENT_NO_SHOWS',
        severity: 'LOW',
        observation: `${signals.attendance.noShowCountLast28d} missed session booking recorded in the last 28 days.`,
        timeframe: 'Last 28 days',
        evidence: [`Recorded No-Shows: ${signals.attendance.noShowCountLast28d}`],
      });
    }

    // 4. WORKOUT_ADHERENCE_DECLINE
    if (signals.workout.workoutsScheduledLast28d >= 2 && signals.workout.workoutAdherencePct < 25) {
      factors.push({
        type: 'WORKOUT_ADHERENCE_DECLINE',
        severity: 'HIGH',
        observation: `Scheduled workout adherence dropped to ${signals.workout.workoutAdherencePct}% (${signals.workout.workoutsCompletedLast28d} of ${signals.workout.workoutsScheduledLast28d} completed).`,
        timeframe: 'Last 28 days',
        evidence: [
          `Scheduled Workouts: ${signals.workout.workoutsScheduledLast28d}`,
          `Completed Workouts: ${signals.workout.workoutsCompletedLast28d}`,
          `Adherence Rate: ${signals.workout.workoutAdherencePct}%`,
        ],
      });
    } else if (signals.workout.workoutsScheduledLast28d >= 2 && signals.workout.workoutAdherencePct < 50) {
      factors.push({
        type: 'WORKOUT_ADHERENCE_DECLINE',
        severity: 'MEDIUM',
        observation: `Workout completion adherence is below 50% (${signals.workout.workoutAdherencePct}%).`,
        timeframe: 'Last 28 days',
        evidence: [
          `Scheduled: ${signals.workout.workoutsScheduledLast28d}`,
          `Completed: ${signals.workout.workoutsCompletedLast28d}`,
        ],
      });
    }

    // 5. BOOKING_DECLINE
    if (baseline.baselineBookingsPerWeek >= 1 && baseline.recentBookingsPerWeek === 0) {
      factors.push({
        type: 'BOOKING_DECLINE',
        severity: 'MEDIUM',
        observation: `Member previously booked ${baseline.baselineBookingsPerWeek} sessions/week, but has 0 active bookings in recent period.`,
        timeframe: 'Last 14 days',
        evidence: [
          `Baseline Bookings: ${baseline.baselineBookingsPerWeek}/week`,
          `Recent Bookings: ${baseline.recentBookingsPerWeek}/week`,
        ],
      });
    }

    // 6. APP_ENGAGEMENT_DECLINE
    if (signals.app.eventsLast28d === 0) {
      factors.push({
        type: 'APP_ENGAGEMENT_DECLINE',
        severity: 'MEDIUM',
        observation: 'Zero mobile app opens or interactions logged over the last 28 days.',
        timeframe: 'Last 28 days',
        evidence: ['0 app telemetry events recorded in past 28-day window'],
      });
    } else if (signals.app.eventsDeltaPct <= -50 && baseline.baselineAppEventsPerWeek >= 3) {
      factors.push({
        type: 'APP_ENGAGEMENT_DECLINE',
        severity: 'LOW',
        observation: `App usage frequency dropped by ${Math.abs(signals.app.eventsDeltaPct)}% compared with baseline.`,
        timeframe: 'Last 7 days',
        evidence: [
          `Baseline App Events: ${baseline.baselineAppEventsPerWeek}/week`,
          `Recent App Events: ${baseline.recentAppEventsPerWeek}/week`,
        ],
      });
    }

    // 7. CHECKIN_DECLINE
    if (signals.checkin.checkInsLast28d >= 3 && signals.checkin.checkInsLast7d === 0) {
      factors.push({
        type: 'CHECKIN_DECLINE',
        severity: 'LOW',
        observation: 'Daily wellness check-ins paused during the last 7 days after regular previous participation.',
        timeframe: 'Last 7 days',
        evidence: [
          `Check-ins in past 28d: ${signals.checkin.checkInsLast28d}`,
          `Check-ins in past 7d: 0`,
        ],
      });
    }

    // 8. MEMBERSHIP_EXPIRATION
    if (
      signals.membership.isExpiringSoon &&
      signals.membership.daysUntilExpiry !== null &&
      signals.membership.daysUntilExpiry !== undefined
    ) {
      const days = signals.membership.daysUntilExpiry;
      factors.push({
        type: 'MEMBERSHIP_EXPIRATION',
        severity: days <= 7 ? 'HIGH' : 'MEDIUM',
        observation: `Membership expires in ${days} days without auto-renewal configured.`,
        timeframe: `Next ${days} days`,
        evidence: [
          `Expiry countdown: ${days} days remaining`,
          'Membership status record',
        ],
      });
    }

    // 9. GOAL_DISENGAGEMENT
    if (signals.workout.workoutsScheduledLast28d > 0 && signals.workout.workoutsCompletedLast28d === 0) {
      factors.push({
        type: 'GOAL_DISENGAGEMENT',
        severity: 'MEDIUM',
        observation: 'Assigned training routine or target progression has stalled without logged activities.',
        timeframe: 'Last 28 days',
        evidence: ['0 workouts completed against active program'],
      });
    }

    // 10. Multi-Signal Summary factor if multiple pillars are simultaneously declining
    if (factors.length >= 3) {
      factors.unshift({
        type: 'ENGAGEMENT_DECLINE',
        severity: 'HIGH',
        observation: 'Coordinated decline observed simultaneously across gym attendance, training activity, and app engagement.',
        timeframe: 'Last 28 days',
        evidence: [
          `Compounded decline across ${factors.length} distinct behavioral pillars`,
          `Attendance delta: ${signals.attendance.visitsDeltaPct}%`,
          `Workout adherence: ${signals.workout.workoutAdherencePct}%`,
        ],
      });
    } else if (factors.length === 0) {
      factors.push({
        type: 'ENGAGEMENT_STABILITY',
        severity: 'LOW',
        observation: 'Member participation, gym visits, and workout completion align stably with personal baseline.',
        timeframe: 'Last 28 days',
        evidence: ['All behavioral indicators are consistent with historical baseline'],
      });
    }

    return factors;
  }

  /**
   * Detects positive signals balancing negative risk factors.
   */
  evaluatePositiveSignals(
    signals: EngagementSignalsBundle,
    baseline: PersonalBaselineDto,
  ): RetentionPositiveSignal[] {
    const positiveSignals: RetentionPositiveSignal[] = [];

    // 1. ATTENDANCE_RECOVERY / RECENT_REENGAGEMENT
    if (signals.attendance.visitsLast7d >= 2 && baseline.recentVisitsPerWeek >= baseline.baselineVisitsPerWeek) {
      positiveSignals.push({
        type: 'ATTENDANCE_RECOVERY',
        observation: `Gym visits increased over the last 7 days (${signals.attendance.visitsLast7d} visits), matching or exceeding baseline.`,
        timeframe: 'Last 7 days',
        evidence: [`${signals.attendance.visitsLast7d} visits recorded in last 7 days`],
      });
    } else if (signals.attendance.visitsLast7d >= 1 && signals.attendance.visitsLast28d <= 2) {
      positiveSignals.push({
        type: 'RECENT_REENGAGEMENT',
        observation: 'Member checked in to the gym this week after a period of lower attendance.',
        timeframe: 'Last 7 days',
        evidence: ['Recent gym visit logged within the last 7 days'],
      });
    }

    // 2. WORKOUT_ADHERENCE_RECOVERY
    if (signals.workout.workoutAdherencePct >= 75 && signals.workout.workoutsCompletedLast28d >= 3) {
      positiveSignals.push({
        type: 'WORKOUT_ADHERENCE_RECOVERY',
        observation: `Strong workout adherence of ${signals.workout.workoutAdherencePct}% (${signals.workout.workoutsCompletedLast28d} sessions completed).`,
        timeframe: 'Last 28 days',
        evidence: [`${signals.workout.workoutsCompletedLast28d} completed workouts in 28 days`],
      });
    }

    // 3. BOOKING_RECOVERY
    if (signals.booking.bookingsLast7d >= 1) {
      positiveSignals.push({
        type: 'BOOKING_RECOVERY',
        observation: `Active booking created in the last 7 days (${signals.booking.bookingsLast7d} booking).`,
        timeframe: 'Last 7 days',
        evidence: [`${signals.booking.bookingsLast7d} class or PT booking scheduled`],
      });
    }

    // 4. CHECKIN_RECOVERY
    if (signals.checkin.checkInsLast7d >= 3) {
      positiveSignals.push({
        type: 'CHECKIN_RECOVERY',
        observation: `Consistent daily check-in participation (${signals.checkin.checkInsLast7d} check-ins this week).`,
        timeframe: 'Last 7 days',
        evidence: [`${signals.checkin.checkInsLast7d} daily wellness check-ins recorded`],
      });
    }

    // 5. APP_ENGAGEMENT_RECOVERY
    if (signals.app.eventsLast7d >= 5 && signals.app.eventsDeltaPct >= 20) {
      positiveSignals.push({
        type: 'APP_ENGAGEMENT_RECOVERY',
        observation: 'Mobile app activity increased significantly over the past week.',
        timeframe: 'Last 7 days',
        evidence: [`${signals.app.eventsLast7d} app actions recorded in the past 7 days`],
      });
    }

    return positiveSignals;
  }

  /**
   * Computes risk trend based on recent signals, recovery indicators, and baseline deviation.
   */
  computeRiskTrend(
    signals: EngagementSignalsBundle,
    baseline: PersonalBaselineDto,
    positiveSignals: RetentionPositiveSignal[],
  ): RetentionRiskTrend {
    if (!baseline.sufficientHistory) {
      return 'INSUFFICIENT_DATA';
    }

    const hasRecentRecovery = positiveSignals.some(
      (s) => s.type === 'ATTENDANCE_RECOVERY' || s.type === 'RECENT_REENGAGEMENT' || s.type === 'WORKOUT_ADHERENCE_RECOVERY',
    );

    if (hasRecentRecovery || baseline.momentum === 'IMPROVING') {
      return 'IMPROVING';
    }

    if (
      signals.attendance.visitsDeltaPct <= -35 ||
      (signals.attendance.visitsLast28d === 0 && baseline.baselineVisitsPerWeek > 0) ||
      baseline.momentum === 'DECLINING'
    ) {
      return 'WORSENING';
    }

    return 'STABLE';
  }
}
