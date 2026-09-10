/**
 * FitCore — Day 44: Financial Context Service
 *
 * Prepares minimum-necessary, sanitized, authoritative financial context for the AI Finance Assistant.
 * Excludes all health data (PAR-Q, injuries, medical notes) and payment credentials.
 */

import { Injectable, Logger } from '@nestjs/common';
import { FinanceToolRegistry } from '../tools/finance-tool-registry';
import { ResolvedFinanceScope } from '../domain/finance-permission.service';
import { FinanceQuery, FinanceFact, FinanceComparison, FinanceDataQualityRating } from '@fitcore/types';

export interface PreparedFinanceContext {
  facts: FinanceFact[];
  comparisons: FinanceComparison[];
  authoritativeNumbers: Set<number | string>;
  metricsText: string;
  dataQuality: FinanceDataQualityRating;
  hasUnattributedRevenue: boolean;
  syncDelayed: boolean;
  sources: Array<{ tool: string; metric: string }>;
}

@Injectable()
export class FinanceContextService {
  private readonly logger = new Logger(FinanceContextService.name);

  constructor(private readonly toolRegistry: FinanceToolRegistry) {}

  /**
   * Retrieves and formats the exact financial context needed for an intent.
   */
  async buildContext(scope: ResolvedFinanceScope, query: FinanceQuery): Promise<PreparedFinanceContext> {
    const facts: FinanceFact[] = [];
    let comparisons: FinanceComparison[] = [];
    const authoritativeNumbers = new Set<number | string>();
    const sources: Array<{ tool: string; metric: string }> = [];

    const currency = query.currency || 'AUD';
    authoritativeNumbers.add(currency);

    let hasUnattributedRevenue = false;
    let syncDelayed = false;
    let dataQuality: FinanceDataQualityRating = 'HIGH';

    // 1. Core Revenue Summary (always useful baseline)
    const revenueSummary = await this.toolRegistry.getRevenueSummary(scope, {
      currency,
      startDate: query.startDate,
      endDate: query.endDate,
    });

    facts.push({
      metric: 'Gross Revenue',
      value: revenueSummary.grossRevenue,
      currency,
      period: revenueSummary.period,
      source: 'getRevenueSummary',
    });
    facts.push({
      metric: 'Refunds',
      value: revenueSummary.refunds,
      currency,
      period: revenueSummary.period,
      source: 'getRevenueSummary',
    });
    facts.push({
      metric: 'Net Revenue',
      value: revenueSummary.netRevenue,
      currency,
      period: revenueSummary.period,
      source: 'getRevenueSummary',
    });

    authoritativeNumbers.add(revenueSummary.grossRevenue);
    authoritativeNumbers.add(revenueSummary.refunds);
    authoritativeNumbers.add(revenueSummary.netRevenue);
    sources.push({ tool: 'getRevenueSummary', metric: 'Gross and Net Revenue' });

    // 2. Intent-specific data retrieval
    switch (query.intent) {
      case 'REVENUE_COMPARISON': {
        comparisons = await this.toolRegistry.getFinancialComparison(scope, {
          currency,
          startDate: query.startDate,
          endDate: query.endDate,
          comparisonStartDate: query.comparisonStartDate,
          comparisonEndDate: query.comparisonEndDate,
        });

        for (const comp of comparisons) {
          authoritativeNumbers.add(comp.currentValue);
          authoritativeNumbers.add(comp.comparisonValue);
          authoritativeNumbers.add(comp.difference);
          if (comp.percentageDifference !== null && comp.percentageDifference !== undefined) {
            authoritativeNumbers.add(comp.percentageDifference);
            authoritativeNumbers.add(Math.abs(comp.percentageDifference));
          }
        }
        sources.push({ tool: 'getFinancialComparison', metric: 'Period Comparisons' });
        break;
      }

      case 'MEMBERSHIP_REVENUE': {
        const membershipRev = await this.toolRegistry.getMembershipRevenue(scope, {
          currency,
          startDate: query.startDate,
          endDate: query.endDate,
        });
        facts.push({
          metric: 'Membership Revenue',
          value: membershipRev.membershipRevenue,
          currency,
          source: 'getMembershipRevenue',
        });
        authoritativeNumbers.add(membershipRev.membershipRevenue);
        authoritativeNumbers.add(membershipRev.sharePercentage);
        sources.push({ tool: 'getMembershipRevenue', metric: 'Membership Revenue' });
        break;
      }

      case 'OUTLET_REVENUE': {
        const outletPerf = await this.toolRegistry.getOutletRevenue(scope, {
          currency,
          startDate: query.startDate,
          endDate: query.endDate,
        });
        for (const o of outletPerf.outlets) {
          facts.push({
            metric: `Outlet Revenue: ${o.outletName}`,
            value: o.netRevenue,
            currency,
            source: 'getOutletRevenue',
          });
          authoritativeNumbers.add(o.netRevenue);
          authoritativeNumbers.add(o.grossRevenue);
        }
        sources.push({ tool: 'getOutletRevenue', metric: 'Outlet Breakdown' });
        break;
      }

      case 'PLAN_REVENUE': {
        const planPerf = await this.toolRegistry.getPlanRevenue(scope, {
          currency,
          startDate: query.startDate,
          endDate: query.endDate,
        });
        for (const p of planPerf.plans) {
          facts.push({
            metric: `Plan: ${p.planName}`,
            value: p.netRevenue,
            currency,
            source: 'getPlanRevenue',
          });
          authoritativeNumbers.add(p.netRevenue);
        }
        sources.push({ tool: 'getPlanRevenue', metric: 'Plan Breakdown' });
        break;
      }

      case 'PAYMENT_SUMMARY':
      case 'PAYMENT_FAILURES': {
        const paymentSummary = await this.toolRegistry.getPaymentSummary(scope, {
          currency,
          startDate: query.startDate,
          endDate: query.endDate,
        });
        facts.push({
          metric: 'Successful Payments',
          value: paymentSummary.successfulPayments,
          source: 'getPaymentSummary',
        });
        facts.push({
          metric: 'Failed Payments',
          value: paymentSummary.failedPayments,
          source: 'getPaymentSummary',
        });
        authoritativeNumbers.add(paymentSummary.successfulPayments);
        authoritativeNumbers.add(paymentSummary.failedPayments);

        if (paymentSummary.paymentSuccessRate !== null) {
          facts.push({
            metric: 'Payment Success Rate',
            value: `${paymentSummary.paymentSuccessRate}%`,
            source: 'getPaymentSummary',
          });
          authoritativeNumbers.add(paymentSummary.paymentSuccessRate);
        }
        sources.push({ tool: 'getPaymentSummary', metric: 'Payment Counts and Rates' });
        break;
      }

      case 'INVOICE_SUMMARY':
      case 'OUTSTANDING_BALANCE': {
        const invoiceSummary = await this.toolRegistry.getInvoiceSummary(scope, {
          currency,
          startDate: query.startDate,
          endDate: query.endDate,
        });
        facts.push({
          metric: 'Outstanding Invoices',
          value: invoiceSummary.totalOutstanding,
          currency,
          source: 'getInvoiceSummary',
        });
        facts.push({
          metric: 'Outstanding Balance',
          value: invoiceSummary.totalOutstanding,
          currency,
          source: 'getInvoiceSummary',
        });
        facts.push({
          metric: 'Overdue Invoices Count',
          value: invoiceSummary.overdueInvoicesCount,
          source: 'getInvoiceSummary',
        });
        authoritativeNumbers.add(invoiceSummary.totalOutstanding);
        authoritativeNumbers.add(invoiceSummary.overdueInvoicesCount);
        authoritativeNumbers.add(invoiceSummary.overdueAmount);
        sources.push({ tool: 'getInvoiceSummary', metric: 'Invoice Health' });
        break;
      }

      case 'RECURRING_BILLING':
      case 'COLLECTION':
      case 'RECOVERY':
      case 'DUNNING': {
        const recurring = await this.toolRegistry.getRecurringBillingSummary(scope, { currency });
        facts.push({
          metric: 'Recurring Billed',
          value: recurring.recurringBilled,
          currency,
          source: 'getRecurringBillingSummary',
        });
        facts.push({
          metric: 'Recurring Collected',
          value: recurring.recurringCollected,
          currency,
          source: 'getRecurringBillingSummary',
        });
        facts.push({
          metric: 'Collection Rate',
          value: `${recurring.collectionRate}%`,
          source: 'getRecurringBillingSummary',
        });
        facts.push({
          metric: 'Recovery Rate',
          value: `${recurring.recoveryRate}%`,
          source: 'getRecurringBillingSummary',
        });
        authoritativeNumbers.add(recurring.recurringBilled);
        authoritativeNumbers.add(recurring.recurringCollected);
        authoritativeNumbers.add(recurring.recurringFailed);
        if (recurring.collectionRate != null) authoritativeNumbers.add(recurring.collectionRate);
        if (recurring.recoveryRate != null) authoritativeNumbers.add(recurring.recoveryRate);
        sources.push({ tool: 'getRecurringBillingSummary', metric: 'Recurring Billing & Collections' });
        break;
      }

      case 'ACCOUNTING_SYNC':
      case 'RECONCILIATION': {
        const acct = await this.toolRegistry.getAccountingSyncStatus(scope);
        const reconc = await this.toolRegistry.getAccountingReconciliationSummary(scope);
        facts.push({
          metric: 'Accounting Connection Status',
          value: acct.status,
          source: 'getAccountingSyncStatus',
        });
        facts.push({
          metric: 'Unresolved Conflicts',
          value: reconc.unresolvedConflictsCount,
          source: 'getAccountingReconciliationSummary',
        });
        authoritativeNumbers.add(reconc.unresolvedConflictsCount);
        authoritativeNumbers.add(acct.failedSyncsCount);
        if (acct.status !== 'CONNECTED') syncDelayed = true;
        sources.push({ tool: 'getAccountingSyncStatus', metric: 'Accounting Status' });
        break;
      }

      case 'METRIC_DEFINITION': {
        const def = this.toolRegistry.getFinancialMetricDefinition('net_revenue');
        facts.push({
          metric: def.metric,
          value: def.formula,
          source: 'getFinancialMetricDefinition',
        });
        sources.push({ tool: 'getFinancialMetricDefinition', metric: 'Metric Definitions' });
        break;
      }

      default:
        break;
    }

    // 3. Data Quality check
    try {
      const dq = await this.toolRegistry.getFinancialDataQuality(scope);
      dataQuality = dq.integrityRating as any;
      if ((dq.metrics?.missingOutletCount || 0) > 0 || dq.recommendations.some((r: string) => r.toLowerCase().includes('outlet') || r.toLowerCase().includes('unattributed'))) {
        hasUnattributedRevenue = true;
      }
    } catch {
      // safe fallback
    }

    // Format metrics text for AI Context
    const metricsText = JSON.stringify(
      {
        facts,
        comparisons,
        currency,
        period: revenueSummary.period,
        dataQuality,
      },
      null,
      2,
    );

    return {
      facts,
      comparisons,
      authoritativeNumbers,
      metricsText,
      dataQuality,
      hasUnattributedRevenue,
      syncDelayed,
      sources,
    };
  }
}
