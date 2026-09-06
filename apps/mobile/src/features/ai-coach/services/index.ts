/**
 * AI Fitness Coach Service
 * Strict boundary: routes through FitCore ApiClient, never calling raw fetch or external LLMs.
 */

import { apiClient } from '../../../services/api';

export class AiCoachService {
  // TODO: Implement domain-specific endpoints in feature milestone
  static async getStatus(): Promise<{ enabled: boolean }> {
    const res = await apiClient.get<{ enabled: boolean }>('/features/ai-coach/status');
    return res.data;
  }
}
