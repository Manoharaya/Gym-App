/**
 * Nutrition & Macros State Store
 */

import { create } from 'zustand';
import type { NutritionState } from '../types';

export const useNutritionStore = create<NutritionState>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
