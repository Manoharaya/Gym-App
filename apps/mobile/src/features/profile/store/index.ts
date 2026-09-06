/**
 * Profile & Identity State Store
 */

import { create } from 'zustand';
import type { ProfileState } from '../types';

export const useProfileStore = create<ProfileState>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
