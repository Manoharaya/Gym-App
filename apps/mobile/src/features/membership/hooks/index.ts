/**
 * Membership & Subscriptions Custom Hooks
 */

import { useMembershipStore } from '../store';

export function useMembership() {
  const store = useMembershipStore();
  return {
    ...store,
  };
}
