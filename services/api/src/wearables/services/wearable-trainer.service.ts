import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { HealthDataSummaryService } from './health-data-summary.service';
import { WearableTrainerClientSummaryDto, WearableProviderType } from '@fitcore/types';

@Injectable()
export class WearableTrainerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly summaryService: HealthDataSummaryService,
  ) {}

  /**
   * Retrieves high-level summarized wearable telemetry for an assigned client.
   * Strictly verifies active TrainerClientAssignment.
   */
  async getTrainerClientWearableSummary(
    targetMemberId: string,
    trainerUserId: string,
    organisationId: string,
  ): Promise<WearableTrainerClientSummaryDto> {
    // 1. Verify trainer profile
    const trainerProfile = await this.prisma.trainerProfile.findFirst({
      where: {
        organisationId,
        staffProfile: { userId: trainerUserId },
      },
    });

    if (!trainerProfile) {
      throw new ForbiddenException('User is not a registered trainer in this organisation.');
    }

    // 2. Verify active client assignment
    const assignment = await this.prisma.trainerClientAssignment.findFirst({
      where: {
        trainerProfileId: trainerProfile.id,
        memberProfileId: targetMemberId,
        organisationId,
        status: 'ACTIVE',
      },
      include: {
        memberProfile: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    if (!assignment) {
      throw new ForbiddenException('Trainer is not authorized to access this member telemetry.');
    }

    const memberUser = assignment.memberProfile?.user;
    const memberName = memberUser ? `${memberUser.firstName} ${memberUser.lastName}` : 'Client';

    // 3. Obtain 7-day health summary
    const summary = await this.summaryService.getMemberSummary(targetMemberId, organisationId);

    // 4. Identify today's stats from daily summaries
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySummary = summary.dailySummaries.find((d) => d.date === todayStr);

    // 5. Check last sync across active connections
    const latestConnection = await this.prisma.wearableConnection.findFirst({
      where: { memberId: targetMemberId, organisationId, status: 'CONNECTED' },
      orderBy: { lastSuccessfulSyncAt: 'desc' },
      select: { lastSuccessfulSyncAt: true },
    });

    return {
      memberId: targetMemberId,
      memberName,
      trainerAssignmentStatus: 'ACTIVE',
      todayActivity: {
        steps: todaySummary?.steps || 0,
        activeCaloriesKcal: todaySummary?.activeCaloriesKcal || 0,
        distanceKm: todaySummary?.distanceKm || 0,
        restingHeartRateBpm: todaySummary?.restingHeartRateBpm || null,
      },
      weeklyAverages: {
        avgDailySteps: summary.avgDailySteps,
        avgDailyCaloriesKcal: Math.round(summary.totalActiveCaloriesKcal / 7),
        avgSleepMinutes: summary.avgSleepMinutes,
        workoutCount: summary.totalWorkouts,
      },
      lastSyncAt: latestConnection?.lastSuccessfulSyncAt?.toISOString() || null,
      connectedProviders: summary.connectedProviders,
      notice:
        'This wearable telemetry is provided for training load management and fitness planning only. It is not clinical or diagnostic health data.',
    };
  }
}
