import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { PersonalBaselineDto } from '@fitcore/types';
import {
  ENGAGEMENT_HISTORICAL_BASELINE_DAYS,
  ENGAGEMENT_RECENT_WINDOW_DAYS,
  TREND_SENSITIVITY_THRESHOLD_PCT,
} from '../engagement-intelligence.constants';

@Injectable()
export class MemberEngagementBaselineService {
  private readonly logger = new Logger(MemberEngagementBaselineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compares a member's recent activity strictly against THEIR OWN historical baseline.
   * Prevents false disengagement flags for naturally low-frequency but consistent members.
   */
  async computeBaseline(
    memberId: string,
    organisationId: string,
    now: Date = new Date(),
  ): Promise<PersonalBaselineDto> {
    const historicalDays = ENGAGEMENT_HISTORICAL_BASELINE_DAYS; // 28 days
    const recentDays = ENGAGEMENT_RECENT_WINDOW_DAYS; // 7 days

    const dRecent = new Date(now.getTime() - recentDays * 24 * 60 * 60 * 1000);
    const dHistorical = new Date(now.getTime() - historicalDays * 24 * 60 * 60 * 1000);

    // 1. Attendance visits
    const [checkIns, attendanceRecords] = await Promise.all([
      this.prisma.checkIn.findMany({
        where: {
          memberProfileId: memberId,
          organisationId,
          status: 'SUCCESS',
          checkedInAt: { gte: dHistorical, lte: now },
        },
        select: { checkedInAt: true },
      }),
      this.prisma.attendanceRecord.findMany({
        where: {
          memberProfileId: memberId,
          organisationId,
          status: { in: ['CHECKED_IN', 'COMPLETED', 'WALK_IN'] },
          createdAt: { gte: dHistorical, lte: now },
        },
        select: { checkedInAt: true, createdAt: true },
      }),
    ]);

    const totalHistoricalVisits = Math.max(checkIns.length, attendanceRecords.length);
    const recentVisits = Math.max(
      checkIns.filter((c) => c.checkedInAt >= dRecent).length,
      attendanceRecords.filter((a) => (a.checkedInAt || a.createdAt) >= dRecent).length,
    );

    // Baseline weekly visits vs recent weekly visits
    const baselineVisitsPerWeek = Number((totalHistoricalVisits / (historicalDays / 7)).toFixed(2));
    const recentVisitsPerWeek = recentVisits; // 7 days is 1 week

    // 2. Workouts
    const workouts = await this.prisma.workout.findMany({
      where: {
        memberProfileId: memberId,
        organisationId,
        createdAt: { gte: dHistorical, lte: now },
      },
      select: { status: true, updatedAt: true, createdAt: true },
    });

    const historicalCompleted = workouts.filter((w) => w.status === 'COMPLETED').length;
    const historicalTotal = workouts.length;
    const baselineWorkoutAdherence = historicalTotal > 0 ? Math.round((historicalCompleted / historicalTotal) * 100) : 0;

    const recentWorkouts = workouts.filter((w) => w.createdAt >= dRecent);
    const recentCompleted = recentWorkouts.filter((w) => w.status === 'COMPLETED').length;
    const recentWorkoutAdherence =
      recentWorkouts.length > 0 ? Math.round((recentCompleted / recentWorkouts.length) * 100) : baselineWorkoutAdherence;

    // 3. Bookings
    const bookings = await this.prisma.booking.findMany({
      where: {
        memberProfileId: memberId,
        organisationId,
        bookedAt: { gte: dHistorical, lte: now },
      },
      select: { bookedAt: true },
    });
    const baselineBookingsPerWeek = Number((bookings.length / 4).toFixed(2));
    const recentBookingsPerWeek = bookings.filter((b) => b.bookedAt >= dRecent).length;

    // 4. App Events
    const appEvents = await this.prisma.engagementEvent.findMany({
      where: {
        memberId,
        organisationId,
        occurredAt: { gte: dHistorical, lte: now },
      },
      select: { occurredAt: true },
    });
    const baselineAppEventsPerWeek = Number((appEvents.length / 4).toFixed(2));
    const recentAppEventsPerWeek = appEvents.filter((e) => e.occurredAt >= dRecent).length;

    // 5. Check-ins
    const checkInEntries = await this.prisma.dailyCheckIn.findMany({
      where: {
        memberId,
        organisationId,
        status: 'COMPLETED',
        completedAt: { gte: dHistorical, lte: now },
      },
      select: { completedAt: true },
    });
    const baselineCheckInRate = Math.min(100, Math.round((checkInEntries.length / historicalDays) * 100));
    const recentCheckInCount = checkInEntries.filter((c) => c.completedAt && c.completedAt >= dRecent).length;
    const recentCheckInRate = Math.min(100, Math.round((recentCheckInCount / recentDays) * 100));

    // Check if sufficient history exists
    const totalObservations = totalHistoricalVisits + historicalTotal + bookings.length + appEvents.length;
    const sufficientHistory = totalObservations >= 3;

    // Calculate personal deviation
    let deviationPercent = 0;
    let momentum: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE';

    if (sufficientHistory && baselineVisitsPerWeek > 0) {
      deviationPercent = Math.round(
        ((recentVisitsPerWeek - baselineVisitsPerWeek) / baselineVisitsPerWeek) * 100,
      );

      if (deviationPercent <= -TREND_SENSITIVITY_THRESHOLD_PCT) {
        momentum = 'DECLINING';
      } else if (deviationPercent >= TREND_SENSITIVITY_THRESHOLD_PCT) {
        momentum = 'IMPROVING';
      } else {
        momentum = 'STABLE';
      }
    } else if (sufficientHistory && baselineVisitsPerWeek === 0 && recentVisitsPerWeek > 0) {
      momentum = 'IMPROVING';
      deviationPercent = 100;
    } else if (!sufficientHistory) {
      momentum = 'STABLE';
    }

    const isDeviating = Math.abs(deviationPercent) >= TREND_SENSITIVITY_THRESHOLD_PCT;

    return {
      memberId,
      organisationId,
      historicalWindowDays: historicalDays,
      recentWindowDays: recentDays,
      baselineVisitsPerWeek,
      recentVisitsPerWeek,
      baselineWorkoutAdherence,
      recentWorkoutAdherence,
      baselineBookingsPerWeek,
      recentBookingsPerWeek,
      baselineAppEventsPerWeek,
      recentAppEventsPerWeek,
      baselineCheckInRate,
      recentCheckInRate,
      deviationPercent,
      isDeviating,
      momentum,
      sufficientHistory,
    };
  }
}
