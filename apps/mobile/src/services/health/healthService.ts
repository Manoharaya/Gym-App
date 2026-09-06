import type {
  DateRange,
  HealthDataProvider,
  HealthPermissionStatus,
  HeartRateMetric,
  SleepMetric,
  StepMetric,
  WearableSource,
  WorkoutMetric,
} from '@fitcore/types';
import { logger } from '../logging';

/**
 * FitCore Health Service Abstraction
 * Decouples health analytics from native platform APIs (Apple HealthKit / Android Health Connect).
 */
export class HealthService {
  private activeProvider: HealthDataProvider | null = null;

  public registerProvider(provider: HealthDataProvider): void {
    this.activeProvider = provider;
    logger.info(`Health data provider registered: ${provider.source}`);
  }

  public getSource(): WearableSource {
    return this.activeProvider?.source ?? 'MANUAL';
  }

  public async isAvailable(): Promise<boolean> {
    if (!this.activeProvider) return false;
    return await this.activeProvider.isAvailable();
  }

  public async requestPermissions(): Promise<HealthPermissionStatus> {
    if (!this.activeProvider) {
      return {
        steps: false,
        heartRate: false,
        sleep: false,
        workouts: false,
        activeEnergy: false,
        bodyWeight: false,
      };
    }
    return await this.activeProvider.requestPermissions();
  }

  public async getSteps(range: DateRange): Promise<StepMetric[]> {
    if (!this.activeProvider) return [];
    return await this.activeProvider.getSteps(range);
  }

  public async getHeartRate(range: DateRange): Promise<HeartRateMetric[]> {
    if (!this.activeProvider) return [];
    return await this.activeProvider.getHeartRate(range);
  }

  public async getSleep(range: DateRange): Promise<SleepMetric[]> {
    if (!this.activeProvider) return [];
    return await this.activeProvider.getSleep(range);
  }

  public async getWorkouts(range: DateRange): Promise<WorkoutMetric[]> {
    if (!this.activeProvider) return [];
    return await this.activeProvider.getWorkouts(range);
  }
}

export const healthService = new HealthService();
