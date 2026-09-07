import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QueryAnalyticsDto } from '../dto/engagement.dto';
import { EngagementSegment, EngagementLevel } from '@fitcore/types';

@Injectable()
export class EngagementAnalyticsService {
  private readonly logger = new Logger(EngagementAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Organisation-wide engagement dashboard metrics.
   */
  async getOrganisationDashboard(organisationId: string, query?: QueryAnalyticsDto) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalMembers,
      profiles,
      visitsLast30Days,
      workoutsLast30Days,
      challengeParticipantsCount,
    ] = await Promise.all([
      this.prisma.memberProfile.count({
        where: { organisationId, status: 'ACTIVE' },
      }),
      this.prisma.memberEngagementProfile.findMany({
        where: { organisationId },
        select: { engagementLevel: true, engagementScore: true, currentStreak: true },
      }),
      this.prisma.checkIn.count({
        where: {
          organisationId,
          checkedInAt: { gte: thirtyDaysAgo },
          status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
        },
      }),
      this.prisma.workout.count({
        where: {
          organisationId,
          completedAt: { gte: thirtyDaysAgo },
          status: 'COMPLETED',
        },
      }),
      this.prisma.challengeParticipant.count({
        where: { organisationId },
      }),
    ]);

    let highlyEngagedCount = 0;
    let engagedCount = 0;
    let activeCount = 0;
    let atRiskCount = 0;
    let dormantCount = 0;
    let newCount = 0;
    let totalScore = 0;

    for (const p of profiles) {
      totalScore += p.engagementScore;
      switch (p.engagementLevel) {
        case EngagementLevel.HIGHLY_ENGAGED:
          highlyEngagedCount++;
          break;
        case EngagementLevel.ENGAGED:
          engagedCount++;
          break;
        case EngagementLevel.ACTIVE:
          activeCount++;
          break;
        case EngagementLevel.AT_RISK:
          atRiskCount++;
          break;
        case EngagementLevel.DORMANT:
          dormantCount++;
          break;
        case EngagementLevel.NEW:
          newCount++;
          break;
      }
    }

    const avgEngagementScore = profiles.length > 0 ? Math.round((totalScore / profiles.length) * 10) / 10 : 0;

    return {
      totalMembers,
      trackedProfilesCount: profiles.length,
      averageEngagementScore: avgEngagementScore,
      levelDistribution: {
        highlyEngaged: highlyEngagedCount,
        engaged: engagedCount,
        active: activeCount,
        atRisk: atRiskCount,
        dormant: dormantCount,
        new: newCount,
      },
      activityMetrics30Days: {
        visits: visitsLast30Days,
        workouts: workoutsLast30Days,
        challengeParticipants: challengeParticipantsCount,
      },
    };
  }

  /**
   * Outlet-scoped engagement operational metrics.
   * Respects explicit outlet context.
   */
  async getOutletDashboard(organisationId: string, outletId: string, query?: QueryAnalyticsDto) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      outletMembersCount,
      outletVisits,
      outletWorkouts,
      outletChallengesCount,
    ] = await Promise.all([
      this.prisma.memberOutlet.count({
        where: { outletId, status: 'ACTIVE' },
      }),
      this.prisma.checkIn.count({
        where: {
          outletId,
          checkedInAt: { gte: thirtyDaysAgo },
          status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
        },
      }),
      this.prisma.workout.count({
        where: {
          outletId,
          completedAt: { gte: thirtyDaysAgo },
          status: 'COMPLETED',
        },
      }),
      this.prisma.challenge.count({
        where: { organisationId, outletId },
      }),
    ]);

    return {
      outletId,
      activeMembersAtOutlet: outletMembersCount,
      thirtyDayMetrics: {
        visits: outletVisits,
        workouts: outletWorkouts,
        outletChallenges: outletChallengesCount,
      },
    };
  }

  /**
   * Deterministically assigns members to engagement segments (Slice 36).
   */
  async getMemberSegments(memberId: string, organisationId: string): Promise<EngagementSegment[]> {
    const profile = await this.prisma.memberEngagementProfile.findUnique({
      where: { memberId },
    });

    const segments: EngagementSegment[] = [];
    if (!profile) return [EngagementSegment.NEW_MEMBER];

    if (profile.engagementLevel === EngagementLevel.NEW) {
      segments.push(EngagementSegment.NEW_MEMBER);
    }
    if (profile.engagementLevel === EngagementLevel.HIGHLY_ENGAGED) {
      segments.push(EngagementSegment.HIGHLY_ENGAGED);
    }
    if (profile.engagementLevel === EngagementLevel.ACTIVE) {
      segments.push(EngagementSegment.ACTIVE_MEMBER);
    }
    if (profile.engagementLevel === EngagementLevel.AT_RISK) {
      segments.push(EngagementSegment.AT_RISK);
      segments.push(EngagementSegment.LOW_ACTIVITY);
    }
    if (profile.engagementLevel === EngagementLevel.DORMANT) {
      segments.push(EngagementSegment.DORMANT);
    }

    if (profile.totalWorkouts >= 8) {
      segments.push(EngagementSegment.CONSISTENT_WORKOUT_MEMBER);
    }
    if (profile.totalVisits >= 10) {
      segments.push(EngagementSegment.CONSISTENT_ATTENDANCE_MEMBER);
    }

    const hasChallenge = await this.prisma.challengeParticipant.findFirst({
      where: { memberId, status: { in: ['JOINED', 'IN_PROGRESS', 'COMPLETED'] } },
    });
    if (hasChallenge) {
      segments.push(EngagementSegment.CHALLENGE_PARTICIPANT);
    }

    return segments;
  }
}
