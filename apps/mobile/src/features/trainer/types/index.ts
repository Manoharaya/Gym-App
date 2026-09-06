/**
 * Trainer Portal Types
 * Staff portal for trainers to monitor client rosters, programs, and schedules.
 */

export interface TrainerState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}
