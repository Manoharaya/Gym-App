import {
  MemberReactivationProfileDto,
  InactivityAnalysisDto,
  ReactivationStrategyRecommendation,
  ReactivationStrategyType,
  ReactivationBarrierItem,
  ReactivationPositiveSignalItem,
  MemberRecoveryPlanDto,
  RecoveryState,
  ReactivationStatus,
  ReactivationLifecycleState,
  PersonalBaselineDto,
  RetentionRiskAssessment,
} from '@fitcore/types';
import { EngagementSignalsBundle } from '../engagement-intelligence/engagement-intelligence.types';

export interface ReactivationContextProjection {
  memberSummary: {
    id: string;
    firstName: string;
    lastName: string;
    lifecycleStage: string;
    tenureDays: number;
    joinedDate: string;
  };
  lifecycleState: ReactivationLifecycleState;
  reactivationStatus: ReactivationStatus;
  recoveryState: RecoveryState;
  inactivitySummary: InactivityAnalysisDto;
  engagementSummary: {
    previousEngagementLevel: string;
    currentEngagementLevel: string;
    trendMomentum: string;
  };
  retentionRisk: {
    level: string;
    trend: string;
    contributingReasons: string[];
  };
  retentionFactors: ReactivationBarrierItem[];
  recoverySignals: ReactivationPositiveSignalItem[];
  trainingSummary: {
    activePlanName?: string;
    lastWorkoutCompletedAt?: string | null;
    completedWorkoutsLast28d: number;
    workoutAdherencePct: number;
  };
  bookingSummary: {
    totalBookingsLast28d: number;
    upcomingBookingsCount: number;
    lastBookingAt?: string | null;
    attendedCount: number;
    noShowCount: number;
  };
  attendanceSummary: {
    lastVisitAt?: string | null;
    visitsLast28d: number;
    visitsDeltaPct: number;
  };
  goalsSummary: {
    activeGoalsCount: number;
    primaryGoalTitle?: string;
    goalTargetDate?: string | null;
  };
  trainerRelationship?: {
    assignedTrainerId?: string;
    trainerName?: string;
    assignmentType?: string;
  } | null;
  membershipSummary: {
    membershipName?: string;
    status: string;
    expiresAt?: string | null;
    isExpiringSoon: boolean;
  };
  previousReactivationHistory?: {
    previousSpellsCount: number;
    longestInactivityDays: number;
    previousCompletedPlansCount: number;
  };
  dataQuality: {
    sufficientData: boolean;
    observationsCount: number;
  };
}

export interface EligibilityEvaluationResult {
  eligible: boolean;
  lifecycleState: ReactivationLifecycleState;
  reactivationStatus: ReactivationStatus;
  primaryReasons: string[];
  inactivityDays: number;
  lastMeaningfulActivityAt: Date | null;
}

export interface StrategySelectionInput {
  inactivityDays: number;
  retentionRiskLevel: string;
  hasAssignedTrainer: boolean;
  previousClassAttendanceCount: number;
  recentClassBooking: boolean;
  hasActiveGoals: boolean;
  recoveryState: RecoveryState;
}
