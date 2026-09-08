/**
 * FitCore AI Retention Agent Contracts & Types (Day 29)
 *
 * Connects Engagement Intelligence, Retention Intelligence, Reactivation,
 * and the Communication Engine under a mandatory human-in-the-loop approval workflow.
 *
 * CRITICAL DIRECTIVE:
 * OBSERVE -> IDENTIFY -> EXPLAIN -> RECOMMEND -> DRAFT -> HUMAN APPROVAL -> COMMUNICATE -> TRACK -> LEARN
 * AI must NEVER autonomously send messages or take membership/pricing actions.
 */

import {
  RetentionRiskLevel,
} from './engagement-intelligence';
import {
  RetentionRiskFactor,
  RetentionPositiveSignal,
  RetentionInterventionType,
  RetentionRiskTrend,
} from './retention-intelligence';
import { CommunicationChannel } from './communications';

// ==========================================
// 1. STATUSES & TAXONOMY
// ==========================================

export type RetentionAgentAnalysisStatus =
  | 'GENERATED'
  | 'REVIEW_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'SCHEDULED'
  | 'SENT'
  | 'DELIVERED'
  | 'ENGAGED'
  | 'REENGAGED'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'CANCELLED';

export type RetentionOutreachStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'SENT'
  | 'DELIVERED'
  | 'ENGAGED'
  | 'REENGAGED'
  | 'NO_RESPONSE'
  | 'DECLINED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED';

export type RetentionApprovalStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED';

export type RetentionPriorityLevel =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'URGENT';

export type RetentionObservedOutcome =
  | 'REENGAGED'
  | 'BOOKING_CREATED'
  | 'CLASS_ATTENDED'
  | 'WORKOUT_COMPLETED'
  | 'PT_SESSION_BOOKED'
  | 'MEMBER_RESPONDED'
  | 'MEMBER_DECLINED'
  | 'NO_RESPONSE'
  | 'MEMBERSHIP_RENEWED'
  | 'MEMBERSHIP_CANCELLED'
  | 'STAFF_FOLLOW_UP_REQUIRED'
  | 'UNKNOWN';

// ==========================================
// 2. TIMING & STRATEGY
// ==========================================

export interface RetentionTimingRecommendation {
  recommendedAt: string;
  timezone: string;
  reason: string;
  confidence: number;
}

export interface StructuredRetentionStrategy {
  intervention: RetentionInterventionType;
  reason: string;
  priority: RetentionPriorityLevel;
  suggestedStaffRole: string;
  suggestedChannel: CommunicationChannel;
  suggestedTiming: RetentionTimingRecommendation;
  expectedNextStep: string;
  confidence: number;
}

// ==========================================
// 3. AI STRUCTURED OUTPUT CONTRACT
// ==========================================

export interface RetentionAgentStructuredOutput {
  summary: string;
  riskLevel: RetentionRiskLevel;
  riskTrend: RetentionRiskTrend;
  primaryFactors: RetentionRiskFactor[];
  positiveSignals: RetentionPositiveSignal[];
  recommendedIntervention: RetentionInterventionType;
  interventionReason: string;
  recommendedChannel: CommunicationChannel;
  recommendedTiming: RetentionTimingRecommendation;
  messageDraft: string;
  staffNote?: string;
  nextBestAction?: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
  caution?: string;
  sources?: string[];
}

// ==========================================
// 4. DATA TRANSFER OBJECTS (DTOs)
// ==========================================

export interface RetentionAgentAnalysisDto {
  id: string;
  organisationId: string;
  memberId: string;
  outletId?: string;
  retentionRiskId?: string;
  analysisVersion: number;
  contextVersion: number;
  status: RetentionAgentAnalysisStatus;
  priority: RetentionPriorityLevel;
  riskLevel: RetentionRiskLevel;
  riskTrend: RetentionRiskTrend;
  primaryFactors: RetentionRiskFactor[];
  positiveSignals: RetentionPositiveSignal[];
  recommendedInterventions: RetentionInterventionType[];
  recommendedChannel: CommunicationChannel;
  recommendedTiming?: RetentionTimingRecommendation;
  summary: string;
  staffNote?: string;
  nextBestAction?: string;
  confidence: string;
  caution?: string;
  sources?: string[];
  generatedBy: string;
  model?: string;
  promptVersion: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RetentionOutreachDto {
  id: string;
  organisationId: string;
  memberId: string;
  memberName?: string;
  outletId?: string;
  outletName?: string;
  retentionAnalysisId?: string;
  interventionType: RetentionInterventionType;
  communicationId?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  approvedByStaffId?: string;
  approvedByStaffName?: string;
  status: RetentionOutreachStatus;
  approvalStatus: RetentionApprovalStatus;
  recommendedChannel: CommunicationChannel;
  selectedChannel: CommunicationChannel;
  messageDraft: string;
  finalMessage?: string;
  staffNotes?: string;
  rejectionReason?: string;
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  respondedAt?: string;
  outcome?: RetentionObservedOutcome;
  outcomeReason?: string;
  outcomeRecordedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RetentionQueueQueryDto {
  outletId?: string;
  assignedStaffId?: string;
  riskLevel?: RetentionRiskLevel;
  priority?: RetentionPriorityLevel;
  status?: RetentionOutreachStatus;
  channel?: CommunicationChannel;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AnalyzeRetentionMemberDto {
  memberId: string;
  promptQuery?: string;
  forceRefresh?: boolean;
}

export interface CreateOutreachDto {
  memberId: string;
  outletId?: string;
  interventionType: RetentionInterventionType;
  selectedChannel: CommunicationChannel;
  messageDraft: string;
  scheduledAt?: string;
  assignedStaffId?: string;
}

export interface ApproveOutreachDto {
  editedMessage?: string;
  selectedChannel?: CommunicationChannel;
  scheduledAt?: string;
  staffNotes?: string;
}

export interface RejectOutreachDto {
  reason: string;
}

export interface RescheduleOutreachDto {
  scheduledAt: string;
  reason?: string;
}

export interface SubmitOutreachFeedbackDto {
  rating: 'HELPFUL' | 'NOT_HELPFUL' | 'INCORRECT' | 'NOT_RELEVANT';
  comment?: string;
}

export interface RecordRetentionOutcomeDto {
  outreachId: string;
  outcome: RetentionObservedOutcome;
  outcomeReason?: string;
}

export interface RetentionAgentAnalyticsDto {
  organisationId: string;
  outletId?: string;
  candidatesIdentified: number;
  analysesGenerated: number;
  recommendationsGenerated: number;
  outreachPendingApproval: number;
  outreachApproved: number;
  outreachRejected: number;
  outreachSent: number;
  outreachDelivered: number;
  outreachResponded: number;
  membersReengaged: number;
  channelDistribution: Record<CommunicationChannel, number>;
  interventionDistribution: Record<string, number>;
  calculatedAt: string;
}
