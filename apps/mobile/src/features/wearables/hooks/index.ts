/**
 * Wearables & Telemetry Custom Hooks
 */

import { useWearablesStore } from '../store';

export function useWearables() {
  const store = useWearablesStore();
  return {
    ...store,
  };
}
