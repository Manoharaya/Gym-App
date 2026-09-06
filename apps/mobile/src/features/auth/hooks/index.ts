/**
 * Authentication & Session Custom Hooks
 */

import { useAuthStore } from '../store';

export function useAuth() {
  const store = useAuthStore();
  return {
    ...store,
  };
}
