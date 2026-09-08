export interface NutritionAIContextIdentity {
  memberId: string;
  organisationId: string;
  preferredLanguage: string;
  unitSystem: 'METRIC' | 'IMPERIAL';
}

export interface NutritionAIContextProfile {
  dietaryPattern: string;
  nutritionGoal?: string | null;
  activityLevel?: string | null;
  allergies: string[];
  intolerances: string[];
  foodsAvoided: string[];
  dietaryRestrictions?: string | null;
  preferences: Array<{
    category: string;
    item: string;
    preferenceType: string;
  }>;
}

export interface NutritionAIContextTargets {
  hasActiveTarget: boolean;
  dailyCalories?: number;
  proteinGrams?: number;
  carbohydrateGrams?: number;
  fatGrams?: number;
  fiberGrams?: number | null;
  waterMl?: number | null;
  source?: string;
}

export interface NutritionAIContextDailySummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbohydrates: number;
  totalFat: number;
  totalFiber: number;
  totalWaterMl: number;
  calorieAdherencePct: number;
  proteinAdherencePct: number;
  carbAdherencePct: number;
  fatAdherencePct: number;
  waterAdherencePct: number;
  mealBreakdown: Record<string, { calories: number; protein: number; itemsCount: number }>;
}

export interface NutritionAIContextFoodLogItem {
  id: string;
  foodName: string;
  mealType: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  consumedAt: string;
}

export interface NutritionAIContextMealPlan {
  hasAssignedMealPlan: boolean;
  planId?: string;
  planName?: string;
  version?: number;
  dietaryPattern?: string | null;
  targetDailyCalories?: number | null;
  targetProteinGrams?: number | null;
  daysCount?: number;
  todayMeals?: Array<{
    mealName: string;
    mealType: string;
    timeOfDay?: string | null;
    items: Array<{ foodName: string; quantity: number; unit: string }>;
  }>;
}

export interface NutritionAIContextTraining {
  hasActiveTrainingPlan: boolean;
  activePlanName?: string;
  recentWorkouts: Array<{ name: string; date: string; durationMinutes?: number }>;
  todayHasWorkout: boolean;
}

export interface NutritionAIContext {
  identity: NutritionAIContextIdentity;
  profile: NutritionAIContextProfile;
  targets: NutritionAIContextTargets;
  dailySummary: NutritionAIContextDailySummary;
  recentFoodLogs: NutritionAIContextFoodLogItem[];
  mealPlan: NutritionAIContextMealPlan;
  training?: NutritionAIContextTraining;
  safetyConstraints: {
    documentedAllergies: string[];
    isAllergyProtected: boolean;
    medicalBoundaryDisclaimer: string;
  };
}
