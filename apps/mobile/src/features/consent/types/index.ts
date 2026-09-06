/**
 * Legal Consent & Terms Types
 * Tracks regulatory privacy policy, terms of service, and health data agreements.
 */

export interface ConsentState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}
