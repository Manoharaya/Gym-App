/**
 * FitCore AI Retention Agent Internal Types (Day 29)
 */

import {
  RetentionRiskLevel,
  RetentionRiskTrend,
  RetentionRiskFactor,
  RetentionPositiveSignal,
  RetentionInterventionType,
  CommunicationChannel,
  RetentionPriorityLevel,
  RetentionTimingRecommendation,
  RetentionAgentAnalysisStatus,
  RetentionOutreachStatus,
  RetentionApprovalStatus,
  RetentionObservedOutcome,
} from '@fitcore/types';

export interface RetentionCandidateEvaluation {
  memberId: string;
  isCandidate: boolean;
  priority: RetentionPriorityLevel;
  reasons: string[];
  riskLevel: RetentionRiskLevel;
  riskTrend: RetentionRiskTrend;
  cooldownActive: boolean;
  hasSufficientData: boolean;
  assignedTrainerId?: string;
  outletId?: string;
}

export interface RetentionMessageSafetyCheckResult {
  isSafe: boolean;
  violations: string[];
  sanitizedText: string;
}
