/**
 * Member Support & Help State Store
 */

import { create } from 'zustand';
import type { SupportState } from '../types';

export const useSupportStore = create<SupportState>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
