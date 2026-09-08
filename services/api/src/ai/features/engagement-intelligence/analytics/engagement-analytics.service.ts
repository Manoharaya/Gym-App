import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import {
  OrganisationEngagementAnalyticsDto,
  OverallEngagementLevel,
  RetentionRiskLevel,
} from '@fitcore/types';

@Injectable()
export class EngagementAnalyticsService {
  private readonly logger = new Logger(EngagementAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates tenant-isolated aggregate business analytics.
   * STRICT BOUNDARY: Aggregate metrics only; never reveals individual records to unauthorized eyes.
   */
  async getOrganisationAnalytics(
    organisationId: string,
    outletId?: string,
    now: Date = new Date(),
  ): Promise<OrganisationEngagementAnalyticsDto> {
    const d7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d28Ago = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const memberWhere: any = { organisationId };
    if (outletId) {
      memberWhere.memberOutlets = { some: { outletId } };
    }

    const members = await this.prisma.memberProfile.findMany({
      where: memberWhere,
      select: { id: true, status: true },
    });

    const totalMembers = members.length;
    const memberIds = members.map((m) => m.id);

    if (totalMembers === 0) {
      return {
        organisationId,
        outletId,
        timeframe: 'LAST_28_DAYS',
        activeMembers: 0,
        engagedMembers: 0,
        decliningMembers: 0,
        elevatedRiskMembers: 0,
        inactiveMembers: 0,
        reactivatedMembers: 0,
        averageVisitsPerMember: 0,
        averageWorkoutAdherence: 0,
        bookingActivityCount: 0,
        appEngagementScore: 0,
        checkInCompletionRate: 0,
        engagementLevelDistribution: {
          VERY_LOW: 0,
          LOW: 0,
          MODERATE: 0,
          HIGH: 0,
          VERY_HIGH: 0,
          INSUFFICIENT_DATA: 0,
        },
        retentionRiskDistribution: {
          INSUFFICIENT_DATA: 0,
          LOW: 0,
          MODERATE: 0,
          ELEVATED: 0,
          HIGH: 0,
        },
        generatedAt: now.toISOString(),
      };
    }

    // 1. Attendance visits in last 7d and 28d
    const [checkIns28d, attendance28d, workouts28d, bookings28d, appEvents28d] = await Promise.all([
      this.prisma.checkIn.findMany({
        where: { organisationId, memberProfileId: { in: memberIds }, checkedInAt: { gte: d28Ago, lte: now } },
        select: { memberProfileId: true, checkedInAt: true },
      }),
      this.prisma.attendanceRecord.findMany({
        where: { organisationId, memberProfileId: { in: memberIds }, createdAt: { gte: d28Ago, lte: now } },
        select: { memberProfileId: true, createdAt: true },
      }),
      this.prisma.workout.findMany({
        where: { organisationId, memberProfileId: { in: memberIds }, createdAt: { gte: d28Ago, lte: now } },
        select: { memberProfileId: true, status: true },
      }),
      this.prisma.booking.count({
        where: { organisationId, memberProfileId: { in: memberIds }, bookedAt: { gte: d28Ago, lte: now } },
      }),
      this.prisma.engagementEvent.findMany({
        where: { organisationId, memberId: { in: memberIds }, occurredAt: { gte: d28Ago, lte: now } },
        select: { memberId: true, occurredAt: true },
      }),
    ]);

    // Active members (distinct memberIds with activity in 7d or 28d)
    const activeMemberIds7d = new Set<string>();
    const activeMemberIds28d = new Set<string>();

    for (const c of checkIns28d) {
      activeMemberIds28d.add(c.memberProfileId);
      if (c.checkedInAt >= d7Ago) activeMemberIds7d.add(c.memberProfileId);
    }
    for (const a of attendance28d) {
      activeMemberIds28d.add(a.memberProfileId);
      if (a.createdAt >= d7Ago) activeMemberIds7d.add(a.memberProfileId);
    }
    for (const w of workouts28d) {
      activeMemberIds28d.add(w.memberProfileId);
    }
    for (const e of appEvents28d) {
      activeMemberIds28d.add(e.memberId);
      if (e.occurredAt >= d7Ago) activeMemberIds7d.add(e.memberId);
    }

    const weeklyActiveMembers = activeMemberIds7d.size;
    const monthlyActiveMembers = activeMemberIds28d.size;
    const inactiveMembers = Math.max(0, totalMembers - monthlyActiveMembers);

    const totalVisits = checkIns28d.length + attendance28d.length;
    const averageVisitsPerMember = totalMembers > 0 ? Number((totalVisits / totalMembers).toFixed(2)) : 0;

    const completedWorkouts = workouts28d.filter((w) => w.status === 'COMPLETED').length;
    const averageWorkoutAdherence =
      workouts28d.length > 0 ? Math.round((completedWorkouts / workouts28d.length) * 100) : 0;

    // Engagement Level distribution from MemberEngagementProfile table
    const storedProfiles = await this.prisma.memberEngagementProfile.findMany({
      where: { organisationId, memberId: { in: memberIds } },
      select: { engagementLevel: true },
    });

    const engagementLevelDistribution: Record<OverallEngagementLevel, number> = {
      VERY_LOW: 0,
      LOW: 0,
      MODERATE: 0,
      HIGH: 0,
      VERY_HIGH: 0,
      INSUFFICIENT_DATA: 0,
    };

    for (const p of storedProfiles) {
      const level = p.engagementLevel as OverallEngagementLevel;
      if (engagementLevelDistribution[level] !== undefined) {
        engagementLevelDistribution[level]++;
      }
    }
    // Members without profile count as INSUFFICIENT_DATA
    engagementLevelDistribution.INSUFFICIENT_DATA += Math.max(0, totalMembers - storedProfiles.length);

    // Retention risk distribution from EngagementInsight table or derived
    const storedInsights = await this.prisma.engagementInsight.findMany({
      where: { organisationId, memberId: { in: memberIds } },
      select: { retentionRiskLevel: true },
      distinct: ['memberId'],
      orderBy: { createdAt: 'desc' },
    });

    const retentionRiskDistribution: Record<RetentionRiskLevel, number> = {
      INSUFFICIENT_DATA: 0,
      LOW: 0,
      MODERATE: 0,
      ELEVATED: 0,
      HIGH: 0,
    };

    for (const i of storedInsights) {
      const risk = i.retentionRiskLevel as RetentionRiskLevel;
      if (retentionRiskDistribution[risk] !== undefined) {
        retentionRiskDistribution[risk]++;
      }
    }
    retentionRiskDistribution.INSUFFICIENT_DATA += Math.max(0, totalMembers - storedInsights.length);

    const elevatedRiskMembers =
      retentionRiskDistribution.ELEVATED + retentionRiskDistribution.HIGH;
    const engagedMembers =
      engagementLevelDistribution.HIGH + engagementLevelDistribution.VERY_HIGH;
    const decliningMembers =
      engagementLevelDistribution.LOW + engagementLevelDistribution.VERY_LOW;

    return {
      organisationId,
      outletId,
      timeframe: 'LAST_28_DAYS',
      activeMembers: weeklyActiveMembers,
      engagedMembers,
      decliningMembers,
      elevatedRiskMembers,
      inactiveMembers,
      reactivatedMembers: 0,
      averageVisitsPerMember,
      averageWorkoutAdherence,
      bookingActivityCount: bookings28d,
      appEngagementScore: Math.min(100, Math.round((appEvents28d.length / Math.max(1, totalMembers * 4)) * 10)),
      checkInCompletionRate: 0,
      engagementLevelDistribution,
      retentionRiskDistribution,
      generatedAt: now.toISOString(),
    };
  }
}
