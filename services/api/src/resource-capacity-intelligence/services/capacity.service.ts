import { Injectable } from '@nestjs/common';
import { CapacityType } from '@fitcore/types';

export interface CapacityEvaluation {
  capacityType: CapacityType;
  configuredCapacity: number;
  occupiedCapacity: number;
  availableCapacity: number;
  utilisationPercentage: number | null;
  unit: string;
}

@Injectable()
export class CapacityService {
  /**
   * Evaluates explicit capacity metrics ensuring no negative or inferred values.
   */
  evaluateCapacity(params: {
    type: CapacityType;
    configured: number;
    occupied: number;
    unit?: string;
  }): CapacityEvaluation {
    const { type, configured, occupied, unit = 'seats' } = params;

    const safeConfigured = Math.max(0, configured);
    const safeOccupied = Math.max(0, occupied);
    const available = Math.max(0, safeConfigured - safeOccupied);

    const utilisationPercentage =
      safeConfigured > 0
        ? Math.round((safeOccupied / safeConfigured) * 1000) / 10
        : null;

    return {
      capacityType: type,
      configuredCapacity: safeConfigured,
      occupiedCapacity: safeOccupied,
      availableCapacity: available,
      utilisationPercentage,
      unit,
    };
  }
}
