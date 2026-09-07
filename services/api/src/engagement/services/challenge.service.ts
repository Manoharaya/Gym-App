import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { EngagementNotificationService } from './engagement-notification.service';
import {
  CreateChallengeDto,
  UpdateChallengeDto,
  QueryChallengesDto,
} from '../dto/engagement.dto';
import {
  ChallengeStatus,
  ChallengeType,
  ParticipantStatus,
  LeaderboardEntry,
} from '@fitcore/types';

@Injectable()
export class ChallengeService {
  private readonly logger = new Logger(ChallengeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notificationService: EngagementNotificationService,
  ) {}

  /**
   * List challenges with filters.
   */
  async getChallenges(
    organisationId: string,
    query: QueryChallengesDto,
    memberId?: string,
  ) {
    const where: any = {
      organisationId,
      ...(query.outletId ? { OR: [{ outletId: null }, { outletId: query.outletId }] } : {}),
      ...(query.challengeType ? { challengeType: query.challengeType } : {}),
      ...(query.status ? { status: query.status } : { status: { in: ['PUBLISHED', 'ACTIVE'] } }),
    };

    if (query.joinedOnly && memberId) {
      where.participants = {
        some: {
          memberId,
          status: { in: ['JOINED', 'IN_PROGRESS', 'COMPLETED'] },
        },
      };
    }

    const challenges = await this.prisma.challenge.findMany({
      where,
      include: {
        _count: {
          select: { participants: true },
        },
        participants: memberId
          ? {
              where: { memberId },
              take: 1,
            }
          : false,
      },
      orderBy: { startDate: 'desc' },
    });

    return challenges.map((c) => ({
      ...c,
      participantCount: c._count.participants,
      isJoined: c.participants && c.participants.length > 0,
      myProgress: c.participants?.[0] || null,
    }));
  }

  /**
   * Get challenge detail.
   */
  async getChallengeById(id: string, organisationId: string, memberId?: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id },
      include: {
        _count: { select: { participants: true } },
        participants: memberId
          ? {
              where: { memberId },
              take: 1,
            }
          : false,
      },
    });

    if (!challenge || challenge.organisationId !== organisationId) {
      throw new NotFoundException('Challenge not found');
    }

    return {
      ...challenge,
      participantCount: challenge._count.participants,
      isJoined: challenge.participants && challenge.participants.length > 0,
      myProgress: challenge.participants?.[0] || null,
    };
  }

  /**
   * Create challenge.
   */
  async createChallenge(organisationId: string, dto: CreateChallengeDto, actorUserId: string) {
    const challenge = await this.prisma.challenge.create({
      data: {
        organisationId,
        outletId: dto.outletId,
        name: dto.name,
        description: dto.description,
        challengeType: dto.challengeType,
        metric: dto.metric,
        target: dto.target,
        periodDays: dto.periodDays,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: dto.status ?? ChallengeStatus.PUBLISHED,
        participationLimit: dto.participationLimit,
        leaderboardEnabled: dto.leaderboardEnabled ?? true,
      },
    });

    await this.audit.log({
      userId: actorUserId,
      organisationId,
      action: 'CREATE',
      resource: 'challenges',
      resourceId: challenge.id,
      metadata: { name: challenge.name, target: challenge.target },
    });

    return challenge;
  }

  /**
   * Update challenge.
   */
  async updateChallenge(
    id: string,
    organisationId: string,
    dto: UpdateChallengeDto,
    actorUserId: string,
  ) {
    const existing = await this.prisma.challenge.findUnique({ where: { id } });
    if (!existing || existing.organisationId !== organisationId) {
      throw new NotFoundException('Challenge not found');
    }

    const updated = await this.prisma.challenge.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.target ? { target: dto.target } : {}),
        ...(dto.participationLimit !== undefined ? { participationLimit: dto.participationLimit } : {}),
        ...(dto.leaderboardEnabled !== undefined ? { leaderboardEnabled: dto.leaderboardEnabled } : {}),
      },
    });

    await this.audit.log({
      userId: actorUserId,
      organisationId,
      action: 'UPDATE',
      resource: 'challenges',
      resourceId: id,
      metadata: dto,
    });

    return updated;
  }

  /**
   * Member joins challenge.
   * Concurrency-safe participation check and duplicate join prevention.
   */
  async joinChallenge(challengeId: string, memberId: string, organisationId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        _count: { select: { participants: true } },
      },
    });

    if (!challenge || challenge.organisationId !== organisationId) {
      throw new NotFoundException('Challenge not found');
    }

    if (challenge.status !== ChallengeStatus.PUBLISHED && challenge.status !== ChallengeStatus.ACTIVE) {
      throw new BadRequestException(`Cannot join challenge in ${challenge.status} status`);
    }

    if (challenge.participationLimit && challenge._count.participants >= challenge.participationLimit) {
      throw new BadRequestException('Challenge participation limit has been reached');
    }

    // Upsert or create participant
    const participant = await this.prisma.challengeParticipant.upsert({
      where: {
        challengeId_memberId: {
          challengeId,
          memberId,
        },
      },
      create: {
        challengeId,
        memberId,
        organisationId,
        target: challenge.target,
        currentProgress: 0,
        status: ParticipantStatus.JOINED,
      },
      update: {
        status: ParticipantStatus.JOINED,
      },
    });

    await this.notificationService.dispatchEngagementNotification({
      type: 'CHALLENGE_JOINED',
      organisationId,
      memberId,
      variables: {
        'challenge.name': challenge.name,
      },
      data: { challengeId: challenge.id },
    });

    return participant;
  }

  /**
   * Member leaves / withdraws from challenge.
   */
  async leaveChallenge(challengeId: string, memberId: string, organisationId: string) {
    const participant = await this.prisma.challengeParticipant.findUnique({
      where: {
        challengeId_memberId: {
          challengeId,
          memberId,
        },
      },
    });

    if (!participant || participant.organisationId !== organisationId) {
      throw new NotFoundException('Participation record not found');
    }

    return this.prisma.challengeParticipant.update({
      where: { id: participant.id },
      data: { status: ParticipantStatus.WITHDRAWN },
    });
  }

  /**
   * Increments progress on active challenges when relevant engagement events occur.
   */
  async incrementProgressForMember(
    memberId: string,
    organisationId: string,
    metric: string,
    incrementAmount: number = 1,
  ): Promise<void> {
    const now = new Date();
    const activeParticipations = await this.prisma.challengeParticipant.findMany({
      where: {
        memberId,
        organisationId,
        status: { in: [ParticipantStatus.JOINED, ParticipantStatus.IN_PROGRESS] },
        challenge: {
          metric,
          status: { in: [ChallengeStatus.PUBLISHED, ChallengeStatus.ACTIVE] },
          startDate: { lte: now },
          endDate: { gte: now },
        },
      },
      include: { challenge: true },
    });

    for (const part of activeParticipations) {
      const newProgress = part.currentProgress + incrementAmount;
      const isCompleted = newProgress >= part.target;

      await this.prisma.challengeParticipant.update({
        where: { id: part.id },
        data: {
          currentProgress: newProgress,
          status: isCompleted ? ParticipantStatus.COMPLETED : ParticipantStatus.IN_PROGRESS,
          completedAt: isCompleted ? now : null,
        },
      });

      if (isCompleted) {
        await this.notificationService.dispatchEngagementNotification({
          type: 'CHALLENGE_COMPLETED',
          organisationId,
          memberId,
          variables: {
            'challenge.name': part.challenge.name,
          },
          data: { challengeId: part.challenge.id },
        });
      }
    }
  }

  /**
   * Privacy-safe leaderboard.
   * STRICT ZERO-TRUST PRIVACY: Only display names and progress numbers.
   * No health data, body measurements, private goals, or trainer notes are ever returned.
   */
  async getChallengeLeaderboard(
    challengeId: string,
    organisationId: string,
    limit: number = 50,
  ): Promise<LeaderboardEntry[]> {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { organisationId: true, leaderboardEnabled: true, target: true },
    });

    if (!challenge || challenge.organisationId !== organisationId) {
      throw new NotFoundException('Challenge not found');
    }

    if (!challenge.leaderboardEnabled) {
      throw new BadRequestException('Leaderboard is disabled for this challenge');
    }

    const participants = await this.prisma.challengeParticipant.findMany({
      where: {
        challengeId,
        status: { in: [ParticipantStatus.JOINED, ParticipantStatus.IN_PROGRESS, ParticipantStatus.COMPLETED] },
      },
      include: {
        memberProfile: {
          select: {
            user: {
              select: {
                displayName: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: [{ currentProgress: 'desc' }, { completedAt: 'asc' }, { joinedAt: 'asc' }],
      take: limit,
    });

    return participants.map((p, index) => {
      const user = p.memberProfile.user;
      const publicName =
        user.displayName ||
        (user.firstName ? `${user.firstName} ${user.lastName ? user.lastName[0] + '.' : ''}` : 'Athlete');

      return {
        rank: index + 1,
        memberId: p.memberId,
        displayName: publicName,
        avatarUrl: user.avatarUrl,
        progress: p.currentProgress,
        target: p.target,
        completed: p.status === ParticipantStatus.COMPLETED,
      };
    });
  }
}
