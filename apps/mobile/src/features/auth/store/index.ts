/**
 * Authentication & Session State Store
 */

import { create } from 'zustand';
import type { AuthState } from '../types';

export const useAuthStore = create<AuthState>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
