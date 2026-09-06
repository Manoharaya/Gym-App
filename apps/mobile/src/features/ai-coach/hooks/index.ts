/**
 * AI Fitness Coach Custom Hooks
 */

import { useAiCoachStore } from '../store';

export function useAiCoach() {
  const store = useAiCoachStore();
  return {
    ...store,
  };
}
