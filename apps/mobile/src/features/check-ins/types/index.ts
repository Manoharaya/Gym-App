/**
 * Coach Check-Ins Types
 * Structured periodic feedback loops between members and assigned trainers.
 */

export interface CheckInsState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}
