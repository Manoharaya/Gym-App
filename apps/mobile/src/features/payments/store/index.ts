/**
 * Payments & Billing State Store
 */

import { create } from 'zustand';
import type { PaymentsState } from '../types';

export const usePaymentsStore = create<PaymentsState>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
