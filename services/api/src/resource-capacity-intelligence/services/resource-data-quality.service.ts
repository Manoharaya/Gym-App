import { Injectable } from '@nestjs/common';
import {
  BusinessDataQualityRating,
  BusinessDataFreshness,
  BusinessKpiDirection,
} from '@fitcore/types';

export interface ZeroDenominatorResult {
  value: number | null;
  direction: BusinessKpiDirection;
  dataQuality: BusinessDataQualityRating;
  sampleSizeCaveat?: string;
}

@Injectable()
export class ResourceDataQualityService {
  /**
   * Safe division with zero denominator handling and sample size warnings.
   */
  safeDivide(params: {
    numerator: number;
    denominator: number;
    minimumSample?: number;
    metricLabel?: string;
    asPercentage?: boolean;
    previousValue?: number;
  }): ZeroDenominatorResult {
    const {
      numerator,
      denominator,
      minimumSample = 10,
      metricLabel = 'Metric',
      asPercentage = true,
      previousValue,
    } = params;

    if (denominator <= 0) {
      return {
        value: null,
        direction: 'NOT_COMPARABLE',
        dataQuality: 'INSUFFICIENT_DATA',
        sampleSizeCaveat: `${metricLabel}: Denominator is zero. Calculation is undefined.`,
      };
    }

    const raw = (numerator / denominator) * (asPercentage ? 100 : 1);
    const value = Math.round(raw * 100) / 100;

    let dataQuality: BusinessDataQualityRating = 'HIGH';
    let sampleSizeCaveat: string | undefined;

    if (denominator < minimumSample) {
      dataQuality = denominator < 3 ? 'LOW' : 'MEDIUM';
      sampleSizeCaveat = `Small sample size (${denominator} records). Value should be interpreted with caution.`;
    }

    let direction: BusinessKpiDirection = 'UNCHANGED';
    if (previousValue !== undefined && previousValue !== null) {
      if (value > previousValue) direction = 'UP';
      else if (value < previousValue) direction = 'DOWN';
    }

    return {
      value,
      direction,
      dataQuality,
      sampleSizeCaveat,
    };
  }

  /**
   * Evaluates freshness based on latest recorded session or booking timestamp.
   */
  evaluateFreshness(latestTimestamp?: Date | null): BusinessDataFreshness {
    if (!latestTimestamp) return 'UNKNOWN';

    const diffMinutes = (Date.now() - new Date(latestTimestamp).getTime()) / (1000 * 60);

    if (diffMinutes <= 15) return 'REAL_TIME';
    if (diffMinutes <= 60) return 'RECENT';
    if (diffMinutes <= 360) return 'DELAYED';
    return 'STALE';
  }
}
