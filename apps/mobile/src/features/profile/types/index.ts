/**
 * Profile & Identity Types
 * Manages member biographical details, emergency contacts, and fitness goals.
 */

export interface ProfileState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}
