/**
 * Explicit Retention Activity Constants & Taxonomy (Day 29 - Section 7A)
 *
 * Enforces the strict distinction:
 * OBSERVED DATA → DERIVED METRIC → TREND → RISK SIGNAL → AI INTERPRETATION → RECOMMENDATION
 */

import { RetentionActivityType, RetentionObservationWindow } from '@fitcore/types';

export const QUALIFYING_RETENTION_ACTIVITIES: Record<RetentionActivityType, {
  name: string;
  sourceDomain: string;
  sourceService: string;
  isPhysicalGymActivity: boolean;
  isDigitalEngagement: boolean;
  description: string;
}> = {
  GYM_CHECK_IN: {
    name: 'Gym Turnstile / Front-Desk Check-In',
    sourceDomain: 'ACCESS_CONTROL',
    sourceService: 'AttendanceService',
    isPhysicalGymActivity: true,
    isDigitalEngagement: false,
    description: 'Physical member check-in record at facility entrance.',
  },
  CLASS_ATTENDED: {
    name: 'Group Fitness Class Attended',
    sourceDomain: 'BOOKING_ATTENDANCE',
    sourceService: 'AttendanceService',
    isPhysicalGymActivity: true,
    isDigitalEngagement: false,
    description: 'Confirmed attendance record for a scheduled class session.',
  },
  PT_SESSION_ATTENDED: {
    name: 'Personal Training Session Attended',
    sourceDomain: 'PERSONAL_TRAINING',
    sourceService: 'AttendanceService',
    isPhysicalGymActivity: true,
    isDigitalEngagement: false,
    description: 'Completed 1-on-1 personal training attendance record.',
  },
  WORKOUT_COMPLETED: {
    name: 'Workout Completed & Logged',
    sourceDomain: 'WORKOUT_TRACKING',
    sourceService: 'WorkoutService',
    isPhysicalGymActivity: true,
    isDigitalEngagement: true,
    description: 'Completed workout session recorded by member or trainer.',
  },
  BOOKING_CREATED: {
    name: 'Class or Session Booking Created',
    sourceDomain: 'BOOKINGS',
    sourceService: 'BookingService',
    isPhysicalGymActivity: false,
    isDigitalEngagement: true,
    description: 'Confirmed booking reservation created for upcoming class.',
  },
  BOOKING_CANCELLED: {
    name: 'Booking Cancelled',
    sourceDomain: 'BOOKINGS',
    sourceService: 'BookingService',
    isPhysicalGymActivity: false,
    isDigitalEngagement: true,
    description: 'Booking cancellation action (neutral if followed by rebooking).',
  },
  APP_LOGIN: {
    name: 'Mobile App Session / Login',
    sourceDomain: 'IDENTITY_ACCESS',
    sourceService: 'EngagementService',
    isPhysicalGymActivity: false,
    isDigitalEngagement: true,
    description: 'Authentic session token issuance or mobile active session.',
  },
  DAILY_CHECK_IN_COMPLETED: {
    name: 'Daily Check-In Completed',
    sourceDomain: 'DAILY_CHECKIN',
    sourceService: 'DailyCheckInService',
    isPhysicalGymActivity: false,
    isDigitalEngagement: true,
    description: 'Completed holistic daily check-in (participation only).',
  },
  NUTRITION_LOGGED: {
    name: 'Nutrition / Meal Log Recorded',
    sourceDomain: 'NUTRITION',
    sourceService: 'NutritionService',
    isPhysicalGymActivity: false,
    isDigitalEngagement: true,
    description: 'Nutrition tracking event recorded (engagement only, no calories).',
  },
  AI_COACH_INTERACTION: {
    name: 'AI Coach Conversation Interaction',
    sourceDomain: 'AI_PLATFORM',
    sourceService: 'EngagementService',
    isPhysicalGymActivity: false,
    isDigitalEngagement: true,
    description: 'Member conversational message exchanged with fitness/nutrition coach.',
  },
  GOAL_INTERACTION: {
    name: 'Training Goal Updated / Progress Logged',
    sourceDomain: 'GOALS_PROGRESS',
    sourceService: 'ProgressService',
    isPhysicalGymActivity: false,
    isDigitalEngagement: true,
    description: 'Goal creation, modification, or target progress snapshot.',
  },
  WEARABLE_SYNCED: {
    name: 'Wearable Device Telemetry Synchronized',
    sourceDomain: 'WEARABLES',
    sourceService: 'WearableService',
    isPhysicalGymActivity: false,
    isDigitalEngagement: true,
    description: 'Wearable connection sync event (sync frequency only, no raw vitals).',
  },
};

export const RETENTION_OBSERVATION_WINDOW_DAYS: Record<RetentionObservationWindow, number> = {
  '7D': 7,
  '14D': 14,
  '30D': 30,
  '60D': 60,
  '90D': 90,
};

export const RETENTION_SOURCE_SERVICES = {
  ATTENDANCE: 'AttendanceService',
  BOOKING: 'BookingService',
  WORKOUT: 'WorkoutService',
  MEMBERSHIP: 'MembershipService',
  ENGAGEMENT: 'EngagementService',
  DAILY_CHECKIN: 'DailyCheckInService',
  NUTRITION: 'NutritionService',
  WEARABLE: 'WearableService',
  PROGRESS: 'ProgressService',
  COMMUNICATION: 'CommunicationService',
} as const;

export const RETENTION_DATA_VERSION = 1;
