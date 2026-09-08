/**
 * Day 30 — Canonical Workflow Trigger Definitions
 *
 * Catalog of domain events and triggers supported by the automation engine.
 */

import { WorkflowTriggerType } from '@fitcore/types';

export interface TriggerDefinitionMetadata {
  triggerType: WorkflowTriggerType;
  category: string;
  displayName: string;
  description: string;
  eventSource: string;
  payloadSchema: Record<string, string>;
  samplePayload: Record<string, any>;
}

export const WORKFLOW_TRIGGER_DEFINITIONS: Record<string, TriggerDefinitionMetadata> = {
  // Member Lifecycle Triggers
  MEMBER_CREATED: {
    triggerType: 'MEMBER_CREATED',
    category: 'ONBOARDING',
    displayName: 'Member Created',
    description: 'Triggered when a member profile is newly registered.',
    eventSource: 'members',
    payloadSchema: { memberId: 'string', email: 'string' },
    samplePayload: { memberId: 'mem_1', email: 'member@test.com' },
  },
  MEMBER_ACTIVATED: {
    triggerType: 'MEMBER_ACTIVATED',
    category: 'ONBOARDING',
    displayName: 'Member Activated',
    description: 'Triggered when member completes initial setup and is marked active.',
    eventSource: 'members',
    payloadSchema: { memberId: 'string', activatedAt: 'string' },
    samplePayload: { memberId: 'mem_1', activatedAt: new Date().toISOString() },
  },
  MEMBER_ONBOARDED: {
    triggerType: 'MEMBER_ONBOARDED',
    category: 'ONBOARDING',
    displayName: 'Member Onboarded',
    description: 'Triggered when a new member completes the initial onboarding flow.',
    eventSource: 'onboarding',
    payloadSchema: { memberId: 'string', completedSteps: 'number' },
    samplePayload: { memberId: 'mem_1', completedSteps: 5 },
  },
  MEMBER_REACTIVATED: {
    triggerType: 'MEMBER_REACTIVATED',
    category: 'REACTIVATION',
    displayName: 'Member Reactivated',
    description: 'Triggered when a dormant or cancelled member rejoins.',
    eventSource: 'reactivation',
    payloadSchema: { memberId: 'string', reactivatedAt: 'string' },
    samplePayload: { memberId: 'mem_1', reactivatedAt: new Date().toISOString() },
  },

  // Attendance & Check-in Triggers
  MEMBER_CHECKED_IN: {
    triggerType: 'MEMBER_CHECKED_IN',
    category: 'ATTENDANCE',
    displayName: 'Member Checked In',
    description: 'Triggered upon gym facility check-in at turnstile, kiosk, or reception.',
    eventSource: 'attendance',
    payloadSchema: { memberId: 'string', outletId: 'string', checkInMethod: 'string' },
    samplePayload: { memberId: 'mem_1', outletId: 'out_1', checkInMethod: 'QR' },
  },
  MEMBER_CHECKED_OUT: {
    triggerType: 'MEMBER_CHECKED_OUT',
    category: 'ATTENDANCE',
    displayName: 'Member Checked Out',
    description: 'Triggered upon gym exit recording workout duration.',
    eventSource: 'attendance',
    payloadSchema: { memberId: 'string', durationMinutes: 'number' },
    samplePayload: { memberId: 'mem_1', durationMinutes: 65 },
  },
  CLASS_ATTENDED: {
    triggerType: 'CLASS_ATTENDED',
    category: 'ATTENDANCE',
    displayName: 'Class Attended',
    description: 'Triggered when member attends a scheduled group fitness class.',
    eventSource: 'attendance',
    payloadSchema: { memberId: 'string', classSessionId: 'string', className: 'string' },
    samplePayload: { memberId: 'mem_1', classSessionId: 'cs_1', className: 'HIIT Morning' },
  },
  CLASS_NO_SHOW: {
    triggerType: 'CLASS_NO_SHOW',
    category: 'ATTENDANCE',
    displayName: 'Class No-Show',
    description: 'Triggered when a booked member fails to attend a class session.',
    eventSource: 'attendance',
    payloadSchema: { memberId: 'string', classSessionId: 'string', className: 'string' },
    samplePayload: { memberId: 'mem_1', classSessionId: 'cs_1', className: 'Pilates Core' },
  },
  PT_SESSION_COMPLETED: {
    triggerType: 'PT_SESSION_COMPLETED',
    category: 'TRAINING',
    displayName: 'PT Session Completed',
    description: 'Triggered upon completion of a 1-on-1 personal training session.',
    eventSource: 'personal-training',
    payloadSchema: { memberId: 'string', trainerId: 'string', durationMinutes: 'number' },
    samplePayload: { memberId: 'mem_1', trainerId: 'tr_1', durationMinutes: 60 },
  },

  // Booking Triggers
  BOOKING_CREATED: {
    triggerType: 'BOOKING_CREATED',
    category: 'ENGAGEMENT',
    displayName: 'Booking Created',
    description: 'Triggered when member creates a booking for class or PT.',
    eventSource: 'bookings',
    payloadSchema: { memberId: 'string', bookingId: 'string', sessionType: 'string' },
    samplePayload: { memberId: 'mem_1', bookingId: 'bk_1', sessionType: 'CLASS' },
  },
  BOOKING_CANCELLED: {
    triggerType: 'BOOKING_CANCELLED',
    category: 'ENGAGEMENT',
    displayName: 'Booking Cancelled',
    description: 'Triggered when a booking is cancelled.',
    eventSource: 'bookings',
    payloadSchema: { memberId: 'string', bookingId: 'string', isLateCancellation: 'boolean' },
    samplePayload: { memberId: 'mem_1', bookingId: 'bk_1', isLateCancellation: false },
  },
  BOOKING_NO_SHOW: {
    triggerType: 'BOOKING_NO_SHOW',
    category: 'ATTENDANCE',
    displayName: 'Booking No-Show',
    description: 'Triggered when a booking status transitions to NO_SHOW.',
    eventSource: 'bookings',
    payloadSchema: { memberId: 'string', bookingId: 'string' },
    samplePayload: { memberId: 'mem_1', bookingId: 'bk_1' },
  },
  WAITLIST_PROMOTED: {
    triggerType: 'WAITLIST_PROMOTED',
    category: 'ENGAGEMENT',
    displayName: 'Waitlist Promoted',
    description: 'Triggered when a waitlisted member is promoted into an open spot.',
    eventSource: 'bookings',
    payloadSchema: { memberId: 'string', classSessionId: 'string' },
    samplePayload: { memberId: 'mem_1', classSessionId: 'cs_1' },
  },

  // Workouts & Training Triggers
  WORKOUT_COMPLETED: {
    triggerType: 'WORKOUT_COMPLETED',
    category: 'TRAINING',
    displayName: 'Workout Completed',
    description: 'Triggered when member completes and logs a workout.',
    eventSource: 'workouts',
    payloadSchema: { memberId: 'string', workoutId: 'string', totalVolumeKg: 'number' },
    samplePayload: { memberId: 'mem_1', workoutId: 'wo_1', totalVolumeKg: 4500 },
  },
  WORKOUT_SKIPPED: {
    triggerType: 'WORKOUT_SKIPPED',
    category: 'TRAINING',
    displayName: 'Workout Skipped',
    description: 'Triggered when a scheduled workout in active plan is explicitly skipped.',
    eventSource: 'workouts',
    payloadSchema: { memberId: 'string', planId: 'string', reason: 'string' },
    samplePayload: { memberId: 'mem_1', planId: 'tp_1', reason: 'Fatigue' },
  },
  WORKOUT_OVERDUE: {
    triggerType: 'WORKOUT_OVERDUE',
    category: 'TRAINING',
    displayName: 'Workout Overdue',
    description: 'Triggered when a scheduled training day has passed without workout log.',
    eventSource: 'workouts',
    payloadSchema: { memberId: 'string', scheduledDate: 'string' },
    samplePayload: { memberId: 'mem_1', scheduledDate: '2026-09-07' },
  },
  TRAINING_GOAL_COMPLETED: {
    triggerType: 'TRAINING_GOAL_COMPLETED',
    category: 'MILESTONE',
    displayName: 'Training Goal Completed',
    description: 'Triggered when member achieves an active fitness or strength goal.',
    eventSource: 'progress',
    payloadSchema: { memberId: 'string', goalId: 'string', goalTitle: 'string' },
    samplePayload: { memberId: 'mem_1', goalId: 'g_1', goalTitle: 'Deadlift 150kg' },
  },

  // Membership & Renewal Triggers
  MEMBERSHIP_STARTED: {
    triggerType: 'MEMBERSHIP_STARTED',
    category: 'MEMBERSHIP',
    displayName: 'Membership Started',
    description: 'Triggered when a membership agreement begins.',
    eventSource: 'memberships',
    payloadSchema: { memberId: 'string', planName: 'string', startDate: 'string' },
    samplePayload: { memberId: 'mem_1', planName: 'Annual Unlimited', startDate: '2026-09-01' },
  },
  MEMBERSHIP_RENEWED: {
    triggerType: 'MEMBERSHIP_RENEWED',
    category: 'MEMBERSHIP',
    displayName: 'Membership Renewed',
    description: 'Triggered upon successful renewal of a membership.',
    eventSource: 'memberships',
    payloadSchema: { memberId: 'string', planName: 'string', newExpiryDate: 'string' },
    samplePayload: { memberId: 'mem_1', planName: 'Annual Unlimited', newExpiryDate: '2027-09-01' },
  },
  MEMBERSHIP_EXPIRING: {
    triggerType: 'MEMBERSHIP_EXPIRING',
    category: 'MEMBERSHIP',
    displayName: 'Membership Expiring',
    description: 'Triggered when expiration is approaching within designated threshold.',
    eventSource: 'memberships',
    payloadSchema: { memberId: 'string', daysUntilExpiration: 'number', expiryDate: 'string' },
    samplePayload: { memberId: 'mem_1', daysUntilExpiration: 14, expiryDate: '2026-09-22' },
  },
  MEMBERSHIP_EXPIRED: {
    triggerType: 'MEMBERSHIP_EXPIRED',
    category: 'MEMBERSHIP',
    displayName: 'Membership Expired',
    description: 'Triggered when membership expires without renewal.',
    eventSource: 'memberships',
    payloadSchema: { memberId: 'string', expiredAt: 'string' },
    samplePayload: { memberId: 'mem_1', expiredAt: '2026-09-08' },
  },

  // Engagement & Retention Triggers
  MEMBER_INACTIVE: {
    triggerType: 'MEMBER_INACTIVE',
    category: 'RETENTION',
    displayName: 'Member Inactive',
    description: 'Triggered when inactivity reaches designated days threshold.',
    eventSource: 'engagement',
    payloadSchema: { memberId: 'string', inactivityDays: 'number' },
    samplePayload: { memberId: 'mem_1', inactivityDays: 14 },
  },
  INACTIVITY_DAYS_REACHED: {
    triggerType: 'INACTIVITY_DAYS_REACHED',
    category: 'RETENTION',
    displayName: 'Inactivity Days Reached',
    description: 'Alias for MEMBER_INACTIVE evaluating inactivityDays.',
    eventSource: 'engagement',
    payloadSchema: { memberId: 'string', inactivityDays: 'number' },
    samplePayload: { memberId: 'mem_1', inactivityDays: 14 },
  },
  ENGAGEMENT_DECLINED: {
    triggerType: 'ENGAGEMENT_DECLINED',
    category: 'RETENTION',
    displayName: 'Engagement Declined',
    description: 'Triggered when 4-week engagement or attendance exhibits steep drop.',
    eventSource: 'engagement-intelligence',
    payloadSchema: { memberId: 'string', dropPercent: 'number', trend: 'string' },
    samplePayload: { memberId: 'mem_1', dropPercent: 40, trend: 'DECLINING' },
  },
  ATTENDANCE_DROP_PERCENT: {
    triggerType: 'ATTENDANCE_DROP_PERCENT',
    category: 'RETENTION',
    displayName: 'Attendance Drop Percent',
    description: 'Alias for ENGAGEMENT_DECLINED measuring percentage attendance decrease.',
    eventSource: 'engagement-intelligence',
    payloadSchema: { memberId: 'string', dropPercent: 'number' },
    samplePayload: { memberId: 'mem_1', dropPercent: 40 },
  },
  ENGAGEMENT_IMPROVED: {
    triggerType: 'ENGAGEMENT_IMPROVED',
    category: 'ENGAGEMENT',
    displayName: 'Engagement Improved',
    description: 'Triggered when member activity trend shifts from low/moderate to high.',
    eventSource: 'engagement-intelligence',
    payloadSchema: { memberId: 'string', currentStreak: 'number' },
    samplePayload: { memberId: 'mem_1', currentStreak: 3 },
  },
  MEMBER_REENGAGED: {
    triggerType: 'MEMBER_REENGAGED',
    category: 'REACTIVATION',
    displayName: 'Member Re-engaged',
    description: 'Triggered when a member checks in after prolonged absence (>= 14 days).',
    eventSource: 'attendance',
    payloadSchema: { memberId: 'string', previousInactivityDays: 'number' },
    samplePayload: { memberId: 'mem_1', previousInactivityDays: 21 },
  },

  // Milestone & Anniversary Triggers
  MEMBER_MILESTONE_REACHED: {
    triggerType: 'MEMBER_MILESTONE_REACHED',
    category: 'MILESTONE',
    displayName: 'Milestone Reached',
    description: 'Triggered upon hitting milestone count (workouts, visits, streak).',
    eventSource: 'engagement',
    payloadSchema: { memberId: 'string', milestoneCount: 'number', milestoneType: 'string' },
    samplePayload: { memberId: 'mem_1', milestoneCount: 50, milestoneType: 'WORKOUTS' },
  },
  WORKOUT_MILESTONE_REACHED: {
    triggerType: 'WORKOUT_MILESTONE_REACHED',
    category: 'MILESTONE',
    displayName: 'Workout Milestone Reached',
    description: 'Alias for workout-specific milestone count.',
    eventSource: 'workouts',
    payloadSchema: { memberId: 'string', milestoneCount: 'number' },
    samplePayload: { memberId: 'mem_1', milestoneCount: 50 },
  },
  MEMBER_BIRTHDAY: {
    triggerType: 'MEMBER_BIRTHDAY',
    category: 'ENGAGEMENT',
    displayName: 'Member Birthday',
    description: 'Triggered on member birth date.',
    eventSource: 'members',
    payloadSchema: { memberId: 'string', dateOfBirth: 'string' },
    samplePayload: { memberId: 'mem_1', dateOfBirth: '1995-09-08' },
  },
  MEMBERSHIP_ANNIVERSARY: {
    triggerType: 'MEMBERSHIP_ANNIVERSARY',
    category: 'ENGAGEMENT',
    displayName: 'Membership Anniversary',
    description: 'Triggered on annual anniversary of member join date.',
    eventSource: 'members',
    payloadSchema: { memberId: 'string', yearsActive: 'number' },
    samplePayload: { memberId: 'mem_1', yearsActive: 1 },
  },
};
