import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { MetricDefinitionService } from './metric-definition.service';
import { BusinessMetricDefinition } from '@fitcore/types';

@Injectable()
export class MetricRegistryService {
  constructor(private readonly definitionService: MetricDefinitionService) {}

  /**
   * Validates and returns the definition for a requested metric key.
   */
  resolveMetric(metricKey: string): BusinessMetricDefinition {
    const definition = this.definitionService.getDefinition(metricKey);
    if (!definition) {
      throw new BadRequestException(
        `Invalid metric key "${metricKey}". Dashboard cannot invent or query unapproved metrics.`,
      );
    }
    return definition;
  }

  /**
   * Validates whether the metric can be queried at the requested scope.
   */
  validateScope(metric: BusinessMetricDefinition, outletId?: string): void {
    if (outletId && !metric.supportsOutletScope) {
      throw new BadRequestException(`Metric "${metric.key}" does not support outlet-level scoping.`);
    }
    if (!outletId && !metric.supportsOrganisationScope) {
      throw new BadRequestException(`Metric "${metric.key}" requires an outlet scope.`);
    }
  }

  /**
   * Checks if user has necessary permissions for the metric.
   */
  checkPermission(metric: BusinessMetricDefinition, userRoles: string[]): void {
    const roles = userRoles.map((r) => r.toUpperCase());
    if (roles.includes('SUPERADMIN') || roles.includes('ORGANISATION_OWNER')) {
      return;
    }

    if (metric.domain === 'FINANCE' && !roles.includes('FINANCE') && !roles.includes('OUTLET_MANAGER')) {
      throw new ForbiddenException(`User role lacks permission to query financial metric "${metric.key}".`);
    }
  }
}
