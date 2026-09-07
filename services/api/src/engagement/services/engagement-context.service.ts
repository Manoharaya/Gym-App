import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MemberEngagementContext } from '@fitcore/types';

@Injectable()
export class EngagementContextService {
  private readonly logger = new Logger(EngagementContextService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assembles the MemberEngagementContext data contract for future AI services (Slice 37).
   * NOTE: Strictly ZERO LLM or AI invocations on Day 18.
   */
  async buildMemberContext(memberId: string, organisationId: string): Promise<MemberEngagementContext> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      profile,
      recentEvents,
      totalWorkouts,
      lastWorkout,
      weeklyWorkouts,
      totalVisits,
      lastVisit,
      weeklyVisits,
      activeGoals,
      completedGoals,
      totalGoals,
      lastFoodLog,
      weeklyFoodLogs,
      activeChallenges,
      completedChallenges,
      activeHabits,
      recentHabitCompletions,
    ] = await Promise.all([
      this.prisma.memberEngagementProfile.findUnique({ where: { memberId } }),
      this.prisma.engagementEvent.findMany({
        where: { memberId },
        orderBy: { occurredAt: 'desc' },
        take: 10,
      }),
      this.prisma.workout.count({ where: { memberProfileId: memberId, status: 'COMPLETED' } }),
      this.prisma.workout.findFirst({
        where: { memberProfileId: memberId, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        select: { completedAt: true },
      }),
      this.prisma.workout.count({
        where: { memberProfileId: memberId, status: 'COMPLETED', completedAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.checkIn.count({ where: { memberProfileId: memberId, status: { in: ['CHECKED_IN', 'CHECKED_OUT'] } } }),
      this.prisma.checkIn.findFirst({
        where: { memberProfileId: memberId, status: { in: ['CHECKED_IN', 'CHECKED_OUT'] } },
        orderBy: { checkedInAt: 'desc' },
        select: { checkedInAt: true },
      }),
      this.prisma.checkIn.count({
        where: { memberProfileId: memberId, checkedInAt: { gte: sevenDaysAgo }, status: { in: ['CHECKED_IN', 'CHECKED_OUT'] } },
      }),
      this.prisma.trainingGoal.count({ where: { memberProfileId: memberId, status: 'ACTIVE' } }),
      this.prisma.trainingGoal.count({ where: { memberProfileId: memberId, status: 'COMPLETED' } }),
      this.prisma.trainingGoal.count({ where: { memberProfileId: memberId } }),
      this.prisma.foodLog.findFirst({
        where: { memberProfileId: memberId },
        orderBy: { consumedAt: 'desc' },
        select: { consumedAt: true },
      }),
      this.prisma.foodLog.count({
        where: { memberProfileId: memberId, consumedAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.challengeParticipant.count({
        where: { memberId, status: { in: ['JOINED', 'IN_PROGRESS'] } },
      }),
      this.prisma.challengeParticipant.count({
        where: { memberId, status: 'COMPLETED' },
      }),
      this.prisma.memberHabit.count({
        where: { memberId, status: 'ACTIVE' },
      }),
      this.prisma.habitCompletion.count({
        where: {
          memberHabit: { memberId },
          date: { gte: sevenDaysAgo },
          completed: true,
        },
      }),
    ]);

    // Calculate weekly habit completion rate
    const weeklyTargetCompletions = (activeHabits || 1) * 7;
    const habitWeeklyRate = Math.min(100, Math.round((recentHabitCompletions / weeklyTargetCompletions) * 100));

    return {
      memberId,
      organisationId,
      engagementLevel: profile?.engagementLevel || 'NEW',
      engagementScore: profile?.engagementScore || 0,
      currentStreak: profile?.currentStreak || 0,
      longestStreak: profile?.longestStreak || 0,
      recentActivity: recentEvents as any,
      workoutSummary: {
        totalCompleted: totalWorkouts,
        lastWorkoutAt: lastWorkout?.completedAt || null,
        weeklyWorkouts,
      },
      attendanceSummary: {
        totalVisits,
        lastVisitAt: lastVisit?.checkedInAt || null,
        weeklyVisits,
      },
      goalSummary: {
        totalGoals,
        completedGoals,
        activeGoals,
      },
      nutritionSummary: {
        lastLoggedAt: lastFoodLog?.consumedAt || null,
        weeklyLogs: weeklyFoodLogs,
      },
      challengeSummary: {
        activeCount: activeChallenges,
        completedCount: completedChallenges,
      },
      habitSummary: {
        activeCount: activeHabits,
        weeklyCompletionRate: habitWeeklyRate,
      },
    };
  }
}
