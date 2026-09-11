import { Injectable } from '@nestjs/common';
import { ResourceDataQualityService } from './resource-data-quality.service';
import { UtilisationType, ResourceMetricValue } from '@fitcore/types';

@Injectable()
export class UtilisationService {
  constructor(private readonly qualityService: ResourceDataQualityService) {}

  /**
   * Computes a formally defined utilisation metric with full mathematical traceability.
   */
  calculateUtilisation(params: {
    metricKey: string;
    metricLabel: string;
    type: UtilisationType;
    occupiedNumerator: number;
    availableDenominator: number;
    sampleSize: number;
    timeRange?: string;
    minimumSample?: number;
    previousValue?: number;
  }): ResourceMetricValue {
    const {
      metricKey,
      metricLabel,
      occupiedNumerator,
      availableDenominator,
      sampleSize,
      timeRange = 'LAST_30_DAYS',
      minimumSample = 10,
      previousValue,
    } = params;

    const division = this.qualityService.safeDivide({
      numerator: occupiedNumerator,
      denominator: availableDenominator,
      minimumSample,
      metricLabel,
      asPercentage: true,
      previousValue,
    });

    return {
      metricKey,
      metricLabel,
      domain: 'RESOURCES',
      value: division.value,
      unit: 'PERCENTAGE',
      numerator: occupiedNumerator,
      denominator: availableDenominator,
      sampleSize,
      timeRange,
      direction: division.direction,
      dataQuality: division.dataQuality,
      freshness: 'REAL_TIME',
      sampleSizeCaveat: division.sampleSizeCaveat,
    };
  }
}
