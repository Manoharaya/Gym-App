import { apiClient } from '../../../services/api/apiClient';
import type {
  MemberAccessStatusResponse,
  DynamicQRCredentialResponse,
  CheckIn,
  AccessCredential,
  CheckInRequestPayload,
  CheckOutRequestPayload,
} from '../types';

export const accessService = {
  /**
   * Fetches current member physical access status and authorized facilities.
   */
  async getAccessStatus(outletId?: string): Promise<MemberAccessStatusResponse> {
    const url = outletId ? `/access/status?outletId=${outletId}` : '/access/status';
    const res = await apiClient.get<MemberAccessStatusResponse>(url);
    const data = res.data as any;
    return (data?.data || data) as MemberAccessStatusResponse;
  },

  /**
   * Generates or refreshes a dynamic HMAC-signed rotating QR credential token.
   */
  async getDynamicQR(outletId?: string): Promise<DynamicQRCredentialResponse> {
    const res = await apiClient.post<DynamicQRCredentialResponse>('/access/credentials/qr', {
      outletId,
    });
    const data = res.data as any;
    return (data?.data || data) as DynamicQRCredentialResponse;
  },

  /**
   * Fetches active gym visit if member is currently inside.
   */
  async getActiveVisit(): Promise<CheckIn | null> {
    const res = await apiClient.get<CheckIn | null>('/access/visits/active');
    const data = res.data as any;
    return (data?.data ?? data) as CheckIn | null;
  },

  /**
   * Fetches paginated visit history for the authenticated member.
   */
  async getMyVisits(page: number = 1, limit: number = 20): Promise<{ items: CheckIn[]; total: number }> {
    const res = await apiClient.get<{ items: CheckIn[]; total: number }>(
      `/access/visits?page=${page}&limit=${limit}`
    );
    const data = res.data as any;
    return (data?.data || data) as { items: CheckIn[]; total: number };
  },

  /**
   * Performs an in-app physical or digital check-in.
   */
  async checkIn(payload: CheckInRequestPayload): Promise<any> {
    const res = await apiClient.post('/access/check-in', payload);
    return res.data;
  },

  /**
   * Performs gym visit check-out.
   */
  async checkOut(payload: CheckOutRequestPayload): Promise<any> {
    const res = await apiClient.post('/access/check-out', payload);
    return res.data;
  },

  /**
   * Lists active access credentials (key fobs, mobile tokens, QR).
   */
  async getCredentials(): Promise<AccessCredential[]> {
    const res = await apiClient.get<AccessCredential[]>('/access/credentials');
    const data = res.data as any;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  },

  /**
   * Revokes a credential.
   */
  async revokeCredential(credentialId: string): Promise<any> {
    const res = await apiClient.patch(`/access/credentials/${credentialId}/revoke`);
    return res.data;
  },
};
