/**
 * FitCore AI Architecture Contracts & Domain Models (Day 19)
 *
 * Centralized AI Platform:
 * Future AI Feature -> AI Application Service -> AI Orchestrator -> AI Context Engine
 * -> Safety / Permission / Privacy -> Prompt Registry -> Model Gateway -> Provider Adapter
 *
 * Direct calls to external LLMs (OpenAI, Anthropic, Gemini) are strictly prohibited.
 */

export type AIProvider = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'DEVELOPMENT';

export type AIFeature =
  | 'AI_PLATFORM_TEST'
  | 'FITNESS_COACH'
  | 'NUTRITION_COACH'
  | 'DAILY_CHECKIN'
  | 'WEARABLE_INTELLIGENCE'
  | 'ENGAGEMENT_INTELLIGENCE'
  | 'RETENTION_INTELLIGENCE'
  | 'AI_REACTIVATION'
  | 'RETENTION_AGENT'
  | 'PROGRESS_INSIGHTS'
  | 'ENGAGEMENT_ASSISTANT'
  | 'RECEPTIONIST'
  | 'RECEPTIONIST_BOOKING'
  | 'AI_LEAD_QUALIFICATION'
  | 'AI_RECEPTIONIST_VOICE'
  | 'SALES_AGENT'
  | 'MARKETING_ASSISTANT'
  | 'CHURN_INTELLIGENCE'
  | 'AUTOMATION_ASSISTANT';

export type AIModelCapability =
  | 'TEXT_GENERATION'
  | 'STRUCTURED_OUTPUT'
  | 'VISION'
  | 'TOOL_USE'
  | 'LONG_CONTEXT'
  | 'EMBEDDING';

export type AIModelStatus = 'ACTIVE' | 'INACTIVE' | 'DEPRECATED';

export type AIRequestStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'BLOCKED'
  | 'TIMED_OUT';

export type AIRequestType = 'SYNC' | 'ASYNC';

export type AIContextSource =
  | 'MEMBER_PROFILE'
  | 'MEMBERSHIP'
  | 'TRAINING'
  | 'PROGRESS'
  | 'NUTRITION'
  | 'ENGAGEMENT'
  | 'BOOKING'
  | 'ATTENDANCE'
  | 'WEARABLE_HEALTH_DATA';

export type SensitivityLevel =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'PERSONAL'
  | 'SENSITIVE'
  | 'HIGHLY_SENSITIVE';

export type SafetyDecision =
  | 'ALLOW'
  | 'BLOCK'
  | 'REDACT'
  | 'REQUIRE_CONFIRMATION'
  | 'ESCALATE';

export type AIPromptStatus = 'DRAFT' | 'TESTING' | 'ACTIVE' | 'ARCHIVED';

export type AIToolType = 'READ_TOOL' | 'WRITE_TOOL';

export type AIAuditEventType =
  | 'AI_REQUEST_CREATED'
  | 'AI_REQUEST_BLOCKED'
  | 'AI_REQUEST_STARTED'
  | 'AI_REQUEST_COMPLETED'
  | 'AI_REQUEST_FAILED'
  | 'AI_RESPONSE_REJECTED'
  | 'AI_TOOL_REQUESTED'
  | 'AI_TOOL_EXECUTED'
  | 'AI_USAGE_RECORDED'
  | 'AI_MODEL_FALLBACK'
  | 'AI_CONFIGURATION_CHANGED'
  | 'AI_PROMPT_PUBLISHED'
  | 'FITNESS_COACH_REQUESTED'
  | 'FITNESS_COACH_COMPLETED'
  | 'FITNESS_COACH_BLOCKED'
  | 'FITNESS_COACH_FAILED'
  | 'FITNESS_COACH_SAFETY_ESCALATION'
  | 'FITNESS_COACH_FEEDBACK_RECEIVED'
  | 'FITNESS_COACH_TOOL_USED'
  | 'AI_NUTRITION_REQUESTED'
  | 'AI_NUTRITION_RESPONSE_GENERATED'
  | 'AI_NUTRITION_SUGGESTION_GENERATED'
  | 'AI_NUTRITION_FEEDBACK_SUBMITTED'
  | 'AI_FOOD_LOG_PROPOSAL_CREATED'
  | 'AI_NUTRITION_SAFETY_BLOCK'
  | 'AI_NUTRITION_ESCALATION'
  | 'AI_NUTRITION_CONTEXT_ACCESSED'
  | 'NUTRITION_COACH_REQUESTED'
  | 'NUTRITION_COACH_COMPLETED'
  | 'NUTRITION_COACH_BLOCKED'
  | 'NUTRITION_COACH_FAILED'
  | 'NUTRITION_COACH_SAFETY_ESCALATION'
  | 'NUTRITION_COACH_FEEDBACK_RECEIVED'
  | 'NUTRITION_COACH_TOOL_USED'
  | 'DAILY_CHECKIN_STARTED'
  | 'DAILY_CHECKIN_COMPLETED'
  | 'DAILY_CHECKIN_AI_GENERATED'
  | 'DAILY_CHECKIN_AI_FAILED'
  | 'DAILY_CHECKIN_SAFETY_TRIGGERED'
  | 'DAILY_CHECKIN_FEEDBACK_SUBMITTED'
  | 'DAILY_CHECKIN_TOOL_USED';

export type AIFeedbackRating = 'HELPFUL' | 'NOT_HELPFUL' | 'REPORT';

export type AIErrorCode =
  | 'AI_FEATURE_DISABLED'
  | 'AI_PERMISSION_DENIED'
  | 'AI_CONTEXT_DENIED'
  | 'AI_RATE_LIMITED'
  | 'AI_USAGE_LIMIT_REACHED'
  | 'AI_SAFETY_BLOCKED'
  | 'AI_PROVIDER_UNAVAILABLE'
  | 'AI_MODEL_UNAVAILABLE'
  | 'AI_TIMEOUT'
  | 'AI_RESPONSE_INVALID'
  | 'AI_ACTION_REQUIRES_CONFIRMATION';

export type AIMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AIMessage {
  role: AIMessageRole;
  content: string;
  name?: string;
}

export interface AIProviderRequest {
  model: string;
  messages: AIMessage[];
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  outputSchema?: Record<string, any>;
  tools?: any[];
  metadata?: Record<string, any>;
}

export interface AIProviderResponse {
  provider: string;
  model: string;
  content: string;
  structuredOutput?: any;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  finishReason?: string;
  latencyMs: number;
  providerRequestId?: string;
}

export interface AIModelDefinition {
  id: string;
  provider: AIProvider;
  modelKey: string;
  displayName: string;
  capabilities: AIModelCapability[];
  contextWindow: number;
  inputCostPer1M: number;  // In minor units (cents) per 1M tokens
  outputCostPer1M: number; // In minor units (cents) per 1M tokens
  status: AIModelStatus;
  configuration?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface AIFeatureConfigurationDto {
  id?: string;
  organisationId: string;
  outletId?: string | null;
  feature: AIFeature;
  enabled: boolean;
  modelId?: string | null;
  dailyLimit?: number;
  monthlyLimit?: number;
  allowedRoles: string[];
  configuration?: Record<string, any>;
}

/**
 * Controlled context contract (Slice 11)
 * Never exposes raw PAR-Q, medical notes, credentials, or payment info.
 */
export interface MemberAIContext {
  identity: {
    memberId: string;
    firstName?: string;
    gender?: string;
    age?: number;
  };
  membership: {
    status: string;
    plan?: string;
    expiryDate?: string;
  };
  training: {
    activeProgram?: any;
    recentWorkouts: any[];
    upcomingSessions: any[];
  };
  progress: {
    goals: any[];
    recentProgress: any[];
  };
  nutrition: {
    targets?: any;
    recentSummary?: any;
  };
  engagement: {
    recentActivity: any[];
    streak?: number;
    engagementLevel?: string;
    points?: number;
  };
  wearables?: {
    connectedProviders: string[];
    todayActivity?: {
      steps: number;
      activeCaloriesKcal: number;
      distanceKm: number;
      restingHeartRateBpm?: number | null;
    };
    weeklyAverages?: {
      avgDailySteps: number;
      avgDailyCaloriesKcal: number;
      avgSleepMinutes?: number | null;
      workoutCount: number;
    };
  };
}

export interface AIToolContext {
  organisationId: string;
  outletId?: string | null;
  userId: string;
  memberId?: string | null;
  userRole: string;
}

export interface AITool {
  name: string;
  description: string;
  toolType: AIToolType;
  requiresConfirmation?: boolean;
  inputSchema: Record<string, any>;
  execute(input: any, context: AIToolContext): Promise<any>;
}

export interface AIAuditLogEntry {
  organisationId: string;
  outletId?: string | null;
  userId: string;
  feature: AIFeature;
  requestId?: string | null;
  eventType: AIAuditEventType;
  result: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  metadata?: Record<string, any>;
}

export interface AIFeedbackDto {
  aiResponseId: string;
  rating: AIFeedbackRating;
  reason?: string;
  comment?: string;
}

export interface AIUsageSummary {
  organisationId: string;
  feature?: AIFeature;
  totalRequests: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostCents: number;
}

// ============================================================================
// Legacy Mobile Compatibility Types (Day 1)
// ============================================================================

export interface AIMessageLegacy {
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
  messages: AIMessageLegacy[];
  createdAt: string;
  updatedAt: string;
}

export interface AIRequestLegacy {
  conversationId?: string;
  message: string;
  contextScope?: {
    includeRecentWorkouts?: boolean;
    includeHealthMetrics?: boolean;
    includeInjuries?: boolean;
    includeDietaryPreferences?: boolean;
  };
}

export interface AIResponseLegacy {
  conversationId: string;
  message: AIMessageLegacy;
  suggestedActions?: Array<{
    type: 'LOG_WORKOUT' | 'ADJUST_CALORIES' | 'SCHEDULE_CHECKIN' | 'BOOK_TRAINER';
    title: string;
    payload?: Record<string, unknown>;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    creditsConsumed: number;
  };
}

export interface AICreditBalance {
  organisationId: string;
  userId: string;
  availableCredits: number;
  monthlyQuota: number;
  consumedThisCycle: number;
  resetDate: string;
}

export type AIRequest = AIRequestLegacy;
export type AIResponse = AIResponseLegacy;

// ============================================================================
// Day 20: AI Fitness Coach Contracts
// ============================================================================

export type FitnessCoachCoachingStyle =
  | 'ENCOURAGING'
  | 'DIRECT'
  | 'TECHNICAL'
  | 'BALANCED'
  | 'MOTIVATIONAL';

export type FitnessCoachResponseLength = 'CONCISE' | 'BALANCED' | 'DETAILED';

export type FitnessCoachTrainingFocus =
  | 'STRENGTH'
  | 'HYPERTROPHY'
  | 'ENDURANCE'
  | 'GENERAL_FITNESS'
  | 'FAT_LOSS'
  | 'MOBILITY';

export type FitnessRecommendationType =
  | 'TRAINING'
  | 'RECOVERY'
  | 'CONSISTENCY'
  | 'WORKOUT_EXECUTION'
  | 'GOAL_SETTING'
  | 'SCHEDULING'
  | 'PROGRESS_REVIEW'
  | 'GENERAL_FITNESS';

export type FitnessActionType =
  | 'VIEW_WORKOUT'
  | 'VIEW_PROGRESS'
  | 'VIEW_GOAL'
  | 'VIEW_TRAINING_PLAN'
  | 'VIEW_BOOKING'
  | 'OPEN_CHALLENGE';

export interface FitnessInsight {
  type: string;
  title: string;
  description: string;
  confidence?: number;
}

export interface FitnessRecommendation {
  title: string;
  description: string;
  rationale?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  type: FitnessRecommendationType;
}

export interface FitnessAction {
  action: FitnessActionType;
  label: string;
  parameters?: Record<string, any>;
}

export interface FitnessCoachResponse {
  message: string;
  summary?: string;
  insights?: FitnessInsight[];
  recommendations?: FitnessRecommendation[];
  cautions?: string[];
  suggestedActions?: FitnessAction[];
  followUpQuestion?: string;
}

export type SafetyEscalationSeverity =
  | 'NONE'
  | 'CAUTION'
  | 'RECOMMEND_PROFESSIONAL'
  | 'URGENT_ESCALATION';

export type SafetyEscalationCategory =
  | 'INJURY'
  | 'MEDICAL_SYMPTOM'
  | 'CHEST_PAIN'
  | 'EXTREME_EXERCISE'
  | 'UNSAFE_WEIGHT_LOSS'
  | 'CONTRAINDICATION';

export interface AIFitnessCoachProfileDto {
  id?: string;
  organisationId: string;
  memberId: string;
  coachingStyle: FitnessCoachCoachingStyle;
  responseLength: FitnessCoachResponseLength;
  language: string;
  unitPreference: 'METRIC' | 'IMPERIAL';
  trainingFocus?: FitnessCoachTrainingFocus | null;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AIFitnessCoachMessageDto {
  id: string;
  conversationId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  structuredOutput?: FitnessCoachResponse | null;
  tokens?: number | null;
  latencyMs?: number | null;
  status: 'SENDING' | 'THINKING' | 'STREAMING' | 'COMPLETED' | 'FAILED' | 'BLOCKED';
  createdAt: string;
}

export interface AIFitnessCoachConversationDto {
  id: string;
  organisationId: string;
  memberId: string;
  title?: string | null;
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  contextSnapshot?: Record<string, any> | null;
  messages?: AIFitnessCoachMessageDto[];
  createdAt: string;
  updatedAt: string;
}

export interface AIFitnessConversationSummaryDto {
  id: string;
  conversationId: string;
  summary: string;
  keyTopics?: string[];
  model: string;
  promptVersion: number;
  version: number;
  generatedAt: string;
}

export interface AIFitnessSafetyEscalationDto {
  id: string;
  organisationId: string;
  memberId: string;
  conversationId?: string | null;
  severity: SafetyEscalationSeverity;
  category: SafetyEscalationCategory;
  triggerPhrase?: string | null;
  actionTaken: string;
  resolved: boolean;
  createdAt: string;
}

// ============================================================================
// Day 21: AI Nutrition Coach Contracts
// ============================================================================

export type NutritionCoachCoachingStyle =
  | 'SUPPORTIVE'
  | 'CONCISE'
  | 'EDUCATIONAL'
  | 'MOTIVATIONAL'
  | 'PRACTICAL';

export type NutritionCoachResponseLength = 'CONCISE' | 'BALANCED' | 'DETAILED';

export type NutritionRecommendationType =
  | 'MEAL_SUGGESTION'
  | 'FOOD_ALTERNATIVE'
  | 'HYDRATION'
  | 'MEAL_TIMING'
  | 'CONSISTENCY'
  | 'TARGET_EDUCATION'
  | 'LOGGING_GUIDANCE'
  | 'TRAINING_NUTRITION'
  | 'GENERAL_EDUCATION';

export type NutritionSafetyEscalationSeverity =
  | 'NONE'
  | 'CAUTION'
  | 'RECOMMEND_PROFESSIONAL'
  | 'URGENT_ESCALATION';

export type NutritionSafetyEscalationCategory =
  | 'EATING_DISORDER'
  | 'EXTREME_RESTRICTION'
  | 'DANGEROUS_FASTING'
  | 'DEHYDRATION'
  | 'UNSAFE_SUPPLEMENT'
  | 'PERFORMANCE_ENHANCING_DRUG'
  | 'MEDICATION_INTERACTION'
  | 'DISEASE_TREATMENT'
  | 'MEDICAL_DIAGNOSIS'
  | 'ALLERGEN_VIOLATION'
  | 'SELF_HARM_RESTRICTION';

export interface NutritionInsight {
  type: string;
  title: string;
  description: string;
  confidence?: number;
}

export interface NutritionRecommendation {
  type: NutritionRecommendationType;
  title: string;
  description: string;
  rationale?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface MealSuggestion {
  name: string;
  ingredients: string[];
  estimatedCalories?: number;
  estimatedProtein?: number;
  estimatedCarbs?: number;
  estimatedFat?: number;
  whyItFits: string;
  allergySafetyNote?: string;
  isAiSuggestion: boolean;
}

export interface FoodAlternative {
  originalFood: string;
  substituteFood: string;
  reason: string;
  nutritionalComparison?: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  allergyWarning?: string;
}

export interface NutritionCoachResponse {
  answer: string;
  responseType: 'EXPLANATION' | 'SUGGESTION' | 'SUMMARY' | 'SAFETY_INTERVENTION' | 'EDUCATIONAL';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  groundedSources?: string[];
  recommendations?: NutritionRecommendation[];
  mealSuggestions?: MealSuggestion[];
  foodAlternatives?: FoodAlternative[];
  warnings?: string[];
  followUpQuestions?: string[];
  requiresProfessionalReview: boolean;
}

export interface ParsedFoodLogItem {
  foodName: string;
  quantity: number;
  unit: string;
  mealType: string;
  foodId?: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber?: number;
  confidence: number;
}

export interface ParsedFoodLogProposal {
  mealType: string;
  consumedAt?: string;
  items: ParsedFoodLogItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbohydrates: number;
  totalFat: number;
  requiresConfirmation: true;
  warning?: string;
}

export interface AINutritionCoachProfileDto {
  id?: string;
  organisationId: string;
  memberId: string;
  coachingStyle: NutritionCoachCoachingStyle;
  responseLength: NutritionCoachResponseLength;
  language: string;
  unitPreference: 'METRIC' | 'IMPERIAL';
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AINutritionCoachMessageDto {
  id: string;
  conversationId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  structuredOutput?: NutritionCoachResponse | null;
  tokens?: number | null;
  latencyMs?: number | null;
  status: 'SENDING' | 'THINKING' | 'STREAMING' | 'COMPLETED' | 'FAILED' | 'BLOCKED';
  createdAt: string;
}

export interface AINutritionCoachConversationDto {
  id: string;
  organisationId: string;
  memberId: string;
  title?: string | null;
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  contextSnapshot?: Record<string, any> | null;
  messages?: AINutritionCoachMessageDto[];
  createdAt: string;
  updatedAt: string;
}

export interface AINutritionConversationSummaryDto {
  id: string;
  conversationId: string;
  summary: string;
  keyTopics?: string[];
  model: string;
  promptVersion: number;
  version: number;
  generatedAt: string;
}

export interface AINutritionSafetyEscalationDto {
  id: string;
  organisationId: string;
  memberId: string;
  conversationId?: string | null;
  severity: NutritionSafetyEscalationSeverity;
  category: NutritionSafetyEscalationCategory;
  triggerPhrase?: string | null;
  actionTaken: string;
  resolved: boolean;
  createdAt: string;
}


