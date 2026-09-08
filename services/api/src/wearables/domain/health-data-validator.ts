import { Injectable, Logger } from '@nestjs/common';
import { HealthDataType } from '@fitcore/types';

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

@Injectable()
export class HealthDataValidator {
  private readonly logger = new Logger(HealthDataValidator.name);

  /**
   * Validates health record timestamps and numeric values.
   */
  validate(
    dataType: HealthDataType,
    value: number,
    startTime: Date,
    endTime?: Date | null,
  ): ValidationResult {
    // 1. Timestamp existence and validity
    if (!startTime || isNaN(startTime.getTime())) {
      return { isValid: false, reason: 'INVALID_START_TIME' };
    }

    if (endTime && isNaN(endTime.getTime())) {
      return { isValid: false, reason: 'INVALID_END_TIME' };
    }

    if (endTime && startTime.getTime() > endTime.getTime()) {
      return {
        isValid: false,
        reason: `START_TIME_AFTER_END_TIME (start: ${startTime.toISOString()}, end: ${endTime.toISOString()})`,
      };
    }

    // Reject future dates beyond 15 min clock drift allowance
    const maxFuture = Date.now() + 15 * 60 * 1000;
    if (startTime.getTime() > maxFuture) {
      return { isValid: false, reason: 'FUTURE_TIMESTAMP_NOT_ALLOWED' };
    }

    // 2. Value checks per data type
    if (isNaN(value) || !isFinite(value)) {
      return { isValid: false, reason: 'NON_NUMERIC_VALUE' };
    }

    switch (dataType) {
      case 'STEPS':
        if (value < 0) return { isValid: false, reason: 'NEGATIVE_STEPS' };
        if (value > 200000) return { isValid: false, reason: 'EXCESSIVE_STEPS_OUTLIER' };
        break;

      case 'DISTANCE':
        if (value < 0) return { isValid: false, reason: 'NEGATIVE_DISTANCE' };
        if (value > 500) return { isValid: false, reason: 'EXCESSIVE_DISTANCE_OUTLIER' };
        break;

      case 'ACTIVE_CALORIES':
      case 'TOTAL_CALORIES':
        if (value < 0) return { isValid: false, reason: 'NEGATIVE_CALORIES' };
        if (value > 30000) return { isValid: false, reason: 'EXCESSIVE_CALORIES_OUTLIER' };
        break;

      case 'HEART_RATE':
      case 'RESTING_HEART_RATE':
        if (value < 25 || value > 260) {
          return { isValid: false, reason: `OUT_OF_RANGE_HEART_RATE (${value} bpm)` };
        }
        break;

      case 'SLEEP':
      case 'SLEEP_DURATION':
        if (value < 0) return { isValid: false, reason: 'NEGATIVE_SLEEP_DURATION' };
        if (value > 1440) return { isValid: false, reason: 'SLEEP_EXCEEDS_24_HOURS' };
        break;

      case 'WEIGHT':
        if (value <= 10 || value > 500) {
          return { isValid: false, reason: `OUT_OF_RANGE_WEIGHT (${value} kg)` };
        }
        break;

      case 'OXYGEN_SATURATION':
        if (value < 50 || value > 100) {
          return { isValid: false, reason: `OUT_OF_RANGE_SPO2 (${value}%)` };
        }
        break;

      default:
        if (value < 0) {
          return { isValid: false, reason: 'NEGATIVE_VALUE' };
        }
        break;
    }

    return { isValid: true };
  }
}
