import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import {
  MemberEngagementProfileDto,
  OverallEngagementLevel,
  EngagementTrendDirection,
} from '@fitcore/types';
import {
  EngagementSignalsBundle,
} from '../engagement-intelligence.types';
import { MemberEngagementBaselineService } from './member-engagement-baseline.service';
import {
  ENGAGEMENT_LEVEL_THRESHOLDS,
  ENGAGEMENT_WEIGHTS,
} from '../engagement-intelligence.constants';

@Injectable()
export class MemberEngagementProfileService {
  private readonly logger = new Logger(MemberEngagementProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly baselineService: MemberEngagementBaselineService,
  ) {}

  /**
   * Generates a deterministic MemberEngagementProfile from raw domain signals and personal baseline.
   */
  async buildProfile(
    signals: EngagementSignalsBundle,
    now: Date = new Date(),
  ): Promise<MemberEngagementProfileDto> {
    const baseline = await this.baselineService.computeBaseline(signals.memberId, signals.organisationId, now);

    // Check data sufficiency:
    const totalSignalsCount =
      signals.attendance.visitsLast28d +
      signals.workout.workoutsScheduledLast28d +
      signals.booking.bookingsLast28d +
      signals.app.eventsLast28d +
      signals.checkin.checkInsLast28d;

    if (totalSignalsCount === 0) {
      return {
        memberId: signals.memberId,
        organisationId: signals.organisationId,
        lastAppActivity: null,
        lastGymVisit: null,
        lastWorkout: null,
        lastBooking: null,
        lastCheckIn: null,
        attendanceFrequency: 0,
        workoutAdherence: 0,
        bookingFrequency: 0,
        appEngagement: 0,
        goalEngagement: 0,
        nutritionEngagement: 0,
        wearableEngagement: 0,
        overallEngagement: 'INSUFFICIENT_DATA',
        trend: 'INSUFFICIENT_DATA',
        calculatedAt: now.toISOString(),
      };
    }

    // 1. Calculate component sub-scores on a 0 - 100 scale:
    // Attendance score: 3+ visits/week = 100
    const attendanceScore = Math.min(100, Math.round((signals.attendance.attendanceFrequencyPerWeek / 3) * 100));

    // Workout score: adherence %
    const workoutScore = Math.min(100, signals.workout.workoutAdherencePct);

    // Booking score: 2+ bookings/week = 100
    const bookingScore = Math.min(100, Math.round((signals.booking.bookingFrequencyPerWeek / 2) * 100));

    // App engagement score: 10+ events/week = 100
    const appScore = Math.min(100, Math.round(((signals.app.eventsLast28d / 4) / 10) * 100));

    // Checkin score: completion rate %
    const checkinScore = Math.min(100, signals.checkin.completionRatePct);

    // Goal score: average progress %
    const goalScore = Math.min(100, signals.goals.averageProgressPct || (signals.goals.activeGoalsCount > 0 ? 50 : 0));

    // 2. Weighted overall score
    const weightedScore =
      attendanceScore * ENGAGEMENT_WEIGHTS.ATTENDANCE +
      workoutScore * ENGAGEMENT_WEIGHTS.WORKOUT_ADHERENCE +
      bookingScore * ENGAGEMENT_WEIGHTS.BOOKING +
      appScore * ENGAGEMENT_WEIGHTS.APP_ACTIVITY +
      checkinScore * ENGAGEMENT_WEIGHTS.CHECK_IN +
      goalScore * ENGAGEMENT_WEIGHTS.GOAL_PROGRESS;

    // 3. Classify Overall Engagement Level
    let overallEngagement: OverallEngagementLevel = 'MODERATE';
    if (totalSignalsCount < 2) {
      overallEngagement = 'INSUFFICIENT_DATA';
    } else if (weightedScore >= ENGAGEMENT_LEVEL_THRESHOLDS.VERY_HIGH) {
      overallEngagement = 'VERY_HIGH';
    } else if (weightedScore >= ENGAGEMENT_LEVEL_THRESHOLDS.HIGH) {
      overallEngagement = 'HIGH';
    } else if (weightedScore >= ENGAGEMENT_LEVEL_THRESHOLDS.MODERATE) {
      overallEngagement = 'MODERATE';
    } else if (weightedScore >= ENGAGEMENT_LEVEL_THRESHOLDS.LOW) {
      overallEngagement = 'LOW';
    } else {
      overallEngagement = 'VERY_LOW';
    }

    // 4. Trend determination based on baseline personal momentum
    let trend: EngagementTrendDirection = 'STABLE';
    if (!baseline.sufficientHistory) {
      trend = 'INSUFFICIENT_DATA';
    } else if (baseline.momentum === 'IMPROVING') {
      trend = 'IMPROVING';
    } else if (baseline.momentum === 'DECLINING') {
      trend = 'DECLINING';
    } else {
      trend = 'STABLE';
    }

    const profileDto: MemberEngagementProfileDto = {
      memberId: signals.memberId,
      organisationId: signals.organisationId,
      lastAppActivity: signals.app.lastAppActivityAt?.toISOString() || null,
      lastGymVisit: signals.attendance.lastGymVisitAt?.toISOString() || null,
      lastWorkout: signals.workout.lastWorkoutAt?.toISOString() || null,
      lastBooking: signals.booking.lastBookingAt?.toISOString() || null,
      lastCheckIn: signals.checkin.lastCheckInAt?.toISOString() || null,
      attendanceFrequency: signals.attendance.attendanceFrequencyPerWeek,
      workoutAdherence: signals.workout.workoutAdherencePct,
      bookingFrequency: signals.booking.bookingFrequencyPerWeek,
      appEngagement: Number((signals.app.eventsLast28d / 4).toFixed(1)),
      goalEngagement: signals.goals.averageProgressPct,
      nutritionEngagement: Number((signals.nutrition.foodLogsLast28d / 4).toFixed(1)),
      wearableEngagement: Number((signals.wearables.syncDaysLast28d / 4).toFixed(1)),
      overallEngagement,
      trend,
      calculatedAt: now.toISOString(),
    };

    // Upsert into Prisma MemberEngagementProfile if exists
    try {
      await this.prisma.memberEngagementProfile.upsert({
        where: { memberId: signals.memberId },
        create: {
          organisationId: signals.organisationId,
          memberId: signals.memberId,
          engagementLevel: overallEngagement,
          engagementScore: Math.round(weightedScore),
          lastActivityAt: signals.app.lastAppActivityAt || signals.attendance.lastGymVisitAt || now,
          lastGymVisitAt: signals.attendance.lastGymVisitAt,
          lastWorkoutAt: signals.workout.lastWorkoutAt,
          lastNutritionActivityAt: signals.nutrition.lastNutritionLogAt,
          totalVisits: signals.attendance.visitsLast28d,
          totalWorkouts: signals.workout.workoutsCompletedLast28d,
          totalCompletedGoals: signals.goals.completedGoalsCount,
        },
        update: {
          engagementLevel: overallEngagement,
          engagementScore: Math.round(weightedScore),
          lastActivityAt: signals.app.lastAppActivityAt || signals.attendance.lastGymVisitAt || undefined,
          lastGymVisitAt: signals.attendance.lastGymVisitAt || undefined,
          lastWorkoutAt: signals.workout.lastWorkoutAt || undefined,
          lastNutritionActivityAt: signals.nutrition.lastNutritionLogAt || undefined,
          totalVisits: signals.attendance.visitsLast28d,
          totalWorkouts: signals.workout.workoutsCompletedLast28d,
          totalCompletedGoals: signals.goals.completedGoalsCount,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Could not sync MemberEngagementProfile table: ${err.message}`);
    }

    return profileDto;
  }
}
