import { Injectable } from '@nestjs/common';
import { SalesKpiCardDto, SalesDataQuality } from '@fitcore/types';
import { MIN_SAMPLE_SIZE } from '../domain/sales-intelligence.constants';

@Injectable()
export class SalesMetricService {
  /**
   * Calculates conversion rate as percentage (0-100).
   * Returns null if total is 0.
   */
  calculateConversionRate(converted: number, total: number): number | null {
    if (!total || total <= 0) return null;
    return Math.round((converted / total) * 1000) / 10;
  }

  /**
   * Calculates percentage change between current and previous period.
   * Returns null if previous period value is 0 or undefined.
   */
  calculatePercentageChange(current: number, previous: number | null | undefined): number | null {
    if (previous === null || previous === undefined || previous <= 0) {
      return null;
    }
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  /**
   * Evaluates data quality based on sample size against minimum threshold.
   */
  evaluateDataQuality(sampleCount: number, threshold: number = MIN_SAMPLE_SIZE): SalesDataQuality {
    if (sampleCount <= 0) return 'INSUFFICIENT_DATA';
    if (sampleCount < threshold) return 'PARTIAL_DATA';
    return 'COMPLETE_DATA';
  }

  /**
   * Calculates speed to lead in elapsed seconds.
   */
  calculateSpeedToLeadSeconds(leadCreatedAt: Date, firstContactAt: Date): number {
    const elapsedMs = firstContactAt.getTime() - leadCreatedAt.getTime();
    return Math.max(0, Math.round(elapsedMs / 1000));
  }

  /**
   * Calculates average of numeric array.
   */
  calculateAverage(values: number[]): number | null {
    if (!values || values.length === 0) return null;
    const sum = values.reduce((acc, curr) => acc + curr, 0);
    return Math.round((sum / values.length) * 10) / 10;
  }

  /**
   * Calculates median of numeric array.
   */
  calculateMedian(values: number[]): number | null {
    if (!values || values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 !== 0) {
      return sorted[mid];
    }
    return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
  }

  /**
   * Assembles a structured KPI card with comparison, trend, and data quality.
   */
  buildKpiCard(params: {
    key: string;
    label: string;
    currentValue: number;
    comparisonValue?: number | null;
    unit?: string;
    definition?: string;
    sampleCount?: number;
  }): SalesKpiCardDto {
    const { key, label, currentValue, comparisonValue, unit, definition, sampleCount } = params;

    const count = sampleCount !== undefined ? sampleCount : currentValue;
    const dataQuality = this.evaluateDataQuality(count);

    let absoluteChange: number | null = null;
    let percentageChange: number | null = null;
    let trend: 'UP' | 'DOWN' | 'STABLE' | null = null;

    if (comparisonValue !== null && comparisonValue !== undefined) {
      absoluteChange = Math.round((currentValue - comparisonValue) * 10) / 10;
      percentageChange = this.calculatePercentageChange(currentValue, comparisonValue);

      if (absoluteChange > 0) trend = 'UP';
      else if (absoluteChange < 0) trend = 'DOWN';
      else trend = 'STABLE';
    }

    return {
      key,
      label,
      value: currentValue,
      comparisonValue: comparisonValue ?? null,
      absoluteChange,
      percentageChange,
      trend,
      dataQuality,
      unit,
      definition,
    };
  }
}
