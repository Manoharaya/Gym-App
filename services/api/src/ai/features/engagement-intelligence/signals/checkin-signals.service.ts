import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { CheckInSignals } from '../engagement-intelligence.types';

@Injectable()
export class CheckInSignalsService {
  private readonly logger = new Logger(CheckInSignalsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Collects non-sensitive check-in engagement indicators.
   * STRICT SAFETY DIRECTIVE:
   * Analyzes check-in frequency and completion consistency only.
   * Never infers or diagnoses psychological, psychiatric, or mental health conditions.
   */
  async collect(memberId: string, organisationId: string, now: Date = new Date()): Promise<CheckInSignals> {
    const d7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d28Ago = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const checkIns = await this.prisma.dailyCheckIn.findMany({
      where: {
        memberId,
        organisationId,
        status: 'COMPLETED',
        completedAt: { gte: d28Ago, lte: now },
      },
      select: {
        id: true,
        completedAt: true,
        motivationLevel: true,
      },
      orderBy: { completedAt: 'desc' },
    });

    const checkInsLast7d = checkIns.filter((c) => c.completedAt && c.completedAt >= d7Ago).length;
    const checkInsLast28d = checkIns.length;
    const lastCheckInAt = checkIns[0]?.completedAt || null;

    // Rate over 28 days (assuming 1 checkin possible per day, 28 max)
    const completionRatePct = Math.min(100, Math.round((checkInsLast28d / 28) * 100));

    // Trajectory based on completion frequency
    let motivationTrajectory: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'INSUFFICIENT_DATA' = 'INSUFFICIENT_DATA';
    if (checkInsLast28d < 3) {
      motivationTrajectory = 'INSUFFICIENT_DATA';
    } else {
      const recentWeekly = checkInsLast7d;
      const baselineWeekly = checkInsLast28d / 4;
      if (recentWeekly >= baselineWeekly * 1.25) {
        motivationTrajectory = 'IMPROVING';
      } else if (recentWeekly <= baselineWeekly * 0.65) {
        motivationTrajectory = 'DECLINING';
      } else {
        motivationTrajectory = 'STABLE';
      }
    }

    return {
      checkInsLast7d,
      checkInsLast28d,
      completionRatePct,
      lastCheckInAt,
      motivationTrajectory,
    };
  }
}
