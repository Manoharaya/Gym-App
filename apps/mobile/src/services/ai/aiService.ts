import type { AICreditBalance, AIConversation, AIRequest, AIResponse } from '@fitcore/types';
import { apiClient } from '../api';
import { logger } from '../logging';

/**
 * FitCore AI Service Abstraction
 *
 * CRITICAL ARCHITECTURAL RULE:
 * Never call OpenAI, Claude, or Gemini directly from the mobile app.
 * All requests route through the FitCore backend AI Orchestration Service.
 */
export class AIService {
  public async sendMessage(request: AIRequest): Promise<AIResponse> {
    logger.info('Dispatching AI coach query through FitCore API');
    const response = await apiClient.post<AIResponse>('/ai/chat', request);
    return response.data;
  }

  public async getConversations(): Promise<AIConversation[]> {
    logger.debug('Fetching AI coaching conversations');
    const response = await apiClient.get<AIConversation[]>('/ai/conversations');
    return response.data;
  }

  public async getCreditBalance(): Promise<AICreditBalance> {
    logger.debug('Fetching AI credit balance');
    const response = await apiClient.get<AICreditBalance>('/ai/credits');
    return response.data;
  }
}

export const aiService = new AIService();
