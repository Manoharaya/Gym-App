import { Injectable, BadRequestException } from '@nestjs/common';
import { HealthDataType, HealthUnit } from '@fitcore/types';

export interface NormalizedHealthValue {
  value: number;
  unit: HealthUnit;
}

@Injectable()
export class UnitNormalizer {
  /**
   * Standardizes incoming values to FitCore's canonical unit for the given data type.
   *
   * Canonical Units:
   * - STEPS: 'steps'
   * - DISTANCE: 'km'
   * - ACTIVE_CALORIES: 'kcal'
   * - TOTAL_CALORIES: 'kcal'
   * - HEART_RATE: 'bpm'
   * - RESTING_HEART_RATE: 'bpm'
   * - HEART_RATE_VARIABILITY: 'ms'
   * - SLEEP: 'minutes'
   * - SLEEP_DURATION: 'minutes'
   * - WEIGHT: 'kg'
   * - BODY_FAT: 'percent'
   * - WORKOUT: 'count'
   * - EXERCISE_SESSION: 'count'
   * - RESPIRATORY_RATE: 'breaths_per_minute'
   * - OXYGEN_SATURATION: 'percent_saturation'
   * - BODY_TEMPERATURE: 'percent'
   */
  normalize(dataType: HealthDataType, rawValue: number, rawUnit: string): NormalizedHealthValue {
    const unit = rawUnit.toLowerCase().trim();

    switch (dataType) {
      case 'STEPS':
        if (unit === 'steps' || unit === 'count' || unit === 'step') {
          return { value: Math.round(rawValue), unit: 'steps' };
        }
        throw new BadRequestException(`Invalid unit '${rawUnit}' for STEPS. Expected 'steps'.`);

      case 'DISTANCE':
        if (unit === 'km' || unit === 'kilometer' || unit === 'kilometre') {
          return { value: Number(rawValue.toFixed(3)), unit: 'km' };
        }
        if (unit === 'm' || unit === 'meter' || unit === 'metre') {
          return { value: Number((rawValue / 1000).toFixed(3)), unit: 'km' };
        }
        if (unit === 'mi' || unit === 'miles' || unit === 'mile') {
          return { value: Number((rawValue * 1.60934).toFixed(3)), unit: 'km' };
        }
        throw new BadRequestException(`Invalid unit '${rawUnit}' for DISTANCE. Expected 'km', 'm', or 'mi'.`);

      case 'ACTIVE_CALORIES':
      case 'TOTAL_CALORIES':
        if (unit === 'kcal' || unit === 'calories' || unit === 'cal') {
          return { value: Number(rawValue.toFixed(1)), unit: 'kcal' };
        }
        if (unit === 'kj' || unit === 'kilojoules') {
          return { value: Number((rawValue / 4.184).toFixed(1)), unit: 'kcal' };
        }
        throw new BadRequestException(`Invalid unit '${rawUnit}' for CALORIES. Expected 'kcal' or 'kj'.`);

      case 'HEART_RATE':
      case 'RESTING_HEART_RATE':
        if (unit === 'bpm' || unit === 'count/min' || unit === 'beats/min') {
          return { value: Math.round(rawValue), unit: 'bpm' };
        }
        throw new BadRequestException(`Invalid unit '${rawUnit}' for HEART_RATE. Expected 'bpm'.`);

      case 'HEART_RATE_VARIABILITY':
        if (unit === 'ms' || unit === 'milliseconds') {
          return { value: Number(rawValue.toFixed(1)), unit: 'ms' };
        }
        throw new BadRequestException(`Invalid unit '${rawUnit}' for HRV. Expected 'ms'.`);

      case 'SLEEP':
      case 'SLEEP_DURATION':
        if (unit === 'minutes' || unit === 'min' || unit === 'mins') {
          return { value: Math.round(rawValue), unit: 'minutes' };
        }
        if (unit === 'hours' || unit === 'hr' || unit === 'hrs') {
          return { value: Math.round(rawValue * 60), unit: 'minutes' };
        }
        if (unit === 'seconds' || unit === 'sec' || unit === 's') {
          return { value: Math.round(rawValue / 60), unit: 'minutes' };
        }
        throw new BadRequestException(`Invalid unit '${rawUnit}' for SLEEP. Expected 'minutes' or 'hours'.`);

      case 'WEIGHT':
        if (unit === 'kg' || unit === 'kilogram' || unit === 'kgs') {
          return { value: Number(rawValue.toFixed(2)), unit: 'kg' };
        }
        if (unit === 'lb' || unit === 'lbs' || unit === 'pounds') {
          return { value: Number((rawValue * 0.45359237).toFixed(2)), unit: 'kg' };
        }
        throw new BadRequestException(`Invalid unit '${rawUnit}' for WEIGHT. Expected 'kg' or 'lb'.`);

      case 'BODY_FAT':
        if (unit === 'percent' || unit === '%') {
          return { value: Number(rawValue.toFixed(1)), unit: 'percent' };
        }
        throw new BadRequestException(`Invalid unit '${rawUnit}' for BODY_FAT. Expected 'percent'.`);

      case 'WORKOUT':
      case 'EXERCISE_SESSION':
        if (unit === 'count' || unit === 'session' || unit === 'workout') {
          return { value: Math.round(rawValue), unit: 'count' };
        }
        throw new BadRequestException(`Invalid unit '${rawUnit}' for WORKOUT. Expected 'count'.`);

      case 'RESPIRATORY_RATE':
        if (unit === 'breaths_per_minute' || unit === 'bpm' || unit === 'breaths/min') {
          return { value: Number(rawValue.toFixed(1)), unit: 'breaths_per_minute' };
        }
        throw new BadRequestException(`Invalid unit '${rawUnit}' for RESPIRATORY_RATE.`);

      case 'OXYGEN_SATURATION':
        if (unit === 'percent_saturation' || unit === 'percent' || unit === '%') {
          return { value: Number(rawValue.toFixed(1)), unit: 'percent_saturation' };
        }
        throw new BadRequestException(`Invalid unit '${rawUnit}' for OXYGEN_SATURATION.`);

      default:
        return { value: rawValue, unit: 'count' };
    }
  }
}
