/**
 * FitCore — Day 44: AI Finance Query Interpretation & Date Resolution Service
 *
 * Translates natural language queries (English and Nepali) into structured,
 * validated FinanceQuery models with deterministic UTC date boundaries.
 */

import { Injectable, Logger } from '@nestjs/common';
import { FinanceIntent, FinanceQuery } from '@fitcore/types';

export interface ParsedDateRange {
  startDate: string;
  endDate: string;
  comparisonStartDate?: string;
  comparisonEndDate?: string;
  label: string;
  isComparison: boolean;
}

@Injectable()
export class FinanceQueryService {
  private readonly logger = new Logger(FinanceQueryService.name);

  /**
   * Parses a natural language query into a structured FinanceQuery.
   */
  interpretQuery(params: {
    query: string;
    organisationId: string;
    outletId?: string;
    currency?: string;
    startDate?: string;
    endDate?: string;
    timezone?: string;
  }): FinanceQuery {
    const { query, organisationId, outletId, currency } = params;
    const lowerQuery = query.toLowerCase();

    const intent = this.detectIntent(lowerQuery);
    const dateRange = this.resolveDateRange(lowerQuery, params.startDate, params.endDate);

    return {
      intent,
      organisationId,
      outletId,
      currency: currency?.toUpperCase() || 'AUD',
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      comparisonStartDate: dateRange.comparisonStartDate,
      comparisonEndDate: dateRange.comparisonEndDate,
      confidence: 0.95,
    };
  }

  /**
   * Detects user intent from English and Nepali natural language queries.
   */
  detectIntent(query: string): FinanceIntent {
    // 1. Definition Queries (Only generic definitions, not operational metrics with 'our' or 'my')
    const isDefinitionPhrase =
      query.includes('definition') ||
      query.includes('define') ||
      query.includes('meaning of') ||
      query.includes('how do you calculate') ||
      query.includes('formula') ||
      query.includes('परिभाषा') ||
      (query.includes('what does') && query.includes('mean')) ||
      (query.includes('what is') && !query.includes('our') && !query.includes('my') && !query.includes('we') && !query.includes('this') && !query.includes('last'));

    if (isDefinitionPhrase) {
      if (
        query.includes('net revenue') ||
        query.includes('gross revenue') ||
        query.includes('collection rate') ||
        query.includes('recovery rate') ||
        query.includes('outstanding') ||
        query.includes('आम्दानी')
      ) {
        return 'METRIC_DEFINITION';
      }
    }

    // 2. Comparison Queries
    if (
      query.includes('compare') ||
      query.includes('comparison') ||
      query.includes('versus') ||
      query.includes(' vs ') ||
      query.includes('higher than') ||
      query.includes('lower than') ||
      query.includes('difference between') ||
      query.includes('what changed') ||
      query.includes('तुलना') ||
      query.includes('परिवर्तन')
    ) {
      return 'REVENUE_COMPARISON';
    }

    // 3. Health & Holistic Summaries
    if (
      query.includes('health') ||
      query.includes('how are we performing') ||
      query.includes('financial status') ||
      query.includes('summarise our finances') ||
      query.includes('summarize our finances') ||
      query.includes('overall') ||
      query.includes('स्वास्थ्य') ||
      query.includes('समग्र')
    ) {
      return 'FINANCIAL_HEALTH';
    }

    // 4. Accounting & Reconciliation
    if (query.includes('reconcil') || query.includes('mismatch') || query.includes('conflict')) {
      return 'RECONCILIATION';
    }
    if (query.includes('accounting') || query.includes('xero') || query.includes('quickbooks') || query.includes('sync')) {
      return 'ACCOUNTING_SYNC';
    }

    // 5. Recurring Billing, Dunning, Recovery, Collections
    if (query.includes('recovery rate') || query.includes('recovered')) {
      return 'RECOVERY';
    }
    if (query.includes('collection rate') || query.includes('collections') || query.includes('collected')) {
      return 'COLLECTION';
    }
    if (query.includes('dunning') || query.includes('escalat')) {
      return 'DUNNING';
    }
    if (query.includes('recurring') || query.includes('subscription')) {
      return 'RECURRING_BILLING';
    }

    // 6. Invoices & Outstanding Balances
    if (query.includes('outstanding') || query.includes('unpaid') || query.includes('owing') || query.includes('बाँकी')) {
      return 'OUTSTANDING_BALANCE';
    }
    if (query.includes('invoice') || query.includes('overdue') || query.includes('बिल')) {
      return 'INVOICE_SUMMARY';
    }

    // 7. Refunds
    if (query.includes('refund') || query.includes('फिर्ता')) {
      return 'REFUNDS';
    }

    // 8. Payments & Payment Failures
    if (query.includes('fail') || query.includes('decline') || query.includes('अस्वीकृत') || query.includes('असफल')) {
      return 'PAYMENT_FAILURES';
    }
    if (query.includes('payment') || query.includes('भुक्तानी')) {
      return 'PAYMENT_SUMMARY';
    }

    // 9. Membership & Plan Revenue
    if (query.includes('plan') || query.includes('membership revenue') || query.includes('सदस्यता आम्दानी')) {
      return query.includes('plan') ? 'PLAN_REVENUE' : 'MEMBERSHIP_REVENUE';
    }

    // 10. Outlet Revenue
    if (query.includes('outlet') || query.includes('location') || query.includes('शाखा') || query.includes('आउटलेट')) {
      return 'OUTLET_VENUE' as any === 'OUTLET_VENUE' ? 'OUTLET_REVENUE' : 'OUTLET_REVENUE';
    }

    // 11. Trend
    if (query.includes('trend') || query.includes('over time') || query.includes('चलन')) {
      return 'FINANCIAL_TREND';
    }

    // 12. Default to Revenue Summary
    if (query.includes('revenue') || query.includes('income') || query.includes('made') || query.includes('collect') || query.includes('आम्दानी') || query.includes('कमाई')) {
      return 'REVENUE_SUMMARY';
    }

    return 'REVENUE_SUMMARY';
  }

  /**
   * Resolves natural language date terms into deterministic ISO UTC timestamps.
   */
  resolveDateRange(
    query: string,
    explicitStart?: string,
    explicitEnd?: string,
  ): ParsedDateRange {
    if (explicitStart && explicitEnd) {
      return {
        startDate: new Date(explicitStart).toISOString(),
        endDate: new Date(explicitEnd).toISOString(),
        label: `${explicitStart} to ${explicitEnd}`,
        isComparison: false,
      };
    }

    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth(); // 0-indexed

    // Today / आज
    if (query.includes('today') || query.includes('आज')) {
      const start = new Date(Date.UTC(currentYear, currentMonth, now.getUTCDate(), 0, 0, 0, 0));
      const end = new Date(Date.UTC(currentYear, currentMonth, now.getUTCDate(), 23, 59, 59, 999));
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        label: 'Today',
        isComparison: false,
      };
    }

    // Yesterday / हिजो
    if (query.includes('yesterday') || query.includes('हिजो')) {
      const start = new Date(Date.UTC(currentYear, currentMonth, now.getUTCDate() - 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(currentYear, currentMonth, now.getUTCDate() - 1, 23, 59, 59, 999));
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        label: 'Yesterday',
        isComparison: false,
      };
    }

    // Last Month / गत महिना
    if (query.includes('last month') || query.includes('previous month') || query.includes('गत महिना')) {
      const start = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999)); // Last day of prev month

      const compStart = new Date(Date.UTC(currentYear, currentMonth - 2, 1, 0, 0, 0, 0));
      const compEnd = new Date(Date.UTC(currentYear, currentMonth - 1, 0, 23, 59, 59, 999));

      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        comparisonStartDate: compStart.toISOString(),
        comparisonEndDate: compEnd.toISOString(),
        label: 'Last Month',
        isComparison: query.includes('compare') || query.includes('vs') || query.includes('तुलना'),
      };
    }

    // Past 30 Days / पछिल्लो ३० दिन
    if (query.includes('past 30 days') || query.includes('last 30 days') || query.includes('३० दिन')) {
      const end = new Date(now.getTime());
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const compStart = new Date(start.getTime() - 30 * 24 * 60 * 60 * 1000);
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        comparisonStartDate: compStart.toISOString(),
        comparisonEndDate: start.toISOString(),
        label: 'Past 30 Days',
        isComparison: query.includes('compare') || query.includes('vs') || query.includes('तुलना'),
      };
    }

    // Past 7 Days / past week / यो हप्ता
    if (query.includes('past 7 days') || query.includes('last 7 days') || query.includes('this week') || query.includes('यो हप्ता')) {
      const end = new Date(now.getTime());
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        label: 'Past 7 Days',
        isComparison: false,
      };
    }

    // Default: This Month / यो महिना
    const start = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));
    const compStart = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0, 0));
    const compEnd = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999));

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      comparisonStartDate: compStart.toISOString(),
      comparisonEndDate: compEnd.toISOString(),
      label: 'This Month',
      isComparison: query.includes('compare') || query.includes('vs') || query.includes('तुलना') || query.includes('परिवर्तन'),
    };
  }

  /**
   * Detects language (English or Nepali).
   */
  detectLanguage(query: string): 'en' | 'ne' {
    const nepaliPattern = /[\u0900-\u097F]/;
    return nepaliPattern.test(query) ? 'ne' : 'en';
  }
}
