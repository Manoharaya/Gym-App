/**
 * Internal types for FitCore AI Retention Intelligence (Day 26)
 */

import {
  RetentionRiskLevel,
  RetentionRiskFactor,
  RetentionPositiveSignal,
  RetentionInterventionRecommendation,
  RetentionIntelligenceResponse,
  MemberLifecycleContext,
  DataQualityLevel,
  PersonalBaselineDto,
  MemberEngagementProfileDto,
} from '@fitcore/types';
import { EngagementSignalsBundle } from '../engagement-intelligence/engagement-intelligence.types';

export interface RetentionContext {
  memberSummary: {
    memberId: string;
    firstName?: string;
    lastName?: string;
    outletId?: string;
    outletName?: string;
    trainerAssigned?: boolean;
    assignedTrainerName?: string;
  };
  membershipSummary: {
    status: string;
    planName?: string;
    isSuspended: boolean;
    isExpiringSoon: boolean;
    daysUntilExpiry?: number | null;
  };
  lifecycleContext: MemberLifecycleContext;
  engagementSummary: {
    overallEngagement: string;
    trend: string;
    attendanceFrequency: number;
    workoutAdherence: number;
    bookingFrequency: number;
    appEngagement: number;
  };
  engagementTrend: {
    direction: string;
    metricHighlights: string[];
  };
  attendanceSummary: {
    visitsLast7d: number;
    visitsLast14d: number;
    visitsLast28d: number;
    visitsLast60d: number;
    visitsLast90d: number;
    baselineVisitsPerWeek: number;
    visitsDeltaPct: number;
    noShowCountLast28d: number;
    lastVisitDate?: string | null;
  };
  bookingSummary: {
    bookingsLast7d: number;
    bookingsLast28d: number;
    baselineBookingsPerWeek: number;
    recentBookingsPerWeek: number;
    lastBookingDate?: string | null;
  };
  workoutSummary: {
    workoutsScheduledLast28d: number;
    workoutsCompletedLast28d: number;
    workoutAdherencePct: number;
    lastWorkoutDate?: string | null;
  };
  goalSummary: {
    activeGoalsCount: number;
    goals: Array<{
      title: string;
      category: string;
      progressPct: number;
      targetDate?: string | null;
    }>;
  };
  recentCheckInSummary?: {
    checkInsLast7d: number;
    checkInsLast28d: number;
    lastCheckInDate?: string | null;
  };
  wearableEngagementSummary?: {
    connectedProvider?: string | null;
    lastSyncDaysAgo?: number | null;
    weeklySyncDays: number;
  };
  retentionRisk: {
    deterministicRiskLevel: RetentionRiskLevel;
    points: number;
    contributingReasons: string[];
  };
  riskFactors: RetentionRiskFactor[];
  recentPositiveSignals: RetentionPositiveSignal[];
  dataQuality: DataQualityLevel;
}

export interface RetentionAnalysisExecutionParams {
  memberId: string;
  organisationId: string;
  now?: Date;
  signals?: EngagementSignalsBundle;
  baseline?: PersonalBaselineDto;
  profile?: MemberEngagementProfileDto;
  forceRecalculate?: boolean;
}
