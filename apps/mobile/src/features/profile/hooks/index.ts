/**
 * Profile & Identity Custom Hooks
 */

import { useProfileStore } from '../store';

export function useProfile() {
  const store = useProfileStore();
  return {
    ...store,
  };
}
