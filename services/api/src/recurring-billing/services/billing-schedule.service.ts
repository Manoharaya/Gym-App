/**
 * FitCore — Day 42: Billing Schedule Service
 *
 * Manages recurring subscription schedules, interval calculations,
 * and lifecycle transitions (DRAFT -> ACTIVE -> PAUSED -> CANCELLED).
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { RECURRING_BILLING_AUDIT } from '../domain/recurring-billing.constants';
import { ResolvedBillingScope } from '../domain/recurring-billing.permissions';
import { CreateBillingScheduleDtoInput } from '../dto/create-schedule.dto';
import { UpdateBillingScheduleDtoInput } from '../dto/update-schedule.dto';
import { BillingScheduleFilterDto } from '../dto/schedule-filter.dto';
import { BillingInterval, BillingScheduleDto } from '@fitcore/types';

@Injectable()
export class BillingScheduleService {
  private readonly logger = new Logger(BillingScheduleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Calculates the next billing date based on the interval and count.
   * Handles leap years and variable month end dates cleanly.
   */
  calculateNextBillingDate(
    currentDate: Date,
    interval: BillingInterval,
    intervalCount: number = 1,
  ): Date {
    const next = new Date(currentDate);
    const count = Math.max(1, intervalCount);

    switch (interval) {
      case 'WEEKLY':
        next.setDate(next.getDate() + 7 * count);
        break;

      case 'BIWEEKLY':
        next.setDate(next.getDate() + 14 * count);
        break;

      case 'MONTHLY': {
        const currentDay = next.getDate();
        next.setMonth(next.getMonth() + count);
        // If target month has fewer days, clamp to last day of that month
        if (next.getDate() !== currentDay) {
          next.setDate(0);
        }
        break;
      }

      case 'QUARTERLY': {
        const currentDay = next.getDate();
        next.setMonth(next.getMonth() + 3 * count);
        if (next.getDate() !== currentDay) {
          next.setDate(0);
        }
        break;
      }

      case 'SEMI_ANNUALLY': {
        const currentDay = next.getDate();
        next.setMonth(next.getMonth() + 6 * count);
        if (next.getDate() !== currentDay) {
          next.setDate(0);
        }
        break;
      }

      case 'ANNUALLY': {
        const currentDay = next.getDate();
        next.setFullYear(next.getFullYear() + count);
        if (next.getDate() !== currentDay) {
          next.setDate(0);
        }
        break;
      }

      case 'CUSTOM':
      default:
        next.setDate(next.getDate() + 30 * count);
        break;
    }

    return next;
  }

  /**
   * Creates a new billing schedule for an active or pending membership.
   */
  async createSchedule(
    organisationId: string,
    input: CreateBillingScheduleDtoInput,
    actorId: string,
  ): Promise<BillingScheduleDto> {
    // 1. Validate membership exists in organisation
    const membership = await this.prisma.memberMembership.findFirst({
      where: {
        id: input.memberMembershipId,
        organisationId,
        memberProfileId: input.memberProfileId,
      },
      include: { membershipPlan: true },
    });

    if (!membership) {
      throw new NotFoundException(
        'Member membership not found or does not belong to organisation',
      );
    }

    // 2. Validate payment method if supplied
    if (input.paymentMethodId) {
      const pm = await this.prisma.paymentMethod.findFirst({
        where: {
          id: input.paymentMethodId,
          organisationId,
          memberProfileId: input.memberProfileId,
          status: 'ACTIVE',
        },
      });
      if (!pm) {
        throw new BadRequestException('Payment method is invalid or inactive');
      }
    }

    const startDate = input.startDate ? new Date(input.startDate) : new Date();
    const nextBillingDate = startDate; // First billing due on start date

    const schedule = await this.prisma.billingSchedule.create({
      data: {
        organisationId,
        memberProfileId: input.memberProfileId,
        memberMembershipId: input.memberMembershipId,
        membershipPlanId: input.membershipPlanId,
        originOutletId: input.originOutletId || membership.originOutletId,
        currency: (input.currency || 'AUD').toUpperCase(),
        billingInterval: input.billingInterval,
        intervalCount: input.intervalCount || 1,
        amountMinor: input.amountMinor,
        nextBillingDate,
        status: 'ACTIVE',
        paymentMethodId: input.paymentMethodId || null,
        startDate,
        endDate: input.endDate ? new Date(input.endDate) : null,
        timezone: input.timezone || 'UTC',
        metadata: input.metadata || {},
      },
      include: {
        memberProfile: {
          select: {
            id: true,
            userId: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        membershipPlan: { select: { id: true, name: true, code: true } },
        paymentMethod: { select: { id: true, type: true, brand: true, last4: true } },
      },
    });

    await this.audit.log({
      action: RECURRING_BILLING_AUDIT.SCHEDULE_CREATED,
      resource: 'billing_schedule',
      resourceId: schedule.id,
      organisationId,
      userId: actorId,
      metadata: {
        amountMinor: schedule.amountMinor,
        currency: schedule.currency,
        interval: schedule.billingInterval,
        nextBillingDate: schedule.nextBillingDate,
      },
    });

    return this.mapToDto(schedule);
  }

  /**
   * Retrieves a billing schedule by ID with tenant validation.
   */
  async getScheduleById(
    organisationId: string,
    id: string,
  ): Promise<BillingScheduleDto> {
    const schedule = await this.prisma.billingSchedule.findFirst({
      where: { id, organisationId },
      include: {
        memberProfile: {
          select: {
            id: true,
            userId: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        membershipPlan: { select: { id: true, name: true, code: true } },
        paymentMethod: { select: { id: true, type: true, brand: true, last4: true } },
      },
    });

    if (!schedule) {
      throw new NotFoundException(`Billing schedule '${id}' not found`);
    }

    return this.mapToDto(schedule);
  }

  /**
   * Lists billing schedules scoped to organisation/outlet.
   */
  async listSchedules(
    scope: ResolvedBillingScope,
    filter: BillingScheduleFilterDto,
  ): Promise<{ data: BillingScheduleDto[]; total: number }> {
    const where: any = { organisationId: scope.organisationId };

    if (scope.roleScope === 'OUTLET' && scope.outletId) {
      where.originOutletId = scope.outletId;
    } else if (filter.outletId) {
      where.originOutletId = filter.outletId;
    }

    if (scope.roleScope === 'SELF' && scope.memberProfileId) {
      where.OR = [
        { memberProfileId: scope.memberProfileId },
        { memberProfile: { userId: scope.memberProfileId } },
      ];
    } else if (filter.memberProfileId) {
      where.memberProfileId = filter.memberProfileId;
    }

    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.currency) {
      where.currency = filter.currency.toUpperCase();
    }

    const [total, rows] = await Promise.all([
      this.prisma.billingSchedule.count({ where }),
      this.prisma.billingSchedule.findMany({
        where,
        skip: filter.offset || 0,
        take: filter.limit || 50,
        orderBy: { nextBillingDate: 'asc' },
        include: {
          memberProfile: {
            select: {
              id: true,
              userId: true,
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
          membershipPlan: { select: { id: true, name: true, code: true } },
          paymentMethod: { select: { id: true, type: true, brand: true, last4: true } },
        },
      }),
    ]);

    return {
      data: rows.map((r) => this.mapToDto(r)),
      total,
    };
  }

  /**
   * Updates billing schedule settings.
   */
  async updateSchedule(
    organisationId: string,
    id: string,
    input: UpdateBillingScheduleDtoInput,
    actorId: string,
  ): Promise<BillingScheduleDto> {
    await this.getScheduleById(organisationId, id);

    const updated = await this.prisma.billingSchedule.update({
      where: { id },
      data: {
        ...(input.billingInterval && { billingInterval: input.billingInterval }),
        ...(input.intervalCount && { intervalCount: input.intervalCount }),
        ...(input.amountMinor !== undefined && { amountMinor: input.amountMinor }),
        ...(input.paymentMethodId && { paymentMethodId: input.paymentMethodId }),
        ...(input.endDate && { endDate: new Date(input.endDate) }),
        ...(input.timezone && { timezone: input.timezone }),
        ...(input.metadata && { metadata: input.metadata }),
      },
      include: {
        memberProfile: {
          select: {
            id: true,
            userId: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        membershipPlan: { select: { id: true, name: true, code: true } },
        paymentMethod: { select: { id: true, type: true, brand: true, last4: true } },
      },
    });

    await this.audit.log({
      action: RECURRING_BILLING_AUDIT.SCHEDULE_UPDATED,
      resource: 'billing_schedule',
      resourceId: id,
      organisationId,
      userId: actorId,
    });

    return this.mapToDto(updated);
  }

  /**
   * Pauses an active billing schedule.
   */
  async pauseSchedule(
    organisationId: string,
    id: string,
    actorId: string,
  ): Promise<BillingScheduleDto> {
    const schedule = await this.getScheduleById(organisationId, id);
    if (schedule.status !== 'ACTIVE') {
      throw new BadRequestException(`Cannot pause schedule in '${schedule.status}' status`);
    }

    const updated = await this.prisma.billingSchedule.update({
      where: { id },
      data: { status: 'PAUSED' },
      include: {
        memberProfile: {
          select: {
            id: true,
            userId: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        membershipPlan: { select: { id: true, name: true, code: true } },
        paymentMethod: { select: { id: true, type: true, brand: true, last4: true } },
      },
    });

    await this.audit.log({
      action: RECURRING_BILLING_AUDIT.SCHEDULE_PAUSED,
      resource: 'billing_schedule',
      resourceId: id,
      organisationId,
      userId: actorId,
    });

    return this.mapToDto(updated);
  }

  /**
   * Resumes a paused billing schedule.
   */
  async resumeSchedule(
    organisationId: string,
    id: string,
    actorId: string,
  ): Promise<BillingScheduleDto> {
    const schedule = await this.getScheduleById(organisationId, id);
    if (schedule.status !== 'PAUSED') {
      throw new BadRequestException(`Cannot resume schedule in '${schedule.status}' status`);
    }

    const updated = await this.prisma.billingSchedule.update({
      where: { id },
      data: { status: 'ACTIVE' },
      include: {
        memberProfile: {
          select: {
            id: true,
            userId: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        membershipPlan: { select: { id: true, name: true, code: true } },
        paymentMethod: { select: { id: true, type: true, brand: true, last4: true } },
      },
    });

    await this.audit.log({
      action: RECURRING_BILLING_AUDIT.SCHEDULE_RESUMED,
      resource: 'billing_schedule',
      resourceId: id,
      organisationId,
      userId: actorId,
    });

    return this.mapToDto(updated);
  }

  /**
   * Cancels a billing schedule.
   */
  async cancelSchedule(
    organisationId: string,
    id: string,
    actorId: string,
  ): Promise<BillingScheduleDto> {
    await this.getScheduleById(organisationId, id);

    const updated = await this.prisma.billingSchedule.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        memberProfile: {
          select: {
            id: true,
            userId: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        membershipPlan: { select: { id: true, name: true, code: true } },
        paymentMethod: { select: { id: true, type: true, brand: true, last4: true } },
      },
    });

    await this.audit.log({
      action: RECURRING_BILLING_AUDIT.SCHEDULE_CANCELLED,
      resource: 'billing_schedule',
      resourceId: id,
      organisationId,
      userId: actorId,
    });

    return this.mapToDto(updated);
  }

  private mapToDto(schedule: any): BillingScheduleDto {
    const user = schedule.memberProfile?.user;
    return {
      id: schedule.id,
      organisationId: schedule.organisationId,
      memberProfileId: schedule.memberProfileId,
      memberMembershipId: schedule.memberMembershipId,
      membershipPlanId: schedule.membershipPlanId,
      originOutletId: schedule.originOutletId,
      currency: schedule.currency,
      billingInterval: schedule.billingInterval as BillingInterval,
      intervalCount: schedule.intervalCount,
      amountMinor: schedule.amountMinor,
      amount: schedule.amountMinor / 100,
      nextBillingDate: schedule.nextBillingDate.toISOString(),
      status: schedule.status as any,
      paymentMethodId: schedule.paymentMethodId,
      startDate: schedule.startDate.toISOString(),
      endDate: schedule.endDate?.toISOString() || null,
      timezone: schedule.timezone,
      failureCount: schedule.failureCount,
      metadata: schedule.metadata as Record<string, any> | null,
      createdAt: schedule.createdAt.toISOString(),
      updatedAt: schedule.updatedAt.toISOString(),
      memberProfile: schedule.memberProfile
        ? {
            id: schedule.memberProfile.id,
            userId: schedule.memberProfile.userId,
            firstName: user?.firstName,
            lastName: user?.lastName,
            email: user?.email,
          }
        : undefined,
      membershipPlan: schedule.membershipPlan
        ? {
            id: schedule.membershipPlan.id,
            name: schedule.membershipPlan.name,
            code: schedule.membershipPlan.code,
          }
        : undefined,
      paymentMethod: schedule.paymentMethod
        ? {
            id: schedule.paymentMethod.id,
            type: schedule.paymentMethod.type,
            brand: schedule.paymentMethod.brand,
            last4: schedule.paymentMethod.last4,
          }
        : null,
    };
  }
}
