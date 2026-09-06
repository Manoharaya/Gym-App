import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingService, type QuerySessionsParams } from '../services/bookingService';

export const BOOKING_QUERY_KEYS = {
  sessions: (params?: QuerySessionsParams) => ['bookings', 'sessions', params] as const,
  sessionDetails: (sessionId: string) => ['bookings', 'session', sessionId] as const,
  myBookings: (includePast?: boolean) => ['bookings', 'my-bookings', includePast] as const,
  myWaitlists: ['bookings', 'my-waitlists'] as const,
};

/**
 * Hook to retrieve scheduled class sessions.
 */
export function useClassSessions(params?: QuerySessionsParams) {
  return useQuery({
    queryKey: BOOKING_QUERY_KEYS.sessions(params),
    queryFn: () => bookingService.getSessions(params),
    refetchInterval: 60000, // 1 min background refresh
  });
}

/**
 * Hook to retrieve single class session with details and real-time spots remaining.
 */
export function useClassSession(sessionId: string) {
  return useQuery({
    queryKey: BOOKING_QUERY_KEYS.sessionDetails(sessionId),
    queryFn: () => bookingService.getSessionDetails(sessionId),
    enabled: !!sessionId,
  });
}

/**
 * Hook to retrieve member's bookings.
 */
export function useMyBookings(includePast: boolean = false) {
  return useQuery({
    queryKey: BOOKING_QUERY_KEYS.myBookings(includePast),
    queryFn: () => bookingService.getMyBookings(includePast),
  });
}

/**
 * Hook to retrieve member's waitlist entries.
 */
export function useMyWaitlists() {
  return useQuery({
    queryKey: BOOKING_QUERY_KEYS.myWaitlists,
    queryFn: () => bookingService.getMyWaitlists(),
  });
}

/**
 * Mutation to book a class session.
 */
export function useBookSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, idempotencyKey }: { sessionId: string; idempotencyKey?: string }) =>
      bookingService.bookSession(sessionId, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

/**
 * Mutation to explicitly join a waitlist.
 */
export function useJoinWaitlistMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => bookingService.joinWaitlist(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

/**
 * Mutation to cancel an existing booking.
 */
export function useCancelBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: string; reason?: string }) =>
      bookingService.cancelBooking(bookingId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

/**
 * Mutation to leave a waitlist.
 */
export function useLeaveWaitlistMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (waitlistId: string) => bookingService.leaveWaitlist(waitlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
