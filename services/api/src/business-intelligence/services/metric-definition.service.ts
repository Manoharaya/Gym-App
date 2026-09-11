import { Injectable } from '@nestjs/common';
import { BusinessMetricDefinition, BusinessMetricDomain } from '@fitcore/types';
import { CANONICAL_BUSINESS_METRICS } from '../domain/business-metric-registry';

@Injectable()
export class MetricDefinitionService {
  /**
   * Returns all canonical metric definitions registered in the BI platform.
   */
  getAllDefinitions(): BusinessMetricDefinition[] {
    return Object.values(CANONICAL_BUSINESS_METRICS);
  }

  /**
   * Returns definitions filtered by domain.
   */
  getDefinitionsByDomain(domain: BusinessMetricDomain): BusinessMetricDefinition[] {
    return Object.values(CANONICAL_BUSINESS_METRICS).filter((m) => m.domain === domain);
  }

  /**
   * Retrieves a specific metric definition by key.
   */
  getDefinition(key: string): BusinessMetricDefinition | undefined {
    return CANONICAL_BUSINESS_METRICS[key];
  }

  /**
   * Verifies if a given metric key is registered canonically.
   */
  isValidMetricKey(key: string): boolean {
    return Boolean(CANONICAL_BUSINESS_METRICS[key]);
  }
}
