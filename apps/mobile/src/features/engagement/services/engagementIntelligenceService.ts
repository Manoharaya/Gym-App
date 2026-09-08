import { apiClient } from '../../../services/api';
import type {
  MemberEngagementProfileDto,
  EngagementTrendItem,
  EngagementIntelligenceResponse,
  EngagementPrivacyViewDto,
  AppEngagementEventType,
} from '@fitcore/types';

export class EngagementIntelligenceService {
  /**
   * Retrieves deterministic member engagement profile, frequencies, adherence, and momentum level.
   */
  static async getSummary(refresh = false): Promise<MemberEngagementProfileDto> {
    const res = await apiClient.get<MemberEngagementProfileDto>(
      `/ai/engagement/summary${refresh ? '?refresh=true' : ''}`,
    );
    return res.data;
  }

  /**
   * Retrieves multi-pillar engagement trends compared against personal historical baseline.
   */
  static async getTrends(refresh = false): Promise<EngagementTrendItem[]> {
    const res = await apiClient.get<EngagementTrendItem[]>(
      `/ai/engagement/trends${refresh ? '?refresh=true' : ''}`,
    );
    return res.data;
  }

  /**
   * Generates AI engagement intelligence insight with actionable, positive coaching recommendations.
   */
  static async generateInsight(promptQuery?: string): Promise<{
    insight: EngagementIntelligenceResponse;
    insightId?: string;
    cached: boolean;
  }> {
    const res = await apiClient.post<{
      insight: EngagementIntelligenceResponse;
      insightId?: string;
      cached: boolean;
    }>('/ai/engagement/insight', { promptQuery });
    return res.data;
  }

  /**
   * Records an intentional app engagement event.
   */
  static async recordAppEvent(
    eventType: AppEngagementEventType,
    metadata?: Record<string, any>,
  ): Promise<{ success: boolean; eventId: string }> {
    const res = await apiClient.post<{ success: boolean; eventId: string }>('/ai/engagement/events', {
      eventType,
      metadata,
    });
    return res.data;
  }

  /**
   * Submits feedback on an engagement insight.
   */
  static async submitFeedback(
    insightId: string,
    rating: 'HELPFUL' | 'NOT_HELPFUL',
    comment?: string,
  ): Promise<{ success: boolean; insightId: string }> {
    const res = await apiClient.post<{ success: boolean; insightId: string }>('/ai/engagement/feedback', {
      insightId,
      rating,
      comment,
    });
    return res.data;
  }

  /**
   * Retrieves member privacy and data governance details.
   */
  static async getPrivacy(): Promise<EngagementPrivacyViewDto> {
    const res = await apiClient.get<EngagementPrivacyViewDto>('/ai/engagement/privacy');
    return res.data;
  }
}
