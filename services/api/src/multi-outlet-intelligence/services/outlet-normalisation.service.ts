import { Injectable } from '@nestjs/common';
import {
  OutletNormalisationMode,
  BusinessKpiDirection,
  BusinessDataQualityRating,
} from '@fitcore/types';

export interface NormalisedResult {
  normalisedValue: number | null;
  normalisedUnit: string;
  denominator: number;
  denominatorLabel: string;
  direction: BusinessKpiDirection;
  dataQuality: BusinessDataQualityRating;
  sampleSizeCaveat?: string;
}

@Injectable()
export class OutletNormalisationService {
  /**
   * Normalises an operational metric with strict zero-denominator handling and sample size warnings.
   */
  normalise(params: {
    metricKey: string;
    absoluteValue: number;
    mode: OutletNormalisationMode;
    denominator?: number;
    denominatorLabel?: string;
    previousValue?: number;
    minimumSample?: number;
    customUnit?: string;
  }): NormalisedResult {
    const {
      absoluteValue,
      mode,
      denominator = 0,
      denominatorLabel = 'Baseline',
      previousValue,
      minimumSample = 5,
      customUnit,
    } = params;

    let normalisedValue: number | null = null;
    let normalisedUnit = customUnit || 'RATIO';
    let direction: BusinessKpiDirection = 'UNCHANGED';
    let dataQuality: BusinessDataQualityRating = 'HIGH';
    let sampleSizeCaveat: string | undefined;

    switch (mode) {
      case 'ABSOLUTE': {
        normalisedValue = absoluteValue;
        normalisedUnit = customUnit || 'COUNT';
        direction = this.determineDirection(absoluteValue, previousValue);
        break;
      }

      case 'PER_ACTIVE_MEMBER': {
        normalisedUnit = customUnit ? `${customUnit}/member` : 'per active member';
        if (denominator <= 0) {
          normalisedValue = null;
          direction = 'NOT_COMPARABLE';
          sampleSizeCaveat = 'Active member population is 0; per-member metric is not comparable.';
          dataQuality = 'INSUFFICIENT_DATA';
        } else {
          normalisedValue = Math.round((absoluteValue / denominator) * 100) / 100;
          direction = this.determineDirection(normalisedValue, previousValue);
          if (denominator < minimumSample) {
            sampleSizeCaveat = `Small sample size (< ${minimumSample} members). Normalised metric is advisory.`;
            dataQuality = 'MEDIUM';
          }
        }
        break;
      }

      case 'PER_LEAD': {
        normalisedUnit = '% of leads';
        if (denominator <= 0) {
          normalisedValue = null;
          direction = 'NOT_COMPARABLE';
          sampleSizeCaveat = 'Lead volume is 0; lead conversion rate is not comparable.';
          dataQuality = 'INSUFFICIENT_DATA';
        } else {
          normalisedValue = Math.round((absoluteValue / denominator) * 1000) / 10;
          direction = this.determineDirection(normalisedValue, previousValue);
          if (denominator < minimumSample) {
            sampleSizeCaveat = `Small lead volume (< ${minimumSample} leads). Conversion percentage may exhibit high variance.`;
            dataQuality = 'MEDIUM';
          }
        }
        break;
      }

      case 'PER_SESSION': {
        normalisedUnit = '% capacity';
        if (denominator <= 0) {
          normalisedValue = null;
          direction = 'NOT_COMPARABLE';
          sampleSizeCaveat = 'Session capacity is 0; fill rate is not comparable.';
          dataQuality = 'INSUFFICIENT_DATA';
        } else {
          normalisedValue = Math.round((absoluteValue / denominator) * 1000) / 10;
          direction = this.determineDirection(normalisedValue, previousValue);
          if (denominator < minimumSample) {
            sampleSizeCaveat = `Small session capacity (< ${minimumSample} spots).`;
            dataQuality = 'MEDIUM';
          }
        }
        break;
      }

      case 'PERCENTAGE': {
        normalisedUnit = '%';
        if (denominator <= 0) {
          normalisedValue = null;
          direction = 'NOT_COMPARABLE';
          sampleSizeCaveat = 'Denominator is 0; percentage rate is not comparable.';
          dataQuality = 'INSUFFICIENT_DATA';
        } else {
          normalisedValue = Math.round((absoluteValue / denominator) * 1000) / 10;
          direction = this.determineDirection(normalisedValue, previousValue);
          if (denominator < minimumSample) {
            sampleSizeCaveat = `Small sample size (< ${minimumSample}). Rate is advisory.`;
            dataQuality = 'MEDIUM';
          }
        }
        break;
      }

      case 'GROWTH_VS_BASELINE': {
        normalisedUnit = '% growth';
        const baseline = previousValue !== undefined ? previousValue : denominator;
        if (baseline === 0) {
          if (absoluteValue === 0) {
            normalisedValue = 0;
            direction = 'UNCHANGED';
          } else {
            normalisedValue = null;
            direction = 'NOT_COMPARABLE';
            sampleSizeCaveat = 'Prior baseline was 0; growth percentage is mathematically undefined.';
            dataQuality = 'MEDIUM';
          }
        } else {
          normalisedValue = Math.round(((absoluteValue - baseline) / Math.abs(baseline)) * 1000) / 10;
          direction = normalisedValue > 0 ? 'UP' : normalisedValue < 0 ? 'DOWN' : 'UNCHANGED';
        }
        break;
      }
    }

    return {
      normalisedValue,
      normalisedUnit,
      denominator,
      denominatorLabel,
      direction,
      dataQuality,
      sampleSizeCaveat,
    };
  }

  private determineDirection(current: number | null, previous?: number | null): BusinessKpiDirection {
    if (current === null || previous === undefined || previous === null) return 'UNCHANGED';
    if (current > previous) return 'UP';
    if (current < previous) return 'DOWN';
    return 'UNCHANGED';
  }
}
