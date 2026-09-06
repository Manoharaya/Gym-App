/**
 * Wearables & Telemetry Types
 * Synchronizes biometric data from Apple Health, Garmin, Whoop, and Oura.
 */

export interface WearablesState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}
