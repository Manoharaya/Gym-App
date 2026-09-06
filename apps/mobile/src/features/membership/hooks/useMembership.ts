import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipService } from '../services/membershipService';

export const MEMBERSHIP_KEYS = {
  all: ['memberships'] as const,
  active: () => [...MEMBERSHIP_KEYS.all, 'active'] as const,
  history: () => [...MEMBERSHIP_KEYS.all, 'history'] as const,
  details: (id: string) => [...MEMBERSHIP_KEYS.all, 'details', id] as const,
  plans: (outletId?: string) => ['membership-plans', outletId ?? 'all'] as const,
};

export const useActiveMembership = () => {
  return useQuery({
    queryKey: MEMBERSHIP_KEYS.active(),
    queryFn: () => membershipService.getActiveMembership(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useMembershipHistory = () => {
  return useQuery({
    queryKey: MEMBERSHIP_KEYS.history(),
    queryFn: () => membershipService.getMembershipHistory(),
    staleTime: 1000 * 60 * 5,
  });
};

export const useMembershipDetails = (id: string) => {
  return useQuery({
    queryKey: MEMBERSHIP_KEYS.details(id),
    queryFn: () => membershipService.getMembershipDetails(id),
    enabled: Boolean(id),
  });
};

export const useMembershipPlans = (outletId?: string) => {
  return useQuery({
    queryKey: MEMBERSHIP_KEYS.plans(outletId),
    queryFn: () => membershipService.getMembershipPlans(outletId),
    staleTime: 1000 * 60 * 10,
  });
};

export const useCancelMembership = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      membershipService.cancelMembership(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERSHIP_KEYS.all });
    },
  });
};

export const useRenewMembership = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => membershipService.renewMembership(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERSHIP_KEYS.all });
    },
  });
};
