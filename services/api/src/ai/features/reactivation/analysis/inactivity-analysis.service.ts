import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import {
  InactivityAnalysisDto,
  ReactivationBarrierItem,
  PersonalBaselineDto,
} from '@fitcore/types';
import { EngagementSignalsBundle } from '../../engagement-intelligence/engagement-intelligence.types';
import { REACTIVATION_THRESHOLDS } from '../reactivation.constants';

export interface MeaningfulActivity {
  type: string;
  weight: number;
  timestamp: Date;
  details?: string;
}

@Injectable()
export class InactivityAnalysisService {
  private readonly logger = new Logger(InactivityAnalysisService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Performs in-depth inactivity analysis across all meaningful member touchpoints.
   */
  async analyzeInactivity(
    memberId: string,
    organisationId: string,
    signals?: EngagementSignalsBundle,
    baseline?: PersonalBaselineDto,
    now: Date = new Date(),
  ): Promise<{
    inactivityAnalysis: InactivityAnalysisDto;
    barriers: ReactivationBarrierItem[];
    mostRecentActivity: MeaningfulActivity | null;
  }> {
    const d90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // 1. Gather all meaningful activities in parallel
    const [
      checkIns,
      attendanceRecords,
      bookings,
      workouts,
      dailyCheckIns,
      goals,
      memberProfile,
    ] = await Promise.all([
      // Check-ins (Turnstile / Gym visits)
      this.prisma.checkIn.findMany({
        where: {
          memberProfileId: memberId,
          organisationId,
          status: 'SUCCESS',
          checkedInAt: { gte: d90Ago, lte: now },
        },
        select: { checkedInAt: true },
        orderBy: { checkedInAt: 'desc' },
      }),
      // Attendance records (Classes or PT)
      this.prisma.attendanceRecord.findMany({
        where: {
          memberProfileId: memberId,
          organisationId,
          status: { in: ['CHECKED_IN', 'COMPLETED', 'WALK_IN'] },
          createdAt: { gte: d90Ago, lte: now },
        },
        select: { checkedInAt: true, createdAt: true, classSessionId: true },
        orderBy: { createdAt: 'desc' },
      }),
      // Bookings
      this.prisma.booking.findMany({
        where: {
          memberProfileId: memberId,
          organisationId,
          createdAt: { gte: d90Ago, lte: now },
        },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: 'desc' },
      }),
      // Workouts
      this.prisma.workout.findMany({
        where: {
          memberProfileId: memberId,
          status: 'COMPLETED',
          completedAt: { gte: d90Ago, lte: now },
        },
        select: { completedAt: true },
        orderBy: { completedAt: 'desc' },
      }),
      // Daily AI Check-Ins
      this.prisma.dailyCheckIn.findMany({
        where: {
          memberId,
          createdAt: { gte: d90Ago, lte: now },
        },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      // Active Goals
      this.prisma.trainingGoal.findMany({
        where: {
          memberProfileId: memberId,
          status: 'ACTIVE',
        },
        select: { updatedAt: true, title: true },
        orderBy: { updatedAt: 'desc' },
      }),
      // Member Profile
      this.prisma.memberProfile.findUnique({
        where: { id: memberId },
        select: { createdAt: true },
      }),
    ]);

    // 2. Build list of weighted meaningful activities
    const activities: MeaningfulActivity[] = [];

    for (const c of checkIns) {
      activities.push({
        type: 'GYM_VISIT',
        weight: 1.0,
        timestamp: c.checkedInAt,
        details: 'Facility check-in',
      });
    }

    for (const a of attendanceRecords) {
      const isClass = Boolean(a.classSessionId);
      activities.push({
        type: isClass ? 'CLASS_ATTENDANCE' : 'PT_SESSION',
        weight: 1.0,
        timestamp: a.checkedInAt || a.createdAt,
        details: isClass ? 'Class attended' : 'PT session attended',
      });
    }

    for (const w of workouts) {
      if (w.completedAt) {
        activities.push({
          type: 'WORKOUT_COMPLETION',
          weight: 0.8,
          timestamp: w.completedAt,
          details: 'Workout completed',
        });
      }
    }

    for (const b of bookings) {
      activities.push({
        type: 'BOOKING',
        weight: 0.6,
        timestamp: b.createdAt,
        details: `Booking created (${b.status})`,
      });
    }

    for (const d of dailyCheckIns) {
      activities.push({
        type: 'DAILY_CHECKIN',
        weight: 0.4,
        timestamp: d.createdAt,
        details: 'Daily AI check-in logged',
      });
    }

    if (signals?.app?.lastAppActivityAt && signals.app.lastAppActivityAt >= d90Ago) {
      activities.push({
        type: 'APP_ACTIVITY',
        weight: 0.2,
        timestamp: signals.app.lastAppActivityAt,
        details: 'Mobile app activity',
      });
    }

    for (const g of goals) {
      if (g.updatedAt >= d90Ago) {
        activities.push({
          type: 'GOAL_ACTIVITY',
          weight: 0.2,
          timestamp: g.updatedAt,
          details: `Goal '${g.title}' updated`,
        });
      }
    }

    // Sort descending by timestamp
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const mostRecent = activities[0] || null;
    let daysInactive = 0;
    let lastActivityDate: Date | null = null;
    let lastActivityType = 'NONE';

    if (mostRecent) {
      lastActivityDate = mostRecent.timestamp;
      lastActivityType = mostRecent.type;
      daysInactive = Math.max(
        0,
        Math.floor((now.getTime() - mostRecent.timestamp.getTime()) / (1000 * 60 * 60 * 24)),
      );
    } else if (memberProfile?.createdAt) {
      lastActivityDate = memberProfile.createdAt;
      lastActivityType = 'ACCOUNT_CREATED';
      daysInactive = Math.max(
        0,
        Math.floor((now.getTime() - memberProfile.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      );
    }

    // 3. Frequency calculations (comparing past 14d vs baseline)
    const baselineWeeklyVisits =
      baseline?.baselineVisitsPerWeek ?? (signals?.attendance?.attendanceFrequencyPerWeek ?? 2.0);

    const d14Ago = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const recentVisitsCount = activities.filter(
      (a) =>
        ['GYM_VISIT', 'CLASS_ATTENDANCE', 'PT_SESSION'].includes(a.type) &&
        a.timestamp >= d14Ago,
    ).length;
    const currentWeeklyFrequency = Number((recentVisitsCount / 2).toFixed(1));

    let frequencyDeclinePct = 0;
    if (baselineWeeklyVisits > 0) {
      const diff = baselineWeeklyVisits - currentWeeklyFrequency;
      frequencyDeclinePct = Math.max(
        0,
        Math.min(100, Math.round((diff / baselineWeeklyVisits) * 100)),
      );
    }

    // 4. Identify negative signals / barriers matching ReactivationBarrierItem
    const barriers: ReactivationBarrierItem[] = [];

    if (daysInactive >= REACTIVATION_THRESHOLDS.MINIMUM_INACTIVITY_DAYS) {
      barriers.push({
        type: daysInactive >= REACTIVATION_THRESHOLDS.HIGH_INACTIVITY_DAYS ? 'LONG_INACTIVITY' : 'NO_ACTIVITY',
        observation: `No meaningful activity recorded for ${daysInactive} days`,
        evidence: [
          `Last recorded activity was ${lastActivityType} on ${
            lastActivityDate ? lastActivityDate.toISOString().split('T')[0] : 'N/A'
          }`,
        ],
      });
    }

    if (frequencyDeclinePct >= REACTIVATION_THRESHOLDS.ENGAGEMENT_DECLINE_THRESHOLD_PCT) {
      barriers.push({
        type: 'ATTENDANCE_DECLINE',
        observation: `Weekly visit frequency fell from baseline ${baselineWeeklyVisits}/wk to ${currentWeeklyFrequency}/wk (${frequencyDeclinePct}% drop)`,
        evidence: [
          `Previous weekly baseline: ${baselineWeeklyVisits}`,
          `Current 14-day average: ${currentWeeklyFrequency}`,
        ],
      });
    }

    if (signals?.booking?.cancellationsLast28d && signals.booking.cancellationsLast28d >= 2) {
      barriers.push({
        type: 'BOOKING_DECLINE',
        observation: `Member cancelled ${signals.booking.cancellationsLast28d} booking(s) in the last 28 days`,
        evidence: [`${signals.booking.cancellationsLast28d} cancellations detected in last 28 days`],
      });
    }

    if (signals?.attendance?.noShowCountLast28d && signals.attendance.noShowCountLast28d > 0) {
      barriers.push({
        type: 'REPEATED_NO_SHOWS',
        observation: `Member recorded ${signals.attendance.noShowCountLast28d} class no-show(s)`,
        evidence: [`${signals.attendance.noShowCountLast28d} missed sessions without check-in`],
      });
    }

    if (goals.length > 0) {
      const d21Ago = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
      const recentGoalUpdate = goals.some((g) => g.updatedAt >= d21Ago);
      if (!recentGoalUpdate) {
        barriers.push({
          type: 'GOAL_DISENGAGEMENT',
          observation: 'Training goals have had no progress or updates in over 21 days',
          evidence: [`${goals.length} active goal(s) currently unupdated`],
        });
      }
    }

    const inactivityAnalysis: InactivityAnalysisDto = {
      daysInactive,
      lastMeaningfulActivityAt: lastActivityDate ? lastActivityDate.toISOString() : null,
      lastMeaningfulActivityType: lastActivityType,
      historicalActivityFrequencyPerWeek: baselineWeeklyVisits,
      recentActivityFrequencyPerWeek: currentWeeklyFrequency,
      baselineActivityVisitsPerWeek: baselineWeeklyVisits,
      activityDropPercent: frequencyDeclinePct,
      previousInactivitySpellsCount: 0,
      longestInactivityDays: daysInactive,
      reactivationHistorySummary: `Inactive for ${daysInactive} days; visit frequency dropped ${frequencyDeclinePct}%.`,
    };

    return {
      inactivityAnalysis,
      barriers,
      mostRecentActivity: mostRecent,
    };
  }
}
