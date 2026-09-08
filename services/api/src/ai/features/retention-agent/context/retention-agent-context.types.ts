/**
 * Retention Agent Context Types (Day 29)
 */

import {
  RetentionRiskLevel,
  RetentionRiskTrend,
  RetentionRiskFactor,
  RetentionPositiveSignal,
  CommunicationChannel,
} from '@fitcore/types';

export interface RetentionAgentMemberContext {
  memberId: string;
  userId: string;
  organisationId: string;
  outletId?: string;
  firstName: string;
  preferredName?: string;
  preferredLanguage: string;
  lifecycleStage: string;
  membership: {
    status: string;
    tierName?: string;
    expiresAt?: string;
    autoRenew: boolean;
  };
  engagement: {
    baselineWeeklyVisits: number;
    recentWeeklyVisits: number;
    dropPercentage: number;
    daysInactive: number;
    completedWorkoutsLast30Days: number;
    bookingsLast30Days: number;
    noShowsLast30Days: number;
    hasWearableConnected: boolean;
  };
  goals: Array<{
    title: string;
    status: string;
  }>;
  trainer?: {
    trainerId: string;
    trainerName: string;
  };
  retentionSignals: {
    riskLevel: RetentionRiskLevel;
    riskTrend: RetentionRiskTrend;
    primaryFactors: RetentionRiskFactor[];
    positiveSignals: RetentionPositiveSignal[];
  };
  reactivationContext?: {
    lifecycleState: string;
    recoveryState: string;
  };
  communicationPolicy: {
    allowedChannels: CommunicationChannel[];
    hasConsent: boolean;
    optedOutChannels: CommunicationChannel[];
    isCooldownActive: boolean;
  };
  dataBundle?: import('@fitcore/types').RetentionDataBundle;
  dataPoints?: import('@fitcore/types').RetentionDataPoint[];
  dataQuality?: import('@fitcore/types').DataQuality;
}
