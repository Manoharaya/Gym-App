/**
 * FitCore — Day 44: Financial Recommendation Engine
 *
 * Generates explainable, advisory recommendations based on observed operational data.
 * Adheres to AI OBSERVES -> AI EXPLAINS -> AI RECOMMENDS -> HUMAN DECIDES.
 */

import { Injectable } from '@nestjs/common';
import { FinanceRecommendation } from '@fitcore/types';

@Injectable()
export class FinanceRecommendationService {
  /**
   * Evaluates operational metrics and generates advisory action items.
   */
  generateRecommendations(params: {
    overdueInvoicesCount?: number;
    failedPaymentCount?: number;
    unresolvedConflictsCount?: number;
    unattributedRevenueMinor?: number;
    collectionRate?: number;
    language?: 'en' | 'ne';
  }): FinanceRecommendation[] {
    const {
      overdueInvoicesCount = 0,
      failedPaymentCount = 0,
      unresolvedConflictsCount = 0,
      unattributedRevenueMinor = 0,
      collectionRate,
      language = 'en',
    } = params;

    const recommendations: FinanceRecommendation[] = [];

    // 1. Overdue Invoices
    if (overdueInvoicesCount > 0) {
      recommendations.push({
        recommendation:
          language === 'ne'
            ? 'भाखा नाघेका बिलहरू (Overdue Invoices) समीक्षा गर्नुहोस्।'
            : 'Review the overdue invoice collection queue and assign follow-up tasks.',
        reason:
          language === 'ne'
            ? `हाल ${overdueInvoicesCount} वटा बिलहरूको भुक्तानी समय नाघेको छ।`
            : `There are currently ${overdueInvoicesCount} overdue invoices requiring front-desk or billing follow-up.`,
        priority: overdueInvoicesCount > 10 ? 'HIGH' : 'MEDIUM',
      });
    }

    // 2. Failed Payments / Recurring Failures
    if (failedPaymentCount > 5) {
      recommendations.push({
        recommendation:
          language === 'ne'
            ? 'विफल भुक्तानीहरूको कारण (Failed Payments) अनुसन्धान गर्नुहोस्।'
            : 'Investigate payment failure reasons in the recurring billing dashboard.',
        reason:
          language === 'ne'
            ? `${failedPaymentCount} वटा भुक्तानीहरू अस्वीकृत भएका छन्।`
            : `${failedPaymentCount} payment attempts failed, primarily due to insufficient funds or expired payment methods.`,
        priority: 'HIGH',
      });
    }

    // 3. Unresolved Accounting Conflicts (Day 43)
    if (unresolvedConflictsCount > 0) {
      recommendations.push({
        recommendation:
          language === 'ne'
            ? 'लेखा समायोजन विवादहरू (Accounting Conflicts) समाधान गर्नुहोस्।'
            : 'Review and resolve pending accounting reconciliation conflicts.',
        reason:
          language === 'ne'
            ? `${unresolvedConflictsCount} वटा कारोबारहरू बाह्य लेखा प्रणालीसँग मेल खाएका छैनन्।`
            : `${unresolvedConflictsCount} reconciliation conflicts detected between FitCore and external accounting ledgers.`,
        priority: 'MEDIUM',
      });
    }

    // 4. Unattributed Revenue (Day 41)
    if (unattributedRevenueMinor > 0) {
      recommendations.push({
        recommendation:
          language === 'ne'
            ? 'शाखा नतोकिएका कारोबारहरूलाई सम्बन्धित शाखामा मिलाउनुहोस्।'
            : 'Assign member origin outlets to eliminate unattributed revenue.',
        reason:
          language === 'ne'
            ? 'केही सदस्यताहरू कुनै शाखासँग नजोडिएकाले शाखागत प्रतिवेदन अधुरो छ।'
            : 'Unattributed transactions prevent 100% complete outlet-level financial reporting.',
        priority: 'LOW',
      });
    }

    // 5. Low Collection Rate (Day 42)
    if (collectionRate !== undefined && collectionRate < 85) {
      recommendations.push({
        recommendation:
          language === 'ne'
            ? 'नियमित संकलन दर (Collection Rate) बढाउन डनिङ प्रक्रिया सक्रिय गर्नुहोस्।'
            : 'Enable automated dunning SMS/email reminders to improve collection rate.',
        reason:
          language === 'ne'
            ? `हालको संकलन दर ${collectionRate}% छ, जुन लक्ष्यभन्दा कम हो।`
            : `Current recurring collection rate is ${collectionRate}%, below target operating threshold (85%).`,
        priority: 'HIGH',
      });
    }

    return recommendations;
  }
}
