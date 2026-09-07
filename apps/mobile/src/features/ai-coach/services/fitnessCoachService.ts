import { apiClient } from '../../../services/api';
import type {
  AIFitnessCoachProfileDto,
  AIFitnessCoachConversationDto,
  FitnessCoachResponse,
  AIFeedbackRating,
} from '@fitcore/types';

export interface SendCoachMessageRequest {
  content: string;
  focusTopic?: string;
  includeNutritionContext?: boolean;
}

export interface SendCoachMessageResponse {
  userMessageId: string;
  assistantMessageId: string;
  response: FitnessCoachResponse;
}

export interface ContextSummaryResponse {
  coachingPreferences: {
    coachingStyle: string;
    responseLength: string;
    unitPreference: string;
    trainingFocus?: string;
  };
  training: {
    hasActivePlan: boolean;
    activePlanName: string | null;
    recentWorkoutsCount: number;
    hasTodayWorkout: boolean;
  };
  progress: {
    activeGoalsCount: number;
    goals: Array<{ title: string; category: string }>;
  };
  engagement: {
    streak: number;
    engagementLevel: string;
    totalVisits: number;
  };
  nutrition: {
    authorized: boolean;
    dailyCalories: number | null;
  };
  privacyNotice: string;
}

export const fitnessCoachService = {
  /**
   * Get or initialize the member coaching profile preferences
   */
  async getProfile(): Promise<AIFitnessCoachProfileDto> {
    const res = await apiClient.get<AIFitnessCoachProfileDto>('/ai/fitness-coach/profile');
    return res.data;
  },

  /**
   * Update member coaching profile preferences
   */
  async updateProfile(dto: Partial<AIFitnessCoachProfileDto>): Promise<AIFitnessCoachProfileDto> {
    const res = await apiClient.put<AIFitnessCoachProfileDto>('/ai/fitness-coach/profile', dto);
    return res.data;
  },

  /**
   * List all conversations for the member
   */
  async listConversations(status?: string): Promise<{ data: AIFitnessCoachConversationDto[]; total: number }> {
    const res = await apiClient.get<{ data: AIFitnessCoachConversationDto[]; total: number }>(
      '/ai/fitness-coach/conversations',
      { params: { status } },
    );
    return res.data;
  },

  /**
   * Create a new conversation
   */
  async createConversation(title?: string): Promise<AIFitnessCoachConversationDto> {
    const res = await apiClient.post<AIFitnessCoachConversationDto>('/ai/fitness-coach/conversations', {
      title,
    });
    return res.data;
  },

  /**
   * Get conversation details with messages
   */
  async getConversation(conversationId: string): Promise<AIFitnessCoachConversationDto> {
    const res = await apiClient.get<AIFitnessCoachConversationDto>(
      `/ai/fitness-coach/conversations/${conversationId}`,
    );
    return res.data;
  },

  /**
   * Send a prompt message to the coach
   */
  async sendMessage(
    conversationId: string,
    dto: SendCoachMessageRequest,
  ): Promise<SendCoachMessageResponse> {
    const res = await apiClient.post<SendCoachMessageResponse>(
      `/ai/fitness-coach/conversations/${conversationId}/messages`,
      dto,
    );
    return res.data;
  },

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(
      `/ai/fitness-coach/conversations/${conversationId}`,
    );
    return res.data;
  },

  /**
   * Fetch transparent context summary used by the AI
   */
  async getContextSummary(): Promise<ContextSummaryResponse> {
    const res = await apiClient.get<ContextSummaryResponse>('/ai/fitness-coach/context-summary');
    return res.data;
  },

  /**
   * Submit feedback on coaching response
   */
  async submitFeedback(
    rating: AIFeedbackRating,
    messageId?: string,
    reason?: string,
    comment?: string,
  ): Promise<any> {
    const res = await apiClient.post('/ai/fitness-coach/feedback', {
      messageId,
      rating,
      reason,
      comment,
    });
    return res.data;
  },
};
