/**
 * FitCore AI Architecture Contracts
 *
 * Mobile -> FitCore API -> AI Orchestration Service -> LLM Provider
 * Never call LLMs directly from client code.
 */

export type AIProvider = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'INTERNAL_ORCHESTRATOR';

export type AIMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AIMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AIConversation {
  id: string;
  userId: string;
  organisationId: string;
  outletId?: string;
  title: string;
  category: 'WORKOUT_COACH' | 'NUTRITION_COACH' | 'RECOVERY_ADVISOR' | 'GENERAL_FITNESS';
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AIRequest {
  conversationId?: string;
  message: string;
  contextScope?: {
    includeRecentWorkouts?: boolean;
    includeHealthMetrics?: boolean;
    includeInjuries?: boolean;
    includeDietaryPreferences?: boolean;
  };
}

export interface AIResponse {
  conversationId: string;
  message: AIMessage;
  suggestedActions?: Array<{
    type: 'LOG_WORKOUT' | 'ADJUST_CALORIES' | 'SCHEDULE_CHECKIN' | 'BOOK_TRAINER';
    title: string;
    payload?: Record<string, unknown>;
  }>;
  usage: AIUsage;
}

export interface AIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  creditsConsumed: number;
}

export interface AICreditBalance {
  organisationId: string;
  userId: string;
  availableCredits: number;
  monthlyQuota: number;
  consumedThisCycle: number;
  resetDate: string;
}
