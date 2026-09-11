import { Injectable } from '@nestjs/common';
import {
  ResourceComparisonMatrixDto,
  ResourceComparisonItemDto,
  ResourceIntelligenceType,
} from '@fitcore/types';

@Injectable()
export class ResourceComparisonService {
  /**
   * Compares resources across outlets by metric, sorting by performance/utilisation.
   */
  compareResources(params: {
    metricKey: string;
    metricLabel: string;
    timeRange: string;
    rooms: any[];
  }): ResourceComparisonMatrixDto {
    const { metricKey, metricLabel, timeRange, rooms } = params;

    const items: ResourceComparisonItemDto[] = rooms.map((r) => {
      let demandLevel: 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' = 'MODERATE';
      if (r.roomUtilisation !== null) {
        if (r.roomUtilisation >= 80) demandLevel = 'VERY_HIGH';
        else if (r.roomUtilisation >= 65) demandLevel = 'HIGH';
        else if (r.roomUtilisation >= 40) demandLevel = 'MODERATE';
        else if (r.roomUtilisation >= 20) demandLevel = 'LOW';
        else demandLevel = 'VERY_LOW';
      }

      let healthStatus: 'GOOD' | 'STABLE' | 'WATCH' | 'ATTENTION_REQUIRED' | 'INSUFFICIENT_DATA' = 'GOOD';
      if (r.roomUtilisation !== null && (r.roomUtilisation > 90 || r.roomUtilisation < 20)) {
        healthStatus = 'WATCH';
      }

      return {
        resourceId: r.roomId,
        resourceName: r.roomName,
        resourceType: (r.roomType as ResourceIntelligenceType) || 'STUDIO',
        outletId: r.outletId,
        outletName: r.outletName,
        capacity: r.configuredCapacity,
        utilisation: r.roomUtilisation,
        demandLevel,
        waitlistCount: 0,
        healthStatus,
        dataQuality: r.dataQuality || 'HIGH',
      };
    });

    items.sort((a, b) => (b.utilisation || 0) - (a.utilisation || 0));

    return {
      metricKey,
      metricLabel,
      timeRange,
      items,
      totalResources: items.length,
    };
  }
}
