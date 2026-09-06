import { apiClient } from '../../../services/api/apiClient';
import type {
  ClassSession,
  Booking,
  WaitlistEntry,
} from '../types';

export interface QuerySessionsParams {
  outletId?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  classTypeId?: string;
  trainerId?: string;
  status?: string;
}

export interface BookSessionResponse {
  booking?: Booking;
  waitlist?: WaitlistEntry;
  status: 'CONFIRMED' | 'WAITLISTED';
  message: string;
}

export const bookingService = {
  /**
   * Fetches scheduled class sessions with capacity, trainer, and room info.
   */
  async getSessions(params: QuerySessionsParams = {}): Promise<ClassSession[]> {
    const query = new URLSearchParams();
    if (params.outletId) query.append('outletId', params.outletId);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.category) query.append('category', params.category);
    if (params.classTypeId) query.append('classTypeId', params.classTypeId);
    if (params.trainerId) query.append('trainerId', params.trainerId);
    if (params.status) query.append('status', params.status);

    const qs = query.toString();
    const url = `/class-sessions${qs ? `?${qs}` : ''}`;
    const res = await apiClient.get<ClassSession[]>(url);
    const data = res.data as any;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  },

  /**
   * Fetches single class session by ID with full details.
   */
  async getSessionDetails(sessionId: string): Promise<ClassSession> {
    const res = await apiClient.get<ClassSession>(`/class-sessions/${sessionId}`);
    const data = res.data as any;
    return (data?.data || data) as ClassSession;
  },

  /**
   * Books a class session. If full and policy allows, joins waitlist.
   */
  async bookSession(sessionId: string, idempotencyKey?: string): Promise<BookSessionResponse> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }
    const res = await apiClient.post<BookSessionResponse>(
      `/class-sessions/${sessionId}/book`,
      {},
      { headers }
    );
    const data = res.data as any;
    return (data?.data || data) as BookSessionResponse;
  },

  /**
   * Explicitly joins waitlist for a full class session.
   */
  async joinWaitlist(sessionId: string): Promise<WaitlistEntry> {
    const res = await apiClient.post<WaitlistEntry>(`/class-sessions/${sessionId}/waitlist`, {});
    const data = res.data as any;
    return (data?.data || data) as WaitlistEntry;
  },

  /**
   * Cancels an existing booking.
   */
  async cancelBooking(bookingId: string, reason?: string): Promise<Booking> {
    const res = await apiClient.post<Booking>(`/bookings/${bookingId}/cancel`, {
      reason,
    });
    const data = res.data as any;
    return (data?.data || data) as Booking;
  },

  /**
   * Leaves a waitlist.
   */
  async leaveWaitlist(waitlistId: string): Promise<any> {
    const res = await apiClient.delete(`/bookings/waitlist/${waitlistId}`);
    return res.data;
  },

  /**
   * Gets authenticated member's active and upcoming bookings.
   */
  async getMyBookings(includePast: boolean = false): Promise<Booking[]> {
    const url = `/members/me/bookings${includePast ? '?includePast=true' : ''}`;
    const res = await apiClient.get<Booking[]>(url);
    const data = res.data as any;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  },

  /**
   * Gets authenticated member's active waitlist entries.
   */
  async getMyWaitlists(): Promise<WaitlistEntry[]> {
    const res = await apiClient.get<WaitlistEntry[]>('/members/me/waitlists');
    const data = res.data as any;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  },
};
