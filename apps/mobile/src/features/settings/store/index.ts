/**
 * Club & App Settings State Store
 */

import { create } from 'zustand';
import type { SettingsState } from '../types';

export const useSettingsStore = create<SettingsState>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
