import { apiClient } from '../../../services/api';
import type {
  AINutritionCoachProfileDto,
  AINutritionCoachConversationDto,
  NutritionCoachResponse,
  ParsedFoodLogProposal,
  AIFeedbackRating,
} from '@fitcore/types';

export interface SendNutritionMessageRequest {
  content: string;
  includeTrainingContext?: boolean;
  conversationId?: string;
}

export interface SendNutritionMessageResponse {
  userMessageId: string;
  assistantMessageId: string;
  response: NutritionCoachResponse;
}

export interface TodayNutritionSummaryResponse {
  date: string;
  summary: {
    calories: { consumed: number; target: number; adherencePct: number };
    protein: { consumed: number; target: number; adherencePct: number };
    carbohydrates: { consumed: number; target: number; adherencePct: number };
    fat: { consumed: number; target: number; adherencePct: number };
    water: { consumed: number; target: number; adherencePct: number };
  };
  insights: string[];
  adherenceMessage: string;
}

export const nutritionCoachService = {
  /**
   * Get or initialize member coaching profile preferences
   */
  async getProfile(): Promise<AINutritionCoachProfileDto> {
    const res = await apiClient.get<AINutritionCoachProfileDto>('/ai/nutrition/profile');
    return res.data;
  },

  /**
   * Update member coaching profile preferences
   */
  async updateProfile(dto: Partial<AINutritionCoachProfileDto>): Promise<AINutritionCoachProfileDto> {
    const res = await apiClient.put<AINutritionCoachProfileDto>('/ai/nutrition/profile', dto);
    return res.data;
  },

  /**
   * List all conversations for the authenticated member
   */
  async listConversations(status?: string): Promise<{ data: AINutritionCoachConversationDto[]; total: number }> {
    const res = await apiClient.get<{ data: AINutritionCoachConversationDto[]; total: number }>(
      '/ai/nutrition/conversations',
      { params: { status } },
    );
    return res.data;
  },

  /**
   * Create a new conversation session
   */
  async createConversation(title?: string): Promise<AINutritionCoachConversationDto> {
    const res = await apiClient.post<AINutritionCoachConversationDto>('/ai/nutrition/conversations', {
      title,
    });
    return res.data;
  },

  /**
   * Get conversation details with messages
   */
  async getConversation(conversationId: string): Promise<AINutritionCoachConversationDto> {
    const res = await apiClient.get<AINutritionCoachConversationDto>(
      `/ai/nutrition/conversations/${conversationId}`,
    );
    return res.data;
  },

  /**
   * Send a message to the AI Nutrition Coach
   */
  async sendMessage(
    conversationId: string,
    dto: SendNutritionMessageRequest,
  ): Promise<SendNutritionMessageResponse> {
    const res = await apiClient.post<SendNutritionMessageResponse>(
      `/ai/nutrition/conversations/${conversationId}/messages`,
      dto,
    );
    return res.data;
  },

  /**
   * Quick chat with AI Nutrition Coach
   */
  async chat(dto: SendNutritionMessageRequest): Promise<SendNutritionMessageResponse> {
    const res = await apiClient.post<SendNutritionMessageResponse>('/ai/nutrition/chat', dto);
    return res.data;
  },

  /**
   * Soft-delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(
      `/ai/nutrition/conversations/${conversationId}`,
    );
    return res.data;
  },

  /**
   * Fetch today's structured nutrition summary with AI interpretation
   */
  async getTodaySummary(): Promise<TodayNutritionSummaryResponse> {
    const res = await apiClient.get<TodayNutritionSummaryResponse>('/ai/nutrition/summary/today');
    return res.data;
  },

  /**
   * Parse natural language meal text into a structured proposal
   */
  async parseFoodLog(text: string, mealType?: string): Promise<ParsedFoodLogProposal> {
    const res = await apiClient.post<ParsedFoodLogProposal>('/ai/nutrition/food-log/parse', {
      text,
      mealType,
    });
    return res.data;
  },

  /**
   * Get transparent context preview
   */
  async getContextPreview(): Promise<any> {
    const res = await apiClient.get('/ai/nutrition/context/preview');
    return res.data;
  },

  /**
   * Submit feedback for an AI response
   */
  async submitFeedback(
    rating: AIFeedbackRating,
    messageId?: string,
    reason?: string,
    comment?: string,
  ): Promise<any> {
    const res = await apiClient.post('/ai/nutrition/feedback', {
      messageId,
      rating,
      reason,
      comment,
    });
    return res.data;
  },
};
