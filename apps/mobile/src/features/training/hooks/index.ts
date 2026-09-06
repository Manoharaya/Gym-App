/**
 * Training Programs & Workouts Custom Hooks
 */

import { useTrainingStore } from '../store';

export function useTraining() {
  const store = useTrainingStore();
  return {
    ...store,
  };
}
