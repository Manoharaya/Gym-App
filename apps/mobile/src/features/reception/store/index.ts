/**
 * Reception & Front Desk State Store
 */

import { create } from 'zustand';
import type { ReceptionState } from '../types';

export const useReceptionStore = create<ReceptionState>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
