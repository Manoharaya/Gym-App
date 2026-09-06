/**
 * Notification Center Types
 * Delivers push notifications, in-app alerts, and quiet hours preferences.
 */

export interface NotificationsState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}
