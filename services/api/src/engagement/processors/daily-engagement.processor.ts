import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StreakService } from '../services/streak.service';
import { EngagementScoreService } from '../services/engagement-score.service';
import { EngagementLevelService } from '../services/engagement-level.service';
import { RewardStatus } from '@fitcore/types';

@Injectable()
export class DailyEngagementProcessor {
  private readonly logger = new Logger(DailyEngagementProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly streakService: StreakService,
    private readonly scoreService: EngagementScoreService,
    private readonly levelService: EngagementLevelService,
  ) {}

  /**
   * Incremental daily processing of member streaks, score snapshots, and reward expirations.
   */
  async runDailyProcess(organisationId: string): Promise<{
    streaksUpdated: number;
    rewardsExpired: number;
    snapshotsRecorded: number;
  }> {
    this.logger.log(`Starting daily engagement run for organisation '${organisationId}'`);
    const now = new Date();

    // 1. Expire past-due member rewards
    const expireResult = await this.prisma.memberReward.updateMany({
      where: {
        organisationId,
        status: RewardStatus.AVAILABLE,
        expiresAt: { lt: now },
      },
      data: { status: RewardStatus.EXPIRED },
    });

    // 2. Fetch all tracked engagement profiles for this org
    const profiles = await this.prisma.memberEngagementProfile.findMany({
      where: { organisationId },
      include: {
        memberProfile: {
          select: { timezone: true, createdAt: true },
        },
      },
    });

    let streaksUpdated = 0;
    let snapshotsRecorded = 0;

    for (const profile of profiles) {
      const tz = profile.memberProfile?.timezone || 'UTC';
      const streakResult = await this.streakService.calculateMemberEngagementStreak(profile.memberId, tz);
      const scoreResult = await this.scoreService.calculateScore(profile.memberId, organisationId);

      const totalActivities = await this.prisma.engagementEvent.count({
        where: { memberId: profile.memberId },
      });

      const level = this.levelService.determineLevel({
        score: scoreResult.score,
        currentStreak: streakResult.currentStreak,
        lastActivityAt: profile.lastActivityAt,
        memberJoinedAt: profile.memberProfile?.createdAt || new Date(),
        totalActivitiesCount: totalActivities,
      });

      await this.prisma.memberEngagementProfile.update({
        where: { id: profile.id },
        data: {
          engagementLevel: level,
          engagementScore: scoreResult.score,
          currentStreak: streakResult.currentStreak,
          longestStreak: Math.max(profile.longestStreak, streakResult.longestStreak),
        },
      });
      streaksUpdated++;

      // Record snapshot
      await this.scoreService.recordSnapshot(profile.memberId, organisationId, level);
      snapshotsRecorded++;
    }

    this.logger.log(
      `Daily engagement run complete: ${streaksUpdated} profiles updated, ${expireResult.count} rewards expired, ${snapshotsRecorded} snapshots recorded.`,
    );

    return {
      streaksUpdated,
      rewardsExpired: expireResult.count,
      snapshotsRecorded,
    };
  }
}
