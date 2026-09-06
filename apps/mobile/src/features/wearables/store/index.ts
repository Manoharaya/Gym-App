/**
 * Wearables & Telemetry State Store
 */

import { create } from 'zustand';
import type { WearablesState } from '../types';

export const useWearablesStore = create<WearablesState>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
