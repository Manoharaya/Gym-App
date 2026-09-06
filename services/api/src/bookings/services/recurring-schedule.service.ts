import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TimezoneUtil } from '../utils/timezone.util';

export interface CreateRecurringScheduleParams {
  outletId: string;
  classTemplateId: string;
  trainerId?: string;
  resourceId?: string;
  frequency?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  dayOfWeek: number;
  daysOfWeek?: number[];
  startTime: string; // e.g. "09:00"
  durationMinutes?: number;
  customCapacity?: number;
  startDate: Date;
  endDate?: Date;
  timezone?: string;
}

export interface UpdateRecurringScheduleParams {
  trainerId?: string;
  resourceId?: string;
  frequency?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  dayOfWeek?: number;
  daysOfWeek?: number[];
  startTime?: string;
  durationMinutes?: number;
  customCapacity?: number;
  endDate?: Date;
  isActive?: boolean;
}

@Injectable()
export class RecurringScheduleService {
  private readonly logger = new Logger(RecurringScheduleService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new Recurring Schedule definition for an organisation.
   */
  async createSchedule(organisationId: string, data: CreateRecurringScheduleParams) {
    // Validate template belongs to organisation
    const template = await this.prisma.classTemplate.findFirst({
      where: { id: data.classTemplateId, organisationId },
      include: { classType: true },
    });

    if (!template) {
      throw new NotFoundException('Class template not found in this organisation');
    }

    // Validate outlet belongs to organisation
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: data.outletId, organisationId },
    });

    if (!outlet) {
      throw new NotFoundException('Outlet not found in this organisation');
    }

    // Default daysOfWeek to primary dayOfWeek if empty
    const daysOfWeek =
      data.daysOfWeek && data.daysOfWeek.length > 0
        ? data.daysOfWeek
        : [data.dayOfWeek];

    const schedule = await this.prisma.recurringSchedule.create({
      data: {
        organisationId,
        outletId: data.outletId,
        classTemplateId: data.classTemplateId,
        trainerId: data.trainerId,
        resourceId: data.resourceId,
        frequency: data.frequency || 'WEEKLY',
        dayOfWeek: data.dayOfWeek,
        daysOfWeek,
        startTime: data.startTime,
        durationMinutes: data.durationMinutes || template.durationMinutes || 60,
        customCapacity: data.customCapacity,
        startDate: data.startDate,
        endDate: data.endDate,
        timezone: data.timezone || outlet.timezone || 'Australia/Perth',
        isActive: true,
      },
      include: {
        classTemplate: { include: { classType: true } },
        outlet: { select: { id: true, name: true, code: true, timezone: true } },
        trainer: { select: { id: true, firstName: true, lastName: true } },
        resource: { select: { id: true, name: true, type: true } },
      },
    });

    this.logger.log(
      `[RECURRING SCHEDULE] Created schedule ${schedule.id} (${schedule.frequency}) for ${template.name} at ${outlet.name}`,
    );

    return schedule;
  }

  /**
   * Retrieves schedule details by ID.
   */
  async getSchedule(id: string, organisationId: string) {
    const schedule = await this.prisma.recurringSchedule.findFirst({
      where: { id, organisationId },
      include: {
        classTemplate: { include: { classType: true } },
        outlet: { select: { id: true, name: true, code: true, timezone: true } },
        trainer: { select: { id: true, firstName: true, lastName: true, email: true } },
        resource: { select: { id: true, name: true, type: true } },
        _count: { select: { sessions: true } },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Recurring schedule not found');
    }

    return schedule;
  }

  /**
   * Lists recurring schedules with optional filters.
   */
  async listSchedules(organisationId: string, outletId?: string, isActive?: boolean) {
    return this.prisma.recurringSchedule.findMany({
      where: {
        organisationId,
        ...(outletId ? { outletId } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      include: {
        classTemplate: { include: { classType: true } },
        outlet: { select: { id: true, name: true, code: true } },
        trainer: { select: { id: true, firstName: true, lastName: true } },
        resource: { select: { id: true, name: true, type: true } },
        _count: { select: { sessions: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  /**
   * Updates an existing recurring schedule.
   */
  async updateSchedule(
    id: string,
    organisationId: string,
    data: UpdateRecurringScheduleParams,
  ) {
    const schedule = await this.prisma.recurringSchedule.findFirst({
      where: { id, organisationId },
    });

    if (!schedule) {
      throw new NotFoundException('Recurring schedule not found');
    }

    return this.prisma.recurringSchedule.update({
      where: { id },
      data: {
        trainerId: data.trainerId !== undefined ? data.trainerId : schedule.trainerId,
        resourceId: data.resourceId !== undefined ? data.resourceId : schedule.resourceId,
        frequency: data.frequency || schedule.frequency,
        dayOfWeek: data.dayOfWeek !== undefined ? data.dayOfWeek : schedule.dayOfWeek,
        daysOfWeek: data.daysOfWeek || schedule.daysOfWeek,
        startTime: data.startTime || schedule.startTime,
        durationMinutes: data.durationMinutes || schedule.durationMinutes,
        customCapacity: data.customCapacity !== undefined ? data.customCapacity : schedule.customCapacity,
        endDate: data.endDate !== undefined ? data.endDate : schedule.endDate,
        isActive: data.isActive !== undefined ? data.isActive : schedule.isActive,
      },
      include: {
        classTemplate: { include: { classType: true } },
        outlet: true,
        trainer: true,
        resource: true,
      },
    });
  }

  /**
   * Previews upcoming occurrences for a schedule within a date range without writing to database.
   */
  async previewOccurrences(scheduleId: string, fromDate: Date, toDate: Date) {
    const schedule = await this.prisma.recurringSchedule.findUnique({
      where: { id: scheduleId },
      include: { classTemplate: true, outlet: true },
    });

    if (!schedule) {
      throw new NotFoundException('Recurring schedule not found');
    }

    const slots = TimezoneUtil.calculateRecurringOccurrences({
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      fromDate,
      toDate,
      frequency: schedule.frequency,
      dayOfWeek: schedule.dayOfWeek,
      daysOfWeek: schedule.daysOfWeek,
      startTime: schedule.startTime,
      durationMinutes: schedule.durationMinutes,
      timezone: schedule.timezone,
    });

    return {
      scheduleId,
      frequency: schedule.frequency,
      timezone: schedule.timezone,
      slotsCount: slots.length,
      slots,
    };
  }

  /**
   * Generates concrete ClassSession records from recurring schedule templates.
   *
   * Invariants:
   * - Deterministic & Timezone-aware: occurrences calculated in schedule local timezone and converted to UTC.
   * - Idempotent: running twice creates zero duplicate sessions.
   * - Historical preservation: completed sessions and sessions with bookings remain untouched.
   * - Override preservation: sessions flagged with isOverride=true are never overwritten.
   */
  async generateSessionsForSchedule(
    scheduleId: string,
    fromDate: Date,
    toDate: Date,
  ) {
    const schedule = await this.prisma.recurringSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        classTemplate: { include: { classType: true } },
        outlet: true,
      },
    });

    if (!schedule || !schedule.isActive) {
      throw new NotFoundException('Active recurring schedule not found');
    }

    if (fromDate > toDate) {
      throw new BadRequestException('fromDate must be before or equal to toDate');
    }

    const slots = TimezoneUtil.calculateRecurringOccurrences({
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      fromDate,
      toDate,
      frequency: schedule.frequency,
      dayOfWeek: schedule.dayOfWeek,
      daysOfWeek: schedule.daysOfWeek,
      startTime: schedule.startTime,
      durationMinutes: schedule.durationMinutes,
      timezone: schedule.timezone,
    });

    const createdSessions = [];

    for (const slot of slots) {
      // Check for duplicate existing session or overridden session originating from this slot
      const existing = await this.prisma.classSession.findFirst({
        where: {
          recurringScheduleId: schedule.id,
          OR: [
            { startsAt: slot.startsAt },
            { originalStartsAt: slot.startsAt },
          ],
          status: { not: 'CANCELLED' },
        },
      });

      if (!existing) {
        const capacity =
          schedule.customCapacity ||
          schedule.classTemplate.defaultCapacity ||
          20;

        const session = await this.prisma.classSession.create({
          data: {
            organisationId: schedule.organisationId,
            outletId: schedule.outletId,
            classTemplateId: schedule.classTemplateId,
            classTypeId: schedule.classTemplate.classTypeId,
            recurringScheduleId: schedule.id,
            trainerId: schedule.trainerId,
            resourceId: schedule.resourceId,
            name: schedule.classTemplate.name,
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            capacity,
            status: 'OPEN',
            isOverride: false,
            bookingOpensAt: new Date(slot.startsAt.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 days before
            bookingClosesAt: new Date(slot.startsAt.getTime() - 30 * 60 * 1000),          // 30 min before
            cancellationClosesAt: new Date(slot.startsAt.getTime() - 2 * 60 * 60 * 1000), // 2 hours before
          },
          include: {
            classType: true,
            trainer: { select: { id: true, firstName: true, lastName: true } },
            resource: { select: { id: true, name: true, type: true } },
          },
        });
        createdSessions.push(session);
      }
    }

    this.logger.log(
      `[RECURRING SCHEDULE] Generated ${createdSessions.length} new sessions for schedule ${scheduleId} between ${fromDate.toISOString()} and ${toDate.toISOString()}`,
    );

    return createdSessions;
  }

  /**
   * Batch generates concrete sessions for all active recurring schedules in an organisation.
   */
  async generateAllActiveSchedules(
    organisationId: string,
    fromDate: Date,
    toDate: Date,
    outletId?: string,
  ) {
    const activeSchedules = await this.prisma.recurringSchedule.findMany({
      where: {
        organisationId,
        isActive: true,
        ...(outletId ? { outletId } : {}),
      },
    });

    let totalGenerated = 0;
    for (const schedule of activeSchedules) {
      const generated = await this.generateSessionsForSchedule(
        schedule.id,
        fromDate,
        toDate,
      );
      totalGenerated += generated.length;
    }

    return {
      schedulesProcessed: activeSchedules.length,
      totalGenerated,
      fromDate,
      toDate,
    };
  }
}
