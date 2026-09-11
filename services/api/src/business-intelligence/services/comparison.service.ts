import { Injectable } from '@nestjs/common';
import {
  BusinessFilterDto,
} from '../dto/business-filter.dto';
import {
  BusinessPeriodComparison,
  BusinessKpiDirection,
  BusinessDataQualityRating,
} from '@fitcore/types';

export interface DateWindowBounds {
  startDate: Date;
  endDate: Date;
  previousStartDate: Date;
  previousEndDate: Date;
  timezone: string;
}

@Injectable()
export class ComparisonService {
  /**
   * Resolves current and equivalent previous date boundaries.
   */
  resolveDateBounds(filters: BusinessFilterDto, timezone: string = 'Australia/Perth'): DateWindowBounds {
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
          const currentQuarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
          break;
        }
        case 'LAST_QUARTER': {
          const prevQuarter = Math.floor(now.getMonth() / 3) - 1;
          const year = prevQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
          const qMonth = (prevQuarter + 4) % 4 * 3;
          startDate = new Date(year, qMonth, 1);
          endDate = new Date(year, qMonth + 3, 0, 23, 59, 59, 999);
          break;
        }
        case 'THIS_YEAR':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'LAST_YEAR':
          startDate = new Date(now.getFullYear() - 1, 0, 1);
          endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    const durationMs = Math.max(endDate.getTime() - startDate.getTime(), 24 * 60 * 60 * 1000);
    let previousStartDate: Date;
    let previousEndDate: Date;

    if (filters.comparisonStartDate && filters.comparisonEndDate) {
      previousStartDate = new Date(filters.comparisonStartDate);
      previousEndDate = new Date(filters.comparisonEndDate);
    } else if (filters.comparisonType === 'YEAR_OVER_YEAR') {
      previousStartDate = new Date(startDate);
      previousStartDate.setFullYear(previousStartDate.getFullYear() - 1);
      previousEndDate = new Date(endDate);
      previousEndDate.setFullYear(previousEndDate.getFullYear() - 1);
    } else {
      // PREVIOUS_PERIOD: exactly equal duration immediately preceding current window
      previousEndDate = new Date(startDate.getTime() - 1);
      previousStartDate = new Date(previousEndDate.getTime() - durationMs);
    }

    return {
      startDate,
      endDate,
      previousStartDate,
      previousEndDate,
      timezone,
    };
  }

  /**
   * Compares current vs previous values with zero-denominator safety.
   */
  calculateComparison(params: {
    metricKey: string;
    label: string;
    current: number;
    previous: number;
    unit: string;
    currency?: string;
  }): BusinessPeriodComparison {
    const { metricKey, label, current, previous, unit, currency } = params;
    const difference = Math.round((current - previous) * 100) / 100;

    let percentageDifference: number | null = null;
    let direction: BusinessKpiDirection = 'UNCHANGED';
    let dataQuality: BusinessDataQualityRating = 'HIGH';
    let caveat: string | undefined;

    if (previous === 0) {
      if (current === 0) {
        direction = 'UNCHANGED';
        percentageDifference = 0;
      } else {
        // When previous is zero, percentage change is mathematically undefined
        direction = 'NOT_COMPARABLE';
        percentageDifference = null;
        caveat = 'Previous period had 0 baseline value; percentage is not comparable.';
        dataQuality = 'MEDIUM';
      }
    } else {
      percentageDifference = Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
      if (difference > 0) {
        direction = 'UP';
      } else if (difference < 0) {
        direction = 'DOWN';
      } else {
        direction = 'UNCHANGED';
      }
    }

    return {
      metricKey,
      label,
      current,
      previous,
      difference,
      percentageDifference,
      direction,
      dataQuality,
      currency,
      unit,
      caveat,
    };
  }
}
