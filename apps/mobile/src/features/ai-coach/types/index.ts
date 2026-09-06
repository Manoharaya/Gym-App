/**
 * AI Fitness Coach Types
 * Orchestrates generative advice through backend FitCore AI gateway.
 */

export interface AiCoachState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}
