/**
 * Trainer Portal Custom Hooks
 */

import { useTrainerStore } from '../store';

export function useTrainer() {
  const store = useTrainerStore();
  return {
    ...store,
  };
}
