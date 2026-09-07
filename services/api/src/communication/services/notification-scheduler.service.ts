import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationOrchestratorService } from './notification-orchestrator.service';
import { CreateNotificationScheduleDto } from '../dto/communication.dto';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: NotificationOrchestratorService,
  ) {}

  /**
   * Creates a scheduled notification record.
   */
  async scheduleNotification(
    organisationId: string,
    dto: CreateNotificationScheduleDto,
  ) {
    const scheduledDate = new Date(dto.scheduledFor);

    if (dto.idempotencyKey) {
      const existing = await this.prisma.notificationSchedule.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });

      if (existing) {
        this.logger.log(`Schedule with idempotencyKey '${dto.idempotencyKey}' already exists.`);
        return existing;
      }
    }

    const schedule = await this.prisma.notificationSchedule.create({
      data: {
        organisationId,
        outletId: dto.outletId,
        recipientUserId: dto.recipientUserId,
        notificationType: dto.notificationType,
        scheduledFor: scheduledDate,
        timezone: dto.timezone || 'UTC',
        status: 'SCHEDULED',
        payload: dto.payload,
        idempotencyKey: dto.idempotencyKey,
      },
    });

    this.logger.log(
      `Scheduled notification '${schedule.id}' of type '${dto.notificationType}' for ${scheduledDate.toISOString()}`,
    );

    return schedule;
  }

  /**
   * Cancels a scheduled notification.
   */
  async cancelSchedule(organisationId: string, scheduleId: string) {
    const schedule = await this.prisma.notificationSchedule.findFirst({
      where: { id: scheduleId, organisationId },
    });

    if (!schedule) {
      throw new NotFoundException('Scheduled notification not found');
    }

    return this.prisma.notificationSchedule.update({
      where: { id: schedule.id },
      data: { status: 'CANCELLED' },
    });
  }

  /**
   * Helper to schedule standard class reminders (24h, 2h, 30m before start).
   */
  async scheduleClassReminders(
    organisationId: string,
    outletId: string | null,
    userId: string,
    bookingId: string,
    className: string,
    outletName: string,
    startTime: Date,
  ) {
    const reminders = [
      { offsetMinutes: 24 * 60, label: '24h', keySuffix: '24h' },
      { offsetMinutes: 2 * 60, label: '2h', keySuffix: '2h' },
      { offsetMinutes: 30, label: '30m', keySuffix: '30m' },
    ];

    const scheduled = [];

    for (const r of reminders) {
      const scheduledTime = new Date(startTime.getTime() - r.offsetMinutes * 60 * 1000);
      // Only schedule if in future
      if (scheduledTime > new Date()) {
        const item = await this.scheduleNotification(organisationId, {
          recipientUserId: userId,
          outletId: outletId || undefined,
          notificationType: 'CLASS_REMINDER',
          scheduledFor: scheduledTime.toISOString(),
          idempotencyKey: `booking:${bookingId}:reminder:${r.keySuffix}`,
          payload: {
            bookingId,
            className,
            outletName,
            timeUntil: r.label,
            startTime: startTime.toISOString(),
          },
        });
        scheduled.push(item);
      }
    }

    return scheduled;
  }

  /**
   * Processes all due scheduled notifications batch worker.
   */
  async processDueSchedules(): Promise<{ processedCount: number; failedCount: number }> {
    const now = new Date();
    const dueSchedules = await this.prisma.notificationSchedule.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledFor: { lte: now },
      },
      take: 100,
    });

    let processedCount = 0;
    let failedCount = 0;

    for (const schedule of dueSchedules) {
      try {
        await this.prisma.notificationSchedule.update({
          where: { id: schedule.id },
          data: { status: 'PROCESSING' },
        });

        const payload = schedule.payload as any;

        await this.orchestrator.handleDomainEvent({
          type: schedule.notificationType,
          organisationId: schedule.organisationId,
          outletId: schedule.outletId,
          recipientUserId: schedule.recipientUserId,
          category: payload.category || 'SYSTEM',
          priority: payload.priority,
          variables: payload,
          data: {
            actionType: payload.actionType,
            actionId: payload.actionId,
            deepLink: payload.deepLink,
          },
          idempotencyKey: schedule.idempotencyKey,
        });

        await this.prisma.notificationSchedule.update({
          where: { id: schedule.id },
          data: { status: 'SENT' },
        });

        processedCount++;
      } catch (err: any) {
        this.logger.error(
          `Failed to process schedule '${schedule.id}': ${err.message}`,
        );
        await this.prisma.notificationSchedule.update({
          where: { id: schedule.id },
          data: { status: 'FAILED' },
        });
        failedCount++;
      }
    }

    return { processedCount, failedCount };
  }

  /**
   * Lists schedules for an organisation.
   */
  async getSchedules(organisationId: string, recipientUserId?: string) {
    const where: any = { organisationId };
    if (recipientUserId) where.recipientUserId = recipientUserId;

    return this.prisma.notificationSchedule.findMany({
      where,
      orderBy: { scheduledFor: 'desc' },
      take: 50,
    });
  }
}
