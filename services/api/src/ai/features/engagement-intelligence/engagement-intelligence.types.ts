/**
 * Internal Engagement Intelligence Types (Day 25)
 */

import {
  OverallEngagementLevel,
  EngagementTrendDirection,
  RetentionRiskLevel,
  DataQualityLevel,
  ReactivationWorkflowState,
  EngagementConfidenceLevel,
  EngagementTrendType,
  AppEngagementEventType,
  ObservedSignalItem,
} from '@fitcore/types';

export interface AttendanceSignals {
  visitsLast7d: number;
  visitsLast28d: number;
  classAttendanceCount: number;
  ptAttendanceCount: number;
  noShowCountLast28d: number;
  attendanceFrequencyPerWeek: number;
  lastGymVisitAt?: Date | null;
  visitsDeltaPct: number;
}

export interface BookingSignals {
  bookingsLast7d: number;
  bookingsLast28d: number;
  cancellationsLast28d: number;
  waitlistCountLast28d: number;
  bookingFrequencyPerWeek: number;
  lastBookingAt?: Date | null;
  bookingDeltaPct: number;
}

export interface WorkoutSignals {
  workoutsScheduledLast28d: number;
  workoutsCompletedLast7d: number;
  workoutsCompletedLast28d: number;
  workoutsSkippedLast28d: number;
  workoutAdherencePct: number; // 0 - 100
  activePlanAdherencePct?: number | null;
  lastWorkoutAt?: Date | null;
  workoutDeltaPct: number;
}

export interface MembershipSignals {
  status: string; // ACTIVE, SUSPENDED, EXPIRED, CANCELLED, etc.
  planName?: string;
  daysUntilExpiry?: number | null;
  isExpiringSoon: boolean;
  isSuspended: boolean;
  isPastDue: boolean;
  startDate?: Date;
  endDate?: Date | null;
}

export interface AppEngagementSignals {
  eventsLast7d: number;
  eventsLast28d: number;
  loginsLast28d: number;
  appOpensLast28d: number;
  featuresUsedCount: number;
  lastAppActivityAt?: Date | null;
  eventsDeltaPct: number;
}

export interface CheckInSignals {
  checkInsLast7d: number;
  checkInsLast28d: number;
  completionRatePct: number; // 0 - 100
  lastCheckInAt?: Date | null;
  motivationTrajectory: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'INSUFFICIENT_DATA';
}

export interface GoalSignals {
  activeGoalsCount: number;
  completedGoalsCount: number;
  averageProgressPct: number;
  lastGoalActivityAt?: Date | null;
}

export interface NutritionEngagementSignals {
  foodLogsLast7d: number;
  foodLogsLast28d: number;
  trackingConsistencyScore: number; // 0 - 100
  lastNutritionLogAt?: Date | null;
}

export interface WearableSignals {
  syncDaysLast7d: number;
  syncDaysLast28d: number;
  syncConsistencyPct: number;
  activityConsistencyScore: number;
  sleepTrackingDays: number;
  lastSyncAt?: Date | null;
}

export interface EngagementSignalsBundle {
  memberId: string;
  organisationId: string;
  attendance: AttendanceSignals;
  booking: BookingSignals;
  workout: WorkoutSignals;
  membership: MembershipSignals;
  app: AppEngagementSignals;
  checkin: CheckInSignals;
  goals: GoalSignals;
  nutrition: NutritionEngagementSignals;
  wearables: WearableSignals;
  collectedAt: Date;
}
