/**
 * FitCore — Day 42: Billing Cycle Service
 *
 * Generates billing cycles for due schedules, preserves historical pricing snapshots,
 * and creates authoritative invoices via InvoiceService.
 */

import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { InvoiceService } from '../../payments/services/invoice.service';
import { BillingScheduleService } from './billing-schedule.service';
import { AuditService } from '../../audit/audit.service';
import { RECURRING_BILLING_AUDIT } from '../domain/recurring-billing.constants';
import { ResolvedBillingScope } from '../domain/recurring-billing.permissions';
import { BillingCycleFilterDto } from '../dto/schedule-filter.dto';
import { BillingCycleDto } from '@fitcore/types';

@Injectable()
export class BillingCycleService {
  private readonly logger = new Logger(BillingCycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceService: InvoiceService,
    private readonly scheduleService: BillingScheduleService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Generates a single billing cycle for a schedule.
   * Concurrency-safe: uses @@unique([billingScheduleId, cycleNumber]).
   */
  async generateCycleForSchedule(
    scheduleId: string,
    actorId: string = 'SYSTEM',
  ): Promise<BillingCycleDto | null> {
    const schedule = await this.prisma.billingSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        memberMembership: { include: { membershipPlan: true } },
        memberProfile: { select: { id: true, userId: true } },
      },
    });

    if (!schedule || schedule.status !== 'ACTIVE') {
      return null;
    }

    // Determine cycle number
    const cycleCount = await this.prisma.billingCycle.count({
      where: { billingScheduleId: schedule.id },
    });
    const nextCycleNumber = cycleCount + 1;

    // Check if this cycle number was already generated
    const existingCycle = await this.prisma.billingCycle.findUnique({
      where: {
        billingScheduleId_cycleNumber: {
          billingScheduleId: schedule.id,
          cycleNumber: nextCycleNumber,
        },
      },
    });
    if (existingCycle) {
      return this.mapToDto(existingCycle);
    }

    const periodStart = schedule.nextBillingDate;
    const periodEnd = this.scheduleService.calculateNextBillingDate(
      periodStart,
      schedule.billingInterval as any,
      schedule.intervalCount,
    );

    // 1. Create authoritative Invoice via Day 6 InvoiceService
    const plan = schedule.memberMembership.membershipPlan;
    const invoice = await this.invoiceService.createInvoice(
      {
        organisationId: schedule.organisationId,
        memberProfileId: schedule.memberProfileId,
        currency: schedule.currency,
        dueDate: new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000),
        notes: `Recurring subscription: ${plan.name} (${schedule.billingInterval})`,
        items: [
          {
            description: `${plan.name} - Subscription Cycle #${nextCycleNumber}`,
            quantity: 1,
            unitAmountMinor: schedule.amountMinor,
            membershipPlanId: schedule.membershipPlanId,
            memberMembershipId: schedule.memberMembershipId,
          },
        ],
        idempotencyKey: `rec_inv_${schedule.id}_cycle_${nextCycleNumber}`,
      },
      actorId,
    );

    // 2. Create BillingCycle linking invoice
    const cycle = await this.prisma.billingCycle.create({
      data: {
        organisationId: schedule.organisationId,
        billingScheduleId: schedule.id,
        memberProfileId: schedule.memberProfileId,
        memberMembershipId: schedule.memberMembershipId,
        cycleNumber: nextCycleNumber,
        periodStart,
        periodEnd,
        scheduledBillingDate: periodStart,
        invoiceId: invoice.id,
        status: 'INVOICED',
        amountMinor: schedule.amountMinor,
        currency: schedule.currency,
        metadata: {
          planName: plan.name,
          planCode: plan.code,
          interval: schedule.billingInterval,
        },
      },
      include: {
        invoice: { select: { invoiceNumber: true } },
      },
    });

    await this.audit.log({
      action: RECURRING_BILLING_AUDIT.CYCLE_CREATED,
      resource: 'billing_cycle',
      resourceId: cycle.id,
      organisationId: schedule.organisationId,
      userId: actorId,
      metadata: {
        cycleNumber: cycle.cycleNumber,
        invoiceId: invoice.id,
        amountMinor: cycle.amountMinor,
      },
    });

    return this.mapToDto(cycle);
  }

  /**
   * Scans and generates due billing cycles across an organisation in bounded batches.
   */
  async processDueSchedules(
    organisationId: string,
    batchSize: number = 50,
    actorId: string = 'SYSTEM',
  ): Promise<{ processedCount: number; cyclesGenerated: number }> {
    const now = new Date();

    const dueSchedules = await this.prisma.billingSchedule.findMany({
      where: {
        organisationId,
        status: 'ACTIVE',
        nextBillingDate: { lte: now },
      },
      take: batchSize,
      orderBy: { nextBillingDate: 'asc' },
    });

    let cyclesGenerated = 0;

    for (const schedule of dueSchedules) {
      try {
        const cycle = await this.generateCycleForSchedule(schedule.id, actorId);
        if (cycle) cyclesGenerated++;
      } catch (err: any) {
        this.logger.error(
          `Failed to generate cycle for schedule ${schedule.id}: ${err.message}`,
          err.stack,
        );
      }
    }

    return {
      processedCount: dueSchedules.length,
      cyclesGenerated,
    };
  }

  /**
   * Retrieves a cycle by ID.
   */
  async getCycleById(organisationId: string, id: string): Promise<BillingCycleDto> {
    const cycle = await this.prisma.billingCycle.findFirst({
      where: { id, organisationId },
      include: {
        invoice: { select: { invoiceNumber: true } },
        paymentAttempts: { orderBy: { attemptNumber: 'asc' } },
      },
    });

    if (!cycle) {
      throw new NotFoundException(`Billing cycle '${id}' not found`);
    }

    return this.mapToDto(cycle);
  }

  /**
   * Lists cycles with filtering and pagination.
   */
  async listCycles(
    scope: ResolvedBillingScope,
    filter: BillingCycleFilterDto,
  ): Promise<{ data: BillingCycleDto[]; total: number }> {
    const where: any = { organisationId: scope.organisationId };

    if (scope.roleScope === 'SELF' && scope.memberProfileId) {
      where.OR = [
        { memberProfileId: scope.memberProfileId },
        { memberProfile: { userId: scope.memberProfileId } },
      ];
    }

    if (filter.billingScheduleId) {
      where.billingScheduleId = filter.billingScheduleId;
    }
    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.currency) {
      where.currency = filter.currency.toUpperCase();
    }

    const [total, rows] = await Promise.all([
      this.prisma.billingCycle.count({ where }),
      this.prisma.billingCycle.findMany({
        where,
        skip: filter.offset || 0,
        take: filter.limit || 50,
        orderBy: { scheduledBillingDate: 'desc' },
        include: {
          invoice: { select: { invoiceNumber: true } },
          paymentAttempts: { orderBy: { attemptNumber: 'asc' } },
        },
      }),
    ]);

    return {
      data: rows.map((r) => this.mapToDto(r)),
      total,
    };
  }

  private mapToDto(cycle: any): BillingCycleDto {
    return {
      id: cycle.id,
      organisationId: cycle.organisationId,
      billingScheduleId: cycle.billingScheduleId,
      memberProfileId: cycle.memberProfileId,
      memberMembershipId: cycle.memberMembershipId,
      cycleNumber: cycle.cycleNumber,
      periodStart: cycle.periodStart.toISOString(),
      periodEnd: cycle.periodEnd.toISOString(),
      scheduledBillingDate: cycle.scheduledBillingDate.toISOString(),
      invoiceId: cycle.invoiceId,
      invoiceNumber: cycle.invoice?.invoiceNumber,
      status: cycle.status as any,
      amountMinor: cycle.amountMinor,
      amount: cycle.amountMinor / 100,
      currency: cycle.currency,
      processedAt: cycle.processedAt?.toISOString() || null,
      metadata: cycle.metadata as Record<string, any> | null,
      createdAt: cycle.createdAt.toISOString(),
      updatedAt: cycle.updatedAt.toISOString(),
      paymentAttempts: cycle.paymentAttempts?.map((a: any) => ({
        id: a.id,
        organisationId: a.organisationId,
        billingCycleId: a.billingCycleId,
        invoiceId: a.invoiceId,
        paymentTransactionId: a.paymentTransactionId,
        attemptNumber: a.attemptNumber,
        attemptedAt: a.attemptedAt.toISOString(),
        status: a.status as any,
        failureCode: a.failureCode,
        failureCategory: a.failureCategory as any,
        providerReference: a.providerReference,
        nextRetryAt: a.nextRetryAt?.toISOString() || null,
        metadata: a.metadata as Record<string, any> | null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
    };
  }
}
