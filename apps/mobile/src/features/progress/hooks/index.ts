/**
 * Progress & Body Metrics Custom Hooks
 */

import { useProgressStore } from '../store';

export function useProgress() {
  const store = useProgressStore();
  return {
    ...store,
  };
}
