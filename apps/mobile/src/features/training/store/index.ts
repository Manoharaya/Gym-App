/**
 * Training Programs & Workouts State Store
 */

import { create } from 'zustand';
import type { TrainingState } from '../types';

export const useTrainingStore = create<TrainingState>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
