/**
 * Retail & POS Store Custom Hooks
 */

import { useRetailStore } from '../store';

export function useRetail() {
  const store = useRetailStore();
  return {
    ...store,
  };
}
