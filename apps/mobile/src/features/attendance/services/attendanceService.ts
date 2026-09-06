import { apiClient } from '../../../services/api/apiClient';
import type {
  AttendanceRecord,
  SessionRosterResponse,
} from '../types';

export interface CheckInPayload {
  memberProfileId?: string;
  method?: string;
  allowWindowOverride?: boolean;
  notes?: string;
}

export interface CheckOutPayload {
  memberProfileId?: string;
  method?: string;
}

export interface RecordWalkInPayload {
  memberProfileId: string;
  allowCapacityOverride?: boolean;
  overrideReason?: string;
  notes?: string;
}

export interface CorrectAttendancePayload {
  status: string;
  reason: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  notes?: string;
}

export interface SubstituteTrainerPayload {
  substituteTrainerId: string;
  reason: string;
  notes?: string;
}

export const attendanceService = {
  /**
   * Checks in a member with a confirmed reservation into a class session.
   */
  async checkInMember(
    classSessionId: string,
    payload: CheckInPayload = {},
  ): Promise<AttendanceRecord> {
    const res = await apiClient.post<AttendanceRecord>(
      `/class-sessions/${classSessionId}/check-in`,
      payload,
    );
    const data = res.data as any;
    return (data?.data || data) as AttendanceRecord;
  },

  /**
   * Checks out an attendee from a class session.
   */
  async checkOutMember(
    classSessionId: string,
    payload: CheckOutPayload = {},
  ): Promise<AttendanceRecord> {
    const res = await apiClient.post<AttendanceRecord>(
      `/class-sessions/${classSessionId}/check-out`,
      payload,
    );
    const data = res.data as any;
    return (data?.data || data) as AttendanceRecord;
  },

  /**
   * Fetches attendance history for current member.
   */
  async getMyAttendance(limit = 50, offset = 0): Promise<AttendanceRecord[]> {
    const res = await apiClient.get<AttendanceRecord[]>(
      `/members/me/attendance?limit=${limit}&offset=${offset}`,
    );
    const data = res.data as any;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  },

  /**
   * Fetches operational class roster and live occupancy metrics (Staff/Trainer).
   */
  async getSessionRoster(classSessionId: string): Promise<SessionRosterResponse> {
    const res = await apiClient.get<SessionRosterResponse>(
      `/class-sessions/${classSessionId}/roster`,
    );
    const data = res.data as any;
    return (data?.data || data) as SessionRosterResponse;
  },

  /**
   * Records walk-in member attendance without prior booking (Staff).
   */
  async recordWalkIn(
    classSessionId: string,
    payload: RecordWalkInPayload,
  ): Promise<AttendanceRecord> {
    const res = await apiClient.post<AttendanceRecord>(
      `/class-sessions/${classSessionId}/walk-in`,
      payload,
    );
    const data = res.data as any;
    return (data?.data || data) as AttendanceRecord;
  },

  /**
   * Corrects attendance status or timestamps with audit justification (Staff).
   */
  async correctAttendance(
    attendanceId: string,
    payload: CorrectAttendancePayload,
  ): Promise<AttendanceRecord> {
    const res = await apiClient.post<AttendanceRecord>(
      `/attendance/${attendanceId}/correct`,
      payload,
    );
    const data = res.data as any;
    return (data?.data || data) as AttendanceRecord;
  },

  /**
   * Trainer arrival and class check-in.
   */
  async trainerCheckIn(classSessionId: string): Promise<any> {
    const res = await apiClient.post(
      `/class-sessions/${classSessionId}/trainer-check-in`,
      {},
    );
    const data = res.data as any;
    return data?.data || data;
  },

  /**
   * Trainer session check-out and completion.
   */
  async trainerCheckOut(classSessionId: string): Promise<any> {
    const res = await apiClient.post(
      `/class-sessions/${classSessionId}/trainer-check-out`,
      {},
    );
    const data = res.data as any;
    return data?.data || data;
  },

  /**
   * Substitutes trainer for an individual session instance.
   */
  async substituteTrainer(
    classSessionId: string,
    payload: SubstituteTrainerPayload,
  ): Promise<any> {
    const res = await apiClient.post(
      `/class-sessions/${classSessionId}/substitute-trainer`,
      payload,
    );
    const data = res.data as any;
    return data?.data || data;
  },

  /**
   * Triggers no-show batch processing for an ended session.
   */
  async processSessionNoShows(
    classSessionId: string,
    gracePeriodMinutes = 15,
  ): Promise<any> {
    const res = await apiClient.post(
      `/class-sessions/${classSessionId}/process-no-shows?gracePeriodMinutes=${gracePeriodMinutes}`,
      {},
    );
    const data = res.data as any;
    return data?.data || data;
  },
};
