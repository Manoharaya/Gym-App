/**
 * Progress & Body Metrics Types
 * Visualizes weight, body fat %, measurements, and strength milestones.
 */

export interface ProgressState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}
