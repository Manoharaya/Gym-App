/**
 * Member Onboarding Custom Hooks
 */

import { useOnboardingStore } from '../store';

export function useOnboarding() {
  const store = useOnboardingStore();
  return {
    ...store,
  };
}
