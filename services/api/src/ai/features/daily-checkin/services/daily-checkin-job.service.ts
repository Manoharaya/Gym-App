import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class DailyCheckInJobService {
  private readonly logger = new Logger(DailyCheckInJobService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotently expires uncompleted check-ins from previous calendar days.
   */
  async expireStaleCheckIns(): Promise<{ expiredCount: number }> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const result = await this.prisma.dailyCheckIn.updateMany({
      where: {
        status: { in: ['PENDING', 'STARTED'] },
        checkInDate: { lt: today },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} stale daily check-in records from previous days.`);
    }

    return { expiredCount: result.count };
  }

  /**
   * Evaluates members requiring daily check-in reminders.
   * Can be invoked by a cron job or worker queue.
   */
  async processReminders(): Promise<{ remindersEvaluated: number }> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Find all settings where reminder is enabled
    const settings = await this.prisma.dailyCheckInSetting.findMany({
      where: {
        reminderEnabled: true,
        checkInEnabled: true,
      },
      include: {
        memberProfile: {
          select: { id: true, userId: true, organisationId: true },
        },
      },
      take: 100,
    });

    let remindersEvaluated = 0;

    for (const setting of settings) {
      if (!setting.memberId) continue;

      // Check if already checked in today
      const existing = await this.prisma.dailyCheckIn.findUnique({
        where: {
          memberId_checkInDate: {
            memberId: setting.memberId,
            checkInDate: today,
          },
        },
      });

      if (!existing || existing.status === 'PENDING') {
        remindersEvaluated++;
        // Idempotent dispatch point for Day 17 notification orchestrator
        this.logger.debug(
          `Member ${setting.memberId} is eligible for daily check-in reminder at ${setting.reminderTime}`,
        );
      }
    }

    return { remindersEvaluated };
  }
}
