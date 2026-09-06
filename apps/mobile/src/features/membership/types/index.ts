/**
 * Membership & Subscriptions Types
 * Coordinates membership plans, billing intervals, pauses, and renewals.
 */

export interface MembershipState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}
