/**
 * Training Programs & Workouts Types
 * Manages workout prescriptions, active session tracking, and exercise logs.
 */

export interface TrainingState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}
