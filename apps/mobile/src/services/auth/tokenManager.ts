import { SECURE_STORAGE_KEYS } from '@fitcore/constants';
import { secureStorage } from '../storage/secureStorage';
import { logger } from '../logging';

export class TokenManager {
  async getAccessToken(): Promise<string | null> {
    return await secureStorage.getItem(SECURE_STORAGE_KEYS.ACCESS_TOKEN);
  }

  async setAccessToken(token: string): Promise<void> {
    logger.debug('Storing access token in secure hardware storage');
    await secureStorage.setItem(SECURE_STORAGE_KEYS.ACCESS_TOKEN, token);
  }

  async getRefreshToken(): Promise<string | null> {
    return await secureStorage.getItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
  }

  async setRefreshToken(token: string): Promise<void> {
    logger.debug('Storing refresh token in secure hardware storage');
    await secureStorage.setItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN, token);
  }

  async clearTokens(): Promise<void> {
    logger.info('Clearing secure auth tokens');
    await secureStorage.removeItem(SECURE_STORAGE_KEYS.ACCESS_TOKEN);
    await secureStorage.removeItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
    await secureStorage.removeItem(SECURE_STORAGE_KEYS.BIOMETRIC_TOKEN);
  }
}

export const tokenManager = new TokenManager();
