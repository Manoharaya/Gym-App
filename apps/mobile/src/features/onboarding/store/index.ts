/**
 * Member Onboarding State Store
 */

import { create } from 'zustand';
import type { OnboardingState } from '../types';

export const useOnboardingStore = create<OnboardingState>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
