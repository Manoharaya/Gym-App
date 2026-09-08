import { apiClient } from '../../../services/api';
import type {
  WearableIntelligenceSummaryDto,
  WearableIntelligenceResponseDto,
  WearableInsightQueryDto,
  WearableInsightFeedbackDto,
  RecoverySummaryDto,
  WearableTrendDto,
  TrainingCorrelationDto,
  SleepMetricsDto,
  ActivityMetricsDto,
  WearablePrivacyViewDto,
} from '@fitcore/types';

export class WearableIntelligenceService {
  /**
   * Retrieves comprehensive aggregated wearable summary (metrics, trends, recovery, correlations).
   */
  static async getSummary(refresh = false): Promise<WearableIntelligenceSummaryDto> {
    const res = await apiClient.get<WearableIntelligenceSummaryDto>(
      `/ai/wearables/summary${refresh ? '?refresh=true' : ''}`,
    );
    return res.data;
  }

  /**
   * Retrieves recovery readiness score and non-medical classification.
   */
  static async getRecovery(): Promise<RecoverySummaryDto> {
    const res = await apiClient.get<RecoverySummaryDto>('/ai/wearables/recovery');
    return res.data;
  }

  /**
   * Retrieves multi-day rolling metric trends.
   */
  static async getTrends(): Promise<WearableTrendDto[]> {
    const res = await apiClient.get<WearableTrendDto[]>('/ai/wearables/trends');
    return res.data;
  }

  /**
   * Retrieves detailed sleep analytics.
   */
  static async getSleep(): Promise<SleepMetricsDto> {
    const res = await apiClient.get<SleepMetricsDto>('/ai/wearables/sleep');
    return res.data;
  }

  /**
   * Retrieves detailed daily activity analytics.
   */
  static async getActivity(): Promise<ActivityMetricsDto> {
    const res = await apiClient.get<ActivityMetricsDto>('/ai/wearables/activity');
    return res.data;
  }

  /**
   * Retrieves workout and wearable recovery correlations.
   */
  static async getTrainingCorrelation(): Promise<TrainingCorrelationDto[]> {
    const res = await apiClient.get<TrainingCorrelationDto[]>('/ai/wearables/training-correlation');
    return res.data;
  }

  /**
   * Generates or retrieves an AI wearable intelligence insight.
   */
  static async generateInsight(
    dto: WearableInsightQueryDto = {},
    idempotencyKey?: string,
  ): Promise<{ insight: WearableIntelligenceResponseDto; insightId?: string; cached: boolean }> {
    const headers = idempotencyKey ? { 'idempotency-key': idempotencyKey } : undefined;
    const res = await apiClient.post<{ insight: WearableIntelligenceResponseDto; insightId?: string; cached: boolean }>(
      '/ai/wearables/insight',
      dto,
      { headers },
    );
    return res.data;
  }

  /**
   * Retrieves recent historical wearable intelligence insights.
   */
  static async getPastInsights(limit = 10): Promise<any[]> {
    const res = await apiClient.get<any[]>(`/ai/wearables/insights?limit=${limit}`);
    return res.data;
  }

  /**
   * Submits member feedback on an insight (Helpful / Not Helpful).
   */
  static async submitFeedback(
    dto: WearableInsightFeedbackDto,
  ): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post<{ success: boolean; message: string }>('/ai/wearables/feedback', dto);
    return res.data;
  }

  /**
   * Retrieves privacy transparency view.
   */
  static async getPrivacyView(): Promise<WearablePrivacyViewDto> {
    const res = await apiClient.get<WearablePrivacyViewDto>('/ai/wearables/privacy');
    return res.data;
  }
}
