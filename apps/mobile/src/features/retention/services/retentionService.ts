import { apiClient } from '../../../services/api';
import type {
  RetentionDashboardSummaryDto,
  RetentionRiskAssessment,
  RetentionRiskFactor,
  RetentionPositiveSignal,
  RetentionRiskTrend,
  RetentionQueueItemDto,
  RetentionIntelligenceResponse,
  RetentionFollowUpTaskDto,
  RetentionInterventionType,
  RetentionFeedbackRating,
} from '@fitcore/types';

export class RetentionService {
  /**
   * Aggregate retention dashboard summary & distribution metrics.
   */
  static async getSummary(params?: {
    outletId?: string;
    timeframe?: string;
  }): Promise<RetentionDashboardSummaryDto> {
    const res = await apiClient.get<RetentionDashboardSummaryDto>('/ai/retention/summary', {
      params,
    });
    return res.data;
  }

  /**
   * Deterministic retention risk assessment for a member.
   */
  static async getRisk(
    memberId: string,
    refresh = false,
  ): Promise<RetentionRiskAssessment & { trend: RetentionRiskTrend }> {
    const res = await apiClient.get<RetentionRiskAssessment & { trend: RetentionRiskTrend }>(
      '/ai/retention/risk',
      { params: { memberId, refresh } },
    );
    return res.data;
  }

  /**
   * Structured risk factors with evidence and positive signals.
   */
  static async getFactors(memberId: string): Promise<{
    primaryFactors: RetentionRiskFactor[];
    positiveSignals: RetentionPositiveSignal[];
    riskTrend: RetentionRiskTrend;
  }> {
    const res = await apiClient.get<{
      primaryFactors: RetentionRiskFactor[];
      positiveSignals: RetentionPositiveSignal[];
      riskTrend: RetentionRiskTrend;
    }>('/ai/retention/factors', { params: { memberId } });
    return res.data;
  }

  /**
   * Staff follow-up queue with filters.
   */
  static async getQueue(params?: {
    outletId?: string;
    riskLevel?: string;
    trainerId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: RetentionQueueItemDto[]; total: number; limit: number; offset: number }> {
    const res = await apiClient.get<{
      items: RetentionQueueItemDto[];
      total: number;
      limit: number;
      offset: number;
    }>('/ai/retention/queue', { params });
    return res.data;
  }

  /**
   * Generate or retrieve AI Retention Intelligence analysis.
   */
  static async analyze(
    memberId: string,
    promptQuery?: string,
    forceRecalculate = false,
    idempotencyKey?: string,
  ): Promise<{
    analysis: RetentionIntelligenceResponse;
    analysisId: string;
    cached: boolean;
    generatedBy: 'AI' | 'DETERMINISTIC';
  }> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['idempotency-key'] = idempotencyKey;
    }

    const res = await apiClient.post<{
      analysis: RetentionIntelligenceResponse;
      analysisId: string;
      cached: boolean;
      generatedBy: 'AI' | 'DETERMINISTIC';
    }>(
      '/ai/retention/analyze',
      { memberId, promptQuery, forceRecalculate },
      { headers },
    );
    return res.data;
  }

  /**
   * Submit staff rating & feedback on recommendations.
   */
  static async submitFeedback(params: {
    memberId: string;
    analysisId?: string;
    rating: RetentionFeedbackRating;
    comment?: string;
    category?: string;
  }): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post<{ success: boolean; message: string }>(
      '/ai/retention/feedback',
      params,
    );
    return res.data;
  }

  /**
   * Create human follow-up task.
   */
  static async createFollowUpTask(params: {
    memberId: string;
    outletId?: string;
    interventionType: RetentionInterventionType;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    assignedStaffId?: string;
    title?: string;
    notes?: string;
    dueAt?: string;
  }): Promise<RetentionFollowUpTaskDto> {
    const res = await apiClient.post<RetentionFollowUpTaskDto>(
      '/ai/retention/follow-ups',
      params,
    );
    return res.data;
  }

  /**
   * Update follow-up task status, assignment, or completion.
   */
  static async updateFollowUpTask(
    taskId: string,
    params: {
      status?: string;
      assignedStaffId?: string;
      notes?: string;
      dismissalReason?: string;
    },
  ): Promise<RetentionFollowUpTaskDto> {
    const res = await apiClient.patch<RetentionFollowUpTaskDto>(
      `/ai/retention/follow-ups/${taskId}`,
      params,
    );
    return res.data;
  }
}
