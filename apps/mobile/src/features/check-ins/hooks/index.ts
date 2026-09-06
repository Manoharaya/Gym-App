/**
 * Coach Check-Ins Custom Hooks
 */

import { useCheckInsStore } from '../store';

export function useCheckIns() {
  const store = useCheckInsStore();
  return {
    ...store,
  };
}
