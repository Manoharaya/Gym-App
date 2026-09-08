/**
 * FitCore Explicit Retention Data Definitions (Day 29 - Section 7A)
 *
 * Enforces the strict deterministic pipeline:
 * OBSERVED DATA → DERIVED METRIC → TREND → RISK SIGNAL → AI INTERPRETATION → RECOMMENDATION
 *
 * Core rule: AI output must never be treated as the source of truth.
 * All retention metrics are calculated deterministically by backend services.
 */

// ==========================================
// 1. QUALIFYING ACTIVITY TAXONOMY
// ==========================================

export type RetentionActivityType =
  | 'GYM_CHECK_IN'
  | 'CLASS_ATTENDED'
  | 'PT_SESSION_ATTENDED'
  | 'WORKOUT_COMPLETED'
  | 'BOOKING_CREATED'
  | 'BOOKING_CANCELLED'
  | 'APP_LOGIN'
  | 'DAILY_CHECK_IN_COMPLETED'
  | 'NUTRITION_LOGGED'
  | 'AI_COACH_INTERACTION'
  | 'GOAL_INTERACTION'
  | 'WEARABLE_SYNCED';

export interface QualifyingActivityRecord {
  activityType: RetentionActivityType;
  timestamp: string;
  sourceEventId?: string;
  sourceDomain: string;
  metadata?: Record<string, any>;
}

// ==========================================
// 2. OBSERVATION & BASELINE WINDOWS
// ==========================================

export type RetentionObservationWindow = '7D' | '14D' | '30D' | '60D' | '90D';

export interface WindowDefinition {
  window: RetentionObservationWindow;
  startDate: string;
  endDate: string;
  windowDays: number;
}

export interface BaselineWindowDefinition {
  baselineStart: string;
  baselineEnd: string;
  baselineDays: number;
  calculationMethod: 'HISTORICAL_PRIOR_EQUIVALENT' | 'PERSONAL_TRAILING_AVERAGE' | 'FIXED_ONBOARDING_BASELINE';
}

// ==========================================
// 3. RETENTION DATA POINT TYPES & ENUMS
// ==========================================

export type RetentionDataType =
  | 'LAST_ACTIVITY_AT'
  | 'INACTIVITY_DAYS'
  | 'ATTENDANCE_FREQUENCY'
  | 'ATTENDANCE_BASELINE'
  | 'ATTENDANCE_TREND'
  | 'WORKOUT_ADHERENCE'
  | 'WORKOUT_ADHERENCE_TREND'
  | 'BOOKING_ENGAGEMENT'
  | 'BOOKING_TREND'
  | 'NO_SHOW_RATE'
  | 'APP_ENGAGEMENT'
  | 'APP_ENGAGEMENT_TREND'
  | 'CHECK_IN_ENGAGEMENT'
  | 'GOAL_ENGAGEMENT'
  | 'NUTRITION_ENGAGEMENT'
  | 'WEARABLE_ENGAGEMENT'
  | 'MEMBERSHIP_CONTEXT'
  | 'MEMBERSHIP_EXPIRATION_WINDOW'
  | 'MEMBER_LIFECYCLE'
  | 'REENGAGEMENT_SIGNAL'
  | 'CONTACT_FREQUENCY'
  | 'COOLDOWN_STATUS'
  | 'DATA_QUALITY';

export type RetentionTrend = 'IMPROVING' | 'STABLE' | 'DECLINING' | 'INSUFFICIENT_DATA';

export type DataQuality = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';

export type RetentionFactorSeverity = 'LOW' | 'MODERATE' | 'HIGH';

export type MembershipExpirationWindow =
  | 'ACTIVE'
  | 'EXPIRING_30_DAYS'
  | 'EXPIRING_14_DAYS'
  | 'EXPIRING_7_DAYS'
  | 'EXPIRED';

import { MemberLifecycleStage } from './retention-intelligence';

// ==========================================
// 4. STANDARDIZED RETENTION DATA POINT CONTRACT (Section 36)
// ==========================================

export interface RetentionDataPoint {
  type: RetentionDataType;
  currentValue?: number;
  baselineValue?: number;
  absoluteDifference?: number;
  percentageDifference?: number;
  observationWindow?: RetentionObservationWindow | string;
  baselineWindow?: string;
  trend?: RetentionTrend;
  severity?: RetentionFactorSeverity;
  dataQuality: DataQuality;
  observedAt: string;
  source: string;
  evidence: string[];
}

// ==========================================
// 5. DETAILED DOMAIN METRIC CONTRACTS
// ==========================================

export interface InactivityMetric {
  lastActivityAt: string | null;
  inactivityDays: number | null;
  status: 'ACTIVE' | 'INACTIVE' | 'NO_ACTIVITY_DATA';
  timezone: string;
  lastActivityType?: RetentionActivityType;
  sourceDomain: string;
}

export interface AttendanceMetrics {
  attendedCount: number;
  observationWindow: WindowDefinition;
  baseline?: {
    attendedCount: number;
    baselineWindow: BaselineWindowDefinition;
  };
  absoluteDifference?: number;
  percentageDifference?: number;
  trend: RetentionTrend;
  dataQuality: DataQuality;
}

export interface WorkoutAdherenceMetrics {
  scheduledCount: number;
  completedCount: number;
  skippedCount: number;
  overdueCount: number;
  adherencePercentage: number;
  trend: RetentionTrend;
  observationWindow: WindowDefinition;
  dataQuality: DataQuality;
}

export interface BookingEngagementMetrics {
  classesViewed: number;
  bookingsCreated: number;
  bookingsCancelled: number;
  waitlistJoins: number;
  bookingsAttended: number;
  bookingsMissed: number;
  bookingFrequency: number;
  trend: RetentionTrend;
  observationWindow: WindowDefinition;
  dataQuality: DataQuality;
}

export interface NoShowMetrics {
  bookedSessions: number;
  eligibleSessions: number;
  noShows: number;
  noShowRate: number;
  observationWindow: WindowDefinition;
  dataQuality: DataQuality;
}

export interface AppEngagementMetrics {
  opensCount: number;
  loginsCount: number;
  workoutsViewedCount: number;
  workoutsStartedCount: number;
  classesViewedCount: number;
  bookingsCreatedCount: number;
  goalsViewedCount: number;
  nutritionInteractionsCount: number;
  dailyCheckInsStartedCount: number;
  dailyCheckInsCompletedCount: number;
  aiCoachInteractionsCount: number;
  wearableDashboardViewsCount: number;
  totalAppActions: number;
  trend: RetentionTrend;
  observationWindow: WindowDefinition;
  dataQuality: DataQuality;
}

export interface DailyCheckInEngagementMetrics {
  checkInsStarted: number;
  checkInsCompleted: number;
  checkInsSkipped: number;
  completionRate: number;
  recentActivityDays: number;
  observationWindow: WindowDefinition;
  dataQuality: DataQuality;
  // NOTE: Strict privacy rule: Response text/vitals are NOT used for retention scoring
}

export interface GoalEngagementMetrics {
  activeGoalsCount: number;
  goalsViewedCount: number;
  goalsUpdatedCount: number;
  goalsCompletedCount: number;
  progressUpdatesCount: number;
  lastGoalInteractionAt?: string;
  dataQuality: DataQuality;
}

export interface NutritionEngagementMetrics {
  foodLogsCount: number;
  mealPlanViewsCount: number;
  dashboardViewsCount: number;
  coachInteractionsCount: number;
  totalNutritionEvents: number;
  lastLoggedAt?: string;
  dataQuality: DataQuality;
  // NOTE: Strict privacy rule: Calories, macros, and allergies are NEVER retention risk factors
}

export interface WearableEngagementMetrics {
  isConnected: boolean;
  provider?: string;
  syncFrequencyWeekly: number;
  lastSyncedAt?: string;
  dashboardViewsCount: number;
  dataQuality: DataQuality;
  // NOTE: Strict privacy rule: HRV, resting heart rate, and sleep scores are NEVER retention risk factors
}

export interface MembershipContextMetrics {
  status: string;
  startDate?: string;
  endDate?: string;
  daysUntilExpiration?: number;
  membershipPlanName?: string;
  isAutoRenew: boolean;
  expirationWindow: MembershipExpirationWindow;
}

export interface ReengagementSignalData {
  isReengaged: boolean;
  reengagementAt?: string;
  signalType?: RetentionActivityType;
  sourceEvent?: string;
  previousInactivityDays?: number;
  previousRiskLevel?: string;
}

export interface ContactFrequencySummary {
  communicationsLast24h: number;
  communicationsLast7d: number;
  communicationsLast30d: number;
  retentionCommunicationsLast7d: number;
  retentionCommunicationsLast30d: number;
  lastOutreachAt?: string;
  isCooldownActive: boolean;
  cooldownUntil?: string;
  cooldownReason?: string;
}

// ==========================================
// 6. COMPLETE RETENTION DATA BUNDLE (Section 31 & 36)
// ==========================================

export interface RetentionDataBundle {
  memberId: string;
  organisationId: string;
  outletId?: string;
  calculatedAt: string;
  dataVersion: number;
  lifecycleStage: MemberLifecycleStage;
  inactivity: InactivityMetric;
  attendance: AttendanceMetrics;
  workoutAdherence: WorkoutAdherenceMetrics;
  booking: BookingEngagementMetrics;
  noShow: NoShowMetrics;
  appEngagement: AppEngagementMetrics;
  checkInEngagement: DailyCheckInEngagementMetrics;
  goalEngagement: GoalEngagementMetrics;
  nutritionEngagement: NutritionEngagementMetrics;
  wearableEngagement: WearableEngagementMetrics;
  membership: MembershipContextMetrics;
  reengagement: ReengagementSignalData;
  contactFrequency: ContactFrequencySummary;
  overallDataQuality: DataQuality;
  dataPoints: RetentionDataPoint[];
}
