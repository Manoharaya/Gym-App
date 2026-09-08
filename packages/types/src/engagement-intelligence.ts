/**
 * FitCore Member Engagement Intelligence Contracts & Types (Day 25)
 *
 * Grounded, deterministic-first intelligence layer quantifying member engagement
 * across gym visits, training, app activity, and goals, with personal baseline
 * comparisons, multi-pillar trend detection, and explainable retention risk.
 */

export type OverallEngagementLevel =
  | 'VERY_LOW'
  | 'LOW'
  | 'MODERATE'
  | 'HIGH'
  | 'VERY_HIGH'
  | 'INSUFFICIENT_DATA';

export type EngagementTrendDirection =
  | 'IMPROVING'
  | 'STABLE'
  | 'DECLINING'
  | 'INSUFFICIENT_DATA';

export type RetentionRiskLevel =
  | 'INSUFFICIENT_DATA'
  | 'LOW'
  | 'MODERATE'
  | 'ELEVATED'
  | 'HIGH';

export type DataQualityLevel =
  | 'NO_DATA'
  | 'INSUFFICIENT_DATA'
  | 'PARTIAL_DATA'
  | 'STALE_DATA'
  | 'SUFFICIENT_DATA';

export type ReactivationWorkflowState =
  | 'NO_ACTION'
  | 'FOLLOW_UP_RECOMMENDED'
  | 'FOLLOW_UP_IN_PROGRESS'
  | 'REENGAGED';

export type EngagementConfidenceLevel =
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'INSUFFICIENT_DATA';

export type EngagementTrendType =
  | 'ATTENDANCE_IMPROVING'
  | 'ATTENDANCE_DECLINING'
  | 'WORKOUT_ADHERENCE_IMPROVING'
  | 'WORKOUT_ADHERENCE_DECLINING'
  | 'BOOKING_ACTIVITY_INCREASING'
  | 'BOOKING_ACTIVITY_DECREASING'
  | 'APP_ENGAGEMENT_INCREASING'
  | 'APP_ENGAGEMENT_DECREASING'
  | 'GOAL_ENGAGEMENT_INCREASING'
  | 'GOAL_ENGAGEMENT_DECREASING'
  | 'CHECKIN_ENGAGEMENT_INCREASING'
  | 'CHECKIN_ENGAGEMENT_DECREASING'
  | 'OVERALL_ENGAGEMENT_IMPROVING'
  | 'OVERALL_ENGAGEMENT_DECLINING';

export type AppEngagementEventType =
  | 'APP_OPENED'
  | 'LOGIN'
  | 'PROFILE_VIEWED'
  | 'CLASS_VIEWED'
  | 'BOOKING_CREATED'
  | 'BOOKING_CANCELLED'
  | 'WORKOUT_VIEWED'
  | 'WORKOUT_STARTED'
  | 'WORKOUT_COMPLETED'
  | 'GOAL_VIEWED'
  | 'NUTRITION_VIEWED'
  | 'NUTRITION_LOGGED'
  | 'DAILY_CHECKIN_STARTED'
  | 'DAILY_CHECKIN_COMPLETED'
  | 'AI_COACH_USED'
  | 'AI_NUTRITION_USED'
  | 'WEARABLE_VIEWED';

export interface ObservedSignalItem {
  category: string;
  observation: string;
  timeframe?: string;
}

export interface MemberEngagementProfileDto {
  memberId: string;
  organisationId: string;
  lastAppActivity?: string | null;
  lastGymVisit?: string | null;
  lastWorkout?: string | null;
  lastBooking?: string | null;
  lastCheckIn?: string | null;

  attendanceFrequency: number; // visits per week over last 28 days
  workoutAdherence: number; // 0..100 percentage
  bookingFrequency: number; // bookings per week
  appEngagement: number; // events / week
  goalEngagement: number; // active goals progress score 0..100
  nutritionEngagement?: number; // logs per week
  wearableEngagement?: number; // sync days per week

  overallEngagement: OverallEngagementLevel;
  trend: EngagementTrendDirection;
  calculatedAt: string;
}

export interface PersonalBaselineDto {
  memberId: string;
  organisationId: string;
  historicalWindowDays: number; // default 28 or 60
  recentWindowDays: number; // default 7 or 14
  baselineVisitsPerWeek: number;
  recentVisitsPerWeek: number;
  baselineWorkoutAdherence: number;
  recentWorkoutAdherence: number;
  baselineBookingsPerWeek: number;
  recentBookingsPerWeek: number;
  baselineAppEventsPerWeek: number;
  recentAppEventsPerWeek: number;
  baselineCheckInRate: number;
  recentCheckInRate: number;
  deviationPercent: number;
  isDeviating: boolean;
  momentum: 'IMPROVING' | 'STABLE' | 'DECLINING';
  sufficientHistory: boolean;
}

export interface EngagementTrendItem {
  trendType: EngagementTrendType;
  direction: 'IMPROVING' | 'STABLE' | 'DECLINING';
  metric: string;
  baselineValue: number;
  recentValue: number;
  deltaPercent: number;
  confidence: EngagementConfidenceLevel;
  description: string;
  observationCount: number;
}

export interface RetentionRiskAssessment {
  memberId: string;
  organisationId: string;
  riskLevel: RetentionRiskLevel;
  observedSignals: ObservedSignalItem[];
  contributingReasons: string[];
  workflowState: ReactivationWorkflowState;
  dataQuality: DataQualityLevel;
  assessedAt: string;
}

export interface RecommendedActionItem {
  type:
    | 'CHECK_IN'
    | 'TRAINING'
    | 'GOAL'
    | 'BOOKING'
    | 'RECOVERY'
    | 'SUPPORT'
    | 'REENGAGEMENT';
  recommendation: string;
}

export interface EngagementIntelligenceResponse {
  summary: string;
  observedSignals: ObservedSignalItem[];
  engagementInterpretation: {
    level: OverallEngagementLevel;
    trend: EngagementTrendDirection;
  };
  retentionRisk: {
    level: RetentionRiskLevel;
    reasons: string[];
  };
  recommendedActions: RecommendedActionItem[];
  confidence: EngagementConfidenceLevel;
}

export interface OrganisationEngagementAnalyticsDto {
  organisationId: string;
  outletId?: string;
  timeframe: string;
  activeMembers: number;
  engagedMembers: number;
  decliningMembers: number;
  elevatedRiskMembers: number;
  inactiveMembers: number;
  reactivatedMembers: number;
  averageVisitsPerMember: number;
  averageWorkoutAdherence: number;
  bookingActivityCount: number;
  appEngagementScore: number;
  checkInCompletionRate: number;
  engagementLevelDistribution: Record<OverallEngagementLevel, number>;
  retentionRiskDistribution: Record<RetentionRiskLevel, number>;
  generatedAt: string;
}

export interface TrainerClientEngagementDto {
  memberId: string;
  firstName?: string;
  lastName?: string;
  engagementLevel: OverallEngagementLevel;
  trend: EngagementTrendDirection;
  lastGymVisit?: string | null;
  lastWorkout?: string | null;
  workoutsCompletedLast30d: number;
  attendanceVisitsLast30d: number;
  workoutAdherencePercent: number;
  observedSignals: ObservedSignalItem[];
  suggestedFollowUp: string;
}

export interface EngagementPrivacyViewDto {
  title: string;
  whatIsTracked: string[];
  whyItIsUsed: string[];
  howAIUsesIt: string[];
  whoCanSeeIt: string[];
  fairnessCommitment: string;
  retentionPolicy: string;
  memberRights: string[];
}
