/**
 * FitCore — Day 42: Recurring Billing Metrics & Member Status Service
 *
 * Computes deterministic recurring billing KPIs, collection rates, recovery rates,
 * and user-friendly member billing summaries without floating-point errors.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ResolvedBillingScope } from '../domain/recurring-billing.permissions';
import {
  MemberBillingStatusDto,
  RecurringBillingMetricsDto,
} from '@fitcore/types';

@Injectable()
export class RecurringMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Computes recurring billing and collection KPIs for an organisation/currency.
   */
  async getMetrics(
    scope: ResolvedBillingScope,
    currency: string = 'AUD',
  ): Promise<RecurringBillingMetricsDto> {
    const orgId = scope.organisationId;
    const cur = currency.toUpperCase();
    const now = new Date();

    // 1. Active schedules count and upcoming billing
    const schedules = await this.prisma.billingSchedule.findMany({
      where: {
        organisationId: orgId,
        currency: cur,
        status: 'ACTIVE',
      },
    });

    const activeSchedules = schedules.length;
    const upcomingDateLimit = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // next 7 days

    const upcomingBillingMinor = schedules
      .filter((s) => s.nextBillingDate <= upcomingDateLimit)
      .reduce((sum, s) => sum + s.amountMinor, 0);

    // 2. Billing Cycles analysis
    const cycles = await this.prisma.billingCycle.findMany({
      where: {
        organisationId: orgId,
        currency: cur,
      },
      include: { paymentAttempts: true },
    });

    let recurringBilledMinor = 0;
    let recurringCollectedMinor = 0;
    let recurringFailedMinor = 0;

    let successfulAttempts = 0;
    let failedAttempts = 0;

    let initiallyFailedMinor = 0;
    let recoveredAfterFailureMinor = 0;

    for (const c of cycles) {
      recurringBilledMinor += c.amountMinor;

      if (c.status === 'PAID') {
        recurringCollectedMinor += c.amountMinor;
      } else if (c.status === 'FAILED' || c.status === 'PAST_DUE') {
        recurringFailedMinor += c.amountMinor;
      }

      const attempts = c.paymentAttempts || [];
      for (const a of attempts) {
        if (a.status === 'SUCCEEDED') successfulAttempts++;
        if (a.status === 'FAILED') failedAttempts++;
      }

      // Check if cycle experienced a failure before succeeding (recovery)
      const hadFailure = attempts.some((a) => a.status === 'FAILED');
      const eventuallySucceeded = attempts.some((a) => a.status === 'SUCCEEDED');

      if (hadFailure) {
        initiallyFailedMinor += c.amountMinor;
        if (eventuallySucceeded) {
          recoveredAfterFailureMinor += c.amountMinor;
        }
      }
    }

    // Safe rates (0 / 0 = null)
    const totalAttempts = successfulAttempts + failedAttempts;
    const recurringPaymentSuccessRate =
      totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 1000) / 10 : null;

    const collectionRate =
      recurringBilledMinor > 0
        ? Math.round((recurringCollectedMinor / recurringBilledMinor) * 1000) / 10
        : null;

    const recoveryRate =
      initiallyFailedMinor > 0
        ? Math.round((recoveredAfterFailureMinor / initiallyFailedMinor) * 1000) / 10
        : null;

    // 3. Active Dunning Cases
    const activeDunningCases = await this.prisma.dunningCase.count({
      where: {
        organisationId: orgId,
        status: { in: ['OPEN', 'RETRYING', 'CUSTOMER_ACTION_REQUIRED', 'STAFF_REVIEW', 'ESCALATED'] },
      },
    });

    // 4. Overdue Invoices
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        organisationId: orgId,
        currency: cur,
        status: { in: ['OPEN', 'OVERDUE'] },
        dueDate: { lt: now },
      },
    });

    const overdueInvoicesCount = overdueInvoices.length;
    const overdueInvoicesAmountMinor = overdueInvoices.reduce(
      (sum, i) => sum + i.amountDueMinor,
      0,
    );

    return {
      currency: cur,
      activeSchedules,
      upcomingBillingMinor,
      upcomingBilling: upcomingBillingMinor / 100,
      recurringBilledMinor,
      recurringBilled: recurringBilledMinor / 100,
      recurringCollectedMinor,
      recurringCollected: recurringCollectedMinor / 100,
      recurringFailedMinor,
      recurringFailed: recurringFailedMinor / 100,
      recurringPaymentSuccessRate,
      retryRecoveryRate: recoveryRate,
      dunningRecoveryRate: recoveryRate,
      collectionRate,
      activeDunningCases,
      overdueInvoicesCount,
      overdueInvoicesAmountMinor,
      overdueInvoicesAmount: overdueInvoicesAmountMinor / 100,
    };
  }

  /**
   * Retrieves a friendly member billing summary without exposing raw provider codes.
   */
  async getMemberBillingStatus(
    organisationId: string,
    memberProfileId: string,
  ): Promise<MemberBillingStatusDto> {
    const schedule = await this.prisma.billingSchedule.findFirst({
      where: {
        organisationId,
        OR: [
          { memberProfileId },
          { memberProfile: { userId: memberProfileId } },
        ],
        status: { in: ['ACTIVE', 'PAST_DUE', 'PAUSED'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        paymentMethod: true,
        membershipPlan: true,
      },
    });

    const openInvoices = await this.prisma.invoice.findMany({
      where: {
        organisationId,
        OR: [
          { memberProfileId },
          { memberProfile: { userId: memberProfileId } },
        ],
        status: { in: ['OPEN', 'OVERDUE'] },
      },
    });

    const now = new Date();
    const openInvoicesCount = openInvoices.length;
    const overdueInvoicesCount = openInvoices.filter((i) => i.dueDate < now).length;

    let statusText = 'No active billing schedule';
    let isActionRequired = false;
    let actionType: string | null = null;

    if (schedule) {
      if (schedule.status === 'ACTIVE') {
        statusText = 'Active subscription — next payment scheduled';
      } else if (schedule.status === 'PAST_DUE') {
        statusText = 'Payment past due — retry scheduled or update required';
        isActionRequired = true;
        actionType = 'UPDATE_PAYMENT_METHOD';
      } else if (schedule.status === 'PAUSED') {
        statusText = 'Subscription paused';
      }
    }

    const pm = schedule?.paymentMethod;
    const paymentMethodMasked = pm
      ? `${pm.brand?.toUpperCase() || pm.type} •••• ${pm.last4 || '••••'}`
      : null;

    return {
      schedule: schedule
        ? {
            id: schedule.id,
            organisationId: schedule.organisationId,
            memberProfileId: schedule.memberProfileId,
            memberMembershipId: schedule.memberMembershipId,
            membershipPlanId: schedule.membershipPlanId,
            currency: schedule.currency,
            billingInterval: schedule.billingInterval as any,
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
            createdAt: schedule.createdAt.toISOString(),
            updatedAt: schedule.updatedAt.toISOString(),
          }
        : null,
      statusText,
      nextBillingDate: schedule?.nextBillingDate.toISOString() || null,
      nextAmount: schedule ? schedule.amountMinor / 100 : null,
      currency: schedule?.currency || null,
      paymentMethodMasked,
      isActionRequired,
      actionType,
      openInvoicesCount,
      overdueInvoicesCount,
    };
  }
}
