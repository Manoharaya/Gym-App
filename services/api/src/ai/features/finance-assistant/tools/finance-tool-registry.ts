/**
 * FitCore — Day 44: AI Finance Tool Registry
 *
 * Exposes 19 strictly READ-ONLY financial tools querying authoritative services from
 * Day 6 (Payments/Invoices), Day 41 (Financial Intelligence), Day 42 (Recurring Billing),
 * and Day 43 (Accounting Integration).
 *
 * CRITICAL SECURITY GUARANTEE: Zero financial state mutation.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { FinancialAnalyticsService } from '../../../../financial-intelligence/services/financial-analytics.service';
import { FinancialDataQualityService } from '../../../../financial-intelligence/services/financial-data-quality.service';
import { RecurringMetricsService } from '../../../../recurring-billing/services/recurring-metrics.service';
import { AccountingHealthService } from '../../../../accounting-integration/services/accounting-health.service';
import { AccountingConflictService } from '../../../../accounting-integration/services/accounting-conflict.service';
import { ResolvedFinanceScope } from '../domain/finance-permission.service';
import { ResolvedFinancialScope } from '../../../../financial-intelligence/domain/financial-intelligence.permissions';
import { ResolvedBillingScope, BillingRoleScope } from '../../../../recurring-billing/domain/recurring-billing.permissions';
import { CANONICAL_FINANCIAL_METRICS } from '../domain/finance-assistant.constants';
import { FinanceFact, FinanceComparison } from '@fitcore/types';
import { FinanceComparisonService } from '../services/finance-comparison.service';

@Injectable()
export class FinanceToolRegistry {
  private readonly logger = new Logger(FinanceToolRegistry.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsService: FinancialAnalyticsService,
    private readonly dataQualityService: FinancialDataQualityService,
    private readonly recurringMetricsService: RecurringMetricsService,
    private readonly accountingHealthService: AccountingHealthService,
    private readonly accountingConflictService: AccountingConflictService,
    private readonly comparisonService: FinanceComparisonService,
  ) {}

  private mapScope(scope: ResolvedFinanceScope): ResolvedFinancialScope {
    const roleScope = scope.isSuperAdmin
      ? 'PLATFORM'
      : scope.canViewAllOutlets
      ? 'ORGANISATION'
      : scope.isSelfOnly
      ? 'SELF'
      : 'OUTLET';

    return {
      organisationId: scope.organisationId,
      outletId: scope.outletId,
      memberProfileId: scope.memberId,
      roleScope,
    };
  }

  private mapBillingScope(scope: ResolvedFinanceScope): ResolvedBillingScope {
    const roleScope: BillingRoleScope = scope.isSuperAdmin
      ? 'PLATFORM'
      : scope.canViewAllOutlets
      ? 'ORGANISATION'
      : scope.isSelfOnly
      ? 'SELF'
      : 'OUTLET';

    return {
      organisationId: scope.organisationId,
      outletId: scope.outletId,
      memberProfileId: scope.memberId,
      roleScope,
    };
  }

  // 1. getRevenueSummary
  async getRevenueSummary(scope: ResolvedFinanceScope, params: { currency?: string; startDate?: string; endDate?: string }) {
    const currency = (params.currency || 'AUD').toUpperCase();
    const overview = await this.analyticsService.getOverview(this.mapScope(scope), {
      currency,
      startDate: params.startDate,
      endDate: params.endDate,
    });

    const curr = overview.currencies.find((c: any) => c.currency === currency) || overview.currencies[0];
    return {
      currency,
      grossRevenue: curr ? curr.grossRevenue : 0,
      refunds: curr ? curr.refunds : 0,
      netRevenue: curr ? curr.netRevenue : 0,
      period: overview.period.timeRange,
      changes: overview.comparison?.changes || null,
      source: 'FinancialAnalyticsService.getOverview',
    };
  }

  // 2. getRevenueTrend
  async getRevenueTrend(scope: ResolvedFinanceScope, params: { currency?: string; startDate?: string; endDate?: string }) {
    const currency = (params.currency || 'AUD').toUpperCase();
    const trends = await this.analyticsService.getRevenueTrends(this.mapScope(scope), {
      currency,
      startDate: params.startDate,
      endDate: params.endDate,
    });
    return {
      currency,
      dataPoints: trends.slice(-14), // last 14 data points
      source: 'FinancialAnalyticsService.getRevenueTrends',
    };
  }

  // 3. getMembershipRevenue
  async getMembershipRevenue(scope: ResolvedFinanceScope, params: { currency?: string; startDate?: string; endDate?: string }) {
    const currency = (params.currency || 'AUD').toUpperCase();
    const overview = await this.analyticsService.getOverview(this.mapScope(scope), {
      currency,
      startDate: params.startDate,
      endDate: params.endDate,
    });
    const curr = overview.currencies.find((c: any) => c.currency === currency) || overview.currencies[0];
    return {
      currency,
      membershipRevenue: curr ? curr.membershipRevenue : 0,
      totalNetRevenue: curr ? curr.netRevenue : 0,
      sharePercentage: curr && curr.netRevenue > 0
        ? Math.round((curr.membershipRevenue / curr.netRevenue) * 1000) / 10
        : 0,
      source: 'FinancialAnalyticsService.getOverview',
    };
  }

  // 4. getOutletRevenue
  async getOutletRevenue(scope: ResolvedFinanceScope, params: { currency?: string; startDate?: string; endDate?: string }) {
    const currency = (params.currency || 'AUD').toUpperCase();
    const outletPerf = await this.analyticsService.getOutletPerformance(this.mapScope(scope), {
      currency,
      startDate: params.startDate,
      endDate: params.endDate,
    });
    return {
      currency,
      outlets: outletPerf.map((o: any) => ({
        outletId: o.outletId,
        outletName: o.outletName,
        grossRevenue: o.grossRevenue,
        netRevenue: o.netRevenue,
        transactionCount: o.transactionCount,
      })),
      source: 'FinancialAnalyticsService.getOutletPerformance',
    };
  }

  // 5. getPlanRevenue
  async getPlanRevenue(scope: ResolvedFinanceScope, params: { currency?: string; startDate?: string; endDate?: string }) {
    const currency = (params.currency || 'AUD').toUpperCase();
    const planPerf = await this.analyticsService.getPlanPerformance(this.mapScope(scope), {
      currency,
      startDate: params.startDate,
      endDate: params.endDate,
    });
    return {
      currency,
      plans: planPerf.slice(0, 5).map((p: any) => ({
        planId: p.planId,
        planName: p.planName,
        netRevenue: p.netRevenue,
        activeSubscribers: p.activeSubscribers,
      })),
      source: 'FinancialAnalyticsService.getPlanPerformance',
    };
  }

  // 6. getPaymentSummary
  async getPaymentSummary(scope: ResolvedFinanceScope, params: { currency?: string; startDate?: string; endDate?: string }) {
    const currency = (params.currency || 'AUD').toUpperCase();
    const overview = await this.analyticsService.getOverview(this.mapScope(scope), {
      currency,
      startDate: params.startDate,
      endDate: params.endDate,
    });
    const curr = overview.currencies.find((c: any) => c.currency === currency) || overview.currencies[0];
    return {
      currency,
      successfulPayments: curr ? curr.successfulPayments : 0,
      failedPayments: curr ? curr.failedPayments : 0,
      paymentSuccessRate: curr ? curr.paymentSuccessRate : null,
      averageTransactionValue: curr ? curr.averageTransactionValue : 0,
      source: 'FinancialAnalyticsService.getOverview',
    };
  }

  // 7. getPaymentFailures
  async getPaymentFailures(scope: ResolvedFinanceScope, params: { currency?: string; startDate?: string; endDate?: string }) {
    const currency = (params.currency || 'AUD').toUpperCase();
    const overview = await this.analyticsService.getOverview(this.mapScope(scope), {
      currency,
      startDate: params.startDate,
      endDate: params.endDate,
    });
    const curr = overview.currencies.find((c: any) => c.currency === currency) || overview.currencies[0];

    // Find categorized attempts if any
    const failedAttempts = await this.prisma.paymentAttempt.findMany({
      where: {
        organisationId: scope.organisationId,
        status: 'FAILED',
      },
      take: 20,
    });

    const categoryCounts: Record<string, number> = {};
    for (const a of failedAttempts) {
      const cat = a.failureCategory || 'UNCLASSIFIED';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    return {
      currency,
      totalFailedCount: curr ? curr.failedPayments : failedAttempts.length,
      categories: categoryCounts,
      source: 'PaymentAttempt / FinancialAnalyticsService',
    };
  }

  // 8. getInvoiceSummary
  async getInvoiceSummary(scope: ResolvedFinanceScope, params: { currency?: string; startDate?: string; endDate?: string }) {
    const currency = (params.currency || 'AUD').toUpperCase();
    const overview = await this.analyticsService.getOverview(this.mapScope(scope), {
      currency,
      startDate: params.startDate,
      endDate: params.endDate,
    });
    const curr = overview.currencies.find((c: any) => c.currency === currency) || overview.currencies[0];

    return {
      currency,
      overdueInvoicesCount: curr ? curr.overdueInvoicesCount : 0,
      overdueAmount: curr ? curr.overdueInvoices : 0,
      totalOutstanding: curr ? curr.outstandingInvoices : 0,
      source: 'FinancialAnalyticsService.getOverview',
    };
  }

  // 9. getOutstandingBalances
  async getOutstandingBalances(scope: ResolvedFinanceScope, params: { currency?: string }) {
    const currency = (params.currency || 'AUD').toUpperCase();
    const invoices = await this.analyticsService.getInvoices(this.mapScope(scope), { currency, invoiceStatus: 'OPEN' });
    return {
      currency,
      totalOutstanding: (invoices as any).totalOutstanding || 0,
      totalInvoices: (invoices as any).totalInvoices || 0,
      openInvoices: (invoices as any).openInvoices || 0,
      source: 'FinancialAnalyticsService.getInvoices',
    };
  }

  // 10. getRefundSummary
  async getRefundSummary(scope: ResolvedFinanceScope, params: { currency?: string; startDate?: string; endDate?: string }) {
    const currency = (params.currency || 'AUD').toUpperCase();
    const overview = await this.analyticsService.getOverview(this.mapScope(scope), {
      currency,
      startDate: params.startDate,
      endDate: params.endDate,
    });
    const curr = overview.currencies.find((c: any) => c.currency === currency) || overview.currencies[0];
    const gross = curr ? curr.grossRevenue : 0;
    const refunds = curr ? curr.refunds : 0;

    return {
      currency,
      refunds,
      refundRate: gross > 0 ? Math.round((refunds / gross) * 1000) / 10 : 0,
      source: 'FinancialAnalyticsService.getOverview',
    };
  }

  // 11. getRecurringBillingSummary
  async getRecurringBillingSummary(scope: ResolvedFinanceScope, params: { currency?: string }) {
    const currency = (params.currency || 'AUD').toUpperCase();
    const metrics = await this.recurringMetricsService.getMetrics(this.mapBillingScope(scope), currency);
    return {
      currency: metrics.currency,
      activeSchedules: metrics.activeSchedules,
      recurringBilled: metrics.recurringBilled,
      recurringCollected: metrics.recurringCollected,
      recurringFailed: metrics.recurringFailed,
      collectionRate: metrics.collectionRate,
      recoveryRate: metrics.dunningRecoveryRate ?? metrics.retryRecoveryRate ?? 0,
      source: 'RecurringMetricsService.getMetrics',
    };
  }

  // 12. getCollectionRate
  async getCollectionRate(scope: ResolvedFinanceScope, params: { currency?: string }) {
    const currency = (params.currency || 'AUD').toUpperCase();
    const metrics = await this.recurringMetricsService.getMetrics(this.mapBillingScope(scope), currency);
    return {
      currency: metrics.currency,
      collectionRate: metrics.collectionRate,
      recurringBilled: metrics.recurringBilled,
      recurringCollected: metrics.recurringCollected,
      source: 'RecurringMetricsService.getMetrics',
    };
  }

  // 13. getRecoveryRate
  async getRecoveryRate(scope: ResolvedFinanceScope, params: { currency?: string }) {
    const currency = (params.currency || 'AUD').toUpperCase();
    const metrics = await this.recurringMetricsService.getMetrics(this.mapBillingScope(scope), currency);
    return {
      currency: metrics.currency,
      recoveryRate: metrics.dunningRecoveryRate ?? metrics.retryRecoveryRate ?? 0,
      dunningRecoveryRate: metrics.dunningRecoveryRate,
      retryRecoveryRate: metrics.retryRecoveryRate,
      activeDunningCases: metrics.activeDunningCases,
      source: 'RecurringMetricsService.getMetrics',
    };
  }

  // 14. getDunningSummary
  async getDunningSummary(scope: ResolvedFinanceScope, params: { currency?: string }) {
    const currency = (params.currency || 'AUD').toUpperCase();
    const metrics = await this.recurringMetricsService.getMetrics(this.mapBillingScope(scope), currency);
    return {
      currency: metrics.currency,
      activeDunningCases: metrics.activeDunningCases,
      overdueInvoicesCount: metrics.overdueInvoicesCount,
      overdueInvoicesAmount: metrics.overdueInvoicesAmount,
      recoveryRate: metrics.dunningRecoveryRate ?? metrics.retryRecoveryRate ?? 0,
      source: 'RecurringMetricsService.getMetrics',
    };
  }

  // 15. getFinancialComparison
  async getFinancialComparison(
    scope: ResolvedFinanceScope,
    params: {
      currency?: string;
      startDate?: string;
      endDate?: string;
      comparisonStartDate?: string;
      comparisonEndDate?: string;
    },
  ): Promise<FinanceComparison[]> {
    const currency = (params.currency || 'AUD').toUpperCase();
    const current = await this.getRevenueSummary(scope, { currency, startDate: params.startDate, endDate: params.endDate });
    const prev = await this.getRevenueSummary(scope, { currency, startDate: params.comparisonStartDate, endDate: params.comparisonEndDate });

    const netComparison = this.comparisonService.compareMetrics({
      metric: 'Net Revenue',
      currentValue: current.netRevenue,
      comparisonValue: prev.netRevenue,
      currency,
    });

    const grossComparison = this.comparisonService.compareMetrics({
      metric: 'Gross Revenue',
      currentValue: current.grossRevenue,
      comparisonValue: prev.grossRevenue,
      currency,
    });

    return [netComparison, grossComparison];
  }

  // 16. getAccountingSyncStatus
  async getAccountingSyncStatus(scope: ResolvedFinanceScope) {
    const health = await this.accountingHealthService.getHealth(scope.organisationId);
    return {
      provider: health.provider,
      status: health.status,
      isTokenValid: health.isTokenValid,
      lastSuccessfulSyncAt: health.lastSuccessfulSyncAt,
      failedSyncsCount: health.failedSyncsCount,
      systemHealthRating: health.systemHealthRating,
      source: 'AccountingHealthService.getHealth',
    };
  }

  // 17. getAccountingReconciliationSummary
  async getAccountingReconciliationSummary(scope: ResolvedFinanceScope) {
    const conflicts = await this.accountingConflictService.listConflicts(scope.organisationId, 'UNRESOLVED');
    const health = await this.accountingHealthService.getHealth(scope.organisationId);

    return {
      unresolvedConflictsCount: conflicts.length,
      reconciliationMismatchCount: health.reconciliationMismatchCount,
      conflicts: conflicts.slice(0, 5).map((c: any) => ({
        id: c.id,
        entityType: c.entityType,
        conflictType: c.conflictType,
        fitcoreValue: c.fitcoreValue,
        externalValue: c.externalValue,
      })),
      source: 'AccountingConflictService.listConflicts',
    };
  }

  // 18. getFinancialDataQuality
  async getFinancialDataQuality(scope: ResolvedFinanceScope) {
    const quality = await this.dataQualityService.assessDataQuality(this.mapScope(scope));
    const anomaliesCount = (quality.metrics.missingOutletCount || 0) + (quality.metrics.unprojectedTransactionCount || 0);
    return {
      integrityRating: quality.rating,
      integrityScore: quality.overallScore ?? quality.score ?? 100,
      anomaliesCount,
      metrics: quality.metrics,
      recommendations: quality.recommendations,
      source: 'FinancialDataQualityService.assessDataQuality',
    };
  }

  // 19. getFinancialMetricDefinition
  getFinancialMetricDefinition(metricKey: string) {
    const normalizedKey = metricKey.toUpperCase().replace(/\s+/g, '_');
    const metric =
      (CANONICAL_FINANCIAL_METRICS as any)[normalizedKey] ||
      Object.values(CANONICAL_FINANCIAL_METRICS).find(
        (m) => m.name.toLowerCase() === metricKey.toLowerCase(),
      );

    if (metric) {
      return {
        metric: metric.name,
        definition: metric.definition,
        formula: metric.formula,
        source: metric.source,
      };
    }

    return {
      metric: metricKey,
      definition: 'Standard financial metric recognised in FitCore financial intelligence ledger.',
      formula: 'Configured by platform revenue policies',
      source: 'FitCore Authoritative Ledger',
    };
  }
}
