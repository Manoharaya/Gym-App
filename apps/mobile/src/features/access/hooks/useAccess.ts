import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accessService } from '../services/accessService';
import { useAccessStore } from '../store/accessStore';
import type { CheckInRequestPayload, CheckOutRequestPayload } from '../types';

export const ACCESS_QUERY_KEYS = {
  status: (outletId?: string) => ['access', 'status', outletId] as const,
  dynamicQR: (outletId?: string) => ['access', 'dynamic-qr', outletId] as const,
  activeVisit: ['access', 'active-visit'] as const,
  visits: (page: number, limit: number) => ['access', 'visits', page, limit] as const,
  credentials: ['access', 'credentials'] as const,
};

/**
 * Hook to retrieve member's access status and authorized facilities.
 */
export function useAccessStatus(outletId?: string) {
  const setStatus = useAccessStore((state) => state.setStatus);

  const query = useQuery({
    queryKey: ACCESS_QUERY_KEYS.status(outletId),
    queryFn: () => accessService.getAccessStatus(outletId),
    refetchInterval: 30000, // 30s background sync
  });

  useEffect(() => {
    if (query.data) {
      setStatus(query.data);
    }
  }, [query.data, setStatus]);

  return query;
}

/**
 * Hook to fetch and periodically rotate dynamic QR token.
 */
export function useDynamicQR(outletId?: string, enabled: boolean = true) {
  const { dynamicQR, secondsRemaining, setDynamicQR, decrementTimer } = useAccessStore();

  const query = useQuery({
    queryKey: ACCESS_QUERY_KEYS.dynamicQR(outletId),
    queryFn: () => accessService.getDynamicQR(outletId),
    enabled,
    refetchInterval: 55000, // Rotate every 55 seconds (before 60s expiration)
  });

  useEffect(() => {
    if (query.data) {
      setDynamicQR(query.data);
    }
  }, [query.data, setDynamicQR]);

  // Second-by-second countdown timer for smooth UI progress bar
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      decrementTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [enabled, decrementTimer]);

  return {
    ...query,
    token: dynamicQR?.token,
    displayIdentifier: dynamicQR?.displayIdentifier,
    expiresAt: dynamicQR?.expiresAt,
    secondsRemaining,
  };
}

/**
 * Hook to retrieve active ongoing gym visit.
 */
export function useActiveVisit() {
  const setActiveVisit = useAccessStore((state) => state.setActiveVisit);

  const query = useQuery({
    queryKey: ACCESS_QUERY_KEYS.activeVisit,
    queryFn: () => accessService.getActiveVisit(),
    refetchInterval: 15000, // 15s polling when visit active
  });

  useEffect(() => {
    if (query.data !== undefined) {
      setActiveVisit(query.data);
    }
  }, [query.data, setActiveVisit]);

  return query;
}

/**
 * Hook to retrieve visit history.
 */
export function useVisitHistory(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ACCESS_QUERY_KEYS.visits(page, limit),
    queryFn: () => accessService.getMyVisits(page, limit),
  });
}

/**
 * Mutation hook for in-app check-in.
 */
export function useCheckInMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CheckInRequestPayload) => accessService.checkIn(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access'] });
    },
  });
}

/**
 * Mutation hook for in-app check-out.
 */
export function useCheckOutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CheckOutRequestPayload) => accessService.checkOut(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access'] });
    },
  });
}
