/**
 * Trainer Portal State Store
 */

import { create } from 'zustand';
import type { TrainerState } from '../types';

export const useTrainerStore = create<TrainerState>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
