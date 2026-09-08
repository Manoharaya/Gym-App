/**
 * FitCore AI Retention Intelligence Contracts & Types (Day 26)
 *
 * Predictive Member Retention Insights, Risk Explanation & Recommended Interventions.
 *
 * CRITICAL RULE:
 * AI may DETECT, EXPLAIN, RECOMMEND, PRIORITIZE, and DRAFT.
 * AI must NEVER directly perform retention actions (no messages, no discounts, no cancellations).
 */

import { RetentionRiskLevel } from './engagement-intelligence';

// ==========================================
// 1. RISK FACTORS TAXONOMY
// ==========================================

export type RetentionRiskFactorType =
  | 'ATTENDANCE_DECLINE'
  | 'WORKOUT_ADHERENCE_DECLINE'
  | 'BOOKING_DECLINE'
  | 'APP_ENGAGEMENT_DECLINE'
  | 'CHECKIN_DECLINE'
  | 'GOAL_DISENGAGEMENT'
  | 'LONG_INACTIVITY'
  | 'RECENT_NO_SHOWS'
  | 'MEMBERSHIP_EXPIRATION'
  | 'TRAINING_DISRUPTION'
  | 'ENGAGEMENT_DECLINE'
  | 'ENGAGEMENT_STABILITY'
  | 'REENGAGEMENT_SIGNAL';

export type RetentionSeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RetentionRiskFactor {
  type: RetentionRiskFactorType;
  severity: RetentionSeverityLevel;
  observation: string;
  timeframe?: string;
  evidence: string[];
}

// ==========================================
// 2. POSITIVE SIGNALS TAXONOMY
// ==========================================

export type RetentionPositiveSignalType =
  | 'RECENT_REENGAGEMENT'
  | 'ATTENDANCE_RECOVERY'
  | 'WORKOUT_ADHERENCE_RECOVERY'
  | 'BOOKING_RECOVERY'
  | 'GOAL_PROGRESS'
  | 'RECENT_SUCCESS'
  | 'CHECKIN_RECOVERY'
  | 'APP_ENGAGEMENT_RECOVERY';

export interface RetentionPositiveSignal {
  type: RetentionPositiveSignalType;
  observation: string;
  timeframe?: string;
  evidence?: string[];
}

// ==========================================
// 3. MEMBER LIFECYCLE CONTEXT
// ==========================================

export type MemberLifecycleStage =
  | 'NEW_MEMBER'
  | 'EARLY_MEMBERSHIP'
  | 'ACTIVE_MEMBER'
  | 'LONG_TERM_MEMBER'
  | 'RETURNING_MEMBER'
  | 'REACTIVATED_MEMBER';

export interface MemberLifecycleContext {
  stage: MemberLifecycleStage;
  tenureDays: number;
  joinedDate?: string;
  membershipStartedAt?: string;
  membershipExpiresAt?: string | null;
  daysUntilExpiry?: number | null;
  status: string;
  renewalType?: string;
}

// ==========================================
// 4. INTERVENTION TAXONOMY
// ==========================================

export type RetentionInterventionType =
  | 'TRAINER_CHECK_IN'
  | 'GOAL_REVIEW'
  | 'TRAINING_RESTART'
  | 'CLASS_RECOMMENDATION'
  | 'PERSONAL_TRAINING_FOLLOW_UP'
  | 'RECOVERY_SUPPORT'
  | 'APP_ENGAGEMENT'
  | 'NUTRITION_ENGAGEMENT'
  | 'MEMBERSHIP_CONVERSATION'
  | 'GENERAL_SUPPORT'
  | 'NO_ACTION'
  | 'INSUFFICIENT_DATA';

export type RetentionInterventionPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RetentionInterventionRecommendation {
  type: RetentionInterventionType;
  priority: RetentionInterventionPriority;
  reason: string;
  suggestedActionPlan?: string;
}

// ==========================================
// 5. STRUCTURED AI OUTPUT CONTRACT
// ==========================================

export type RetentionRiskTrend = 'IMPROVING' | 'STABLE' | 'WORSENING' | 'INSUFFICIENT_DATA';

export type RetentionConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';

export interface RetentionIntelligenceResponse {
  summary: string;
  risk: {
    level: RetentionRiskLevel;
    trend: RetentionRiskTrend;
  };
  primaryFactors: RetentionRiskFactor[];
  positiveSignals: RetentionPositiveSignal[];
  recommendedInterventions: RetentionInterventionRecommendation[];
  suggestedStaffNote?: string;
  confidence: RetentionConfidenceLevel;
}

// ==========================================
// 6. FOLLOW-UP TASK DOMAIN
// ==========================================

export type RetentionFollowUpTaskStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DISMISSED'
  | 'EXPIRED';

export interface RetentionFollowUpTaskDto {
  id: string;
  organisationId: string;
  outletId?: string | null;
  memberId: string;
  memberName?: string;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  riskLevel: RetentionRiskLevel;
  interventionType: RetentionInterventionType;
  source: string;
  status: RetentionFollowUpTaskStatus;
  priority: RetentionInterventionPriority;
  title?: string | null;
  notes?: string | null;
  dueAt?: string | null;
  completedAt?: string | null;
  completedByStaffId?: string | null;
  dismissalReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 7. STAFF QUEUE & DASHBOARD CONTRACTS
// ==========================================

export interface RetentionQueueItemDto {
  memberId: string;
  memberName: string;
  memberEmail?: string;
  avatarUrl?: string | null;
  outletId?: string;
  outletName?: string;
  riskLevel: RetentionRiskLevel;
  riskTrend: RetentionRiskTrend;
  primaryReason: string;
  recommendedIntervention: RetentionInterventionType;
  interventionPriority: RetentionInterventionPriority;
  assignedTrainer?: {
    id: string;
    name: string;
  } | null;
  lastVisit?: string | null;
  lastWorkout?: string | null;
  lastContact?: string | null;
  lifecycleStage: MemberLifecycleStage;
  activeTask?: RetentionFollowUpTaskDto | null;
}

export interface RetentionDashboardSummaryDto {
  organisationId: string;
  outletId?: string | null;
  totalActiveMembers: number;
  membersWithElevatedRisk: number;
  membersWithHighRisk: number;
  membersWithDecliningEngagement: number;
  membersReengaging: number;
  membersRequiringFollowUp: number;
  riskDistribution: Record<RetentionRiskLevel, number>;
  trendDistribution: Record<RetentionRiskTrend, number>;
  interventionDistribution: Record<RetentionInterventionType, number>;
  openTasksCount: number;
  completedTasksCount: number;
  calculatedAt: string;
}

// ==========================================
// 8. STAFF FEEDBACK CONTRACT
// ==========================================

export type RetentionFeedbackRating = 'HELPFUL' | 'NOT_HELPFUL' | 'INCORRECT' | 'NOT_RELEVANT';

export interface RetentionFeedbackDto {
  analysisId?: string;
  memberId: string;
  organisationId: string;
  rating: RetentionFeedbackRating;
  comment?: string;
  category?: string;
  submittedAt: string;
}
