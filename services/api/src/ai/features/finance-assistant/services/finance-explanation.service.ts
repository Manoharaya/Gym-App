/**
 * FitCore — Day 44: Financial Explanation Engine
 *
 * Separates FACT, OBSERVED SIGNAL, POSSIBLE EXPLANATION, and LIMITATION.
 * Strictly avoids ungrounded causality claims ("because members lost interest").
 */

import { Injectable } from '@nestjs/common';
import { FinanceFact, FinanceComparison } from '@fitcore/types';
import { ADVISORY_DISCLAIMERS } from '../domain/finance-assistant.constants';

export interface ExplanationStructure {
  facts: FinanceFact[];
  observations: string[];
  possibleExplanations: string[];
  limitations: string[];
}

@Injectable()
export class FinanceExplanationService {
  /**
   * Builds grounded observations, cautious hypotheses, and stated limitations
   * based strictly on verified facts and comparisons.
   */
  generateExplanation(params: {
    facts: FinanceFact[];
    comparisons?: FinanceComparison[];
    hasUnattributedRevenue?: boolean;
    syncDelayed?: boolean;
    language?: 'en' | 'ne';
  }): ExplanationStructure {
    const { facts, comparisons, hasUnattributedRevenue, syncDelayed, language = 'en' } = params;

    const observations: string[] = [];
    const possibleExplanations: string[] = [];
    const limitations: string[] = [];

    // 1. Observations from Comparisons
    if (comparisons && comparisons.length > 0) {
      for (const comp of comparisons) {
        if (comp.direction === 'UP' && comp.percentageDifference !== null) {
          observations.push(
            language === 'ne'
              ? `${comp.metric} गत अवधिको तुलनामा ${comp.percentageDifference}% ले बढेको छ।`
              : `${comp.metric} increased by ${comp.percentageDifference}% compared to the comparison period.`,
          );
        } else if (comp.direction === 'DOWN' && comp.percentageDifference !== null && comp.percentageDifference !== undefined) {
          observations.push(
            language === 'ne'
              ? `${comp.metric} गत अवधिको तुलनामा ${Math.abs(comp.percentageDifference)}% ले घटेको छ।`
              : `${comp.metric} decreased by ${Math.abs(comp.percentageDifference)}% compared to the comparison period.`,
          );
        } else if (comp.direction === 'NOT_COMPARABLE') {
          observations.push(
            language === 'ne'
              ? `${comp.metric} को लागि गत अवधिमा कुनै रेकर्ड नभएकाले प्रतिशत तुलना उपलब्ध छैन।`
              : `${comp.metric} percentage change is not comparable because the baseline comparison period had zero or unavailable records.`,
          );
        }
      }
    }

    // 2. Observations from Facts
    const refundsFact = facts.find((f) => f.metric.toLowerCase().includes('refund'));
    const failedPaymentsFact = facts.find((f) => f.metric.toLowerCase().includes('fail'));
    const collectionRateFact = facts.find((f) => f.metric.toLowerCase().includes('collection'));

    if (refundsFact && Number(refundsFact.value) > 0) {
      observations.push(
        language === 'ne'
          ? `यस अवधिमा कुल ${refundsFact.currency || ''} ${refundsFact.value} फिर्ता (refund) गरिएको छ।`
          : `Recorded total refunds of ${refundsFact.currency || ''} ${refundsFact.value} during this period.`,
      );
    }

    if (failedPaymentsFact && Number(failedPaymentsFact.value) > 0) {
      observations.push(
        language === 'ne'
          ? `यस अवधिमा ${failedPaymentsFact.value} असफल भुक्तानीहरू दर्ता भएका छन्।`
          : `Observed ${failedPaymentsFact.value} payment failure occurrences in this window.`,
      );
    }

    // 3. Cautious Hypotheses (Non-Causal)
    if (comparisons?.some((c) => c.metric.includes('Net Revenue') && c.direction === 'UP')) {
      possibleExplanations.push(
        language === 'ne'
          ? `कुल आम्दानीमा भएको वृद्धि सदस्यता भुक्तानी तथा नियमित संकलन दरमा सुधारसँग सम्बन्धित हुन सक्छ।`
          : `The observed increase in net revenue appears consistent with stronger recurring collections and payment processing volumes.`,
      );
    } else if (comparisons?.some((c) => c.metric.includes('Net Revenue') && c.direction === 'DOWN')) {
      possibleExplanations.push(
        language === 'ne'
          ? `आम्दानीमा आएको कमी भुक्तानी विफलता वा सदस्यता नवीकरण ढिलाइसँग जोडिएको हुन सक्छ।`
          : `The decline in recognized revenue may be associated with elevated payment failures or delayed billing cycle renewals.`,
      );
    }

    // 4. Stated Limitations
    limitations.push(
      language === 'ne'
        ? `यो विश्लेषणले केवल अभिलेखबद्ध तथ्याङ्क देखाउँछ र यसले प्रत्यक्ष कारण प्रमाणित गर्दैन।`
        : ADVISORY_DISCLAIMERS.CAUSATION_LIMITATION,
    );

    if (hasUnattributedRevenue) {
      limitations.push(
        language === 'ne'
          ? `केही कारोबारहरू कुनै शाखामा समावेश नभएकाले शाखागत आम्दानी अधुरो हुन सक्छ।`
          : `Some transactions are currently unattributed to an outlet; outlet revenue distribution may be incomplete.`,
      );
    }

    if (syncDelayed) {
      limitations.push(
        language === 'ne'
          ? `बाह्य लेखा प्रणाली (Xero/QuickBooks) सिङ्क ढिलाइ हुन सक्छ।`
          : `External accounting provider synchronization is pending or delayed; external ledger balances may lag.`,
      );
    }

    return {
      facts,
      observations,
      possibleExplanations,
      limitations,
    };
  }
}
