/**
 * Appointments & Booking Custom Hooks
 */

import { useBookingStore } from '../store';

export function useBooking() {
  const store = useBookingStore();
  return {
    ...store,
  };
}
