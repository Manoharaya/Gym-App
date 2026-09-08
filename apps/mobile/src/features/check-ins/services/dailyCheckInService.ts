import { apiClient } from '../../../services/api';
import type {
  DailyCheckInDto,
  SubmitDailyCheckInDto,
  CreateDailyCheckInDto,
  DailyCheckInHistoryResponseDto,
  DailyCheckInPrivacyViewDto,
  DailyCheckInSettingsDto,
  UpdateDailyCheckInSettingsDto,
} from '@fitcore/types';

export class DailyCheckInService {
  /**
   * Initializes or resumes a check-in for today.
   */
  static async startCheckIn(dto?: CreateDailyCheckInDto): Promise<DailyCheckInDto> {
    const res = await apiClient.post<DailyCheckInDto>('/ai/daily-checkin/start', dto || {});
    return res.data;
  }

  /**
   * Submits check-in responses and receives structured AI daily intelligence.
   */
  static async submitCheckIn(
    dto: SubmitDailyCheckInDto,
    idempotencyKey?: string,
  ): Promise<DailyCheckInDto> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['idempotency-key'] = idempotencyKey;
    }

    const res = await apiClient.post<DailyCheckInDto>('/ai/daily-checkin/submit', dto, { headers });
    return res.data;
  }

  /**
   * Fetches today's check-in if started or completed.
   */
  static async getTodayCheckIn(date?: string): Promise<DailyCheckInDto | null> {
    const url = date ? `/ai/daily-checkin/today?date=${date}` : '/ai/daily-checkin/today';
    try {
      const res = await apiClient.get<DailyCheckInDto | null>(url);
      return res.data;
    } catch {
      return null;
    }
  }

  /**
   * Fetches past check-ins with trend indicators.
   */
  static async getHistory(limit: number = 14, offset: number = 0): Promise<DailyCheckInHistoryResponseDto> {
    const res = await apiClient.get<DailyCheckInHistoryResponseDto>(
      `/ai/daily-checkin/history?limit=${limit}&offset=${offset}`,
    );
    return res.data;
  }

  /**
   * Fetches a specific check-in by ID.
   */
  static async getById(id: string): Promise<DailyCheckInDto> {
    const res = await apiClient.get<DailyCheckInDto>(`/ai/daily-checkin/${id}`);
    return res.data;
  }

  /**
   * Regenerates AI daily insight for a completed check-in.
   */
  static async regenerate(id: string): Promise<DailyCheckInDto> {
    const res = await apiClient.post<DailyCheckInDto>(`/ai/daily-checkin/${id}/regenerate`, {});
    return res.data;
  }

  /**
   * Submits feedback on daily check-in recommendations.
   */
  static async submitFeedback(
    id: string,
    rating: 'HELPFUL' | 'NOT_HELPFUL' | 'INCORRECT' | 'NOT_RELEVANT' | 'UNSAFE',
    comment?: string,
  ): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post<{ success: boolean; message: string }>(
      `/ai/daily-checkin/${id}/feedback`,
      { rating, comment },
    );
    return res.data;
  }

  /**
   * Transparent member privacy view of data sources used vs excluded.
   */
  static async getPrivacyView(id: string): Promise<DailyCheckInPrivacyViewDto> {
    const res = await apiClient.get<DailyCheckInPrivacyViewDto>(`/ai/daily-checkin/${id}/privacy`);
    return res.data;
  }

  /**
   * Fetches check-in & reminder preferences.
   */
  static async getSettings(): Promise<DailyCheckInSettingsDto> {
    const res = await apiClient.get<DailyCheckInSettingsDto>('/ai/daily-checkin/settings');
    return res.data;
  }

  /**
   * Updates check-in & reminder preferences.
   */
  static async updateSettings(dto: UpdateDailyCheckInSettingsDto): Promise<DailyCheckInSettingsDto> {
    const res = await apiClient.patch<DailyCheckInSettingsDto>('/ai/daily-checkin/settings', dto);
    return res.data;
  }
}

export const dailyCheckInService = DailyCheckInService;
