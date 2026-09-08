/**
 * Daily Check-In Constants
 */

export const DAILY_CHECKIN_FEATURE = 'DAILY_CHECKIN';
export const DAILY_CHECKIN_PROMPT_KEY = 'daily_checkin.v1';

export const READINESS_FORMULA_VERSION = '1.0';

export const SCORING_WEIGHTS = {
  energy: {
    VERY_LOW: 5,
    LOW: 10,
    MODERATE: 15,
    GOOD: 20,
    VERY_GOOD: 25,
  },
  sleep: {
    VERY_POOR: 5,
    POOR: 10,
    FAIR: 15,
    GOOD: 20,
    EXCELLENT: 25,
  },
  // Inverted: higher soreness = lower readiness points
  soreness: {
    NONE: 25,
    MILD: 20,
    MODERATE: 15,
    HIGH: 8,
    VERY_HIGH: 2,
  },
  // Inverted: higher stress = lower readiness points
  stress: {
    VERY_LOW: 15,
    LOW: 13,
    MODERATE: 10,
    HIGH: 6,
    VERY_HIGH: 2,
  },
  motivation: {
    VERY_LOW: 2,
    LOW: 4,
    MODERATE: 6,
    HIGH: 8,
    VERY_HIGH: 10,
  },
};

export const READINESS_THRESHOLDS = {
  OPTIMAL: 80,
  MODERATE: 50,
};

export const READINESS_DESCRIPTIONS = {
  OPTIMAL: 'FitCore planning indicator: Optimal capacity to tackle your scheduled training session.',
  MODERATE: 'FitCore planning indicator: Moderate capacity. Good for steady, standard intensity training.',
  RECOVERY_FOCUSED: 'FitCore planning indicator: Recovery focused. Consider active recovery, mobility, or lighter loads today.',
};

export const READINESS_DISCLAIMER =
  'The FitCore Daily Readiness score is a deterministic training-planning indicator derived from your self-reported check-in responses. It is not a clinical or medical measurement.';

export const TREND_OBSERVATION_MINIMUM = 3;
