/**
 * Appointments & Booking State Store
 */

import { create } from 'zustand';
import type { BookingState } from '../types';

export const useBookingStore = create<BookingState>(() => ({
  isInitialized: false,
  isLoading: false,
  error: null,
}));
