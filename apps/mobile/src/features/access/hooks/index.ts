/**
 * Access Control & Entry Custom Hooks
 */

import { useAccessStore } from '../store';

export function useAccess() {
  const store = useAccessStore();
  return {
    ...store,
  };
}
