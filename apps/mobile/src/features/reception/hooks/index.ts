/**
 * Reception & Front Desk Custom Hooks
 */

import { useReceptionStore } from '../store';

export function useReception() {
  const store = useReceptionStore();
  return {
    ...store,
  };
}
