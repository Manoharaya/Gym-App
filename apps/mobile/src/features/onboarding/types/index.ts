/**
 * Member Onboarding Types
 * Guides new members through health profiling, waivers, and orientation tours.
 */

export interface OnboardingState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}
