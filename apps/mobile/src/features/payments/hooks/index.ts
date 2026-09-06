/**
 * Payments & Billing Custom Hooks
 */

import { usePaymentsStore } from '../store';

export function usePayments() {
  const store = usePaymentsStore();
  return {
    ...store,
  };
}
