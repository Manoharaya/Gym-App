/**
 * FitCore Wearables & Health Data Foundation Contracts
 *
 * Wave 1: Apple Health (HealthKit), Google Health Connect, Fitbit
 * Wave 2 (Extension points only): Garmin, WHOOP, Oura
 */

export type WearableProviderType =
  | 'APPLE_HEALTH'
  | 'GOOGLE_HEALTH_CONNECT'
  | 'FITBIT'
  | 'GARMIN'
  | 'WHOOP'
  | 'OURA';

export type WearableConnectionStatus =
  | 'PENDING'
  | 'CONNECTED'
  | 'SYNCING'
  | 'SYNC_ERROR'
  | 'REAUTH_REQUIRED'
  | 'DISCONNECTED'
  | 'REVOKED';

export type HealthDataType =
  | 'STEPS'
  | 'DISTANCE'
  | 'ACTIVE_CALORIES'
  | 'TOTAL_CALORIES'
  | 'HEART_RATE'
  | 'RESTING_HEART_RATE'
  | 'HEART_RATE_VARIABILITY'
  | 'SLEEP'
  | 'SLEEP_DURATION'
  | 'WEIGHT'
  | 'BODY_FAT'
  | 'WORKOUT'
  | 'EXERCISE_SESSION'
  | 'RESPIRATORY_RATE'
  | 'OXYGEN_SATURATION'
  | 'BODY_TEMPERATURE';

export type HealthUnit =
  | 'count'
  | 'steps'
  | 'km'
  | 'm'
  | 'kcal'
  | 'bpm'
  | 'ms'
  | 'minutes'
  | 'hours'
  | 'kg'
  | 'lb'
  | 'percent'
  | 'breaths_per_minute'
  | 'percent_saturation';

export type WearableSyncType = 'INITIAL' | 'INCREMENTAL' | 'RETRY' | 'MANUAL';
export type WearableSyncStatus = 'SUCCESS' | 'FAILED' | 'PARTIAL';

export interface WearableCapability {
  dataType: HealthDataType;
  readSupported: boolean;
  writeSupported: boolean;
  unit: HealthUnit;
  description: string;
}

export interface WearableProviderInfo {
  provider: WearableProviderType;
  name: string;
  description: string;
  isEnabled: boolean;
  wave: 1 | 2;
  authType: 'NATIVE_SDK' | 'OAUTH2' | 'WEB_API';
  capabilities: WearableCapability[];
  requiredPermissions: string[];
  iconUrl?: string;
  privacyNotice: string;
}

export interface WearableConnectionDto {
  id: string;
  organisationId: string;
  memberId: string;
  provider: WearableProviderType;
  status: WearableConnectionStatus;
  connectedAt?: string | null;
  lastSyncAt?: string | null;
  lastSuccessfulSyncAt?: string | null;
  lastFailedSyncAt?: string | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  providerUserReference?: string | null;
  scopes: string[];
  createdAt: string;
  updatedAt: string;
  revokedAt?: string | null;
}

export interface ConnectWearableDto {
  provider: WearableProviderType;
  authCode?: string;
  redirectUri?: string;
  scopes?: string[];
  providerUserReference?: string;
  nativeAccessToken?: string;
  nativeRefreshToken?: string;
  tokenExpiresIn?: number;
}

export interface ReauthorizeWearableDto {
  authCode?: string;
  nativeAccessToken?: string;
  nativeRefreshToken?: string;
  tokenExpiresIn?: number;
}

export interface HealthDataRecordDto {
  id: string;
  organisationId: string;
  memberId: string;
  connectionId: string;
  provider: WearableProviderType;
  dataType: HealthDataType;
  sourceRecordId?: string | null;
  startTime: string; // ISO 8601 UTC
  endTime?: string | null; // ISO 8601 UTC
  value: number;
  unit: HealthUnit;
  timezone?: string | null;
  sourceName?: string | null;
  sourceDevice?: string | null;
  metadata?: Record<string, any> | null;
  recordedAt: string;
}

export interface IngestHealthDataRecordInput {
  dataType: HealthDataType;
  sourceRecordId?: string;
  startTime: string;
  endTime?: string;
  value: number;
  unit: HealthUnit;
  timezone?: string;
  sourceName?: string;
  sourceDevice?: string;
  metadata?: Record<string, any>;
}

export interface SyncWearableRequestDto {
  syncType?: WearableSyncType;
  forceFullSync?: boolean;
  startDate?: string;
  endDate?: string;
  records?: IngestHealthDataRecordInput[]; // For native-device providers (Apple Health / Health Connect)
}

export interface SyncWearableResultDto {
  connectionId: string;
  provider: WearableProviderType;
  syncType: WearableSyncType;
  status: WearableSyncStatus;
  recordsFetched: number;
  recordsInserted: number;
  duplicatesSkipped: number;
  validationFailures: number;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface HealthDataQueryDto {
  dataType?: HealthDataType;
  provider?: WearableProviderType;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface DailyHealthMetricSummary {
  date: string; // YYYY-MM-DD
  steps: number;
  distanceKm: number;
  activeCaloriesKcal: number;
  restingHeartRateBpm?: number | null;
  avgHeartRateBpm?: number | null;
  sleepMinutes?: number | null;
  workoutCount: number;
  sources: WearableProviderType[];
}

export interface HealthDataSummaryDto {
  memberId: string;
  period: {
    startDate: string;
    endDate: string;
  };
  totalSteps: number;
  avgDailySteps: number;
  totalDistanceKm: number;
  totalActiveCaloriesKcal: number;
  avgRestingHeartRateBpm?: number | null;
  avgSleepMinutes?: number | null;
  totalWorkouts: number;
  dailySummaries: DailyHealthMetricSummary[];
  connectedProviders: WearableProviderType[];
}

export interface WearablePrivacyViewDto {
  memberId: string;
  activeConsent: {
    consented: boolean;
    consentKey: string;
    consentedAt?: string | null;
    version?: string | null;
  };
  connectedProviders: Array<{
    provider: WearableProviderType;
    status: WearableConnectionStatus;
    connectedAt?: string | null;
    lastSyncAt?: string | null;
    authorizedDataTypes: HealthDataType[];
  }>;
  storedDataCategories: Array<{
    dataType: HealthDataType;
    recordCount: number;
    oldestRecordDate?: string | null;
    newestRecordDate?: string | null;
  }>;
  trainerAccess: {
    isPermitted: boolean;
    assignedTrainerName?: string | null;
    accessibleMetrics: string[];
    rawValuesExposed: boolean; // Always false (only summarized metrics)
  };
  retentionPolicy: {
    normalizedHealthRecordsDays: number;
    rawPayloadsDays: number;
    selfServiceDeletionAllowed: boolean;
  };
}

export interface WearableTrainerClientSummaryDto {
  memberId: string;
  memberName: string;
  trainerAssignmentStatus: 'ACTIVE';
  todayActivity: {
    steps: number;
    activeCaloriesKcal: number;
    distanceKm: number;
    restingHeartRateBpm?: number | null;
  };
  weeklyAverages: {
    avgDailySteps: number;
    avgDailyCaloriesKcal: number;
    avgSleepMinutes?: number | null;
    workoutCount: number;
  };
  lastSyncAt?: string | null;
  connectedProviders: WearableProviderType[];
  notice: string; // Non-medical reminder
}
