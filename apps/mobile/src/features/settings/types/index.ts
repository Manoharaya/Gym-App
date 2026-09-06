/**
 * Club & App Settings Types
 * Tenant customization, device permissions, and security configuration.
 */

export interface SettingsState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}
