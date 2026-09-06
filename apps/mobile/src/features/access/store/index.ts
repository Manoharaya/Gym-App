/**
 * Access Control & Entry State Store
 */

import { create } from 'zustand';
import type { AccessState } from '../types';

export const useAccessStore = create<AccessState>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
