import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { FinancialMetricService } from './financial-metric.service';
import { ResolvedFinancialScope } from '../domain/financial-intelligence.permissions';
import { FinancialFilterDto } from '../dto/financial-filter.dto';
import {
  FinancialOverviewDto,
  CurrencyFinancialSummaryDto,
  FinancialTrendPointDto,
  OutletFinancialPerformanceDto,
  PlanFinancialPerformanceDto,
  FinancialTransactionDrillDownDto,
  FinancialInvoiceSummaryDto,
  FinancialRefundSummaryDto,
} from '@fitcore/types';

export interface DateRangeBounds {
  startDate: Date;
  endDate: Date;
  previousStartDate: Date;
  previousEndDate: Date;
  timezone: string;
}

@Injectable()
export class FinancialAnalyticsService {
  private readonly logger = new Logger(FinancialAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricService: FinancialMetricService,
  ) {}

  /**
   * Resolves date boundaries for current and previous equivalent period.
   */
  resolveDateBounds(filters: FinancialFilterDto, timezone: string = 'Australia/Perth'): DateRangeBounds {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);

    if (filters.startDate && filters.endDate) {
      startDate = new Date(filters.startDate);
      endDate = new Date(filters.endDate);
    } else {
      switch (filters.timeRange) {
        case 'TODAY':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'YESTERDAY':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now);
          endDate.setDate(endDate.getDate() - 1);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'LAST_7_DAYS':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'LAST_30_DAYS':
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'THIS_MONTH':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'LAST_MONTH':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          break;
        case 'THIS_QUARTER': {
          const currentQ = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), currentQ * 3, 1);
          break;
        }
        case 'LAST_QUARTER': {
          const lastQ = Math.floor(now.getMonth() / 3) - 1;
          const qYear = lastQ < 0 ? now.getFullYear() - 1 : now.getFullYear();
          const qMonth = lastQ < 0 ? 9 : lastQ * 3;
          startDate = new Date(qYear, qMonth, 1);
          endDate = new Date(qYear, qMonth + 3, 0, 23, 59, 59, 999);
          break;
        }
        case 'THIS_YEAR':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }
    }

    const durationMs = endDate.getTime() - startDate.getTime();
    const previousEndDate = new Date(startDate.getTime() - 1);
    const previousStartDate = new Date(previousEndDate.getTime() - durationMs);

    return {
      startDate,
      endDate,
      previousStartDate,
      previousEndDate,
      timezone,
    };
  }

  /**
   * 1. Financial Overview
   */
  async getOverview(
    scope: ResolvedFinancialScope,
    filters: FinancialFilterDto,
  ): Promise<FinancialOverviewDto> {
    const bounds = this.resolveDateBounds(filters);

    const orgWhere = scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {};

    // 1. Fetch available currencies for organisation
    const distinctCurrencies = await this.prisma.paymentTransaction.findMany({
      where: {
        ...orgWhere,
        createdAt: { gte: bounds.startDate, lte: bounds.endDate },
      },
      select: { currency: true },
      distinct: ['currency'],
    });

    const activeCurrencies = distinctCurrencies.map((c) => c.currency);
    if (activeCurrencies.length === 0) {
      activeCurrencies.push(filters.currency || 'AUD');
    }

    const targetCurrencies = filters.currency ? [filters.currency.toUpperCase()] : activeCurrencies;

    // 2. Aggregate metrics per currency
    const summaries: CurrencyFinancialSummaryDto[] = [];

    for (const curr of targetCurrencies) {
      const summary = await this.aggregateCurrencySummary(scope, filters, curr, bounds);
      summaries.push(summary);
    }

    const primarySummary = summaries[0] || {
      currency: filters.currency || 'AUD',
      grossRevenueMinor: 0,
      grossRevenue: 0,
      refundsMinor: 0,
      refunds: 0,
      netRevenueMinor: 0,
      netRevenue: 0,
      successfulPayments: 0,
      failedPayments: 0,
      paymentSuccessRate: null,
      outstandingInvoicesMinor: 0,
      outstandingInvoices: 0,
      overdueInvoicesCount: 0,
      overdueInvoicesMinor: 0,
      overdueInvoices: 0,
      membershipRevenueMinor: 0,
      membershipRevenue: 0,
      averageTransactionValueMinor: 0,
      averageTransactionValue: 0,
    };

    // Calculate previous period for primary currency
    const prevSummary = await this.aggregateCurrencySummary(
      scope,
      filters,
      primarySummary.currency,
      {
        startDate: bounds.previousStartDate,
        endDate: bounds.previousEndDate,
        previousStartDate: new Date(),
        previousEndDate: new Date(),
        timezone: bounds.timezone,
      },
    );

    const kpis = {
      grossRevenue: this.metricService.buildKpiCard({
        value: primarySummary.grossRevenueMinor,
        unit: primarySummary.currency,
        previousValue: prevSummary.grossRevenueMinor,
        currency: primarySummary.currency,
        isCurrency: true,
      }),
      refunds: this.metricService.buildKpiCard({
        value: primarySummary.refundsMinor,
        unit: primarySummary.currency,
        previousValue: prevSummary.refundsMinor,
        currency: primarySummary.currency,
        isCurrency: true,
      }),
      netRevenue: this.metricService.buildKpiCard({
        value: primarySummary.netRevenueMinor,
        unit: primarySummary.currency,
        previousValue: prevSummary.netRevenueMinor,
        currency: primarySummary.currency,
        isCurrency: true,
      }),
      membershipRevenue: this.metricService.buildKpiCard({
        value: primarySummary.membershipRevenueMinor,
        unit: primarySummary.currency,
        previousValue: prevSummary.membershipRevenueMinor,
        currency: primarySummary.currency,
        isCurrency: true,
      }),
      successfulPayments: this.metricService.buildKpiCard({
        value: primarySummary.successfulPayments,
        unit: 'payments',
        previousValue: prevSummary.successfulPayments,
      }),
      failedPayments: this.metricService.buildKpiCard({
        value: primarySummary.failedPayments,
        unit: 'payments',
        previousValue: prevSummary.failedPayments,
      }),
      outstandingInvoices: this.metricService.buildKpiCard({
        value: primarySummary.outstandingInvoicesMinor,
        unit: primarySummary.currency,
        previousValue: prevSummary.outstandingInvoicesMinor,
        currency: primarySummary.currency,
        isCurrency: true,
      }),
      overdueInvoices: this.metricService.buildKpiCard({
        value: primarySummary.overdueInvoicesCount,
        unit: 'invoices',
        previousValue: prevSummary.overdueInvoicesCount,
      }),
    };

    return {
      period: {
        timeRange: filters.timeRange || 'LAST_30_DAYS',
        startDate: bounds.startDate.toISOString(),
        endDate: bounds.endDate.toISOString(),
        timezone: bounds.timezone,
      },
      currencies: summaries,
      kpis,
      comparison: {
        previousStartDate: bounds.previousStartDate.toISOString(),
        previousEndDate: bounds.previousEndDate.toISOString(),
        changes: {
          grossRevenueChange: this.metricService.calculatePercentageChange(
            primarySummary.grossRevenueMinor,
            prevSummary.grossRevenueMinor,
          ),
          netRevenueChange: this.metricService.calculatePercentageChange(
            primarySummary.netRevenueMinor,
            prevSummary.netRevenueMinor,
          ),
          paymentsChange: this.metricService.calculatePercentageChange(
            primarySummary.successfulPayments,
            prevSummary.successfulPayments,
          ),
        },
      },
      dataQuality: {
        rating: 'HIGH',
        score: 95,
        notes: [
          'Cash-basis recognized payments and refunds.',
          'Transactions with unlinked memberships are marked as UNATTRIBUTED.',
        ],
      },
      meta: {
        organisationId: scope.organisationId,
        outletId: scope.outletId,
        generatedAt: new Date().toISOString(),
        model: 'CASH_PAYMENT_BASED',
      },
    };
  }

  private async aggregateCurrencySummary(
    scope: ResolvedFinancialScope,
    filters: FinancialFilterDto,
    currency: string,
    bounds: DateRangeBounds,
  ): Promise<CurrencyFinancialSummaryDto> {
    const orgWhere = scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {};

    // Outlet filter condition on transactions
    let outletCondition: any = {};
    if (scope.outletId || filters.outletId) {
      const targetOutletId = scope.outletId || filters.outletId;
      outletCondition = {
        memberMembership: {
          originOutletId: targetOutletId,
        },
      };
    }

    const txBaseWhere = {
      ...orgWhere,
      currency,
      createdAt: { gte: bounds.startDate, lte: bounds.endDate },
      ...outletCondition,
    };

    // Succeeded payments & failed payments
    const [
      succeededGrossAgg,
      succeededTxCount,
      failedTxCount,
      refundsAgg,
      membershipRevenueAgg,
      outstandingInvoicesAgg,
      overdueInvoicesCount,
      overdueInvoicesAgg,
    ] = await Promise.all([
      this.prisma.paymentTransaction.aggregate({
        where: { ...txBaseWhere, status: { in: ['SUCCEEDED', 'REFUNDED', 'PARTIALLY_REFUNDED'] } },
        _sum: { amountMinor: true },
      }),
      this.prisma.paymentTransaction.count({
        where: { ...txBaseWhere, status: { in: ['SUCCEEDED', 'REFUNDED', 'PARTIALLY_REFUNDED'] } },
      }),
      this.prisma.paymentTransaction.count({
        where: { ...txBaseWhere, status: 'FAILED' },
      }),
      this.prisma.paymentRefund.aggregate({
        where: {
          ...orgWhere,
          currency,
          status: 'SUCCEEDED',
          createdAt: { gte: bounds.startDate, lte: bounds.endDate },
        },
        _sum: { amountMinor: true },
      }),
      this.prisma.paymentTransaction.aggregate({
        where: {
          ...txBaseWhere,
          status: { in: ['SUCCEEDED', 'REFUNDED', 'PARTIALLY_REFUNDED'] },
          memberMembershipId: { not: null },
        },
        _sum: { amountMinor: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          ...orgWhere,
          currency,
          status: { in: ['OPEN', 'OVERDUE', 'PARTIALLY_PAID'] },
          dueDate: { gte: bounds.startDate, lte: bounds.endDate },
        },
        _sum: { amountDueMinor: true },
      }),
      this.prisma.invoice.count({
        where: {
          ...orgWhere,
          currency,
          status: { in: ['OPEN', 'OVERDUE', 'PARTIALLY_PAID'] },
          dueDate: { lt: new Date() },
        },
      }),
      this.prisma.invoice.aggregate({
        where: {
          ...orgWhere,
          currency,
          status: { in: ['OPEN', 'OVERDUE', 'PARTIALLY_PAID'] },
          dueDate: { lt: new Date() },
        },
        _sum: { amountDueMinor: true },
      }),
    ]);

    const grossMinor = succeededGrossAgg._sum.amountMinor || 0;
    const refundsMinor = refundsAgg._sum.amountMinor || 0;
    const netMinor = this.metricService.calculateNetRevenueMinor(grossMinor, refundsMinor);
    const membershipMinor = membershipRevenueAgg._sum.amountMinor || 0;
    const outstandingMinor = outstandingInvoicesAgg._sum.amountDueMinor || 0;
    const overdueMinor = overdueInvoicesAgg._sum.amountDueMinor || 0;

    return {
      currency,
      grossRevenueMinor: grossMinor,
      grossRevenue: this.metricService.minorToMajor(grossMinor),
      refundsMinor,
      refunds: this.metricService.minorToMajor(refundsMinor),
      totalRefundsMinor: refundsMinor,
      totalRefunds: this.metricService.minorToMajor(refundsMinor),
      refundRate: this.metricService.calculateRefundRate(grossMinor, refundsMinor) || 0,
      netRevenueMinor: netMinor,
      netRevenue: this.metricService.minorToMajor(netMinor),
      successfulPayments: succeededTxCount,
      failedPayments: failedTxCount,
      paymentSuccessRate: this.metricService.calculateSuccessRate(succeededTxCount, failedTxCount),
      successRate: this.metricService.calculateSuccessRate(succeededTxCount, failedTxCount) || 100,
      outstandingInvoicesMinor: outstandingMinor,
      outstandingInvoices: this.metricService.minorToMajor(outstandingMinor),
      outstandingBalanceMinor: outstandingMinor,
      outstandingBalance: this.metricService.minorToMajor(outstandingMinor),
      overdueInvoicesCount,
      overdueInvoicesMinor: overdueMinor,
      overdueInvoices: this.metricService.minorToMajor(overdueMinor),
      membershipRevenueMinor: membershipMinor,
      membershipRevenue: this.metricService.minorToMajor(membershipMinor),
      averageTransactionValueMinor:
        succeededTxCount > 0 ? Math.round(grossMinor / succeededTxCount) : 0,
      averageTransactionValue:
        this.metricService.calculateAverageTransactionValue(grossMinor, succeededTxCount) || 0,
    };
  }

  /**
   * 2. Daily Revenue Trends
   */
  async getRevenueTrends(
    scope: ResolvedFinancialScope,
    filters: FinancialFilterDto,
  ): Promise<FinancialTrendPointDto[]> {
    const bounds = this.resolveDateBounds(filters);
    const orgWhere = scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {};
    const currency = (filters.currency || 'AUD').toUpperCase();

    const transactions = await this.prisma.paymentTransaction.findMany({
      where: {
        ...orgWhere,
        currency,
        createdAt: { gte: bounds.startDate, lte: bounds.endDate },
      },
      select: {
        amountMinor: true,
        status: true,
        memberMembershipId: true,
        createdAt: true,
      },
    });

    const refunds = await this.prisma.paymentRefund.findMany({
      where: {
        ...orgWhere,
        currency,
        status: 'SUCCEEDED',
        createdAt: { gte: bounds.startDate, lte: bounds.endDate },
      },
      select: {
        amountMinor: true,
        createdAt: true,
      },
    });

    // Bucket by day (YYYY-MM-DD)
    const dayMap = new Map<string, {
      grossMinor: number;
      refundMinor: number;
      membershipMinor: number;
      paymentCount: number;
      successfulPaymentCount: number;
      failedPaymentCount: number;
    }>();

    // Initialize all days in bounds
    const curr = new Date(bounds.startDate);
    while (curr <= bounds.endDate) {
      const key = curr.toISOString().split('T')[0];
      dayMap.set(key, {
        grossMinor: 0,
        refundMinor: 0,
        membershipMinor: 0,
        paymentCount: 0,
        successfulPaymentCount: 0,
        failedPaymentCount: 0,
      });
      curr.setDate(curr.getDate() + 1);
    }

    for (const tx of transactions) {
      const day = tx.createdAt.toISOString().split('T')[0];
      const entry = dayMap.get(day);
      if (!entry) continue;

      entry.paymentCount++;
      if (['SUCCEEDED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(tx.status)) {
        entry.successfulPaymentCount++;
        entry.grossMinor += tx.amountMinor;
        if (tx.memberMembershipId) {
          entry.membershipMinor += tx.amountMinor;
        }
      } else if (tx.status === 'FAILED') {
        entry.failedPaymentCount++;
      }
    }

    for (const ref of refunds) {
      const day = ref.createdAt.toISOString().split('T')[0];
      const entry = dayMap.get(day);
      if (entry) {
        entry.refundMinor += ref.amountMinor;
      }
    }

    const points: FinancialTrendPointDto[] = [];
    for (const [date, data] of dayMap.entries()) {
      const netMinor = this.metricService.calculateNetRevenueMinor(data.grossMinor, data.refundMinor);
      points.push({
        date,
        currency,
        grossRevenueMinor: data.grossMinor,
        grossRevenue: this.metricService.minorToMajor(data.grossMinor),
        refundsMinor: data.refundMinor,
        refunds: this.metricService.minorToMajor(data.refundMinor),
        netRevenueMinor: netMinor,
        netRevenue: this.metricService.minorToMajor(netMinor),
        membershipRevenueMinor: data.membershipMinor,
        membershipRevenue: this.metricService.minorToMajor(data.membershipMinor),
        paymentCount: data.paymentCount,
        successfulPaymentCount: data.successfulPaymentCount,
        failedPaymentCount: data.failedPaymentCount,
      });
    }

    return points.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 3. Outlet Financial Performance Breakdown
   */
  async getOutletPerformance(
    scope: ResolvedFinancialScope,
    filters: FinancialFilterDto,
  ): Promise<OutletFinancialPerformanceDto[]> {
    const bounds = this.resolveDateBounds(filters);
    const orgWhere = scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {};
    const currency = (filters.currency || 'AUD').toUpperCase();

    // 1. Get Outlets in Organisation
    const outlets = await this.prisma.outlet.findMany({
      where: {
        ...(scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {}),
        ...(scope.outletId ? { id: scope.outletId } : {}),
      },
      select: { id: true, name: true },
    });

    // 2. Query transactions with memberMembership origin outlet
    const transactions = await this.prisma.paymentTransaction.findMany({
      where: {
        ...orgWhere,
        currency,
        createdAt: { gte: bounds.startDate, lte: bounds.endDate },
      },
      include: {
        memberMembership: { select: { originOutletId: true } },
        refunds: { select: { amountMinor: true, status: true } },
      },
    });

    const outletStats = new Map<string, {
      outletName: string;
      grossMinor: number;
      refundMinor: number;
      membershipMinor: number;
      successful: number;
      failed: number;
      total: number;
      isUnattributed: boolean;
    }>();

    for (const o of outlets) {
      outletStats.set(o.id, {
        outletName: o.name,
        grossMinor: 0,
        refundMinor: 0,
        membershipMinor: 0,
        successful: 0,
        failed: 0,
        total: 0,
        isUnattributed: false,
      });
    }

    // Unattributed bucket for transactions not linked to an outlet
    const UNATTRIBUTED_KEY = 'UNATTRIBUTED';
    outletStats.set(UNATTRIBUTED_KEY, {
      outletName: 'Unattributed / Cross-Outlet',
      grossMinor: 0,
      refundMinor: 0,
      membershipMinor: 0,
      successful: 0,
      failed: 0,
      total: 0,
      isUnattributed: true,
    });

    for (const tx of transactions) {
      const outletId = tx.memberMembership?.originOutletId || UNATTRIBUTED_KEY;
      const stats = outletStats.get(outletId) || outletStats.get(UNATTRIBUTED_KEY)!;

      stats.total++;
      if (['SUCCEEDED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(tx.status)) {
        stats.successful++;
        stats.grossMinor += tx.amountMinor;
        if (tx.memberMembershipId) {
          stats.membershipMinor += tx.amountMinor;
        }
        if (tx.refunds) {
          for (const ref of tx.refunds) {
            if (ref.status === 'SUCCEEDED') {
              stats.refundMinor += ref.amountMinor;
            }
          }
        }
      } else if (tx.status === 'FAILED') {
        stats.failed++;
      }
    }

    const results: OutletFinancialPerformanceDto[] = [];
    for (const [outletId, stats] of outletStats.entries()) {
      // Don't show empty unattributed bucket if zero activity
      if (outletId === UNATTRIBUTED_KEY && stats.total === 0) continue;

      const netMinor = this.metricService.calculateNetRevenueMinor(stats.grossMinor, stats.refundMinor);
      results.push({
        outletId,
        outletName: stats.outletName,
        currency,
        grossRevenueMinor: stats.grossMinor,
        grossRevenue: this.metricService.minorToMajor(stats.grossMinor),
        refundsMinor: stats.refundMinor,
        refunds: this.metricService.minorToMajor(stats.refundMinor),
        totalRefundsMinor: stats.refundMinor,
        totalRefunds: this.metricService.minorToMajor(stats.refundMinor),
        netRevenueMinor: netMinor,
        netRevenue: this.metricService.minorToMajor(netMinor),
        membershipRevenueMinor: stats.membershipMinor,
        membershipRevenue: this.metricService.minorToMajor(stats.membershipMinor),
        successfulPayments: stats.successful,
        failedPayments: stats.failed,
        outstandingInvoicesMinor: 0,
        outstandingInvoices: 0,
        paymentCount: stats.total,
        averageTransactionValue:
          this.metricService.calculateAverageTransactionValue(stats.grossMinor, stats.successful) || 0,
        isUnattributed: stats.isUnattributed,
      });
    }

    return results;
  }

  /**
   * 4. Membership Plan Financial Performance
   */
  async getPlanPerformance(
    scope: ResolvedFinancialScope,
    filters: FinancialFilterDto,
  ): Promise<PlanFinancialPerformanceDto[]> {
    const bounds = this.resolveDateBounds(filters);
    const orgWhere = scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {};
    const currency = (filters.currency || 'AUD').toUpperCase();

    const plans = await this.prisma.membershipPlan.findMany({
      where: orgWhere,
      select: { id: true, name: true, code: true },
    });

    const planStats = new Map<string, {
      planName: string;
      planCode: string;
      grossMinor: number;
      refundMinor: number;
      txCount: number;
      activeCount: number;
    }>();

    for (const p of plans) {
      planStats.set(p.id, {
        planName: p.name,
        planCode: p.code,
        grossMinor: 0,
        refundMinor: 0,
        txCount: 0,
        activeCount: 0,
      });
    }

    // Query transactions with linked membership plan
    const transactions = await this.prisma.paymentTransaction.findMany({
      where: {
        ...orgWhere,
        currency,
        status: { in: ['SUCCEEDED', 'REFUNDED', 'PARTIALLY_REFUNDED'] },
        memberMembership: { isNot: null },
        createdAt: { gte: bounds.startDate, lte: bounds.endDate },
      },
      include: {
        memberMembership: { select: { membershipPlanId: true } },
      },
    });

    for (const tx of transactions) {
      const planId = tx.memberMembership?.membershipPlanId;
      if (!planId) continue;
      const stats = planStats.get(planId);
      if (stats) {
        stats.grossMinor += tx.amountMinor;
        stats.txCount++;
      }
    }

    // Active memberships per plan
    const activeMemberships = await this.prisma.memberMembership.groupBy({
      by: ['membershipPlanId'],
      where: {
        ...orgWhere,
        status: 'ACTIVE',
      },
      _count: true,
    });

    for (const am of activeMemberships) {
      const stats = planStats.get(am.membershipPlanId);
      if (stats) {
        stats.activeCount = am._count;
      }
    }

    return Array.from(planStats.entries()).map(([planId, stats]) => {
      const netMinor = this.metricService.calculateNetRevenueMinor(stats.grossMinor, stats.refundMinor);
      return {
        planId,
        planName: stats.planName,
        planCode: stats.planCode,
        currency,
        grossRevenueMinor: stats.grossMinor,
        grossRevenue: this.metricService.minorToMajor(stats.grossMinor),
        refundsMinor: stats.refundMinor,
        refunds: this.metricService.minorToMajor(stats.refundMinor),
        netRevenueMinor: netMinor,
        netRevenue: this.metricService.minorToMajor(netMinor),
        transactionCount: stats.txCount,
        activeSubscriptionsCount: stats.activeCount,
      };
    });
  }

  /**
   * 5. Paginated Transaction Drill-Down
   */
  async getTransactionsDrillDown(
    scope: ResolvedFinancialScope,
    filters: FinancialFilterDto,
  ): Promise<{ data: FinancialTransactionDrillDownDto[]; total: number }> {
    const bounds = this.resolveDateBounds(filters);
    const orgWhere = scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {};

    const where: any = {
      ...orgWhere,
      createdAt: { gte: bounds.startDate, lte: bounds.endDate },
    };

    if (filters.currency) {
      where.currency = filters.currency.toUpperCase();
    }
    if (filters.paymentStatus) {
      where.status = filters.paymentStatus;
    }
    if (scope.outletId || filters.outletId) {
      where.memberMembership = {
        originOutletId: scope.outletId || filters.outletId,
      };
    }
    if (scope.roleScope === 'SELF' && scope.memberProfileId) {
      where.OR = [
        { memberProfileId: scope.memberProfileId },
        { memberProfile: { userId: scope.memberProfileId } },
      ];
    } else if (filters.memberId) {
      where.OR = [
        { memberProfileId: filters.memberId },
        { memberProfile: { userId: filters.memberId } },
      ];
    }

    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { providerTransactionId: { contains: filters.search, mode: 'insensitive' } },
        { invoice: { invoiceNumber: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.paymentTransaction.count({ where }),
      this.prisma.paymentTransaction.findMany({
        where,
        include: {
          memberProfile: {
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
          },
          invoice: { select: { invoiceNumber: true } },
          memberMembership: {
            include: {
              membershipPlan: { select: { name: true } },
              originOutlet: { select: { name: true } },
            },
          },
          refunds: { select: { amountMinor: true, status: true } },
        },
        skip: filters.offset || 0,
        take: filters.limit || 50,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const data: FinancialTransactionDrillDownDto[] = rows.map((r) => {
      const user = r.memberProfile?.user;
      const totalRefunded = r.refunds
        .filter((ref) => ref.status === 'SUCCEEDED')
        .reduce((sum, ref) => sum + ref.amountMinor, 0);

      // Derive transaction type
      let type: any = 'OTHER';
      if (r.memberMembershipId) {
        type = 'MEMBERSHIP_PAYMENT';
      } else if (r.invoiceId) {
        type = 'MANUAL_PAYMENT';
      }

      return {
        id: r.id,
        transactionDate: r.createdAt.toISOString(),
        amountMinor: r.amountMinor,
        amount: this.metricService.minorToMajor(r.amountMinor),
        currency: r.currency,
        status: r.status as any,
        type,
        paymentMethodType: r.paymentMethodType,
        memberId: r.memberProfileId,
        memberProfileId: r.memberProfileId,
        memberName: user ? `${user.firstName} ${user.lastName}` : undefined,
        memberEmail: user?.email,
        invoiceId: r.invoiceId || undefined,
        invoiceNumber: r.invoice?.invoiceNumber,
        membershipId: r.memberMembershipId || undefined,
        planName: r.memberMembership?.membershipPlan?.name,
        outletId: r.memberMembership?.originOutletId || undefined,
        outletName: r.memberMembership?.originOutlet?.name || 'Unattributed',
        source: r.provider,
        refundedAmountMinor: totalRefunded > 0 ? totalRefunded : undefined,
      };
    });

    return { transactions: data, data, total } as any;
  }

  /**
   * 6. Invoices List Drill-Down
   */
  async getInvoices(
    scope: ResolvedFinancialScope,
    filters: FinancialFilterDto,
  ): Promise<{ data: FinancialInvoiceSummaryDto[]; total: number }> {
    const bounds = this.resolveDateBounds(filters);
    const orgWhere = scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {};

    const where: any = {
      ...orgWhere,
      dueDate: { gte: bounds.startDate, lte: bounds.endDate },
    };

    if (filters.currency) {
      where.currency = filters.currency.toUpperCase();
    }
    if (filters.invoiceStatus) {
      where.status = filters.invoiceStatus;
    }
    if (scope.roleScope === 'SELF' && scope.memberProfileId) {
      where.OR = [
        { memberProfileId: scope.memberProfileId },
        { memberProfile: { userId: scope.memberProfileId } },
      ];
    } else if (filters.memberId) {
      where.OR = [
        { memberProfileId: filters.memberId },
        { memberProfile: { userId: filters.memberId } },
      ];
    }

    const [total, rows, paidCount, openCount, debtAgg] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        include: {
          memberProfile: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
          memberMembership: {
            include: { originOutlet: { select: { name: true } } },
          },
        },
        skip: filters.offset || 0,
        take: filters.limit || 50,
        orderBy: { dueDate: 'desc' },
      }),
      this.prisma.invoice.count({ where: { ...where, status: 'PAID' } }),
      this.prisma.invoice.count({ where: { ...where, status: 'OPEN' } }),
      this.prisma.invoice.aggregate({
        where: { ...where, status: { in: ['OPEN', 'PAST_DUE', 'PARTIALLY_PAID'] } },
        _sum: { amountDueMinor: true },
      }),
    ]);

    const data: FinancialInvoiceSummaryDto[] = rows.map((i) => {
      const user = i.memberProfile?.user;
      const isOverdue =
        ['OPEN', 'PARTIALLY_PAID'].includes(i.status) && i.dueDate < new Date();

      return {
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        status: i.status as any,
        dueDate: i.dueDate.toISOString(),
        issuedAt: i.issuedAt.toISOString(),
        totalMinor: i.totalMinor,
        total: this.metricService.minorToMajor(i.totalMinor),
        amountPaidMinor: i.amountPaidMinor,
        amountPaid: this.metricService.minorToMajor(i.amountPaidMinor),
        amountDueMinor: i.amountDueMinor,
        amountDue: this.metricService.minorToMajor(i.amountDueMinor),
        currency: i.currency,
        memberId: i.memberProfileId,
        memberName: user ? `${user.firstName} ${user.lastName}` : undefined,
        outletName: i.memberMembership?.originOutlet?.name || 'Unattributed',
        isOverdue,
      };
    });

    const totalOutstandingMinor = debtAgg._sum.amountDueMinor || 0;

    return {
      totalInvoices: total,
      paidInvoices: paidCount,
      openInvoices: openCount,
      totalOutstandingMinor,
      totalOutstanding: this.metricService.minorToMajor(totalOutstandingMinor),
      invoices: data,
      data,
      total,
    } as any;
  }

  /**
   * 7. Refunds Drill-Down
   */
  async getRefunds(
    scope: ResolvedFinancialScope,
    filters: FinancialFilterDto,
  ): Promise<{ data: FinancialRefundSummaryDto[]; total: number }> {
    const bounds = this.resolveDateBounds(filters);
    const orgWhere = scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {};

    const where: any = {
      ...orgWhere,
      createdAt: { gte: bounds.startDate, lte: bounds.endDate },
    };

    if (filters.currency) {
      where.currency = filters.currency.toUpperCase();
    }

    const [total, rows] = await Promise.all([
      this.prisma.paymentRefund.count({ where }),
      this.prisma.paymentRefund.findMany({
        where,
        skip: filters.offset || 0,
        take: filters.limit || 50,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const data: FinancialRefundSummaryDto[] = rows.map((r) => ({
      id: r.id,
      paymentTransactionId: r.paymentTransactionId,
      amountMinor: r.amountMinor,
      amount: this.metricService.minorToMajor(r.amountMinor),
      currency: r.currency,
      status: r.status,
      reason: r.reason || undefined,
      processedAt: r.processedAt?.toISOString(),
      requestedById: r.requestedById || undefined,
    }));

    return { data, total };
  }
}
