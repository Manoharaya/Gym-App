/**
 * Engagement Intelligence Constants (Day 25)
 */

export const ENGAGEMENT_INTELLIGENCE_FEATURE = 'ENGAGEMENT_INTELLIGENCE';
export const ENGAGEMENT_INTELLIGENCE_PROMPT_KEY = 'engagement_intelligence.v1';

export const ENGAGEMENT_CACHE_TTL_SECONDS = 1800; // 30 minutes
export const ENGAGEMENT_CACHE_PREFIX = 'fitcore:ai:engagement:';

// Window configurations
export const ENGAGEMENT_HISTORICAL_BASELINE_DAYS = 28;
export const ENGAGEMENT_RECENT_WINDOW_DAYS = 7;
export const ENGAGEMENT_MIN_OBSERVATION_DAYS = 7;
export const ENGAGEMENT_MIN_BASELINE_EVENTS = 3;

// Default scoring weights for deterministic multi-pillar engagement
export const ENGAGEMENT_WEIGHTS = {
  ATTENDANCE: 0.30,
  WORKOUT_ADHERENCE: 0.25,
  BOOKING: 0.15,
  APP_ACTIVITY: 0.15,
  CHECK_IN: 0.10,
  GOAL_PROGRESS: 0.05,
};

// Thresholds for Level Classification (0 - 100 scale)
export const ENGAGEMENT_LEVEL_THRESHOLDS = {
  VERY_HIGH: 80,
  HIGH: 65,
  MODERATE: 45,
  LOW: 25,
  // Below 25 is VERY_LOW
};

// Trend sensitivity thresholds (percentage delta)
export const TREND_SENSITIVITY_THRESHOLD_PCT = 25; // 25% change required for improving/declining trend
