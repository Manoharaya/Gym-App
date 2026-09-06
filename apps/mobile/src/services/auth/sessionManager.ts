import { useAuthStore } from '../../store/authStore';
import { tokenManager } from './tokenManager';
import { logger } from '../logging';

export class SessionManager {
  async initSession(): Promise<boolean> {
    logger.debug('Validating existing session token');
    const token = await tokenManager.getAccessToken();
    if (!token) {
      useAuthStore.getState().clearSession();
      return false;
    }

    // In a full session check, token claims or user profile would be validated
    return true;
  }

  async terminateSession(): Promise<void> {
    logger.info('Terminating active user session');
    await tokenManager.clearTokens();
    useAuthStore.getState().clearSession();
  }
}

export const sessionManager = new SessionManager();
