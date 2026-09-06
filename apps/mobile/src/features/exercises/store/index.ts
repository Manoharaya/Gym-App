/**
 * Exercise Library State Store
 */

import { create } from 'zustand';
import type { ExercisesState } from '../types';

export const useExercisesStore = create<ExercisesState>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
