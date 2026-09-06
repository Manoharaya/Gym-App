/**
 * Retail & POS Store State Store
 */

import { create } from 'zustand';
import type { RetailState } from '../types';

export const useRetailStore = create<RetailState>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
