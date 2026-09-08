import { Injectable, Logger } from '@nestjs/common';
import { EngagementTrendItem, EngagementTrendType } from '@fitcore/types';
import { EngagementSignalsBundle } from '../engagement-intelligence.types';
import { PersonalBaselineDto } from '@fitcore/types';
import { TREND_SENSITIVITY_THRESHOLD_PCT } from '../engagement-intelligence.constants';

@Injectable()
export class EngagementTrendService {
  private readonly logger = new Logger(EngagementTrendService.name);

  /**
   * Detects multi-pillar engagement trends.
   * STRICT GUARDRAIL: Requires minimum observations. Never generates a trend from an isolated event.
   */
  detectTrends(
    signals: EngagementSignalsBundle,
    baseline: PersonalBaselineDto,
  ): EngagementTrendItem[] {
    const trends: EngagementTrendItem[] = [];

    if (!baseline.sufficientHistory) {
      return trends;
    }

    const threshold = TREND_SENSITIVITY_THRESHOLD_PCT; // 25%

    // 1. Attendance Trends
    if (signals.attendance.visitsLast28d >= 2) {
      const delta = signals.attendance.visitsDeltaPct;
      if (delta >= threshold) {
        trends.push({
          trendType: 'ATTENDANCE_IMPROVING',
          direction: 'IMPROVING',
          metric: 'Gym & Class Visits',
          baselineValue: baseline.baselineVisitsPerWeek,
          recentValue: baseline.recentVisitsPerWeek,
          deltaPercent: delta,
          confidence: 'HIGH',
          description: `Gym visits increased by ${delta}% compared to recent historical weekly baseline.`,
          observationCount: signals.attendance.visitsLast28d,
        });
      } else if (delta <= -threshold) {
        trends.push({
          trendType: 'ATTENDANCE_DECLINING',
          direction: 'DECLINING',
          metric: 'Gym & Class Visits',
          baselineValue: baseline.baselineVisitsPerWeek,
          recentValue: baseline.recentVisitsPerWeek,
          deltaPercent: delta,
          confidence: 'HIGH',
          description: `Gym visits decreased by ${Math.abs(delta)}% compared to recent historical weekly baseline.`,
          observationCount: signals.attendance.visitsLast28d,
        });
      }
    }

    // 2. Workout Adherence Trends
    if (signals.workout.workoutsScheduledLast28d >= 3) {
      const delta = signals.workout.workoutDeltaPct;
      if (delta >= threshold) {
        trends.push({
          trendType: 'WORKOUT_ADHERENCE_IMPROVING',
          direction: 'IMPROVING',
          metric: 'Workout Adherence',
          baselineValue: baseline.baselineWorkoutAdherence,
          recentValue: baseline.recentWorkoutAdherence,
          deltaPercent: delta,
          confidence: 'HIGH',
          description: `Workout completion increased by ${delta}% relative to schedule.`,
          observationCount: signals.workout.workoutsScheduledLast28d,
        });
      } else if (delta <= -threshold) {
        trends.push({
          trendType: 'WORKOUT_ADHERENCE_DECLINING',
          direction: 'DECLINING',
          metric: 'Workout Adherence',
          baselineValue: baseline.baselineWorkoutAdherence,
          recentValue: baseline.recentWorkoutAdherence,
          deltaPercent: delta,
          confidence: 'HIGH',
          description: `Workout completion declined by ${Math.abs(delta)}% relative to schedule.`,
          observationCount: signals.workout.workoutsScheduledLast28d,
        });
      }
    }

    // 3. Booking Trends
    if (signals.booking.bookingsLast28d >= 2) {
      const delta = signals.booking.bookingDeltaPct;
      if (delta >= threshold) {
        trends.push({
          trendType: 'BOOKING_ACTIVITY_INCREASING',
          direction: 'IMPROVING',
          metric: 'Class & Session Bookings',
          baselineValue: baseline.baselineBookingsPerWeek,
          recentValue: baseline.recentBookingsPerWeek,
          deltaPercent: delta,
          confidence: 'MEDIUM',
          description: `Class and session bookings increased by ${delta}%.`,
          observationCount: signals.booking.bookingsLast28d,
        });
      } else if (delta <= -threshold) {
        trends.push({
          trendType: 'BOOKING_ACTIVITY_DECREASING',
          direction: 'DECLINING',
          metric: 'Class & Session Bookings',
          baselineValue: baseline.baselineBookingsPerWeek,
          recentValue: baseline.recentBookingsPerWeek,
          deltaPercent: delta,
          confidence: 'MEDIUM',
          description: `Class and session bookings decreased by ${Math.abs(delta)}%.`,
          observationCount: signals.booking.bookingsLast28d,
        });
      }
    }

    // 4. App Engagement Trends
    if (signals.app.eventsLast28d >= 4) {
      const delta = signals.app.eventsDeltaPct;
      if (delta >= threshold) {
        trends.push({
          trendType: 'APP_ENGAGEMENT_INCREASING',
          direction: 'IMPROVING',
          metric: 'App Interactions',
          baselineValue: baseline.baselineAppEventsPerWeek,
          recentValue: baseline.recentAppEventsPerWeek,
          deltaPercent: delta,
          confidence: 'MEDIUM',
          description: `Mobile app activity increased by ${delta}%.`,
          observationCount: signals.app.eventsLast28d,
        });
      } else if (delta <= -threshold) {
        trends.push({
          trendType: 'APP_ENGAGEMENT_DECREASING',
          direction: 'DECLINING',
          metric: 'App Interactions',
          baselineValue: baseline.baselineAppEventsPerWeek,
          recentValue: baseline.recentAppEventsPerWeek,
          deltaPercent: delta,
          confidence: 'MEDIUM',
          description: `Mobile app activity decreased by ${Math.abs(delta)}%.`,
          observationCount: signals.app.eventsLast28d,
        });
      }
    }

    // 5. Goal Engagement Trends
    if (signals.goals.activeGoalsCount > 0) {
      if (signals.goals.averageProgressPct >= 70) {
        trends.push({
          trendType: 'GOAL_ENGAGEMENT_INCREASING',
          direction: 'IMPROVING',
          metric: 'Goal Milestones',
          baselineValue: 50,
          recentValue: signals.goals.averageProgressPct,
          deltaPercent: signals.goals.averageProgressPct - 50,
          confidence: 'MEDIUM',
          description: `Active goal progress is accelerating (${signals.goals.averageProgressPct}% complete).`,
          observationCount: signals.goals.activeGoalsCount,
        });
      } else if (signals.goals.averageProgressPct < 15 && signals.goals.activeGoalsCount > 0) {
        trends.push({
          trendType: 'GOAL_ENGAGEMENT_DECREASING',
          direction: 'DECLINING',
          metric: 'Goal Milestones',
          baselineValue: 50,
          recentValue: signals.goals.averageProgressPct,
          deltaPercent: signals.goals.averageProgressPct - 50,
          confidence: 'MEDIUM',
          description: `Goal progress has stalled across active targets.`,
          observationCount: signals.goals.activeGoalsCount,
        });
      }
    }

    // 6. Check-in Engagement Trends
    if (signals.checkin.checkInsLast28d >= 3) {
      if (signals.checkin.motivationTrajectory === 'IMPROVING') {
        trends.push({
          trendType: 'CHECKIN_ENGAGEMENT_INCREASING',
          direction: 'IMPROVING',
          metric: 'Daily Check-In Consistency',
          baselineValue: baseline.baselineCheckInRate,
          recentValue: baseline.recentCheckInRate,
          deltaPercent: baseline.recentCheckInRate - baseline.baselineCheckInRate,
          confidence: 'HIGH',
          description: `Daily check-in submissions have become more regular over recent days.`,
          observationCount: signals.checkin.checkInsLast28d,
        });
      } else if (signals.checkin.motivationTrajectory === 'DECLINING') {
        trends.push({
          trendType: 'CHECKIN_ENGAGEMENT_DECREASING',
          direction: 'DECLINING',
          metric: 'Daily Check-In Consistency',
          baselineValue: baseline.baselineCheckInRate,
          recentValue: baseline.recentCheckInRate,
          deltaPercent: baseline.recentCheckInRate - baseline.baselineCheckInRate,
          confidence: 'HIGH',
          description: `Daily check-in submissions have slowed down recently.`,
          observationCount: signals.checkin.checkInsLast28d,
        });
      }
    }

    // 7. Overall Momentum Trend
    if (baseline.momentum === 'IMPROVING') {
      trends.push({
        trendType: 'OVERALL_ENGAGEMENT_IMPROVING',
        direction: 'IMPROVING',
        metric: 'Overall Momentum',
        baselineValue: 0,
        recentValue: baseline.deviationPercent,
        deltaPercent: baseline.deviationPercent,
        confidence: 'HIGH',
        description: `Overall member engagement shows a positive upward trajectory compared to personal baseline.`,
        observationCount: baseline.historicalWindowDays,
      });
    } else if (baseline.momentum === 'DECLINING') {
      trends.push({
        trendType: 'OVERALL_ENGAGEMENT_DECLINING',
        direction: 'DECLINING',
        metric: 'Overall Momentum',
        baselineValue: 0,
        recentValue: baseline.deviationPercent,
        deltaPercent: baseline.deviationPercent,
        confidence: 'HIGH',
        description: `Overall member engagement is trending downward compared to personal baseline.`,
        observationCount: baseline.historicalWindowDays,
      });
    }

    return trends;
  }
}
