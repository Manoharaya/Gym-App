/**
 * Day 36 — AI Sales Agent Foundation Domain Types & Contracts
 */

export type SalesStyle =
  | 'PROFESSIONAL'
  | 'FRIENDLY'
  | 'CONSULTATIVE'
  | 'PREMIUM'
  | 'ENERGETIC'
  | 'CONCISE';

export type SalesChannel = 'WEB' | 'WHATSAPP' | 'SMS' | 'EMAIL' | 'VOICE';

export type SalesConversationStatus =
  | 'ACTIVE'
  | 'QUALIFYING'
  | 'RECOMMENDING'
  | 'AWAITING_CUSTOMER'
  | 'HANDED_OFF'
  | 'CONVERTED'
  | 'LOST'
  | 'ABANDONED'
  | 'FAILED'
  | 'COMPLETED';

export type SalesIntent =
  | 'MEMBERSHIP_INQUIRY'
  | 'PRICING_INQUIRY'
  | 'CLASS_INQUIRY'
  | 'PERSONAL_TRAINING'
  | 'TRAINER_INQUIRY'
  | 'FACILITY_INQUIRY'
  | 'TRIAL_INQUIRY'
  | 'TOUR_REQUEST'
  | 'BOOKING_INTEREST'
  | 'MEMBERSHIP_RECOMMENDATION'
  | 'SCHEDULE_INQUIRY'
  | 'LOCATION_INQUIRY'
  | 'PROMOTION_INQUIRY'
  | 'EXISTING_MEMBER_REQUEST'
  | 'GENERAL_SALES'
  | 'HUMAN_REQUEST'
  | 'OTHER';

export type SalesRecommendationType =
  | 'MEMBERSHIP_PLAN'
  | 'PERSONAL_TRAINING'
  | 'CLASS'
  | 'TRIAL'
  | 'TOUR'
  | 'CALLBACK'
  | 'HUMAN_CONSULTATION'
  | 'NO_RECOMMENDATION';

export type SalesNextActionType =
  | 'BOOK_TRIAL'
  | 'BOOK_TOUR'
  | 'BOOK_CLASS'
  | 'REQUEST_CALLBACK'
  | 'CONNECT_WITH_STAFF'
  | 'VIEW_MEMBERSHIP_OPTIONS'
  | 'CONTINUE_QUALIFICATION'
  | 'NO_ACTION';

export type SalesNextActionStatus =
  | 'RECOMMENDED'
  | 'PRESENTED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXECUTED'
  | 'FAILED';

export type SalesHandoffReason =
  | 'CUSTOMER_REQUESTED_HUMAN'
  | 'COMPLEX_PRICING'
  | 'CUSTOM_REQUEST'
  | 'COMPLAINT'
  | 'UNAVAILABLE_INFORMATION'
  | 'HIGH_VALUE_PROSPECT'
  | 'MEDICAL_CONCERN'
  | 'POLICY_EXCEPTION'
  | 'FAILED_AI_INTERACTION'
  | 'NEGOTIATION_REQUEST'
  | 'OTHER';

export type SalesHandoffPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type SalesHandoffStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED';

export interface SalesDiscoverySchedule {
  preferredDays?: string[];
  preferredTime?: string;
  frequency?: string;
  scheduleFlexibility?: string;
}

export interface SalesAgentProfileDto {
  id: string;
  organisationId: string;
  outletId?: string | null;
  name: string;
  displayName: string;
  enabled: boolean;
  language: string;
  tone: string;
  salesStyle: SalesStyle;
  businessDescription?: string | null;
  targetAudience?: string | null;
  defaultGreeting?: string | null;
  qualificationEnabled: boolean;
  recommendationEnabled: boolean;
  humanHandoffEnabled: boolean;
  metadata?: Record<string, any> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateSalesAgentProfileDto {
  outletId?: string;
  name: string;
  displayName: string;
  enabled?: boolean;
  language?: string;
  tone?: string;
  salesStyle?: SalesStyle;
  businessDescription?: string;
  targetAudience?: string;
  defaultGreeting?: string;
  qualificationEnabled?: boolean;
  recommendationEnabled?: boolean;
  humanHandoffEnabled?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateSalesAgentProfileDto {
  name?: string;
  displayName?: string;
  enabled?: boolean;
  language?: string;
  tone?: string;
  salesStyle?: SalesStyle;
  businessDescription?: string;
  targetAudience?: string;
  defaultGreeting?: string;
  qualificationEnabled?: boolean;
  recommendationEnabled?: boolean;
  humanHandoffEnabled?: boolean;
  metadata?: Record<string, any>;
}

export interface CreateSalesConversationDto {
  outletId?: string;
  leadId?: string;
  channel?: SalesChannel;
  initialMessage?: string;
  language?: string;
  contactDetails?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  metadata?: Record<string, any>;
}

export interface SalesConversationMessageDto {
  id: string;
  conversationId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  role: 'CUSTOMER' | 'AI' | 'SYSTEM' | 'STAFF';
  content: string;
  language: string;
  intent?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date | string;
}

export interface SalesRecommendationDto {
  id: string;
  conversationId: string;
  organisationId: string;
  outletId?: string | null;
  leadId?: string | null;
  recommendationType: SalesRecommendationType;
  recommendedPlanId?: string | null;
  recommendedPlanName?: string | null;
  recommendedService?: string | null;
  reason: string;
  supportingFactors: string[];
  limitations: string[];
  confidence: number;
  nextBestAction: SalesNextActionType;
  requiresHumanReview: boolean;
  metadata?: Record<string, any> | null;
  createdAt: Date | string;
}

export interface SalesNextActionDto {
  id: string;
  conversationId: string;
  organisationId: string;
  outletId?: string | null;
  leadId?: string | null;
  actionType: SalesNextActionType;
  status: SalesNextActionStatus;
  reason?: string | null;
  payload?: Record<string, any> | null;
  executedAt?: Date | string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date | string;
}

export interface SalesHandoffDto {
  id: string;
  conversationId: string;
  organisationId: string;
  outletId?: string | null;
  leadId: string;
  reason: SalesHandoffReason;
  priority: SalesHandoffPriority;
  status: SalesHandoffStatus;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  notes?: string | null;
  customerSummary?: string | null;
  resolvedAt?: Date | string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SalesConversationDto {
  id: string;
  organisationId: string;
  outletId?: string | null;
  salesAgentProfileId?: string | null;
  leadId: string;
  channel: SalesChannel;
  status: SalesConversationStatus;
  currentIntent?: SalesIntent | null;
  conversationSummary?: string | null;
  discoveredGoals?: string[] | null;
  discoveredExperience?: string | null;
  discoveredSchedule?: SalesDiscoverySchedule | null;
  discoveredBudget?: string | null;
  discoveredReadiness?: string | null;
  discoveredServiceInterest?: string[] | null;
  lastActivityAt: Date | string;
  startedAt: Date | string;
  completedAt?: Date | string | null;
  metadata?: Record<string, any> | null;
  messages?: SalesConversationMessageDto[];
  recommendations?: SalesRecommendationDto[];
  nextActions?: SalesNextActionDto[];
  handoffs?: SalesHandoffDto[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SalesMessageInputDto {
  message: string;
  channel?: SalesChannel;
  language?: string;
  metadata?: Record<string, any>;
}

export interface SalesMessageResponseDto {
  conversationId: string;
  reply: string;
  language: string;
  intent: SalesIntent;
  confidence: number;
  recommendations: SalesRecommendationDto[];
  suggestedNextActions: SalesNextActionDto[];
  handoffRequired: boolean;
  handoff?: SalesHandoffDto | null;
  qualificationStatus?: string;
  discoveredContext?: {
    goals?: string[];
    experience?: string;
    schedule?: SalesDiscoverySchedule;
    readiness?: string;
    budget?: string;
    serviceInterest?: string[];
  };
}

export interface SalesHandoffInputDto {
  reason: SalesHandoffReason;
  priority?: SalesHandoffPriority;
  notes?: string;
  assignedStaffId?: string;
}

export interface SalesFeedbackInputDto {
  rating: 'THUMBS_UP' | 'THUMBS_DOWN';
  category?: string;
  comment?: string;
}

export interface SalesDashboardMetricsDto {
  activeConversations: number;
  newLeads: number;
  qualifiedLeads: number;
  highIntentLeads: number;
  pendingHandoffs: number;
  trialRequests: number;
  tourRequests: number;
  unresolvedConversations: number;
  conversationsByStatus: Record<string, number>;
  conversationsByIntent: Record<string, number>;
}

export interface StaffLeadSummaryDto {
  leadId: string;
  organisationId: string;
  outletId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  status: string;
  score: number;
  qualificationStatus: string;
  discoveredNeeds: {
    goals: string[];
    experience?: string | null;
    schedule?: SalesDiscoverySchedule | null;
    budget?: string | null;
    readiness?: string | null;
    serviceInterest?: string[];
  };
  recommendedPlan?: {
    id: string;
    name: string;
    price: number;
    currency: string;
    billingPeriod: string;
    reason: string;
    supportingFactors: string[];
    limitations: string[];
  } | null;
  nextBestAction?: {
    actionType: SalesNextActionType;
    status: SalesNextActionStatus;
    reason?: string | null;
  } | null;
  latestConversationSummary?: string | null;
  assignedStaffId?: string | null;
  lastInteractionAt?: Date | string | null;
}

export interface SalesAIContext {
  organisationId: string;
  outletId?: string;
  leadId: string;
  conversationId: string;
  currentIntent?: SalesIntent;
  discoveredGoals?: string[];
  discoveredExperience?: string;
  discoveredSchedule?: SalesDiscoverySchedule;
  discoveredBudget?: string;
  discoveredReadiness?: string;
  discoveredServiceInterest?: string[];
  verifiedBusinessInfo?: {
    name: string;
    country: string;
    currency: string;
    timezone: string;
    operatingHours?: any;
    facilities?: string[];
    policies?: string[];
  };
  verifiedMembershipPlans?: Array<{
    id: string;
    name: string;
    price: number;
    currency: string;
    durationValue: number;
    durationUnit: string;
    membershipType: string;
    description?: string | null;
    entitlements: string[];
    isPublic: boolean;
  }>;
  verifiedClasses?: Array<{
    id: string;
    name: string;
    category?: string;
    description?: string;
    durationMinutes?: number;
  }>;
  verifiedTrainers?: Array<{
    id: string;
    displayName: string;
    specialties?: string[];
    bio?: string;
  }>;
  availableNextSteps?: SalesNextActionType[];
  previousInteractions?: Array<{
    role: string;
    content: string;
    createdAt?: Date | string;
  }>;
}
