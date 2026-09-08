/**
 * FitCore AI Reactivation & Member Recovery Contracts & Types (Day 27)
 *
 * Personalized Reactivation Strategies, Recovery Workflows & Human-Approved Member Recovery.
 *
 * CRITICAL RULE:
 * AI may IDENTIFY, ANALYZE, EXPLAIN, PRIORITIZE, RECOMMEND, DRAFT, SUMMARIZE.
 * AI must NEVER autonomously message members, call members, modify memberships,
 * change pricing, discount, book/cancel classes, or modify workout/nutrition plans.
 * All external actions remain strictly human-approved.
 */

import { RetentionRiskLevel, OverallEngagementLevel } from './engagement-intelligence';
import { RetentionRiskTrend } from './retention-intelligence';

// ==========================================
// 1. LIFECYCLE & WORKFLOW STATES
// ==========================================

export type ReactivationLifecycleState =
  | 'NOT_ELIGIBLE'
  | 'ELIGIBLE'
  | 'IN_REACTIVATION'
  | 'REENGAGED'
  | 'CLOSED';

export type ReactivationStatus =
  | 'NO_ACTION'
  | 'FOLLOW_UP_RECOMMENDED'
  | 'FOLLOW_UP_IN_PROGRESS'
  | 'REENGAGED'
  | 'DISMISSED'
  | 'EXPIRED';

export type RecoveryState =
  | 'NO_RECOVERY_SIGNAL'
  | 'EARLY_REENGAGEMENT'
  | 'PARTIAL_REENGAGEMENT'
  | 'STABLE_REENGAGEMENT'
  | 'REENGAGED';

// ==========================================
// 2. SIGNALS TAXONOMY
// ==========================================

export type ReactivationNegativeSignalType =
  | 'NO_ACTIVITY'
  | 'ATTENDANCE_DECLINE'
  | 'WORKOUT_DECLINE'
  | 'BOOKING_DECLINE'
  | 'CHECKIN_DECLINE'
  | 'GOAL_DISENGAGEMENT'
  | 'REPEATED_NO_SHOWS'
  | 'MEMBERSHIP_EXPIRING'
  | 'LONG_INACTIVITY'
  | 'TRAINING_DISRUPTION';

export type ReactivationPositiveSignalType =
  | 'RECENT_VISIT'
  | 'RECENT_WORKOUT'
  | 'RECENT_BOOKING'
  | 'RECENT_CHECKIN'
  | 'GOAL_ACTIVITY'
  | 'APP_REENGAGEMENT'
  | 'CLASS_BOOKED'
  | 'PT_SESSION_BOOKED'
  | 'WEARABLE_REENGAGEMENT';

export interface ReactivationBarrierItem {
  type: ReactivationNegativeSignalType;
  observation: string;
  evidence: string[];
}

export interface ReactivationPositiveSignalItem {
  type: ReactivationPositiveSignalType;
  observation: string;
  evidence?: string[];
  detectedAt?: string;
}

// ==========================================
// 3. CONTROLLED RECOVERY STRATEGIES TAXONOMY
// ==========================================

export const REACTIVATION_STRATEGIES = [
  'PERSONAL_TRAINER_CHECK_IN',
  'GOAL_RESET',
  'TRAINING_RESTART',
  'CLASS_REINTRODUCTION',
  'PERSONAL_TRAINING_RESTART',
  'ROUTINE_REBUILD',
  'RECOVERY_FOCUSED_RETURN',
  'APP_ENGAGEMENT_RESTART',
  'NUTRITION_LOGGING_RESTART',
  'MEMBERSHIP_REVIEW',
  'GENERAL_SUPPORT',
  'NO_ACTION',
  'INSUFFICIENT_DATA',
] as const;

export type ReactivationStrategyType = typeof REACTIVATION_STRATEGIES[number];

export type ReactivationStrategyPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ReactivationStrategyRecommendation {
  type: ReactivationStrategyType;
  priority: ReactivationStrategyPriority;
  reason: string;
  suggestedStaffMessage?: string;
  suggestedNextStep?: string;
}

// ==========================================
// 4. RECOVERY PLAN DOMAIN (HUMAN IN THE LOOP)
// ==========================================

export type RecoveryPlanStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'REENGAGED'
  | 'COMPLETED'
  | 'DISMISSED'
  | 'EXPIRED';

export interface MemberRecoveryPlanDto {
  id: string;
  organisationId: string;
  outletId?: string | null;
  outletName?: string | null;
  memberId: string;
  memberName?: string;
  strategy: ReactivationStrategyType;
  priority: ReactivationStrategyPriority;
  reason: string;
  suggestedStaffMessage?: string | null;
  suggestedNextStep?: string | null;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  status: RecoveryPlanStatus;
  dismissalReason?: string | null;
  outcomeNotes?: string | null;
  recommendedAt: string;
  approvedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  expiresAt?: string | null;
  source: string;
  analysisVersion: number;
  dataVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecoveryPlanDto {
  memberId: string;
  outletId?: string;
  strategy: ReactivationStrategyType;
  priority?: ReactivationStrategyPriority;
  reason: string;
  suggestedStaffMessage?: string;
  suggestedNextStep?: string;
  assignedStaffId?: string;
  status?: RecoveryPlanStatus;
  notes?: string;
  expiresAt?: string;
}

export interface UpdateRecoveryPlanDto {
  status?: RecoveryPlanStatus;
  assignedStaffId?: string;
  strategy?: ReactivationStrategyType;
  priority?: ReactivationStrategyPriority;
  suggestedStaffMessage?: string;
  suggestedNextStep?: string;
  outcomeNotes?: string;
  dismissalReason?: string;
}

// ==========================================
// 5. INACTIVITY & RECOVERY ANALYSIS DTOs
// ==========================================

export interface MeaningfulActivityRecord {
  type: 'GYM_VISIT' | 'CLASS_ATTENDANCE' | 'PT_SESSION' | 'WORKOUT_COMPLETION' | 'BOOKING' | 'DAILY_CHECKIN' | 'APP_ACTIVITY' | 'GOAL_ACTIVITY';
  occurredAt: string;
  details?: string;
  weight: number;
}

export interface InactivityAnalysisDto {
  lastMeaningfulActivityAt: string | null;
  lastMeaningfulActivityType: string | null;
  daysInactive: number;
  historicalActivityFrequencyPerWeek: number;
  recentActivityFrequencyPerWeek: number;
  baselineActivityVisitsPerWeek: number;
  activityDropPercent: number;
  previousInactivitySpellsCount: number;
  longestInactivityDays: number;
  reactivationHistorySummary?: string;
}

export interface MemberReactivationProfileDto {
  id: string;
  organisationId: string;
  memberId: string;
  memberName?: string;
  lifecycleState: ReactivationLifecycleState;
  reactivationStatus: ReactivationStatus;
  recoveryState: RecoveryState;
  inactivityStartDate: string | null;
  lastMeaningfulActivityAt: string | null;
  inactivityDays: number;
  previousEngagementLevel: OverallEngagementLevel | null;
  currentEngagementLevel: OverallEngagementLevel | null;
  retentionRiskLevel: RetentionRiskLevel | null;
  retentionRiskTrend: RetentionRiskTrend | null;
  primaryBarriers: ReactivationBarrierItem[];
  positiveSignals: ReactivationPositiveSignalItem[];
  recommendedStrategy: ReactivationStrategyType | null;
  activePlan?: MemberRecoveryPlanDto | null;
  analysisVersion: number;
  dataVersion: number;
  updatedAt: string;
}

// ==========================================
// 6. STRUCTURED AI REACTIVATION OUTPUT CONTRACT
// ==========================================

export interface ReactivationIntelligenceResponse {
  summary: string;
  reactivation: {
    eligible: boolean;
    status: ReactivationStatus;
    recoveryState: RecoveryState;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
  };
  inactivity: {
    observation: string;
    timeframe?: string;
    evidence: string[];
  };
  primaryFactors: Array<{
    type: string;
    observation: string;
    evidence: string[];
  }>;
  positiveSignals: Array<{
    type: string;
    observation: string;
  }>;
  recommendedStrategies: ReactivationStrategyRecommendation[];
  suggestedStaffMessage?: string;
  suggestedNextStep: string;
}

// ==========================================
// 7. STAFF QUEUE & SUMMARY CONTRACTS
// ==========================================

export interface ReactivationQueueItemDto {
  memberId: string;
  memberName: string;
  memberEmail?: string;
  avatarUrl?: string | null;
  outletId?: string;
  outletName?: string;
  inactivityDays: number;
  lastMeaningfulActivityAt: string | null;
  riskLevel: RetentionRiskLevel;
  riskTrend: RetentionRiskTrend;
  recoveryState: RecoveryState;
  primaryBarrier: string;
  recommendedStrategy: ReactivationStrategyType;
  strategyPriority: ReactivationStrategyPriority;
  assignedStaff?: {
    id: string;
    name: string;
  } | null;
  recoveryPlanStatus: RecoveryPlanStatus | null;
  activePlanId?: string | null;
}

export interface ReactivationSummaryDto {
  organisationId: string;
  outletId?: string | null;
  totalActiveMembers: number;
  eligibleMembersCount: number;
  membersInReactivationCount: number;
  reengagedMembersCount: number;
  followupsPendingApprovalCount: number;
  followupsInProgressCount: number;
  averageInactivityDaysBeforeRecovery: number;
  recoveryRatePercent: number;
  strategyDistribution: Record<ReactivationStrategyType, number>;
  recoveryStateDistribution: Record<RecoveryState, number>;
  calculatedAt: string;
}

// ==========================================
// 8. STAFF FEEDBACK CONTRACT
// ==========================================

export type ReactivationFeedbackRating = 'HELPFUL' | 'NOT_HELPFUL' | 'INCORRECT' | 'NOT_RELEVANT';

export type ReactivationFeedbackReason =
  | 'WRONG_SIGNAL'
  | 'WRONG_STRATEGY'
  | 'OUTDATED_DATA'
  | 'INSUFFICIENT_CONTEXT'
  | 'OTHER';

export interface ReactivationFeedbackDto {
  memberId: string;
  planId?: string;
  rating: ReactivationFeedbackRating;
  reasonCategory?: ReactivationFeedbackReason;
  comment?: string;
  submittedAt: string;
}
