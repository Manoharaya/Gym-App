import { apiClient } from '../../../services/api';
import type {
  AIFeature,
  AIFeedbackRating,
  AIUsageSummary,
  AIFeatureConfigurationDto,
} from '@fitcore/types';

export interface AITestRequest {
  prompt: string;
  feature?: AIFeature;
  modelId?: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  expectedSchema?: Record<string, any>;
}

export interface AITestResponse {
  requestId: string;
  responseId: string;
  content: string;
  structuredOutput?: any;
  model: string;
  provider: string;
  latencyMs: number;
  tokens: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cached?: boolean;
}

export const aiService = {
  /**
   * Execute test prompt through the centralized gateway
   */
  async executeTestPrompt(dto: AITestRequest): Promise<AITestResponse> {
    const res = await apiClient.post<AITestResponse>('/ai/test', dto);
    return res.data;
  },

  /**
   * Fetch active features and status
   */
  async getFeatures(): Promise<AIFeatureConfigurationDto[]> {
    const res = await apiClient.get<AIFeatureConfigurationDto[]>('/ai/features');
    return res.data;
  },

  /**
   * Fetch usage statistics
   */
  async getUsage(): Promise<AIUsageSummary> {
    const res = await apiClient.get<AIUsageSummary>('/ai/usage');
    return res.data;
  },

  /**
   * Submit feedback on AI response
   */
  async submitFeedback(aiResponseId: string, rating: AIFeedbackRating, reason?: string, comment?: string): Promise<any> {
    const res = await apiClient.post('/ai/feedback', {
      aiResponseId,
      rating,
      reason,
      comment,
    });
    return res.data;
  },

  /**
   * Check gateway provider health
   */
  async getHealth(): Promise<{
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    providers: Record<string, 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE'>;
    timestamp: string;
  }> {
    const res = await apiClient.get<{
      status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
      providers: Record<string, 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE'>;
      timestamp: string;
    }>('/ai/health');
    return res.data;
  },

  /**
   * Confirm and execute an action token
   */
  async confirmAction(actionToken: string, confirmed: boolean): Promise<any> {
    const res = await apiClient.post('/ai/actions/confirm', {
      actionToken,
      confirmed,
    });
    return res.data;
  },
};
