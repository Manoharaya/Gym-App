/**
 * Appointments & Booking Types
 * Schedules personal training, consultations, and class reservations.
 */

export interface BookingState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}
