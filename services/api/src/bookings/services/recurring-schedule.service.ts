import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class RecurringScheduleService {
  private readonly logger = new Logger(RecurringScheduleService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createSchedule(
    organisationId: string,
    data: {
      outletId: string;
      classTemplateId: string;
      trainerId?: string;
      resourceId?: string;
      dayOfWeek: number;
      startTime: string; // e.g. "09:00"
      durationMinutes?: number;
      startDate: Date;
      endDate?: Date;
      timezone?: string;
    },
  ) {
    return this.prisma.recurringSchedule.create({
      data: {
        organisationId,
        outletId: data.outletId,
        classTemplateId: data.classTemplateId,
        trainerId: data.trainerId,
        resourceId: data.resourceId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        durationMinutes: data.durationMinutes || 60,
        startDate: data.startDate,
        endDate: data.endDate,
        timezone: data.timezone || 'Australia/Perth',
        isActive: true,
      },
    });
  }

  /**
   * Generates ClassSession records from recurring schedule templates for an upcoming date range.
   */
  async generateSessionsForSchedule(
    scheduleId: string,
    fromDate: Date,
    toDate: Date,
  ) {
    const schedule = await this.prisma.recurringSchedule.findUnique({
      where: { id: scheduleId },
      include: { classTemplate: { include: { classType: true } } },
    });

    if (!schedule || !schedule.isActive) {
      throw new NotFoundException('Active recurring schedule not found');
    }

    const createdSessions = [];
    const current = new Date(fromDate);

    while (current <= toDate) {
      if (current.getDay() === schedule.dayOfWeek) {
        const [hours, minutes] = schedule.startTime.split(':').map(Number);
        const startsAt = new Date(current);
        startsAt.setHours(hours, minutes, 0, 0);

        const endsAt = new Date(startsAt.getTime() + schedule.durationMinutes * 60 * 1000);

        // Check if session already generated for this exact slot
        const existing = await this.prisma.classSession.findFirst({
          where: {
            outletId: schedule.outletId,
            classTemplateId: schedule.classTemplateId,
            startsAt,
            status: { not: 'CANCELLED' },
          },
        });

        if (!existing) {
          const session = await this.prisma.classSession.create({
            data: {
              organisationId: schedule.organisationId,
              outletId: schedule.outletId,
              classTemplateId: schedule.classTemplateId,
              classTypeId: schedule.classTemplate.classTypeId,
              trainerId: schedule.trainerId,
              resourceId: schedule.resourceId,
              name: schedule.classTemplate.name,
              startsAt,
              endsAt,
              capacity: schedule.classTemplate.defaultCapacity || 20,
              status: 'OPEN',
              bookingOpensAt: new Date(startsAt.getTime() - 7 * 24 * 60 * 60 * 1000),
              bookingClosesAt: new Date(startsAt.getTime() - 15 * 60 * 1000),
              cancellationClosesAt: new Date(startsAt.getTime() - 2 * 60 * 60 * 1000),
            },
          });
          createdSessions.push(session);
        }
      }
      current.setDate(current.getDate() + 1);
    }

    this.logger.log(
      `[RECURRING SCHEDULE] Generated ${createdSessions.length} sessions for schedule ${scheduleId}`,
    );

    return createdSessions;
  }
}
