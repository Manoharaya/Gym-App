import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StreakService } from './streak.service';
import { EngagementLevelService } from './engagement-level.service';
import { EngagementScoreService } from './engagement-score.service';
import {
  CreateEngagementEventDto,
  QueryEngagementHistoryDto,
} from '../dto/engagement.dto';
import { EngagementEventType, EngagementSourceType } from '@fitcore/types';

@Injectable()
export class EngagementEventService {
  private readonly logger = new Logger(EngagementEventService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly streakService: StreakService,
    private readonly levelService: EngagementLevelService,
    private readonly scoreService: EngagementScoreService,
  ) {}

  /**
   * Records an immutable engagement event with idempotency and updates derived engagement profile.
   */
  async recordEvent(
    organisationId: string,
    memberId: string,
    dto: CreateEngagementEventDto,
  ) {
    // 1. Idempotency check (Slice 4)
    if (dto.idempotencyKey) {
      const existing = await this.prisma.engagementEvent.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) {
        this.logger.log(`Idempotent duplicate engagement event skipped: ${dto.idempotencyKey}`);
        return existing;
      }
    }

    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();

    // 2. Fetch member to obtain timezone and joined date
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      select: { id: true, timezone: true, createdAt: true, organisationId: true },
    });

    if (!member) {
      throw new Error(`MemberProfile '${memberId}' not found`);
    }

    // 3. Create immutable event
    const event = await this.prisma.engagementEvent.create({
      data: {
        organisationId,
        outletId: dto.outletId,
        memberId,
        eventType: dto.eventType,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        metadata: dto.metadata as any,
        idempotencyKey: dto.idempotencyKey,
        occurredAt,
      },
    });

    // 4. Update derived MemberEngagementProfile (Slice 5)
    await this.updateDerivedProfile(memberId, organisationId, dto.eventType, occurredAt, member.timezone, member.createdAt);

    return event;
  }

  /**
   * Updates derived profile summaries, streaks, scores, and engagement levels.
   */
  async updateDerivedProfile(
    memberId: string,
    organisationId: string,
    eventType: string,
    occurredAt: Date,
    timezone: string = 'UTC',
    memberJoinedAt?: Date,
  ) {
    const isVisit = eventType === EngagementEventType.GYM_CHECKED_IN;
    const isWorkout = eventType === EngagementEventType.WORKOUT_COMPLETED;
    const isClass = eventType === EngagementEventType.CLASS_ATTENDED;
    const isGoal = eventType === EngagementEventType.GOAL_COMPLETED;
    const isNutrition =
      eventType === EngagementEventType.MEAL_LOGGED ||
      eventType === EngagementEventType.NUTRITION_TARGET_REACHED;

    const streakResult = await this.streakService.calculateMemberEngagementStreak(memberId, timezone);
    const scoreResult = await this.scoreService.calculateScore(memberId, organisationId);

    const totalActivities = await this.prisma.engagementEvent.count({
      where: { memberId },
    });

    const level = this.levelService.determineLevel({
      score: scoreResult.score,
      currentStreak: streakResult.currentStreak,
      lastActivityAt: occurredAt,
      memberJoinedAt: memberJoinedAt || new Date(),
      totalActivitiesCount: totalActivities,
    });

    await this.prisma.memberEngagementProfile.upsert({
      where: { memberId },
      create: {
        organisationId,
        memberId,
        engagementLevel: level,
        engagementScore: scoreResult.score,
        currentStreak: streakResult.currentStreak,
        longestStreak: streakResult.longestStreak,
        lastActivityAt: occurredAt,
        lastGymVisitAt: isVisit ? occurredAt : null,
        lastWorkoutAt: isWorkout ? occurredAt : null,
        lastNutritionActivityAt: isNutrition ? occurredAt : null,
        totalVisits: isVisit ? 1 : 0,
        totalWorkouts: isWorkout ? 1 : 0,
        totalCompletedClasses: isClass ? 1 : 0,
        totalCompletedGoals: isGoal ? 1 : 0,
      },
      update: {
        engagementLevel: level,
        engagementScore: scoreResult.score,
        currentStreak: streakResult.currentStreak,
        longestStreak: {
          set: Math.max(streakResult.longestStreak, streakResult.currentStreak),
        },
        lastActivityAt: occurredAt,
        ...(isVisit ? { lastGymVisitAt: occurredAt, totalVisits: { increment: 1 } } : {}),
        ...(isWorkout ? { lastWorkoutAt: occurredAt, totalWorkouts: { increment: 1 } } : {}),
        ...(isClass ? { totalCompletedClasses: { increment: 1 } } : {}),
        ...(isGoal ? { totalCompletedGoals: { increment: 1 } } : {}),
        ...(isNutrition ? { lastNutritionActivityAt: occurredAt } : {}),
      },
    });
  }

  /**
   * Retrieves paginated engagement event history for a member.
   */
  async getMemberEventHistory(
    memberId: string,
    organisationId: string,
    query: QueryEngagementHistoryDto,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      memberId,
      organisationId,
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...(query.sourceType ? { sourceType: query.sourceType } : {}),
      ...(query.startDate || query.endDate
        ? {
            occurredAt: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
    };

    const [total, events] = await Promise.all([
      this.prisma.engagementEvent.count({ where }),
      this.prisma.engagementEvent.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: events,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Returns a complete member engagement summary.
   */
  async getMemberEngagementSummary(memberId: string, organisationId: string) {
    let profile = await this.prisma.memberEngagementProfile.findUnique({
      where: { memberId },
    });

    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      select: { timezone: true, createdAt: true },
    });

    const tz = member?.timezone || 'UTC';

    if (!profile) {
      // Create initial profile if absent
      const streakResult = await this.streakService.calculateMemberEngagementStreak(memberId, tz);
      const scoreResult = await this.scoreService.calculateScore(memberId, organisationId);
      const level = this.levelService.determineLevel({
        score: scoreResult.score,
        currentStreak: streakResult.currentStreak,
        lastActivityAt: null,
        memberJoinedAt: member?.createdAt || new Date(),
        totalActivitiesCount: 0,
      });

      profile = await this.prisma.memberEngagementProfile.create({
        data: {
          organisationId,
          memberId,
          engagementLevel: level,
          engagementScore: scoreResult.score,
          currentStreak: streakResult.currentStreak,
          longestStreak: streakResult.longestStreak,
          totalVisits: 0,
          totalWorkouts: 0,
          totalCompletedClasses: 0,
          totalCompletedGoals: 0,
        },
      });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [weeklyVisits, weeklyWorkouts, weeklyClasses, activeHabitsCount, activeChallengesCount, earnedBadgesCount] =
      await Promise.all([
        this.prisma.checkIn.count({
          where: {
            memberProfileId: memberId,
            checkedInAt: { gte: sevenDaysAgo },
            status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
          },
        }),
        this.prisma.workout.count({
          where: {
            memberProfileId: memberId,
            completedAt: { gte: sevenDaysAgo },
            status: 'COMPLETED',
          },
        }),
        this.prisma.attendanceRecord.count({
          where: {
            memberProfileId: memberId,
            checkedInAt: { gte: sevenDaysAgo },
            status: { in: ['CHECKED_IN', 'COMPLETED', 'ATTENDED'] },
          },
        }),
        this.prisma.memberHabit.count({
          where: { memberId, status: 'ACTIVE' },
        }),
        this.prisma.challengeParticipant.count({
          where: { memberId, status: { in: ['JOINED', 'IN_PROGRESS'] } },
        }),
        this.prisma.memberBadge.count({
          where: { memberId },
        }),
      ]);

    return {
      profile,
      weeklySummary: {
        visits: weeklyVisits,
        workouts: weeklyWorkouts,
        classes: weeklyClasses,
      },
      counts: {
        activeHabits: activeHabitsCount,
        activeChallenges: activeChallengesCount,
        earnedBadges: earnedBadgesCount,
      },
    };
  }
}
