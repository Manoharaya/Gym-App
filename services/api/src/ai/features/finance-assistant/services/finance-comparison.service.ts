/**
 * FitCore — Day 44: Financial Comparison Engine
 *
 * Implements deterministic period-over-period and entity financial comparisons
 * with absolute zero-division protection and non-hallucinated delta metrics.
 */

import { Injectable } from '@nestjs/common';
import { FinanceComparison, FinanceComparisonDirection } from '@fitcore/types';

@Injectable()
export class FinanceComparisonService {
  /**
   * Compares two financial metrics deterministically.
   */
  compareMetrics(params: {
    metric: string;
    currentValue: number;
    comparisonValue: number;
    currency?: string;
    start?: string;
    end?: string;
  }): FinanceComparison {
    const { metric, currentValue, comparisonValue, currency, start, end } = params;
    const difference = Math.round((currentValue - comparisonValue) * 100) / 100;

    let percentageDifference: number | null = null;
    let direction: FinanceComparisonDirection = 'UNCHANGED';

    if (comparisonValue === 0) {
      if (currentValue === 0) {
        direction = 'UNCHANGED';
        percentageDifference = 0;
      } else {
        direction = 'NOT_COMPARABLE';
        percentageDifference = null;
      }
    } else {
      const rawPct = ((currentValue - comparisonValue) / Math.abs(comparisonValue)) * 100;
      percentageDifference = Math.round(rawPct * 10) / 10;

      if (percentageDifference > 0) {
        direction = 'UP';
      } else if (percentageDifference < 0) {
        direction = 'DOWN';
      } else {
        direction = 'UNCHANGED';
      }
    }

    return {
      metric,
      currentValue,
      comparisonValue,
      difference,
      percentageDifference,
      direction,
      currency,
      denominator: comparisonValue,
      dataWindow: start && end ? { start, end } : undefined,
    };
  }
}
