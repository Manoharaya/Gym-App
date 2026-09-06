/**
 * Nutrition & Macros Types
 * Tracks dietary intake, caloric goals, and macronutrient breakdowns.
 */

export interface NutritionState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}
