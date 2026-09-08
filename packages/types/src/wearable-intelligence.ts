import { WearableProviderType } from './wearables';

export type WearableMetricAvailability = 'AVAILABLE' | 'NOT_AVAILABLE' | 'INSUFFICIENT_DATA';

export type WearableTrendType =
  | 'SLEEP_IMPROVING'
  | 'SLEEP_DECLINING'
  | 'ACTIVITY_INCREASING'
  | 'ACTIVITY_DECREASING'
  | 'RESTING_HR_INCREASING'
  | 'RESTING_HR_DECREASING'
  | 'HRV_IMPROVING'
  | 'HRV_DECLINING'
  | 'CONSISTENCY_IMPROVING'
  | 'CONSISTENCY_DECLINING'
  | 'RECOVERY_INDICATORS_IMPROVING'
  | 'RECOVERY_INDICATORS_DECLINING'
  | 'INSUFFICIENT_DATA';

export type RecoveryCategory = 'LOW' | 'MODERATE' | 'GOOD' | 'INSUFFICIENT_DATA';

export type WearableIntelligenceConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';

export type DataQualityRating = 'NO_DATA' | 'INSUFFICIENT_DATA' | 'PARTIAL_DATA' | 'STALE_DATA' | 'NORMAL_DATA';

export type TrainingGuidanceType =
  | 'TRAIN'
  | 'RECOVER'
  | 'REDUCE_INTENSITY'
  | 'HYDRATE'
  | 'SLEEP'
  | 'CONSISTENCY'
  | 'CHECK_IN';

export type WearableInsightType = 'DAILY_SUMMARY' | 'RECOVERY' | 'TREND' | 'TRAINING_CORRELATION';

export interface SleepMetricsDto {
  availability: WearableMetricAvailability;
  lastSleepDurationMinutes?: number | null;
  lastSleepStart?: string | null;
  lastSleepEnd?: string | null;
  sevenDayAverageMinutes?: number | null;
  fourteenDayAverageMinutes?: number | null;
  consistencyScore?: number | null; // 0-100 score representing regular bedtime consistency
  dataDaysCount: number;
}

export interface ActivityMetricsDto {
  availability: WearableMetricAvailability;
  todaySteps: number;
  sevenDayAverageSteps: number;
  todayActiveCaloriesKcal: number;
  sevenDayAverageCaloriesKcal: number;
  todayDistanceKm: number;
  activeMinutes?: number | null;
  activityFrequencyPerWeek: number;
  weeklyTotalSteps: number;
  dataDaysCount: number;
}

export interface HeartMetricsDto {
  restingHeartRateAvailability: WearableMetricAvailability;
  latestRestingHeartRateBpm?: number | null;
  sevenDayAverageRestingHeartRateBpm?: number | null;
  averageHeartRateBpm?: number | null;
  hrvAvailability: WearableMetricAvailability;
  latestHrvMs?: number | null;
  sevenDayAverageHrvMs?: number | null;
  dataDaysCount: number;
}

export interface RecoverySummaryDto {
  category: RecoveryCategory;
  explanation: string;
  contributingSignals: string[];
  caveats: string[];
  confidence: WearableIntelligenceConfidence;
  disclaimer: string; // Non-medical reminder
}

export interface WearableBaselineDto {
  metric: string;
  currentValue: number;
  baseline7Day?: number | null;
  baseline14Day?: number | null;
  baseline28Day?: number | null;
  difference?: number | null;
  percentageChange?: number | null;
  observationWindowDays: number;
  dataQuality: DataQualityRating;
}

export interface WearableTrendDto {
  trendType: WearableTrendType;
  metric: string;
  direction: 'UP' | 'DOWN' | 'STABLE' | 'UNKNOWN';
  strength: 'SLIGHT' | 'MODERATE' | 'STRONG';
  confidence: WearableIntelligenceConfidence;
  dataPointsUsed: number;
  observationWindowDays: number;
  summaryText: string;
  calculatedAt: string;
}

export interface TrainingCorrelationDto {
  pattern: string;
  correlationSummary: string;
  dataPointsUsed: number;
  observedSignals: {
    wearableSignal: string;
    trainingSignal: string;
  };
  disclaimer: string; // "These patterns appear related in your recent data. They represent correlations, not causal relationships."
}

export interface WearableIntelligenceSummaryDto {
  memberId: string;
  dataQuality: DataQualityRating;
  dataDaysCount: number;
  connectedProviders: WearableProviderType[];
  sleep: SleepMetricsDto;
  activity: ActivityMetricsDto;
  heart: HeartMetricsDto;
  recovery: RecoverySummaryDto;
  trends: WearableTrendDto[];
  correlations: TrainingCorrelationDto[];
}

export interface WearableIntelligenceContextDto {
  memberId: string;
  organisationId: string;
  timezone: string;
  currentDate: string;
  dataAvailability: {
    sleep: boolean;
    activity: boolean;
    heartMetrics: boolean;
    hrv: boolean;
  };
  sleepSummary: {
    recentAverageMinutes?: number | null;
    baselineMinutes?: number | null;
    trend?: string | null;
  };
  activitySummary: {
    recentAverageSteps?: number | null;
    baselineSteps?: number | null;
    trend?: string | null;
  };
  heartSummary: {
    restingHeartRate?: number | null;
    baselineRestingHeartRate?: number | null;
    trend?: string | null;
  };
  recoverySummary: {
    category: RecoveryCategory;
    explanation: string;
  };
  trainingSummary?: {
    recentWorkoutsCount?: number;
    trainingConsistency?: string;
  };
  checkInSummary?: {
    recentEnergy?: string;
    recentSoreness?: string;
  };
  detectedTrends: WearableTrendDto[];
  dataQuality: DataQualityRating;
}

export interface WearableIntelligenceResponseDto {
  summary: string;
  dataHighlights: Array<{
    metric: string;
    value?: string;
    comparison?: string;
    trend?: string;
  }>;
  recoveryInterpretation: {
    category: RecoveryCategory;
    explanation: string;
  };
  trainingGuidance: Array<{
    type: TrainingGuidanceType;
    recommendation: string;
    reason: string;
  }>;
  caution?: string;
  escalation?: {
    required: boolean;
    message?: string;
  };
  sourceSummary: string[];
  confidence: WearableIntelligenceConfidence;
}

export interface WearableInsightQueryDto {
  prompt?: string;
  startDate?: string;
  endDate?: string;
  language?: string;
  forceRefresh?: boolean;
}

export interface WearableInsightFeedbackDto {
  insightId: string;
  rating: 'HELPFUL' | 'NOT_HELPFUL';
  category?: 'NOT_RELEVANT' | 'INCORRECT' | 'TOO_GENERIC' | 'CONFUSING' | 'OTHER';
  comment?: string;
}
