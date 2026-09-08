/**
 * Day 30 — Automated Engagement Workflows Local Types
 *
 * Re-exports shared types from @fitcore/types and defines local engine interfaces.
 */

export * from '@fitcore/types';

export type WorkflowState =
  | 'PENDING'
  | 'RUNNING'
  | 'WAITING'
  | 'AWAITING_APPROVAL'
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED'
  | 'EXPIRED'
  | 'SUPPRESSED';

export type WorkflowOutcome =
  | 'COMPLETED'
  | 'MEMBER_REENGAGED'
  | 'MEMBER_RESPONDED'
  | 'BOOKING_CREATED'
  | 'ATTENDANCE_RECORDED'
  | 'WORKOUT_COMPLETED'
  | 'MEMBERSHIP_RENEWED'
  | 'TASK_COMPLETED'
  | 'NO_RESPONSE'
  | 'SUPPRESSED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED';

export interface WorkflowTransitionEvent {
  fromState: WorkflowState;
  toState: WorkflowState;
  instanceId: string;
  actorId?: string;
  reason?: string;
  timestamp: string;
}

export interface FrequencyLimitCheckResult {
  allowed: boolean;
  limitType?: string;
  currentCount?: number;
  maxLimit?: number;
  reason?: string;
}

export interface ScheduledStepCalculation {
  scheduledAt: Date;
  reason: string;
  timezone: string;
}
