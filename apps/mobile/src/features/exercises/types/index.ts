/**
 * Exercise Library Types
 * Curated exercise video demonstrations, muscle mappings, and cues.
 */

export interface ExercisesState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}
