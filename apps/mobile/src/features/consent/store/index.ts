/**
 * Legal Consent & Terms State Store
 */

import { create } from 'zustand';
import type { ConsentState } from '../types';

export const useConsentStore = create<ConsentState>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
