import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { EngagementNotificationService } from './engagement-notification.service';
import { CreateRewardDto, UpdateRewardDto, CreateBadgeDto } from '../dto/engagement.dto';
import { RewardStatus, RewardCategory } from '@fitcore/types';

export const SYSTEM_BADGES = [
  {
    code: 'FIRST_WORKOUT',
    name: 'First Workout',
    description: 'Completed your very first workout on FitCore!',
    category: 'WORKOUT',
    criteria: { type: 'WORKOUT_COUNT', target: 1 },
  },
  {
    code: '10_WORKOUTS',
    name: '10 Workouts Club',
    description: 'Completed 10 workouts. Consistency is building!',
    category: 'WORKOUT',
    criteria: { type: 'WORKOUT_COUNT', target: 10 },
  },
  {
    code: '25_WORKOUTS',
    name: '25 Workouts Milestone',
    description: 'Dedicated athlete! 25 workouts logged.',
    category: 'WORKOUT',
    criteria: { type: 'WORKOUT_COUNT', target: 25 },
  },
  {
    code: '50_WORKOUTS',
    name: 'FitCore Century Half',
    description: 'Phenomenal dedication: 50 workouts completed!',
    category: 'WORKOUT',
    criteria: { type: 'WORKOUT_COUNT', target: 50 },
  },
  {
    code: 'FIRST_CLASS',
    name: 'First Class Attended',
    description: 'Attended your first group fitness class.',
    category: 'ATTENDANCE',
    criteria: { type: 'CLASS_COUNT', target: 1 },
  },
  {
    code: '10_CLASSES',
    name: 'Class Regular',
    description: 'Completed 10 group fitness classes.',
    category: 'ATTENDANCE',
    criteria: { type: 'CLASS_COUNT', target: 10 },
  },
  {
    code: '7_DAY_STREAK',
    name: 'Week on Fire',
    description: 'Maintained a 7-day activity streak!',
    category: 'STREAK',
    criteria: { type: 'STREAK_DAYS', target: 7 },
  },
  {
    code: '30_DAY_STREAK',
    name: 'Unstoppable Momentum',
    description: 'Maintained a 30-day activity streak!',
    category: 'STREAK',
    criteria: { type: 'STREAK_DAYS', target: 30 },
  },
  {
    code: 'GOAL_COMPLETED',
    name: 'Goal Crusher',
    description: 'Completed a primary fitness goal.',
    category: 'GOAL',
    criteria: { type: 'GOAL_COUNT', target: 1 },
  },
  {
    code: 'CHALLENGE_COMPLETED',
    name: 'Challenge Victor',
    description: 'Conquered an official gym challenge.',
    category: 'CHALLENGE',
    criteria: { type: 'CHALLENGE_COUNT', target: 1 },
  },
];

@Injectable()
export class RewardService implements OnModuleInit {
  private readonly logger = new Logger(RewardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notificationService: EngagementNotificationService,
  ) {}

  async onModuleInit() {
    await this.seedSystemBadges();
  }

  /**
   * Seeds deterministic system badges if not present.
   */
  async seedSystemBadges(): Promise<void> {
    for (const b of SYSTEM_BADGES) {
      const existing = await this.prisma.badge.findUnique({
        where: { code: b.code },
      });
      if (!existing) {
        await this.prisma.badge.create({
          data: {
            code: b.code,
            name: b.name,
            description: b.description,
            category: b.category,
            criteria: b.criteria as any,
          },
        });
      }
    }
  }

  /**
   * Evaluates badge qualifications for a member.
   */
  async evaluateBadges(memberId: string, organisationId: string): Promise<string[]> {
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      include: {
        memberBadges: { select: { badgeId: true } },
        engagementProfile: true,
      },
    });

    if (!member) return [];

    const existingBadgeIds = new Set(member.memberBadges.map((mb) => mb.badgeId));
    const allBadges = await this.prisma.badge.findMany();

    const [workoutCount, classCount, completedGoalsCount, completedChallengesCount] = await Promise.all([
      this.prisma.workout.count({ where: { memberProfileId: memberId, status: 'COMPLETED' } }),
      this.prisma.attendanceRecord.count({ where: { memberProfileId: memberId, status: 'ATTENDED' } }),
      this.prisma.trainingGoal.count({ where: { memberProfileId: memberId, status: 'COMPLETED' } }),
      this.prisma.challengeParticipant.count({ where: { memberId, status: 'COMPLETED' } }),
    ]);

    const streak = member.engagementProfile?.currentStreak ?? 0;
    const newlyAwardedBadgeCodes: string[] = [];

    for (const badge of allBadges) {
      if (existingBadgeIds.has(badge.id)) continue;

      const criteria = badge.criteria as any;
      let qualifies = false;

      if (criteria.type === 'WORKOUT_COUNT' && workoutCount >= criteria.target) {
        qualifies = true;
      } else if (criteria.type === 'CLASS_COUNT' && classCount >= criteria.target) {
        qualifies = true;
      } else if (criteria.type === 'STREAK_DAYS' && streak >= criteria.target) {
        qualifies = true;
      } else if (criteria.type === 'GOAL_COUNT' && completedGoalsCount >= criteria.target) {
        qualifies = true;
      } else if (criteria.type === 'CHALLENGE_COUNT' && completedChallengesCount >= criteria.target) {
        qualifies = true;
      }

      if (qualifies) {
        try {
          await this.prisma.memberBadge.create({
            data: {
              organisationId,
              memberId,
              badgeId: badge.id,
              metadata: { awardedAt: new Date().toISOString() },
            },
          });
          newlyAwardedBadgeCodes.push(badge.code);

          // Dispatch milestone notification
          await this.notificationService.dispatchEngagementNotification({
            type: 'REWARD_EARNED',
            organisationId,
            memberId,
            variables: {
              'reward.name': badge.name,
              'badge.description': badge.description,
            },
            data: { badgeId: badge.id, code: badge.code },
          });
        } catch (err) {
          // Handle unique race condition gracefully
          this.logger.debug(`Badge '${badge.code}' already awarded to member '${memberId}'.`);
        }
      }
    }

    return newlyAwardedBadgeCodes;
  }

  /**
   * List rewards for an organisation / outlet.
   */
  async getRewards(organisationId: string, outletId?: string) {
    return this.prisma.reward.findMany({
      where: {
        organisationId,
        active: true,
        ...(outletId ? { OR: [{ outletId: null }, { outletId }] } : {}),
      },
      orderBy: { pointsRequired: 'asc' },
    });
  }

  /**
   * List member rewards & badges.
   */
  async getMemberAchievements(memberId: string, organisationId: string) {
    const [badges, rewards] = await Promise.all([
      this.prisma.memberBadge.findMany({
        where: { memberId, organisationId },
        include: { badge: true },
        orderBy: { awardedAt: 'desc' },
      }),
      this.prisma.memberReward.findMany({
        where: { memberId, organisationId },
        include: { reward: true },
        orderBy: { earnedAt: 'desc' },
      }),
    ]);

    return { badges, rewards };
  }

  /**
   * Creates a new reward for an organisation.
   */
  async createReward(organisationId: string, dto: CreateRewardDto, actorUserId: string) {
    const reward = await this.prisma.reward.create({
      data: {
        organisationId,
        outletId: dto.outletId,
        name: dto.name,
        description: dto.description,
        category: dto.category ?? RewardCategory.PERK,
        pointsRequired: dto.pointsRequired ?? 0,
        inventory: dto.inventory ?? null,
        active: dto.active ?? true,
        validDays: dto.validDays ?? null,
      },
    });

    await this.audit.log({
      userId: actorUserId,
      organisationId,
      action: 'CREATE',
      resource: 'rewards',
      resourceId: reward.id,
      metadata: { name: reward.name, category: reward.category },
    });

    return reward;
  }

  /**
   * Assigns a reward to a member.
   */
  async assignReward(
    organisationId: string,
    memberId: string,
    rewardId: string,
  ) {
    const reward = await this.prisma.reward.findUnique({
      where: { id: rewardId },
    });

    if (!reward || reward.organisationId !== organisationId || !reward.active) {
      throw new NotFoundException('Reward not found or inactive');
    }

    const now = new Date();
    const expiresAt = reward.validDays
      ? new Date(now.getTime() + reward.validDays * 24 * 60 * 60 * 1000)
      : null;

    const memberReward = await this.prisma.memberReward.create({
      data: {
        organisationId,
        memberId,
        rewardId,
        status: RewardStatus.AVAILABLE,
        earnedAt: now,
        expiresAt,
      },
      include: { reward: true },
    });

    await this.notificationService.dispatchEngagementNotification({
      type: 'REWARD_EARNED',
      organisationId,
      memberId,
      variables: {
        'reward.name': reward.name,
      },
      data: { memberRewardId: memberReward.id, rewardId: reward.id },
    });

    return memberReward;
  }

  /**
   * Transactional redemption of a member reward.
   * Concurrency-safe inventory decrement and double-redemption prevention.
   */
  async redeemReward(
    organisationId: string,
    memberId: string,
    memberRewardId: string,
    notes?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const memberReward = await tx.memberReward.findUnique({
        where: { id: memberRewardId },
        include: { reward: true },
      });

      if (!memberReward || memberReward.memberId !== memberId || memberReward.organisationId !== organisationId) {
        throw new NotFoundException('Member reward not found or unauthorized');
      }

      if (memberReward.status !== RewardStatus.AVAILABLE) {
        throw new BadRequestException(`Reward cannot be redeemed (status is ${memberReward.status})`);
      }

      if (memberReward.expiresAt && memberReward.expiresAt < new Date()) {
        await tx.memberReward.update({
          where: { id: memberRewardId },
          data: { status: RewardStatus.EXPIRED },
        });
        throw new BadRequestException('Reward has expired');
      }

      // Check reward inventory
      if (memberReward.reward.inventory !== null && memberReward.reward.inventory !== undefined) {
        if (memberReward.reward.inventory <= 0) {
          throw new BadRequestException('Reward inventory exhausted');
        }

        // Decrement inventory atomically
        await tx.reward.update({
          where: { id: memberReward.rewardId },
          data: { inventory: { decrement: 1 } },
        });
      }

      const updated = await tx.memberReward.update({
        where: { id: memberRewardId },
        data: {
          status: RewardStatus.REDEEMED,
          redeemedAt: new Date(),
          redemptionNotes: notes,
        },
        include: { reward: true },
      });

      return updated;
    });
  }
}
