import {
  DailyCheckInStatus,
  EnergyLevel,
  WellbeingMood,
  SleepQuality,
  SorenessLevel,
  StressLevel,
  MotivationLevel,
  DailyReadinessCategory,
  DailyRecommendationType,
  DailyCheckInTrend,
} from './daily-checkin.enums';

export interface DailyCheckInAIContext {
  date: string; // YYYY-MM-DD
  timezone: string;
  memberPreferences: {
    unitPreference: string;
    language: string;
  };
  goalsSummary: {
    count: number;
    activeGoals: Array<{
      title: string;
      category: string;
      targetValue: number;
      currentValue: number;
      unit: string;
    }>;
  };
  trainingSummary: {
    hasActivePlan: boolean;
    planName?: string;
    isTrainerAssigned: boolean;
    todayWorkout?: {
      id: string;
      title: string;
      exerciseCount: number;
      estimatedMinutes?: number;
    } | null;
    yesterdayWorkout?: {
      id: string;
      title: string;
      completed: boolean;
    } | null;
    recentWorkoutsCount: number;
    recentAdherenceRate: number;
  };
  nutritionSummary: {
    isAuthorized: boolean;
    hasLoggedToday: boolean;
    calorieTarget?: number;
    proteinTarget?: number;
    consumedCalories?: number;
    consumedProtein?: number;
    hydrationLoggedMl?: number;
    recentConsistencyPct?: number;
  };
  attendanceSummary: {
    currentStreak: number;
    recentVisitsCount: number;
    lastVisitDate?: string;
    upcomingPtSession?: {
      scheduledAt: string;
      trainerName?: string;
    } | null;
    engagementLevel?: string;
    momentumTrend?: string;
  };
  previousCheckInSummary: {
    previousCount: number;
    detectedTrends: DailyCheckInTrend[];
    recentSorenessAverage?: string;
    recentEnergyAverage?: string;
  };
  currentCheckInResponses: {
    energyLevel: EnergyLevel;
    wellbeingMood: WellbeingMood;
    sleepQuality: SleepQuality;
    sleepDurationMinutes?: number;
    sorenessLevel: SorenessLevel;
    stressLevel: StressLevel;
    motivationLevel: MotivationLevel;
    yesterdayWorkoutCompleted?: boolean;
    notes?: string;
  };
  deterministicReadiness: {
    score: number;
    category: DailyReadinessCategory;
    formulaVersion: string;
  };
  safetyFlags: {
    flagged: boolean;
    category?: string;
    reason?: string;
  };
}

export interface DailyCheckInSafetyResult {
  isSafeToProceed: boolean;
  severity?: 'CAUTION' | 'RECOMMEND_PROFESSIONAL' | 'URGENT_ESCALATION';
  category?: string;
  triggerPhrase?: string;
  actionTaken: string;
  safeResponse?: {
    summary: string;
    guidance: string;
    caution: string;
    helplineOrReferral?: string;
  };
}

export interface DailyFitnessScoreResult {
  score: number;
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

export interface WearableDailyContextProvider {
  getWearableMetrics(memberId: string, date: string): Promise<{
    hasWearableData: boolean;
    restingHeartRate?: number;
    heartRateVariability?: number;
    recordedSleepDurationMinutes?: number;
    deviceSource?: string;
  }>;
}
