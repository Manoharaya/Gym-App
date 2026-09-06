/**
 * Member Support & Help Custom Hooks
 */

import { useSupportStore } from '../store';

export function useSupport() {
  const store = useSupportStore();
  return {
    ...store,
  };
}
