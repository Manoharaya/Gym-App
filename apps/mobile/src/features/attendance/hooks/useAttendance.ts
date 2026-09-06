import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  attendanceService,
  type CheckInPayload,
  type CheckOutPayload,
  type RecordWalkInPayload,
  type CorrectAttendancePayload,
  type SubstituteTrainerPayload,
} from '../services/attendanceService';

export const ATTENDANCE_QUERY_KEYS = {
  myAttendance: (limit?: number, offset?: number) =>
    ['attendance', 'my-attendance', limit, offset] as const,
  sessionRoster: (sessionId: string) =>
    ['attendance', 'roster', sessionId] as const,
};

/**
 * Hook to retrieve member's past attendance history.
 */
export function useMyAttendance(limit = 50, offset = 0) {
  return useQuery({
    queryKey: ATTENDANCE_QUERY_KEYS.myAttendance(limit, offset),
    queryFn: () => attendanceService.getMyAttendance(limit, offset),
  });
}

/**
 * Hook to retrieve operational class session roster and live occupancy (Staff/Trainer).
 */
export function useSessionRoster(sessionId: string) {
  return useQuery({
    queryKey: ATTENDANCE_QUERY_KEYS.sessionRoster(sessionId),
    queryFn: () => attendanceService.getSessionRoster(sessionId),
    enabled: !!sessionId,
    refetchInterval: 15000, // 15-second live refresh for reception / trainer
  });
}

/**
 * Mutation for member class check-in.
 */
export function useCheckInMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      payload,
    }: {
      sessionId: string;
      payload?: CheckInPayload;
    }) => attendanceService.checkInMember(sessionId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({
        queryKey: ATTENDANCE_QUERY_KEYS.sessionRoster(variables.sessionId),
      });
    },
  });
}

/**
 * Mutation for attendee class check-out.
 */
export function useCheckOutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      payload,
    }: {
      sessionId: string;
      payload?: CheckOutPayload;
    }) => attendanceService.checkOutMember(sessionId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({
        queryKey: ATTENDANCE_QUERY_KEYS.sessionRoster(variables.sessionId),
      });
    },
  });
}

/**
 * Mutation to record walk-in attendance.
 */
export function useRecordWalkInMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      payload,
    }: {
      sessionId: string;
      payload: RecordWalkInPayload;
    }) => attendanceService.recordWalkIn(sessionId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({
        queryKey: ATTENDANCE_QUERY_KEYS.sessionRoster(variables.sessionId),
      });
    },
  });
}

/**
 * Mutation to correct attendance records.
 */
export function useCorrectAttendanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      attendanceId,
      sessionId: _sessionId,
      payload,
    }: {
      attendanceId: string;
      sessionId: string;
      payload: CorrectAttendancePayload;
    }) => attendanceService.correctAttendance(attendanceId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({
        queryKey: ATTENDANCE_QUERY_KEYS.sessionRoster(variables.sessionId),
      });
    },
  });
}

/**
 * Mutation for trainer check-in.
 */
export function useTrainerCheckInMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => attendanceService.trainerCheckIn(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({
        queryKey: ATTENDANCE_QUERY_KEYS.sessionRoster(sessionId),
      });
    },
  });
}

/**
 * Mutation for trainer check-out.
 */
export function useTrainerCheckOutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => attendanceService.trainerCheckOut(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({
        queryKey: ATTENDANCE_QUERY_KEYS.sessionRoster(sessionId),
      });
    },
  });
}

/**
 * Mutation for session trainer substitution.
 */
export function useSubstituteTrainerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      payload,
    }: {
      sessionId: string;
      payload: SubstituteTrainerPayload;
    }) => attendanceService.substituteTrainer(sessionId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({
        queryKey: ATTENDANCE_QUERY_KEYS.sessionRoster(variables.sessionId),
      });
    },
  });
}

/**
 * Mutation for session no-show batch processing.
 */
export function useProcessNoShowsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      gracePeriodMinutes,
    }: {
      sessionId: string;
      gracePeriodMinutes?: number;
    }) => attendanceService.processSessionNoShows(sessionId, gracePeriodMinutes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({
        queryKey: ATTENDANCE_QUERY_KEYS.sessionRoster(variables.sessionId),
      });
    },
  });
}
