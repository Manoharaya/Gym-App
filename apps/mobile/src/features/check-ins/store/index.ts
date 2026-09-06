/**
 * Coach Check-Ins State Store
 */

import { create } from 'zustand';
import type { CheckInsState } from '../types';

export const useCheckInsStore = create<CheckInsState>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
