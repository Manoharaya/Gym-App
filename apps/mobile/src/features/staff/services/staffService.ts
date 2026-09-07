import { apiClient } from '../../../services/api/apiClient';
import type {
  StaffProfile,
  StaffOutletAssignment,
  StaffEmploymentStatus,
} from '@fitcore/types';

export interface QueryStaffParams {
  outletId?: string;
  roleName?: string;
  status?: StaffEmploymentStatus;
  search?: string;
  isTrainer?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateStaffPayload {
  email?: string;
  firstName?: string;
  lastName?: string;
  jobTitle: string;
  displayName?: string;
  employeeReference?: string;
  phone?: string;
  workEmail?: string;
  initialOutletId?: string;
  roleName?: string;
}

export interface InviteStaffPayload {
  email: string;
  roleName: string;
  outletId?: string;
  jobTitle: string;
  displayName?: string;
  employeeReference?: string;
}

export const staffService = {
  async getAllStaff(params?: QueryStaffParams): Promise<StaffProfile[]> {
    const res = await apiClient.get<any>('/staff', {
      params: params as Record<string, string | number | boolean | undefined>,
    });
    if (Array.isArray(res.data)) return res.data;
    if (res.data?.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  },

  async getStaffById(id: string): Promise<StaffProfile> {
    const res = await apiClient.get<StaffProfile>(`/staff/${id}`);
    return res.data;
  },

  async createStaff(payload: CreateStaffPayload): Promise<StaffProfile> {
    const res = await apiClient.post<StaffProfile>('/staff', payload);
    return res.data;
  },

  async updateStaff(id: string, payload: Partial<StaffProfile>): Promise<StaffProfile> {
    const res = await apiClient.patch<StaffProfile>(`/staff/${id}`, payload);
    return res.data;
  },

  async transitionStatus(
    id: string,
    status: StaffEmploymentStatus,
    reason?: string,
  ): Promise<StaffProfile> {
    const res = await apiClient.post<StaffProfile>(`/staff/${id}/status`, { status, reason });
    return res.data;
  },

  async deactivateStaff(id: string, reason?: string): Promise<{ success: boolean }> {
    const res = await apiClient.post<{ success: boolean }>(`/staff/${id}/deactivate`, { reason });
    return res.data;
  },

  async assignOutlet(
    id: string,
    outletId: string,
    roleScope?: string,
    isPrimary?: boolean,
  ): Promise<StaffOutletAssignment> {
    const res = await apiClient.post<StaffOutletAssignment>(`/staff/${id}/outlets`, {
      outletId,
      roleScope,
      isPrimary,
    });
    return res.data;
  },

  async removeOutlet(id: string, outletId: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(`/staff/${id}/outlets/${outletId}`);
    return res.data;
  },

  async inviteStaff(payload: InviteStaffPayload): Promise<any> {
    const res = await apiClient.post<any>('/staff/invite', payload);
    return res.data;
  },
};
