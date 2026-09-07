declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;

export type AppEnvironment = 'development' | 'staging' | 'production';

export interface FitCoreConfig {
  env: AppEnvironment;
  apiBaseUrl: string;
  sentryDsn?: string;
  analyticsKey?: string;
  pushNotificationProjectId?: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isStaging: boolean;
}

/**
 * Resolves configuration from environment variables with fallback defaults.
 */
export function getAppConfig(): FitCoreConfig {
  // Check process.env or global process for Node/Expo environments
  const envVal =
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_APP_ENV) || 'development';
  const env: AppEnvironment = (
    ['development', 'staging', 'production'].includes(envVal) ? envVal : 'development'
  ) as AppEnvironment;

  const apiBaseUrl =
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_BASE_URL) ||
    (env === 'production'
      ? 'https://api.fitcore.io/api/v1'
      : env === 'staging'
        ? 'https://api-staging.fitcore.io/api/v1'
        : 'http://localhost:4000/api/v1');

  const sentryDsn =
    typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_SENTRY_DSN : undefined;
  const analyticsKey =
    typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_ANALYTICS_KEY : undefined;
  const pushNotificationProjectId =
    typeof process !== 'undefined'
      ? process.env?.EXPO_PUBLIC_PUSH_NOTIFICATION_PROJECT_ID
      : undefined;

  return {
    env,
    apiBaseUrl,
    sentryDsn: sentryDsn || undefined,
    analyticsKey: analyticsKey || undefined,
    pushNotificationProjectId: pushNotificationProjectId || undefined,
    isProduction: env === 'production',
    isDevelopment: env === 'development',
    isStaging: env === 'staging',
  };
}
