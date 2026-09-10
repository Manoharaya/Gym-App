import { Injectable } from '@nestjs/common';
import {
  FinancialKpiCardDto,
  FinancialDataQualityRating,
} from '@fitcore/types';

@Injectable()
export class FinancialMetricService {
  /**
   * Converts integer minor units (e.g. cents, paisa) to major units (dollars, rupees).
   * FitCore enforces integer minor units in PostgreSQL.
   */
  minorToMajor(amountMinor: number): number {
    if (!amountMinor || isNaN(amountMinor)) return 0;
    return Math.round((amountMinor / 100) * 100) / 100;
  }

  /**
   * Calculates Net Cash Revenue: Gross Inflow minus Processed Refunds.
   */
  calculateNetRevenueMinor(grossMinor: number, refundMinor: number): number {
    return Math.max(0, (grossMinor || 0) - (refundMinor || 0));
  }

  /**
   * Safe percentage change calculation avoiding Infinity% and NaN%.
   * Returns null if previous period has zero base without meaningful movement.
   */
  calculatePercentageChange(current: number, previous: number): number | null {
    if (previous === 0) {
      if (current === 0) return 0;
      return null; // Denominator is zero; undefined growth rate
    }
    const delta = current - previous;
    const pct = (delta / previous) * 100;
    return Math.round(pct * 10) / 10;
  }

  /**
   * Calculates payment success rate with zero-division safety.
   */
  calculateSuccessRate(successfulCount: number, failedCount: number): number | null {
    const totalAttempts = successfulCount + failedCount;
    if (totalAttempts <= 0) return null;
    const rate = (successfulCount / totalAttempts) * 100;
    return Math.round(rate * 10) / 10;
  }

  /**
   * Calculates average transaction value with zero-division safety.
   */
  calculateAverageTransactionValue(grossMinor: number, count: number): number | null {
    if (!count || count <= 0) return null;
    const avgMinor = Math.round(grossMinor / count);
    return this.minorToMajor(avgMinor);
  }

  /**
   * Formats a monetary value for visual dashboard display.
   */
  formatCurrency(amountMinor: number, currency: string = 'AUD'): string {
    const major = this.minorToMajor(amountMinor);
    const symbols: Record<string, string> = {
      AUD: '$',
      USD: '$',
      NPR: 'Rs.',
      GBP: '£',
      EUR: '€',
      NZD: '$',
      SGD: 'S$',
    };
    const sym = symbols[currency.toUpperCase()] || `${currency} `;
    return `${sym}${major.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Evaluates data quality rating based on missing outlet attributions and anomalies.
   */
  evaluateDataQuality(params: {
    missingOutletPercentage: number;
    failedPaymentRate: number;
    unprojectedCount: number;
  }): FinancialDataQualityRating {
    const { missingOutletPercentage, failedPaymentRate, unprojectedCount } = params;

    if (unprojectedCount > 10 || missingOutletPercentage > 40 || failedPaymentRate > 25) {
      return 'NEEDS_ATTENTION';
    }
    if (unprojectedCount > 0 || missingOutletPercentage > 15 || failedPaymentRate > 10) {
      return 'LOW';
    }
    if (missingOutletPercentage > 5) {
      return 'MEDIUM';
    }
    return 'HIGH';
  }

  /**
   * Builds standardized KPI card with previous period comparison.
   */
  buildKpiCard(params: {
    value: number;
    unit: string;
    previousValue?: number;
    currency?: string;
    isCurrency?: boolean;
    dataQuality?: string;
  }): FinancialKpiCardDto {
    const { value, unit, previousValue, currency = 'AUD', isCurrency = false, dataQuality } = params;
    const changePercentage =
      previousValue !== undefined ? this.calculatePercentageChange(value, previousValue) : undefined;

    let formattedValue: string;
    if (isCurrency) {
      formattedValue = this.formatCurrency(value, currency);
    } else {
      formattedValue = `${value.toLocaleString('en-US')}${unit ? ` ${unit}` : ''}`;
    }

    return {
      value,
      unit,
      previousValue,
      changePercentage,
      dataQuality,
      formattedValue,
    };
  }
}
