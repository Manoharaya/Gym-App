/**
 * AI Fitness Coach State Store
 */

import { create } from 'zustand';
import type { AiCoachState } from '../types';

export const useAiCoachStore = create<AiCoachState>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
