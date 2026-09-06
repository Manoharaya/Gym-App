/**
 * FitCore Health & Wearables Abstraction Contracts
 *
 * Wave 1: Apple Health (HealthKit), Android Health Connect
 * Wave 2: Fitbit, Garmin, Whoop, Oura
 */

export type WearableSource =
  'APPLE_HEALTH' | 'HEALTH_CONNECT' | 'FITBIT' | 'GARMIN' | 'WHOOP' | 'OURA' | 'MANUAL';

export interface HealthPermissionStatus {
  steps: boolean;
  heartRate: boolean;
  sleep: boolean;
  workouts: boolean;
  activeEnergy: boolean;
  bodyWeight: boolean;
}

export interface DateRange {
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
}

export interface StepMetric {
  count: number;
  date: string;
  source: WearableSource;
}

export interface HeartRateMetric {
  bpm: number;
  timestamp: string;
  restingBpm?: number;
  minBpm?: number;
  maxBpm?: number;
  source: WearableSource;
}

export interface SleepMetric {
  durationMinutes: number;
  deepSleepMinutes?: number;
  remSleepMinutes?: number;
  lightSleepMinutes?: number;
  awakeMinutes?: number;
  sleepScore?: number;
  date: string;
  source: WearableSource;
}

export interface WorkoutMetric {
  id: string;
  activityType: string;
  durationMinutes: number;
  caloriesBurned?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  distanceMeters?: number;
  startedAt: string;
  endedAt: string;
  source: WearableSource;
}

export interface HealthDataProvider {
  readonly source: WearableSource;
  isAvailable(): Promise<boolean>;
  requestPermissions(): Promise<HealthPermissionStatus>;
  getSteps(range: DateRange): Promise<StepMetric[]>;
  getHeartRate(range: DateRange): Promise<HeartRateMetric[]>;
  getSleep(range: DateRange): Promise<SleepMetric[]>;
  getWorkouts(range: DateRange): Promise<WorkoutMetric[]>;
}
