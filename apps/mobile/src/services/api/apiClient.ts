import { FitCoreApiClient } from '@fitcore/api-client';
import { getAppConfig } from '@fitcore/config';
import { SECURE_STORAGE_KEYS } from '@fitcore/constants';
import { useTenantStore } from '../../store/tenantStore';
import { secureStorage } from '../storage/secureStorage';

const config = getAppConfig();

export const apiClient = new FitCoreApiClient({
  baseUrl: config.apiBaseUrl,
  timeoutMs: 15000,
  getAuthToken: async () => {
    return await secureStorage.getItem(SECURE_STORAGE_KEYS.ACCESS_TOKEN);
  },
  getTenantContext: () => {
    const { tenant } = useTenantStore.getState();
    if (!tenant) return null;
    return {
      organisationId: tenant.organisationId,
      outletId: tenant.outletId,
    };
  },
  onRefreshToken: async () => {
    const refreshToken = await secureStorage.getItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) return null;

    try {
      // Refresh token request to FitCore Auth endpoint
      const response = await fetch(`${config.apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        await secureStorage.removeItem(SECURE_STORAGE_KEYS.ACCESS_TOKEN);
        await secureStorage.removeItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
        return null;
      }

      const data = await response.json();
      const newAccessToken = data?.data?.accessToken || data?.accessToken;
      if (newAccessToken) {
        await secureStorage.setItem(SECURE_STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
        return newAccessToken;
      }
      return null;
    } catch {
      return null;
    }
  },
});
