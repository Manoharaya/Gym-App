/**
 * Progress & Body Metrics State Store
 */

import { create } from 'zustand';
import type { ProgressState } from '../types';

export const useProgressStore = create<ProgressState>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
