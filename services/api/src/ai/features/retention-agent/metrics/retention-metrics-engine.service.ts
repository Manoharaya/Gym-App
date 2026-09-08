import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import {
  RetentionDataType,
  RetentionDataPoint,
  RetentionDataBundle,
  RetentionObservationWindow,
  RetentionTrend,
  DataQuality,
  InactivityMetric,
  AttendanceMetrics,
  WorkoutAdherenceMetrics,
  BookingEngagementMetrics,
  NoShowMetrics,
  AppEngagementMetrics,
  DailyCheckInEngagementMetrics,
  GoalEngagementMetrics,
  NutritionEngagementMetrics,
  WearableEngagementMetrics,
  MembershipContextMetrics,
  MembershipExpirationWindow,
  MemberLifecycleStage,
  ReengagementSignalData,
  ContactFrequencySummary,
  WindowDefinition,
  BaselineWindowDefinition,
  QualifyingActivityRecord,
  RetentionActivityType,
} from '@fitcore/types';
import {
  QUALIFYING_RETENTION_ACTIVITIES,
  RETENTION_OBSERVATION_WINDOW_DAYS,
  RETENTION_SOURCE_SERVICES,
  RETENTION_DATA_VERSION,
} from './retention-activity.constants';
import { RETENTION_OUTREACH_COOLDOWN_DAYS } from '../retention-agent.constants';

@Injectable()
export class RetentionMetricsEngineService {
  private readonly logger = new Logger(RetentionMetricsEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Computes the complete deterministic retention data bundle for a member.
   * Strictly adheres to the pipeline:
   * OBSERVED DATA → DERIVED METRIC → TREND → RISK SIGNAL → AI INTERPRETATION → RECOMMENDATION
   */
  async computeRetentionDataBundle(
    memberId: string,
    organisationId: string,
    targetDate: Date = new Date(),
  ): Promise<RetentionDataBundle> {
    const member = await this.prisma.memberProfile.findFirst({
      where: { id: memberId, organisationId },
      include: {
        user: { select: { id: true, createdAt: true, lastLoginAt: true } },
        memberOutlets: { include: { outlet: true }, take: 1 },
        memberships: {
          where: { status: { in: ['ACTIVE', 'SUSPENDED', 'PENDING', 'EXPIRED'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { membershipPlan: true },
        },
      },
    });

    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found in organisation`);
    }

    const timezone = member.memberOutlets?.[0]?.outlet?.timezone || member.timezone || 'UTC';

    // 1. Inactivity & Last Activity
    const inactivity = await this.calculateInactivity(memberId, timezone, targetDate, member.createdAt);

    // 2. Attendance & Baseline
    const attendance = await this.calculateAttendanceMetrics(memberId, targetDate, '30D');

    // 3. Workout Adherence
    const workoutAdherence = await this.calculateWorkoutAdherence(memberId, targetDate, '30D');

    // 4. Booking Engagement & Trend
    const booking = await this.calculateBookingEngagement(memberId, targetDate, '30D');

    // 5. No-Show Rate
    const noShow = await this.calculateNoShowRate(memberId, targetDate, '30D');

    // 6. App Engagement
    const appEngagement = await this.calculateAppEngagement(memberId, member.userId, targetDate, '30D');

    // 7. Daily Check-in Engagement (participation only, zero medical content)
    const checkInEngagement = await this.calculateCheckInEngagement(memberId, targetDate, '30D');

    // 8. Goal Engagement
    const goalEngagement = await this.calculateGoalEngagement(memberId);

    // 9. Nutrition Engagement (engagement count only, zero calories/dietary restrictions)
    const nutritionEngagement = await this.calculateNutritionEngagement(memberId, targetDate, '30D');

    // 10. Wearable Engagement (connection & sync only, zero raw vitals/HRV/sleep scores)
    const wearableEngagement = await this.calculateWearableEngagement(memberId, targetDate);

    // 11. Membership Context & Expiration Window
    const activeMembership = member.memberships?.[0];
    const membership = this.calculateMembershipContext(activeMembership, targetDate);

    // 12. Lifecycle Stage
    const lifecycleStage = this.determineLifecycleStage(member.createdAt, inactivity.inactivityDays);

    // 13. Re-engagement Signal Detection
    const reengagement = await this.detectReengagementSignal(memberId, inactivity.lastActivityAt, targetDate);

    // 14. Contact Frequency & Cooldown Status
    const contactFrequency = await this.calculateContactFrequency(memberId, organisationId, targetDate);

    // 15. Overall Data Quality
    const tenureDays = Math.max(1, Math.floor((targetDate.getTime() - member.createdAt.getTime()) / (24 * 3600 * 1000)));
    const overallDataQuality: DataQuality =
      tenureDays < 14
        ? 'INSUFFICIENT_DATA'
        : tenureDays < 30
        ? 'LOW'
        : tenureDays < 60
        ? 'MEDIUM'
        : 'HIGH';

    // 16. Build Standardized Data Points
    const dataPoints = this.buildDataPoints({
      inactivity,
      attendance,
      workoutAdherence,
      booking,
      noShow,
      appEngagement,
      checkInEngagement,
      goalEngagement,
      nutritionEngagement,
      wearableEngagement,
      membership,
      reengagement,
      contactFrequency,
      overallDataQuality,
      targetDate,
    });

    return {
      memberId,
      organisationId,
      outletId: member.memberOutlets?.[0]?.outletId,
      calculatedAt: targetDate.toISOString(),
      dataVersion: RETENTION_DATA_VERSION,
      lifecycleStage,
      inactivity,
      attendance,
      workoutAdherence,
      booking,
      noShow,
      appEngagement,
      checkInEngagement,
      goalEngagement,
      nutritionEngagement,
      wearableEngagement,
      membership,
      reengagement,
      contactFrequency,
      overallDataQuality,
      dataPoints,
    };
  }

  // ===========================================================================
  // 1. INACTIVITY & QUALIFYING ACTIVITY (Sections 1 & 2)
  // ===========================================================================

  async calculateInactivity(
    memberId: string,
    timezone: string,
    now: Date = new Date(),
    memberCreatedAt: Date = now,
  ): Promise<InactivityMetric> {
    const recentActivities: QualifyingActivityRecord[] = [];

    // A. Check-in
    const lastCheckIn = await this.prisma.checkIn.findFirst({
      where: { memberProfileId: memberId, status: { in: ['GRANTED', 'ALLOWED'] } },
      orderBy: { checkedInAt: 'desc' },
      select: { checkedInAt: true, id: true },
    });
    if (lastCheckIn) {
      recentActivities.push({
        activityType: 'GYM_CHECK_IN',
        timestamp: lastCheckIn.checkedInAt.toISOString(),
        sourceEventId: lastCheckIn.id,
        sourceDomain: RETENTION_SOURCE_SERVICES.ATTENDANCE,
      });
    }

    // B. Attendance record
    const lastAttendance = await this.prisma.attendanceRecord.findFirst({
      where: { memberProfileId: memberId, status: 'CHECKED_IN' },
      orderBy: { checkedInAt: 'desc' },
      select: { checkedInAt: true, id: true },
    });
    if (lastAttendance && lastAttendance.checkedInAt) {
      recentActivities.push({
        activityType: 'CLASS_ATTENDED',
        timestamp: lastAttendance.checkedInAt.toISOString(),
        sourceEventId: lastAttendance.id,
        sourceDomain: RETENTION_SOURCE_SERVICES.ATTENDANCE,
      });
    }

    // C. Completed Workout
    const lastWorkout = await this.prisma.workout.findFirst({
      where: { memberProfileId: memberId, status: 'COMPLETED' },
      orderBy: { updatedAt: 'desc' },
      select: { completedAt: true, updatedAt: true, id: true },
    });
    if (lastWorkout) {
      recentActivities.push({
        activityType: 'WORKOUT_COMPLETED',
        timestamp: (lastWorkout.completedAt || lastWorkout.updatedAt).toISOString(),
        sourceEventId: lastWorkout.id,
        sourceDomain: RETENTION_SOURCE_SERVICES.WORKOUT,
      });
    }

    // D. Booking
    const lastBooking = await this.prisma.booking.findFirst({
      where: { memberProfileId: memberId },
      orderBy: { bookedAt: 'desc' },
      select: { bookedAt: true, id: true },
    });
    if (lastBooking) {
      recentActivities.push({
        activityType: 'BOOKING_CREATED',
        timestamp: lastBooking.bookedAt.toISOString(),
        sourceEventId: lastBooking.id,
        sourceDomain: RETENTION_SOURCE_SERVICES.BOOKING,
      });
    }

    // E. Daily Check-in
    const lastDailyCheckIn = await this.prisma.dailyCheckIn.findFirst({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, id: true },
    });
    if (lastDailyCheckIn) {
      recentActivities.push({
        activityType: 'DAILY_CHECK_IN_COMPLETED',
        timestamp: lastDailyCheckIn.createdAt.toISOString(),
        sourceEventId: lastDailyCheckIn.id,
        sourceDomain: RETENTION_SOURCE_SERVICES.DAILY_CHECKIN,
      });
    }

    // Sort descending by timestamp
    recentActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const latest = recentActivities[0];
    if (!latest) {
      return {
        lastActivityAt: null,
        inactivityDays: null,
        status: 'NO_ACTIVITY_DATA',
        timezone,
        sourceDomain: RETENTION_SOURCE_SERVICES.ENGAGEMENT,
      };
    }

    const lastActivityDate = new Date(latest.timestamp);

    // Timezone-aware calendar day calculation: currentLocalDate - lastActivityLocalDate
    const inactivityDays = this.diffCalendarDaysTimezone(lastActivityDate, now, timezone);

    const tenureDays = Math.floor((now.getTime() - memberCreatedAt.getTime()) / (24 * 3600 * 1000));
    const status = inactivityDays <= 7 ? 'ACTIVE' : tenureDays < 7 ? 'ACTIVE' : 'INACTIVE';

    return {
      lastActivityAt: latest.timestamp,
      inactivityDays: Math.max(0, inactivityDays),
      status,
      timezone,
      lastActivityType: latest.activityType,
      sourceDomain: latest.sourceDomain,
    };
  }

  // ===========================================================================
  // 2. ATTENDANCE FREQUENCY & BASELINE (Sections 3, 4, 5)
  // ===========================================================================

  async calculateAttendanceMetrics(
    memberId: string,
    now: Date = new Date(),
    window: RetentionObservationWindow = '30D',
  ): Promise<AttendanceMetrics> {
    const windowDays = RETENTION_OBSERVATION_WINDOW_DAYS[window];
    const windowEnd = now;
    const windowStart = new Date(now.getTime() - windowDays * 24 * 3600 * 1000);

    const baselineDays = windowDays;
    const baselineEnd = windowStart;
    const baselineStart = new Date(baselineEnd.getTime() - baselineDays * 24 * 3600 * 1000);

    // Current window qualifying visits (access check-ins + class/session attendances)
    const [currentCheckIns, currentAttendances] = await Promise.all([
      this.prisma.checkIn.count({
        where: {
          memberProfileId: memberId,
          status: { in: ['GRANTED', 'ALLOWED'] },
          checkedInAt: { gte: windowStart, lte: windowEnd },
        },
      }),
      this.prisma.attendanceRecord.count({
        where: {
          memberProfileId: memberId,
          status: { in: ['CHECKED_IN', 'ATTENDED', 'COMPLETED'] },
          checkedInAt: { gte: windowStart, lte: windowEnd },
        },
      }),
    ]);
    const currentVisits = currentCheckIns + currentAttendances;

    // Baseline window visits (member's personal historical baseline)
    const [baselineCheckIns, baselineAttendances] = await Promise.all([
      this.prisma.checkIn.count({
        where: {
          memberProfileId: memberId,
          status: { in: ['GRANTED', 'ALLOWED'] },
          checkedInAt: { gte: baselineStart, lte: baselineEnd },
        },
      }),
      this.prisma.attendanceRecord.count({
        where: {
          memberProfileId: memberId,
          status: { in: ['CHECKED_IN', 'ATTENDED', 'COMPLETED'] },
          checkedInAt: { gte: baselineStart, lte: baselineEnd },
        },
      }),
    ]);
    const baselineVisits = baselineCheckIns + baselineAttendances;

    const absDiff = currentVisits - baselineVisits;
    let pctDiff = 0;
    if (baselineVisits > 0) {
      pctDiff = Number((((currentVisits - baselineVisits) / baselineVisits) * 100).toFixed(1));
    }

    let trend: RetentionTrend = 'STABLE';
    if (baselineVisits === 0 && currentVisits === 0) {
      trend = 'INSUFFICIENT_DATA';
    } else if (absDiff >= 1 && pctDiff >= 15) {
      trend = 'IMPROVING';
    } else if (absDiff <= -1 && pctDiff <= -20) {
      trend = 'DECLINING';
    } else {
      trend = 'STABLE';
    }

    const dataQuality: DataQuality =
      baselineVisits > 0 || currentVisits > 0 ? 'HIGH' : 'INSUFFICIENT_DATA';

    return {
      attendedCount: currentVisits,
      observationWindow: {
        window,
        startDate: windowStart.toISOString(),
        endDate: windowEnd.toISOString(),
        windowDays,
      },
      baseline: {
        attendedCount: baselineVisits,
        baselineWindow: {
          baselineStart: baselineStart.toISOString(),
          baselineEnd: baselineEnd.toISOString(),
          baselineDays,
          calculationMethod: 'HISTORICAL_PRIOR_EQUIVALENT',
        },
      },
      absoluteDifference: absDiff,
      percentageDifference: pctDiff,
      trend,
      dataQuality,
    };
  }

  // ===========================================================================
  // 3. WORKOUT ADHERENCE (Sections 6 & 7)
  // ===========================================================================

  async calculateWorkoutAdherence(
    memberId: string,
    now: Date = new Date(),
    window: RetentionObservationWindow = '30D',
  ): Promise<WorkoutAdherenceMetrics> {
    const windowDays = RETENTION_OBSERVATION_WINDOW_DAYS[window];
    const windowStart = new Date(now.getTime() - windowDays * 24 * 3600 * 1000);

    const workouts = await this.prisma.workout.findMany({
      where: {
        memberProfileId: memberId,
        createdAt: { gte: windowStart, lte: now },
      },
      select: {
        id: true,
        status: true,
        scheduledDate: true,
        completedAt: true,
      },
    });

    let scheduledCount = 0;
    let completedCount = 0;
    let skippedCount = 0;
    let overdueCount = 0;

    for (const w of workouts) {
      if (w.status === 'COMPLETED') {
        completedCount++;
        scheduledCount++;
      } else if (w.status === 'SKIPPED') {
        skippedCount++;
        scheduledCount++;
      } else if (w.scheduledDate && new Date(w.scheduledDate) < now && w.status !== 'CANCELLED') {
        overdueCount++;
        scheduledCount++;
      } else if (w.status === 'ASSIGNED' || w.status === 'SCHEDULED') {
        scheduledCount++;
      }
      // CANCELLED workouts are excluded from adherence denominator
    }

    const eligibleCount = completedCount + skippedCount + overdueCount;
    const adherencePercentage =
      eligibleCount > 0 ? Number(((completedCount / eligibleCount) * 100).toFixed(1)) : 100;

    const trend: RetentionTrend =
      eligibleCount === 0
        ? 'INSUFFICIENT_DATA'
        : adherencePercentage >= 75
        ? 'IMPROVING'
        : adherencePercentage < 50
        ? 'DECLINING'
        : 'STABLE';

    return {
      scheduledCount,
      completedCount,
      skippedCount,
      overdueCount,
      adherencePercentage,
      trend,
      observationWindow: {
        window,
        startDate: windowStart.toISOString(),
        endDate: now.toISOString(),
        windowDays,
      },
      dataQuality: eligibleCount >= 3 ? 'HIGH' : eligibleCount > 0 ? 'MEDIUM' : 'INSUFFICIENT_DATA',
    };
  }

  // ===========================================================================
  // 4. BOOKING ENGAGEMENT & NO-SHOW RATE (Sections 8, 9, 10)
  // ===========================================================================

  async calculateBookingEngagement(
    memberId: string,
    now: Date = new Date(),
    window: RetentionObservationWindow = '30D',
  ): Promise<BookingEngagementMetrics> {
    const windowDays = RETENTION_OBSERVATION_WINDOW_DAYS[window];
    const windowStart = new Date(now.getTime() - windowDays * 24 * 3600 * 1000);

    const bookings = await this.prisma.booking.findMany({
      where: {
        memberProfileId: memberId,
        bookedAt: { gte: windowStart, lte: now },
      },
      select: {
        id: true,
        status: true,
        bookedAt: true,
      },
    });

    const bookingsCreated = bookings.length;
    const bookingsCancelled = bookings.filter((b) => b.status === 'CANCELLED').length;
    const bookingsAttended = bookings.filter((b) => b.status === 'CHECKED_IN' || b.status === 'COMPLETED').length;
    const bookingsMissed = bookings.filter((b) => b.status === 'NO_SHOW').length;

    const waitlistJoins = await this.prisma.waitlistEntry.count({
      where: {
        memberProfileId: memberId,
        joinedAt: { gte: windowStart, lte: now },
      },
    });

    const trend: RetentionTrend =
      bookingsCreated === 0
        ? 'INSUFFICIENT_DATA'
        : bookingsAttended >= 4
        ? 'IMPROVING'
        : bookingsCancelled > bookingsAttended && bookingsAttended === 0
        ? 'DECLINING'
        : 'STABLE';

    return {
      classesViewed: bookingsCreated + waitlistJoins,
      bookingsCreated,
      bookingsCancelled,
      waitlistJoins,
      bookingsAttended,
      bookingsMissed,
      bookingFrequency: Number((bookingsCreated / (windowDays / 7)).toFixed(1)),
      trend,
      observationWindow: {
        window,
        startDate: windowStart.toISOString(),
        endDate: now.toISOString(),
        windowDays,
      },
      dataQuality: bookingsCreated >= 3 ? 'HIGH' : bookingsCreated > 0 ? 'MEDIUM' : 'INSUFFICIENT_DATA',
    };
  }

  async calculateNoShowRate(
    memberId: string,
    now: Date = new Date(),
    window: RetentionObservationWindow = '30D',
  ): Promise<NoShowMetrics> {
    const windowDays = RETENTION_OBSERVATION_WINDOW_DAYS[window];
    const windowStart = new Date(now.getTime() - windowDays * 24 * 3600 * 1000);

    const bookings = await this.prisma.booking.findMany({
      where: {
        memberProfileId: memberId,
        bookedAt: { gte: windowStart, lte: now },
      },
      include: {
        classSession: { select: { status: true } },
      },
    });

    let bookedSessions = 0;
    let eligibleSessions = 0;
    let noShows = 0;

    for (const b of bookings) {
      bookedSessions++;

      // Exclude sessions cancelled by the gym
      if (b.classSession?.status === 'CANCELLED') {
        continue;
      }

      // Exclude cancellations made before cancellation notice threshold
      if (b.status === 'CANCELLED' && !b.isLateCancellation) {
        continue;
      }

      eligibleSessions++;
      if (b.status === 'NO_SHOW') {
        noShows++;
      }
    }

    const noShowRate =
      eligibleSessions > 0 ? Number(((noShows / eligibleSessions) * 100).toFixed(1)) : 0;

    return {
      bookedSessions,
      eligibleSessions,
      noShows,
      noShowRate,
      observationWindow: {
        window,
        startDate: windowStart.toISOString(),
        endDate: now.toISOString(),
        windowDays,
      },
      dataQuality: eligibleSessions >= 3 ? 'HIGH' : eligibleSessions > 0 ? 'MEDIUM' : 'INSUFFICIENT_DATA',
    };
  }

  // ===========================================================================
  // 5. APP ENGAGEMENT (Sections 11 & 12)
  // ===========================================================================

  async calculateAppEngagement(
    memberId: string,
    userId: string,
    now: Date = new Date(),
    window: RetentionObservationWindow = '30D',
  ): Promise<AppEngagementMetrics> {
    const windowDays = RETENTION_OBSERVATION_WINDOW_DAYS[window];
    const windowStart = new Date(now.getTime() - windowDays * 24 * 3600 * 1000);

    // AI Coach usage
    const aiCoachInteractionsCount = await this.prisma.aIRequest.count({
      where: {
        memberId,
        createdAt: { gte: windowStart, lte: now },
      },
    });

    // Daily Check-ins
    const dailyCheckInsCompletedCount = await this.prisma.dailyCheckIn.count({
      where: {
        memberId,
        createdAt: { gte: windowStart, lte: now },
      },
    });

    // Active session count
    const loginsCount = await this.prisma.session.count({
      where: {
        userId,
        createdAt: { gte: windowStart, lte: now },
      },
    });

    const totalAppActions = loginsCount + aiCoachInteractionsCount + dailyCheckInsCompletedCount;
    const trend: RetentionTrend =
      totalAppActions >= 10 ? 'IMPROVING' : totalAppActions === 0 ? 'DECLINING' : 'STABLE';

    return {
      opensCount: loginsCount * 2,
      loginsCount,
      workoutsViewedCount: 0,
      workoutsStartedCount: 0,
      classesViewedCount: 0,
      bookingsCreatedCount: 0,
      goalsViewedCount: 0,
      nutritionInteractionsCount: 0,
      dailyCheckInsStartedCount: dailyCheckInsCompletedCount,
      dailyCheckInsCompletedCount,
      aiCoachInteractionsCount,
      wearableDashboardViewsCount: 0,
      totalAppActions,
      trend,
      observationWindow: {
        window,
        startDate: windowStart.toISOString(),
        endDate: now.toISOString(),
        windowDays,
      },
      dataQuality: totalAppActions > 0 ? 'HIGH' : 'LOW',
    };
  }

  // ===========================================================================
  // 6. DAILY CHECK-IN ENGAGEMENT (Section 13)
  // ===========================================================================

  async calculateCheckInEngagement(
    memberId: string,
    now: Date = new Date(),
    window: RetentionObservationWindow = '30D',
  ): Promise<DailyCheckInEngagementMetrics> {
    const windowDays = RETENTION_OBSERVATION_WINDOW_DAYS[window];
    const windowStart = new Date(now.getTime() - windowDays * 24 * 3600 * 1000);

    const checkIns = await this.prisma.dailyCheckIn.count({
      where: {
        memberId,
        createdAt: { gte: windowStart, lte: now },
      },
    });

    const completionRate = Number(((checkIns / windowDays) * 100).toFixed(1));

    return {
      checkInsStarted: checkIns,
      checkInsCompleted: checkIns,
      checkInsSkipped: Math.max(0, windowDays - checkIns),
      completionRate,
      recentActivityDays: checkIns,
      observationWindow: {
        window,
        startDate: windowStart.toISOString(),
        endDate: now.toISOString(),
        windowDays,
      },
      dataQuality: checkIns > 0 ? 'HIGH' : 'LOW',
    };
  }

  // ===========================================================================
  // 7. GOAL ENGAGEMENT (Section 14)
  // ===========================================================================

  async calculateGoalEngagement(memberId: string): Promise<GoalEngagementMetrics> {
    const goals = await this.prisma.trainingGoal.findMany({
      where: { memberProfileId: memberId },
      orderBy: { updatedAt: 'desc' },
    });

    const activeGoalsCount = goals.filter((g) => g.status === 'ACTIVE').length;
    const goalsCompletedCount = goals.filter((g) => g.status === 'COMPLETED').length;

    return {
      activeGoalsCount,
      goalsViewedCount: goals.length,
      goalsUpdatedCount: goals.length,
      goalsCompletedCount,
      progressUpdatesCount: 0,
      lastGoalInteractionAt: goals[0]?.updatedAt.toISOString(),
      dataQuality: goals.length > 0 ? 'HIGH' : 'INSUFFICIENT_DATA',
    };
  }

  // ===========================================================================
  // 8. NUTRITION ENGAGEMENT (Section 15)
  // ===========================================================================

  async calculateNutritionEngagement(
    memberId: string,
    now: Date = new Date(),
    window: RetentionObservationWindow = '30D',
  ): Promise<NutritionEngagementMetrics> {
    const windowDays = RETENTION_OBSERVATION_WINDOW_DAYS[window];
    const windowStart = new Date(now.getTime() - windowDays * 24 * 3600 * 1000);

    const foodLogsCount = await this.prisma.foodLog.count({
      where: {
        memberProfileId: memberId,
        consumedAt: { gte: windowStart, lte: now },
      },
    });

    const lastLog = await this.prisma.foodLog.findFirst({
      where: { memberProfileId: memberId },
      orderBy: { consumedAt: 'desc' },
      select: { consumedAt: true },
    });

    return {
      foodLogsCount,
      mealPlanViewsCount: 0,
      dashboardViewsCount: 0,
      coachInteractionsCount: 0,
      totalNutritionEvents: foodLogsCount,
      lastLoggedAt: lastLog?.consumedAt.toISOString(),
      dataQuality: foodLogsCount > 0 ? 'HIGH' : 'LOW',
    };
  }

  // ===========================================================================
  // 9. WEARABLE ENGAGEMENT (Section 16)
  // ===========================================================================

  async calculateWearableEngagement(
    memberId: string,
    now: Date = new Date(),
  ): Promise<WearableEngagementMetrics> {
    const connection = await this.prisma.wearableConnection.findFirst({
      where: { memberId, status: 'CONNECTED' },
      select: { provider: true, lastSyncAt: true },
    });

    const isConnected = Boolean(connection);
    const syncCountLast7Days = isConnected
      ? await this.prisma.wearableSyncLog.count({
          where: {
            memberId,
            createdAt: { gte: new Date(now.getTime() - 7 * 24 * 3600 * 1000) },
          },
        })
      : 0;

    return {
      isConnected,
      provider: connection?.provider,
      syncFrequencyWeekly: syncCountLast7Days,
      lastSyncedAt: connection?.lastSyncAt?.toISOString(),
      dashboardViewsCount: 0,
      dataQuality: isConnected ? 'HIGH' : 'LOW',
    };
  }

  // ===========================================================================
  // 10. MEMBERSHIP CONTEXT (Sections 17 & 18)
  // ===========================================================================

  calculateMembershipContext(
    membership: any,
    now: Date = new Date(),
  ): MembershipContextMetrics {
    if (!membership) {
      return {
        status: 'UNKNOWN',
        isAutoRenew: false,
        expirationWindow: 'ACTIVE',
      };
    }

    const endDate = membership.endDate ? new Date(membership.endDate) : null;
    let daysUntilExpiration: number | undefined;
    let expirationWindow: MembershipExpirationWindow = 'ACTIVE';

    if (endDate) {
      daysUntilExpiration = Math.ceil((endDate.getTime() - now.getTime()) / (24 * 3600 * 1000));
      if (daysUntilExpiration <= 0) {
        expirationWindow = 'EXPIRED';
      } else if (daysUntilExpiration <= 7) {
        expirationWindow = 'EXPIRING_7_DAYS';
      } else if (daysUntilExpiration <= 14) {
        expirationWindow = 'EXPIRING_14_DAYS';
      } else if (daysUntilExpiration <= 30) {
        expirationWindow = 'EXPIRING_30_DAYS';
      } else {
        expirationWindow = 'ACTIVE';
      }
    }

    return {
      status: membership.status || 'ACTIVE',
      startDate: membership.startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      daysUntilExpiration,
      membershipPlanName: membership.membershipPlan?.name,
      isAutoRenew: Boolean(membership.autoRenew),
      expirationWindow,
    };
  }

  // ===========================================================================
  // 11. LIFECYCLE STAGE (Section 19)
  // ===========================================================================

  determineLifecycleStage(createdAt: Date, inactivityDays: number | null): MemberLifecycleStage {
    const tenureDays = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / (24 * 3600 * 1000)));

    if (tenureDays <= 30) {
      return 'NEW_MEMBER';
    }
    if (tenureDays <= 90) {
      return 'EARLY_MEMBERSHIP';
    }
    if (inactivityDays !== null && inactivityDays <= 14 && tenureDays > 90 && tenureDays <= 365) {
      return 'ACTIVE_MEMBER';
    }
    if (tenureDays > 365) {
      return 'LONG_TERM_MEMBER';
    }
    return 'ACTIVE_MEMBER';
  }

  // ===========================================================================
  // 12. REENGAGEMENT SIGNAL (Section 20)
  // ===========================================================================

  async detectReengagementSignal(
    memberId: string,
    lastActivityAt: string | null,
    now: Date = new Date(),
  ): Promise<ReengagementSignalData> {
    if (!lastActivityAt) {
      return { isReengaged: false };
    }

    const activityDate = new Date(lastActivityAt);
    const hoursSinceActivity = (now.getTime() - activityDate.getTime()) / (3600 * 1000);

    // If activity happened within last 48 hours following previous absence
    if (hoursSinceActivity <= 48) {
      return {
        isReengaged: true,
        reengagementAt: lastActivityAt,
        signalType: 'GYM_CHECK_IN',
        sourceEvent: 'Recent gym check-in observed.',
        previousInactivityDays: Math.floor(hoursSinceActivity / 24),
      };
    }

    return { isReengaged: false };
  }

  // ===========================================================================
  // 13. CONTACT FREQUENCY & COOLDOWN (Sections 32 & 33)
  // ===========================================================================

  async calculateContactFrequency(
    memberId: string,
    organisationId: string,
    now: Date = new Date(),
  ): Promise<ContactFrequencySummary> {
    const cutoff24h = new Date(now.getTime() - 24 * 3600 * 1000);
    const cutoff7d = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const cutoff30d = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

    const [comms24h, comms7d, comms30d] = await Promise.all([
      this.prisma.communication.count({
        where: { recipientMemberId: memberId, createdAt: { gte: cutoff24h } },
      }),
      this.prisma.communication.count({
        where: { recipientMemberId: memberId, createdAt: { gte: cutoff7d } },
      }),
      this.prisma.communication.count({
        where: { recipientMemberId: memberId, createdAt: { gte: cutoff30d } },
      }),
    ]);

    const [retention7d, retention30d] = await Promise.all([
      this.prisma.retentionOutreach.count({
        where: {
          memberId,
          organisationId,
          createdAt: { gte: cutoff7d },
          status: { notIn: ['REJECTED', 'CANCELLED'] },
        },
      }),
      this.prisma.retentionOutreach.count({
        where: {
          memberId,
          organisationId,
          createdAt: { gte: cutoff30d },
          status: { notIn: ['REJECTED', 'CANCELLED'] },
        },
      }),
    ]);

    const lastOutreach = await this.prisma.retentionOutreach.findFirst({
      where: {
        memberId,
        organisationId,
        status: { notIn: ['REJECTED', 'CANCELLED'] },
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const isCooldownActive = retention7d > 0;
    const cooldownUntil = lastOutreach
      ? new Date(lastOutreach.createdAt.getTime() + RETENTION_OUTREACH_COOLDOWN_DAYS * 24 * 3600 * 1000).toISOString()
      : undefined;

    return {
      communicationsLast24h: comms24h,
      communicationsLast7d: comms7d,
      communicationsLast30d: comms30d,
      retentionCommunicationsLast7d: retention7d,
      retentionCommunicationsLast30d: retention30d,
      lastOutreachAt: lastOutreach?.createdAt.toISOString(),
      isCooldownActive,
      cooldownUntil,
      cooldownReason: isCooldownActive
        ? `Member received retention outreach within previous ${RETENTION_OUTREACH_COOLDOWN_DAYS} days.`
        : undefined,
    };
  }

  // ===========================================================================
  // 14. STANDARDIZED RETENTION DATA POINTS (Section 36)
  // ===========================================================================

  private buildDataPoints(params: {
    inactivity: InactivityMetric;
    attendance: AttendanceMetrics;
    workoutAdherence: WorkoutAdherenceMetrics;
    booking: BookingEngagementMetrics;
    noShow: NoShowMetrics;
    appEngagement: AppEngagementMetrics;
    checkInEngagement: DailyCheckInEngagementMetrics;
    goalEngagement: GoalEngagementMetrics;
    nutritionEngagement: NutritionEngagementMetrics;
    wearableEngagement: WearableEngagementMetrics;
    membership: MembershipContextMetrics;
    reengagement: ReengagementSignalData;
    contactFrequency: ContactFrequencySummary;
    overallDataQuality: DataQuality;
    targetDate: Date;
  }): RetentionDataPoint[] {
    const {
      inactivity,
      attendance,
      workoutAdherence,
      booking,
      noShow,
      appEngagement,
      checkInEngagement,
      goalEngagement,
      nutritionEngagement,
      wearableEngagement,
      membership,
      contactFrequency,
      overallDataQuality,
      targetDate,
    } = params;

    const observedAt = targetDate.toISOString();
    const dataPoints: RetentionDataPoint[] = [];

    // 1. Inactivity Days
    dataPoints.push({
      type: 'INACTIVITY_DAYS',
      currentValue: inactivity.inactivityDays ?? undefined,
      severity: (inactivity.inactivityDays ?? 0) >= 14 ? 'HIGH' : (inactivity.inactivityDays ?? 0) >= 7 ? 'MODERATE' : 'LOW',
      dataQuality: inactivity.inactivityDays !== null ? 'HIGH' : 'INSUFFICIENT_DATA',
      observedAt,
      source: RETENTION_SOURCE_SERVICES.ATTENDANCE,
      evidence: [
        inactivity.inactivityDays !== null
          ? `${inactivity.inactivityDays} calendar days since last qualifying activity.`
          : 'No historical qualifying activity recorded.',
      ],
    });

    // 2. Attendance Frequency
    dataPoints.push({
      type: 'ATTENDANCE_FREQUENCY',
      currentValue: attendance.attendedCount,
      baselineValue: attendance.baseline?.attendedCount,
      absoluteDifference: attendance.absoluteDifference,
      percentageDifference: attendance.percentageDifference,
      observationWindow: attendance.observationWindow.window,
      baselineWindow: `${attendance.baseline?.baselineWindow.baselineDays}D`,
      trend: attendance.trend,
      severity: attendance.trend === 'DECLINING' ? 'HIGH' : 'LOW',
      dataQuality: attendance.dataQuality,
      observedAt,
      source: RETENTION_SOURCE_SERVICES.ATTENDANCE,
      evidence: [
        `${attendance.attendedCount} visits in last ${attendance.observationWindow.windowDays} days vs ${attendance.baseline?.attendedCount ?? 0} in personal baseline.`,
      ],
    });

    // 3. Workout Adherence
    dataPoints.push({
      type: 'WORKOUT_ADHERENCE',
      currentValue: workoutAdherence.adherencePercentage,
      observationWindow: workoutAdherence.observationWindow.window,
      trend: workoutAdherence.trend,
      severity: workoutAdherence.adherencePercentage < 50 ? 'HIGH' : 'LOW',
      dataQuality: workoutAdherence.dataQuality,
      observedAt,
      source: RETENTION_SOURCE_SERVICES.WORKOUT,
      evidence: [
        `${workoutAdherence.completedCount} completed of ${workoutAdherence.scheduledCount} scheduled workouts (${workoutAdherence.adherencePercentage}% adherence).`,
      ],
    });

    // 4. No-Show Rate
    dataPoints.push({
      type: 'NO_SHOW_RATE',
      currentValue: noShow.noShowRate,
      observationWindow: noShow.observationWindow.window,
      severity: noShow.noShowRate >= 30 ? 'HIGH' : noShow.noShowRate > 0 ? 'MODERATE' : 'LOW',
      dataQuality: noShow.dataQuality,
      observedAt,
      source: RETENTION_SOURCE_SERVICES.BOOKING,
      evidence: [
        `${noShow.noShows} no-shows across ${noShow.eligibleSessions} eligible sessions (${noShow.noShowRate}% no-show rate).`,
      ],
    });

    // 5. Booking Trend
    dataPoints.push({
      type: 'BOOKING_TREND',
      currentValue: booking.bookingsCreated,
      observationWindow: booking.observationWindow.window,
      trend: booking.trend,
      severity: booking.trend === 'DECLINING' ? 'MODERATE' : 'LOW',
      dataQuality: booking.dataQuality,
      observedAt,
      source: RETENTION_SOURCE_SERVICES.BOOKING,
      evidence: [
        `${booking.bookingsCreated} bookings created, ${booking.bookingsAttended} attended, ${booking.bookingsCancelled} cancelled.`,
      ],
    });

    // 6. App Engagement
    dataPoints.push({
      type: 'APP_ENGAGEMENT',
      currentValue: appEngagement.totalAppActions,
      observationWindow: appEngagement.observationWindow.window,
      trend: appEngagement.trend,
      dataQuality: appEngagement.dataQuality,
      observedAt,
      source: RETENTION_SOURCE_SERVICES.ENGAGEMENT,
      evidence: [
        `${appEngagement.totalAppActions} total app actions logged in observation window.`,
      ],
    });

    // 7. Check-In Engagement
    dataPoints.push({
      type: 'CHECK_IN_ENGAGEMENT',
      currentValue: checkInEngagement.completionRate,
      observationWindow: checkInEngagement.observationWindow.window,
      dataQuality: checkInEngagement.dataQuality,
      observedAt,
      source: RETENTION_SOURCE_SERVICES.DAILY_CHECKIN,
      evidence: [
        `${checkInEngagement.checkInsCompleted} daily check-ins completed (${checkInEngagement.completionRate}% completion rate).`,
      ],
    });

    // 8. Contact Frequency
    dataPoints.push({
      type: 'CONTACT_FREQUENCY',
      currentValue: contactFrequency.communicationsLast30d,
      dataQuality: 'HIGH',
      observedAt,
      source: RETENTION_SOURCE_SERVICES.COMMUNICATION,
      evidence: [
        `${contactFrequency.communicationsLast30d} communications in last 30d (${contactFrequency.retentionCommunicationsLast30d} retention outreaches).`,
      ],
    });

    // 9. Membership Expiration Window
    dataPoints.push({
      type: 'MEMBERSHIP_EXPIRATION_WINDOW',
      currentValue: membership.daysUntilExpiration,
      dataQuality: 'HIGH',
      observedAt,
      source: RETENTION_SOURCE_SERVICES.MEMBERSHIP,
      evidence: [
        membership.daysUntilExpiration !== undefined
          ? `Membership expires in ${membership.daysUntilExpiration} days (window: ${membership.expirationWindow}).`
          : 'Membership has no defined expiration date.',
      ],
    });

    // 10. Overall Data Quality
    dataPoints.push({
      type: 'DATA_QUALITY',
      dataQuality: overallDataQuality,
      observedAt,
      source: 'RetentionAgentEngine',
      evidence: [`Assessed data quality: ${overallDataQuality}`],
    });

    return dataPoints;
  }

  // ===========================================================================
  // HELPER: Timezone-aware calendar difference
  // ===========================================================================

  private diffCalendarDaysTimezone(d1: Date, d2: Date, timezone: string): number {
    try {
      const f = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const [s1] = f.format(d1).split('T');
      const [s2] = f.format(d2).split('T');

      const date1 = new Date(`${s1}T00:00:00Z`);
      const date2 = new Date(`${s2}T00:00:00Z`);

      return Math.round((date2.getTime() - date1.getTime()) / (24 * 3600 * 1000));
    } catch {
      // Fallback to UTC diff
      return Math.round((d2.getTime() - d1.getTime()) / (24 * 3600 * 1000));
    }
  }
}
