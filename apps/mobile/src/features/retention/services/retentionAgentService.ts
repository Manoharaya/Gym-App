import { apiClient } from '../../../services/api';
import type {
  RetentionOutreachDto,
  RetentionAgentAnalysisDto,
  RetentionQueueQueryDto,
  ApproveOutreachDto,
  RetentionAgentAnalyticsDto,
} from '@fitcore/types';

export class RetentionAgentService {
  /**
   * Retrieves the staff retention outreach queue.
   */
  static async getQueue(params?: RetentionQueueQueryDto): Promise<{
    items: RetentionOutreachDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const res = await apiClient.get<{
      items: RetentionOutreachDto[];
      total: number;
      limit: number;
      offset: number;
    }>('/ai/retention-agent/queue', { params: params as any });
    return res.data;
  }

  /**
   * Retrieves member analysis and active outreach.
   */
  static async getMemberAnalysis(memberId: string): Promise<{
    latestAnalysis: RetentionAgentAnalysisDto | null;
    pendingOutreach: RetentionOutreachDto | null;
  }> {
    const res = await apiClient.get<{
      latestAnalysis: RetentionAgentAnalysisDto | null;
      pendingOutreach: RetentionOutreachDto | null;
    }>(`/ai/retention-agent/member/${memberId}`);
    return res.data;
  }

  /**
   * Triggers an on-demand retention analysis and draft generation.
   */
  static async analyzeMember(memberId: string, promptQuery?: string): Promise<RetentionOutreachDto> {
    const res = await apiClient.post<RetentionOutreachDto>(`/ai/retention-agent/analyze/${memberId}`, { promptQuery });
    return res.data;
  }

  /**
   * Retrieves outreach details by ID.
   */
  static async getOutreach(id: string): Promise<RetentionOutreachDto> {
    const res = await apiClient.get<RetentionOutreachDto>(`/ai/retention-agent/outreach/${id}`);
    return res.data;
  }

  /**
   * Approves outreach and dispatches to Communication Engine.
   */
  static async approveOutreach(id: string, dto: ApproveOutreachDto): Promise<RetentionOutreachDto> {
    const res = await apiClient.post<RetentionOutreachDto>(`/ai/retention-agent/outreach/${id}/approve`, dto);
    return res.data;
  }

  /**
   * Rejects outreach with a rationale.
   */
  static async rejectOutreach(id: string, reason: string): Promise<RetentionOutreachDto> {
    const res = await apiClient.post<RetentionOutreachDto>(`/ai/retention-agent/outreach/${id}/reject`, { reason });
    return res.data;
  }

  /**
   * Reschedules outreach.
   */
  static async rescheduleOutreach(
    id: string,
    scheduledAt: string,
    reason?: string,
  ): Promise<RetentionOutreachDto> {
    const res = await apiClient.post<RetentionOutreachDto>(`/ai/retention-agent/outreach/${id}/reschedule`, {
      scheduledAt,
      reason,
    });
    return res.data;
  }

  /**
   * Retrieves aggregate operational analytics.
   */
  static async getAnalytics(outletId?: string): Promise<RetentionAgentAnalyticsDto> {
    const res = await apiClient.get<RetentionAgentAnalyticsDto>('/ai/retention-agent/analytics', { params: { outletId } });
    return res.data;
  }
}
