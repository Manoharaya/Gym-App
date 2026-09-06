/**
 * Exercise Library Custom Hooks
 */

import { useExercisesStore } from '../store';

export function useExercises() {
  const store = useExercisesStore();
  return {
    ...store,
  };
}
