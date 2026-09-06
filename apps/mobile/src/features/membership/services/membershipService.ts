import { apiClient } from '../../../services/api/apiClient';
import type { MemberMembership, MembershipPlan } from '../types';

export const membershipService = {
  /**
   * Fetches the current active or trial membership for the logged-in member.
   */
  async getActiveMembership(): Promise<MemberMembership | null> {
    const res = await apiClient.get<MemberMembership | null>('/members/me/memberships/active');
    return res.data;
  },

  /**
   * Fetches the entire membership history (active, expired, cancelled) for the logged-in member.
   */
  async getMembershipHistory(): Promise<MemberMembership[]> {
    const res = await apiClient.get<MemberMembership[]>('/members/me/memberships');
    return res.data ?? [];
  },

  /**
   * Fetches a specific membership record by ID for the logged-in member.
   */
  async getMembershipDetails(id: string): Promise<MemberMembership> {
    const res = await apiClient.get<MemberMembership>(`/members/me/memberships/${id}`);
    return res.data;
  },

  /**
   * Fetches available membership plans for the member's organisation.
   */
  async getMembershipPlans(outletId?: string): Promise<MembershipPlan[]> {
    const params = outletId ? { outletId } : undefined;
    const res = await apiClient.get<MembershipPlan[]>('/membership-plans', { params });
    // Handle paginated or direct array responses
    if (Array.isArray(res.data)) {
      return res.data;
    }
    const anyData = res.data as any;
    if (anyData && Array.isArray(anyData.data)) {
      return anyData.data;
    }
    return [];
  },

  /**
   * Self-service cancellation of membership.
   */
  async cancelMembership(id: string, reason?: string): Promise<MemberMembership> {
    const res = await apiClient.post<MemberMembership>(`/members/me/memberships/${id}/cancel`, {
      reason,
    });
    return res.data;
  },

  /**
   * Self-service renewal of membership.
   */
  async renewMembership(id: string): Promise<MemberMembership> {
    const res = await apiClient.post<MemberMembership>(`/members/me/memberships/${id}/renew`, {});
    return res.data;
  },
};
