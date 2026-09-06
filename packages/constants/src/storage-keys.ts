export const SECURE_STORAGE_KEYS = {
  ACCESS_TOKEN: 'fitcore_secure_access_token',
  REFRESH_TOKEN: 'fitcore_secure_refresh_token',
  USER_CREDENTIALS: 'fitcore_secure_user_creds',
  BIOMETRIC_TOKEN: 'fitcore_secure_biometric_token',
} as const;

export const LOCAL_STORAGE_KEYS = {
  ACTIVE_TENANT: 'fitcore_local_active_tenant',
  APP_THEME: 'fitcore_local_app_theme',
  USER_PREFERENCES: 'fitcore_local_user_preferences',
  OFFLINE_QUEUE: 'fitcore_local_offline_queue',
  LAST_SYNC_TIMESTAMP: 'fitcore_local_last_sync',
} as const;

export const CACHE_KEYS = {
  USER_PROFILE: 'fitcore_cache_user_profile',
  OUTLET_LIST: 'fitcore_cache_outlet_list',
  MEMBERSHIP_DETAILS: 'fitcore_cache_membership',
} as const;
