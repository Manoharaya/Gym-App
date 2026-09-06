/**
 * Authentication & Session Types
 * Handles credential verification, tokens, session restoration, and password management.
 */

export interface AuthState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}
