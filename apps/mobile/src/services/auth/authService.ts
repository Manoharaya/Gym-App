import type { LoginInput, RegisterInput } from '@fitcore/validation';
import type { UserRole } from '@fitcore/types';
import { apiClient } from '../api';
import { tokenManager } from './tokenManager';
import { sessionManager } from './sessionManager';
import { useAuthStore } from '../../store/authStore';
import { logger } from '../logging';

export interface AuthSessionResponse {
  userId: string;
  role: UserRole;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  async login(credentials: LoginInput): Promise<void> {
    logger.info('Authenticating user credentials');
    const response = await apiClient.post<AuthSessionResponse>('/auth/login', credentials, {
      skipAuth: true,
    });

    const { userId, role, accessToken, refreshToken } = response.data;
    await tokenManager.setAccessToken(accessToken);
    await tokenManager.setRefreshToken(refreshToken);
    useAuthStore.getState().setSession(userId, role);
  }

  async register(registrationData: RegisterInput): Promise<void> {
    logger.info('Registering new user');
    const response = await apiClient.post<AuthSessionResponse>('/auth/register', registrationData, {
      skipAuth: true,
    });

    const { userId, role, accessToken, refreshToken } = response.data;
    await tokenManager.setAccessToken(accessToken);
    await tokenManager.setRefreshToken(refreshToken);
    useAuthStore.getState().setSession(userId, role);
  }

  async logout(): Promise<void> {
    logger.info('Logging out user session');
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Proceed with local termination even if server logout fails
    }
    await sessionManager.terminateSession();
  }
}

export const authService = new AuthService();
