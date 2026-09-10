/**
 * FitCore — Day 44: AI Finance Assistant Shared Contracts
 *
 * Types, DTOs, Enums, and Structured Output definitions for
 * Authorised Financial Q&A, Financial Context, Grounding & Explanations.
 */

export type FinanceIntent =
  | 'REVENUE_SUMMARY'
  | 'REVENUE_COMPARISON'
  | 'MEMBERSHIP_REVENUE'
  | 'OUTLET_REVENUE'
  | 'PLAN_REVENUE'
  | 'PAYMENT_SUMMARY'
  | 'PAYMENT_FAILURES'
  | 'INVOICE_SUMMARY'
  | 'OUTSTANDING_BALANCE'
  | 'REFUNDS'
  | 'RECURRING_BILLING'
  | 'COLLECTION'
  | 'RECOVERY'
  | 'DUNNING'
  | 'ACCOUNTING_SYNC'
  | 'RECONCILIATION'
  | 'FINANCIAL_TREND'
  | 'FINANCIAL_HEALTH'
  | 'METRIC_DEFINITION'
  | 'OTHER';

export type FinanceComparisonDirection =
  | 'UP'
  | 'DOWN'
  | 'UNCHANGED'
  | 'NOT_COMPARABLE';

export type FinanceDataQualityRating =
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'INSUFFICIENT_DATA';

export type FinancialHealthDimensionState =
  | 'GOOD'
  | 'STABLE'
  | 'WATCH'
  | 'ATTENTION_REQUIRED'
  | 'INSUFFICIENT_DATA';

export type FinanceFeedbackRating =
  | 'HELPFUL'
  | 'NOT_HELPFUL'
  | 'INACCURATE'
  | 'MISSING_INFO'
  | 'WRONG_CALCULATION'
  | 'WRONG_INTERPRETATION'
  | 'PERMISSION_CONCERN';

export interface FinanceQuery {
  intent: FinanceIntent;
  organisationId: string;
  outletId?: string;
  startDate?: string;
  endDate?: string;
  comparisonStartDate?: string;
  comparisonEndDate?: string;
  currency?: string;
  membershipPlanId?: string;
  confidence: number;
}

export interface FinanceFact {
  metric: string;
  value: string | number;
  period?: string;
  currency?: string;
  source: string;
}

export interface FinanceComparison {
  metric: string;
  currentValue: number;
  comparisonValue: number;
  difference: number;
  percentageDifference?: number | null;
  direction: FinanceComparisonDirection;
  dataWindow?: {
    start: string;
    end: string;
  };
  currency?: string;
  denominator?: number;
  dataQuality?: FinanceDataQualityRating;
}

export interface FinanceRecommendation {
  recommendation: string;
  reason: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface FinanceAssistantResponse {
  conversationId?: string;
  messageId?: string;
  isGrounded?: boolean;
  answer: string;
  summary?: string;
  facts: FinanceFact[];
  comparisons?: FinanceComparison[];
  observations?: string[];
  possibleExplanations?: string[];
  recommendations?: FinanceRecommendation[];
  dataWindow: {
    start: string;
    end: string;
    timezone: string;
  };
  currency?: string;
  dataQuality: FinanceDataQualityRating;
  limitations?: string[];
  sources: Array<{
    tool: string;
    metric: string;
  }>;
  confidence: number;
}

export interface FinanceConversationDto {
  id: string;
  organisationId: string;
  outletId?: string | null;
  userId: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  metadata?: Record<string, any> | null;
}

export interface FinanceMessageDto {
  id: string;
  conversationId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  structuredResponse?: FinanceAssistantResponse | null;
  sources?: Array<{ tool: string; metric: string }> | null;
  dataQuality?: string | null;
  tokens?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  } | null;
  createdAt: string;
}

export interface FinanceFeedbackDto {
  id: string;
  organisationId: string;
  userId: string;
  conversationId?: string | null;
  messageId?: string | null;
  rating: FinanceFeedbackRating;
  comment?: string | null;
  modelId?: string | null;
  promptVersion?: string | null;
  createdAt: string;
}

export interface SubmitFinanceFeedbackDto {
  conversationId?: string;
  messageId?: string;
  rating: FinanceFeedbackRating;
  comment?: string;
  accuracyScore?: number;
  userComments?: string;
}

export interface FinanceChatRequestDto {
  query: string;
  conversationId?: string;
  outletId?: string;
  currency?: string;
  startDate?: string;
  endDate?: string;
  language?: 'en' | 'ne';
}

export interface FinancialHealthSummaryDto {
  organisationId: string;
  evaluatedAt: string;
  overallHealth: FinancialHealthDimensionState;
  dimensions: {
    revenueTrend: FinancialHealthDimensionState;
    collectionHealth: FinancialHealthDimensionState;
    paymentFailureHealth: FinancialHealthDimensionState;
    overdueInvoiceHealth: FinancialHealthDimensionState;
    recurringBillingHealth: FinancialHealthDimensionState;
    refundActivity: FinancialHealthDimensionState;
    accountingSyncHealth: FinancialHealthDimensionState;
    reconciliationHealth: FinancialHealthDimensionState;
    dataQuality: FinancialHealthDimensionState;
  };
  summary: string;
  observations: string[];
  recommendations: FinanceRecommendation[];
}
