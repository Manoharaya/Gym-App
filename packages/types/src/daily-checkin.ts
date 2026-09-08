/**
 * FitCore AI Daily Check-In Contracts & Domain Models (Day 22)
 *
 * An orchestration and intelligence layer answering:
 * "How am I doing today, and what should I focus on?"
 *
 * Combines member goals, training plan, completed workouts, consistency,
 * nutrition summary, attendance, PT sessions, progress trends, and previous check-ins
 * into a concise, safe daily intelligence experience.
 *
 * Strict Non-Medical Boundary:
 * - Readiness is a training-planning indicator, NOT a medical or clinical readiness score.
 * - Wellbeing/mood questions are self-reported fitness signals, NOT psychiatric measurements.
 * - Zero autonomous modifications to workouts, nutrition targets, memberships, bookings, or payments.
 */

export type DailyCheckInStatus = 'PENDING' | 'STARTED' | 'COMPLETED' | 'SKIPPED' | 'EXPIRED';

export type EnergyLevel = 'VERY_LOW' | 'LOW' | 'MODERATE' | 'GOOD' | 'VERY_GOOD';

export type WellbeingMood = 'VERY_LOW' | 'LOW' | 'NEUTRAL' | 'GOOD' | 'VERY_GOOD';

export type SleepQuality = 'VERY_POOR' | 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';

export type SorenessLevel = 'NONE' | 'MILD' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';

export type StressLevel = 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';

export type MotivationLevel = 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';

export type DailyReadinessCategory = 'OPTIMAL' | 'MODERATE' | 'RECOVERY_FOCUSED';

export type DailyRecommendationType =
  | 'TRAINING'
  | 'RECOVERY'
  | 'NUTRITION'
  | 'HYDRATION'
  | 'CONSISTENCY'
  | 'GOAL'
  | 'ATTENDANCE'
  | 'ENGAGEMENT'
  | 'SUPPORT';

export type DailyCheckInTrend =
  | 'ENERGY_DECLINING'
  | 'ENERGY_IMPROVING'
  | 'SLEEP_DECLINING'
  | 'SORENESS_INCREASING'
  | 'MOTIVATION_DECLINING'
  | 'TRAINING_CONSISTENCY_IMPROVING'
  | 'TRAINING_CONSISTENCY_DECLINING'
  | 'NUTRITION_LOGGING_IMPROVING'
  | 'NUTRITION_LOGGING_DECLINING';

export type DailyCheckInSafetyCategory =
  | 'CHEST_PAIN'
  | 'DIFFICULTY_BREATHING'
  | 'FAINTING_DIZZINESS'
  | 'ACUTE_INJURY'
  | 'EXTREME_SORENESS'
  | 'SEVERE_DEHYDRATION'
  | 'SELF_HARM'
  | 'EATING_DISORDER';

export interface DailyRecommendationItem {
  type: DailyRecommendationType;
  title: string;
  explanation: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  relatedDomain: 'TRAINING' | 'NUTRITION' | 'PROGRESS' | 'RECOVERY' | 'WELLNESS';
  suggestedAction?: {
    action: 'VIEW_WORKOUT' | 'VIEW_NUTRITION' | 'VIEW_GOALS' | 'VIEW_COACH' | 'VIEW_ATTENDANCE';
    label: string;
    params?: Record<string, any>;
  };
}

export interface DailyCheckInResponse {
  summary: string;
  checkInInterpretation: string;
  readinessFraming: string;
  todayFocus: string;
  recommendations: DailyRecommendationItem[];
  caution?: string;
  escalation?: {
    severity: 'CAUTION' | 'RECOMMEND_PROFESSIONAL' | 'URGENT_ESCALATION';
    category: DailyCheckInSafetyCategory;
    guidance: string;
    helplineOrReferral?: string;
  };
  suggestedNextAction?: string;
  coachHandoff?: {
    recommendedCoach: 'FITNESS_COACH' | 'NUTRITION_COACH' | 'NONE';
    reason?: string;
    suggestedPrompt?: string;
  };
  sourceSummary?: {
    used: string[];
    excluded: string[];
  };
}

export interface CreateDailyCheckInDto {
  date?: string; // Optional YYYY-MM-DD; defaults to today in member's timezone
  timezone?: string;
}

export interface SubmitDailyCheckInDto {
  energyLevel: EnergyLevel;
  wellbeingMood: WellbeingMood;
  sleepQuality: SleepQuality;
  sleepDurationMinutes?: number;
  sorenessLevel: SorenessLevel;
  stressLevel: StressLevel;
  motivationLevel: MotivationLevel;
  yesterdayWorkoutCompleted?: boolean;
  notes?: string;
  timezone?: string;
}

export interface DailyFitnessReadinessScore {
  score: number; // 0 - 100
  category: DailyReadinessCategory;
  description: string;
  formulaVersion: string;
  breakdown: {
    energyPoints: number;
    sleepPoints: number;
    sorenessPoints: number;
    stressPoints: number;
    motivationPoints: number;
  };
  disclaimer: string;
}

export interface DailyCheckInDto {
  id: string;
  organisationId: string;
  memberId: string;
  checkInDate: string; // ISO / YYYY-MM-DD
  status: DailyCheckInStatus;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;

  // Member reported values
  energyLevel?: EnergyLevel | null;
  wellbeingMood?: WellbeingMood | null;
  sleepQuality?: SleepQuality | null;
  sleepDurationMinutes?: number | null;
  sorenessLevel?: SorenessLevel | null;
  stressLevel?: StressLevel | null;
  motivationLevel?: MotivationLevel | null;
  yesterdayWorkoutCompleted?: boolean | null;
  notes?: string | null;

  // Deterministic calculations
  readinessScore?: number | null;
  readinessCategory?: DailyReadinessCategory | null;
  readinessDetails?: DailyFitnessReadinessScore | null;
  readinessRationale?: string | null;
  detectedTrends?: DailyCheckInTrend[];

  // Structured AI insight
  aiSummary?: string | null;
  aiCheckInInterpretation?: string | null;
  aiReadinessFraming?: string | null;
  aiTodayFocus?: string | null;
  todayFocus?: string | null;
  aiRecommendations?: DailyRecommendationItem[] | null;
  aiCaution?: string | null;
  aiEscalation?: any | null;
  safetyFlagged: boolean;
  suggestedNextAction?: string | null;
  sourceSummary?: {
    used: string[];
    excluded: string[];
  } | null;

  // Feedback
  feedbackRating?: string | null;
  feedbackComment?: string | null;

  // Metadata
  aiModel?: string | null;
  aiLatencyMs?: number | null;
}

export interface DailyCheckInHistoryItemDto {
  id: string;
  checkInDate: string;
  status: DailyCheckInStatus;
  readinessScore?: number | null;
  readinessCategory?: DailyReadinessCategory | null;
  energyLevel?: EnergyLevel | null;
  sorenessLevel?: SorenessLevel | null;
  completedAt?: string | null;
  todayFocus?: string | null;
  safetyFlagged: boolean;
}

export interface DailyCheckInHistoryResponseDto {
  items: DailyCheckInHistoryItemDto[];
  total: number;
  detectedTrends: DailyCheckInTrend[];
}

export interface DailyCheckInPrivacyViewDto {
  checkInId: string;
  memberId: string;
  date: string;
  dataSourcesUsed: string[];
  dataSourcesExcluded: string[];
  explanation: string;
  dataRetentionPolicy: string;
  trainerVisibilityScope?: string;
  consentStatus?: string;
}

export interface DailyCheckInSettingsDto {
  id?: string;
  organisationId: string;
  memberId?: string | null;
  checkInEnabled: boolean;
  reminderEnabled: boolean;
  reminderTime: string; // HH:mm
  trainerVisibility: 'NONE' | 'SUMMARIZED' | 'FULL';
  availableQuestions?: {
    energy: boolean;
    wellbeing: boolean;
    sleep: boolean;
    soreness: boolean;
    stress: boolean;
    motivation: boolean;
    yesterdayWorkout: boolean;
    notes: boolean;
  };
}

export interface UpdateDailyCheckInSettingsDto {
  checkInEnabled?: boolean;
  reminderEnabled?: boolean;
  reminderTime?: string;
  trainerVisibility?: 'NONE' | 'SUMMARIZED' | 'FULL';
}

export interface TrainerClientDailyCheckInSummaryDto {
  memberId: string;
  clientName: string;
  latestCheckInDate?: string;
  status: DailyCheckInStatus;
  readinessCategory?: DailyReadinessCategory;
  reportedSoreness?: SorenessLevel;
  reportedEnergy?: EnergyLevel;
  yesterdayWorkoutCompleted?: boolean;
  trainerNoteGuidance?: string;
  safetyFlagged: boolean;
}

/**
 * Future Wearable Context Provider Interface (Day 24 Placeholder)
 * Day 22 does not integrate wearable providers or invent fake wearable metrics.
 */
export interface WearableDailyContextProvider {
  getWearableMetrics(memberId: string, date: string): Promise<{
    hasWearableData: boolean;
    restingHeartRate?: number;
    heartRateVariability?: number;
    recordedSleepDurationMinutes?: number;
    deviceSource?: string;
  }>;
}
