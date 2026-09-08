/**
 * FitCore Day 31 — AI Receptionist Foundation Contracts & Types
 *
 * Core domain contracts for:
 * Omnichannel AI Receptionist -> Grounded Knowledge -> Controlled Tools -> Human Handoff
 */

export type ReceptionistTone = 'PROFESSIONAL' | 'FRIENDLY' | 'ENERGETIC' | 'PREMIUM' | 'CONCISE';

export type ReceptionistStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'DISABLED';

export type ReceptionistScope = 'ORGANISATION' | 'OUTLET';

export type ReceptionistKnowledgeType =
  | 'ORGANISATION_PROFILE'
  | 'OUTLET_PROFILE'
  | 'OPENING_HOURS'
  | 'HOLIDAY_HOURS'
  | 'MEMBERSHIP_PLAN'
  | 'CLASS_TYPE'
  | 'CLASS_POLICY'
  | 'TRAINER_PROFILE'
  | 'FACILITY'
  | 'AMENITY'
  | 'POLICY'
  | 'FAQ'
  | 'TRIAL_INFORMATION'
  | 'CONTACT_INFORMATION'
  | 'PARKING_INFORMATION'
  | 'BOOKING_POLICY'
  | 'CANCELLATION_POLICY'
  | 'GUEST_POLICY'
  | 'CUSTOM';

export type KnowledgeVisibility = 'PUBLIC' | 'CUSTOMER_VISIBLE' | 'STAFF_ONLY' | 'INTERNAL';

export type ConversationStatus = 'ACTIVE' | 'WAITING' | 'HANDOFF_REQUESTED' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';

export type ConversationChannel = 'WEB_CHAT' | 'MOBILE' | 'SMS' | 'WHATSAPP' | 'VOICE' | 'IN_APP';

export type MessageRole = 'CUSTOMER' | 'AI' | 'SYSTEM' | 'STAFF';

export type MessageContentType = 'TEXT' | 'STRUCTURED' | 'TOOL_RESULT' | 'HANDOFF' | 'SYSTEM_EVENT';

export type HandoffReason =
  | 'LOW_CONFIDENCE'
  | 'UNKNOWN_INFORMATION'
  | 'CUSTOMER_REQUESTED'
  | 'COMPLEX_REQUEST'
  | 'COMPLAINT'
  | 'SENSITIVE_REQUEST'
  | 'POLICY_EXCEPTION'
  | 'TOOL_FAILURE'
  | 'REPEATED_MISUNDERSTANDING';

export type HandoffStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

export type ReceptionistIntent =
  // Information Intents
  | 'GYM_INFORMATION'
  | 'OPENING_HOURS'
  | 'LOCATION'
  | 'FACILITIES'
  | 'MEMBERSHIP_INFORMATION'
  | 'MEMBERSHIP_PRICING'
  | 'CLASS_INFORMATION'
  | 'TRAINER_INFORMATION'
  | 'POLICY_INFORMATION'
  | 'TRIAL_INFORMATION'
  | 'CONTACT_INFORMATION'
  | 'PARKING_INFORMATION'
  | 'GUEST_INFORMATION'
  // Action Intents (Future / Controlled)
  | 'BOOKING'
  | 'CANCELLATION'
  | 'RESCHEDULE'
  | 'MEMBERSHIP_CHANGE'
  | 'LEAD_CAPTURE'
  | 'HUMAN_HANDOFF'
  // Day 32 Booking Discovery Intents
  | 'CLASS_SEARCH'
  | 'CLASS_AVAILABILITY'
  | 'TRAINER_AVAILABILITY'
  | 'SESSION_SEARCH'
  // Day 32 Booking Action Intents
  | 'BOOK_CLASS'
  | 'JOIN_WAITLIST'
  | 'VIEW_BOOKINGS'
  // Day 32 Booking Management Intents
  | 'CANCEL_BOOKING'
  | 'RESCHEDULE_BOOKING'
  | 'MODIFY_BOOKING'
  // Day 32 Booking Policy & Confirmation Intents
  | 'BOOKING_POLICY'
  | 'CANCELLATION_POLICY'
  | 'WAITLIST_POLICY'
  | 'BOOKING_CONFIRMATION'
  // General Conversational
  | 'GREETING'
  | 'THANKS'
  | 'GOODBYE'
  | 'UNKNOWN';

export interface AIReceptionistDto {
  id: string;
  organisationId: string;
  outletId?: string | null;
  name: string;
  displayName: string;
  type: string;
  status: ReceptionistStatus;
  language: string;
  tone: ReceptionistTone;
  greeting: string;
  timezone: string;
  knowledgeScope: ReceptionistScope;
  escalationEnabled: boolean;
  humanHandoffEnabled: boolean;
  systemPromptOverride?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReceptionistDto {
  organisationId?: string;
  outletId?: string | null;
  name: string;
  displayName: string;
  language?: string;
  tone?: ReceptionistTone;
  greeting: string;
  timezone?: string;
  knowledgeScope?: ReceptionistScope;
  escalationEnabled?: boolean;
  humanHandoffEnabled?: boolean;
  systemPromptOverride?: string;
}

export interface UpdateReceptionistDto {
  name?: string;
  displayName?: string;
  status?: ReceptionistStatus;
  language?: string;
  tone?: ReceptionistTone;
  greeting?: string;
  timezone?: string;
  knowledgeScope?: ReceptionistScope;
  escalationEnabled?: boolean;
  humanHandoffEnabled?: boolean;
  systemPromptOverride?: string;
}

export interface ReceptionistKnowledgeSourceDto {
  id: string;
  organisationId: string;
  outletId?: string | null;
  type: ReceptionistKnowledgeType;
  title: string;
  description?: string | null;
  content: string;
  sourceReferenceId?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  priority: number;
  visibility: KnowledgeVisibility;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  version: number;
  metadata?: Record<string, any> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKnowledgeSourceDto {
  organisationId?: string;
  outletId?: string | null;
  type: ReceptionistKnowledgeType;
  title: string;
  description?: string;
  content: string;
  sourceReferenceId?: string;
  status?: 'DRAFT' | 'PUBLISHED';
  priority?: number;
  visibility?: KnowledgeVisibility;
  effectiveFrom?: string | Date;
  effectiveUntil?: string | Date;
  metadata?: Record<string, any>;
}

export interface UpdateKnowledgeSourceDto {
  title?: string;
  description?: string;
  content?: string;
  priority?: number;
  visibility?: KnowledgeVisibility;
  effectiveFrom?: string | Date | null;
  effectiveUntil?: string | Date | null;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  metadata?: Record<string, any>;
}

export interface ReceptionistKnowledgeVersionDto {
  id: string;
  knowledgeSourceId: string;
  version: number;
  content: string;
  metadata?: Record<string, any> | null;
  createdBy?: string | null;
  createdAt: string;
  publishedAt?: string | null;
  archivedAt?: string | null;
}

export interface ReceptionistConversationDto {
  id: string;
  organisationId: string;
  outletId?: string | null;
  receptionistId: string;
  customerId?: string | null;
  customerName?: string | null;
  externalContactId?: string | null;
  channel: ConversationChannel;
  status: ConversationStatus;
  language: string;
  startedAt: string;
  lastMessageAt: string;
  endedAt?: string | null;
  summary?: string | null;
  summaryVersion: number;
  messagesCount?: number;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConversationDto {
  organisationId?: string;
  outletId?: string | null;
  receptionistId?: string;
  customerId?: string;
  externalContactId?: string;
  channel?: ConversationChannel;
  language?: string;
  initialMessage?: string;
}

export interface ReceptionistMessageDto {
  id: string;
  conversationId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  role: MessageRole;
  content: string;
  contentType: MessageContentType;
  language: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  metadata?: {
    intent?: ReceptionistIntent;
    confidence?: number;
    citations?: KnowledgeReferenceDto[];
    toolCalls?: ToolResultReferenceDto[];
    requiresClarification?: boolean;
    handoffRecommended?: boolean;
    model?: string;
    provider?: string;
    latencyMs?: number;
    safetyFlag?: string;
  } | null;
  correlationId?: string | null;
  createdAt: string;
}

export interface SendMessageDto {
  content: string;
  language?: string;
  correlationId?: string;
  channel?: ConversationChannel;
}

export interface KnowledgeReferenceDto {
  sourceId?: string;
  sourceType: string;
  title: string;
  outletId?: string | null;
  effectiveVersion?: string | number;
  confidenceScore?: number;
  snippet?: string;
}

export interface ToolResultReferenceDto {
  toolName: string;
  input: Record<string, any>;
  output: Record<string, any>;
  status: 'SUCCESS' | 'BLOCKED' | 'FAILED';
}

export interface ReceptionistResponseDto {
  message: string;
  intent: ReceptionistIntent;
  confidence: number;
  requiresClarification: boolean;
  suggestedNextStep?: string;
  citations: KnowledgeReferenceDto[];
  toolResults?: ToolResultReferenceDto[];
  handoffRecommended: boolean;
  safetyFlag?: string;
}

export interface ReceptionistHandoffDto {
  id: string;
  organisationId: string;
  outletId?: string | null;
  conversationId: string;
  receptionistId: string;
  memberProfileId?: string | null;
  customerName?: string | null;
  reason: HandoffReason;
  status: HandoffStatus;
  customerSummary: string;
  suggestedAction?: string | null;
  assignedStaffId?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHandoffDto {
  reason: HandoffReason;
  customerSummary: string;
  suggestedAction?: string;
  notes?: string;
}

export interface ResolveHandoffDto {
  status: 'RESOLVED' | 'REJECTED';
  notes?: string;
}

export interface ReceptionistDryRunRequestDto {
  organisationId?: string;
  outletId?: string | null;
  memberId?: string | null;
  customerMessage: string;
  language?: string;
}

export interface ReceptionistDryRunResultDto {
  organisationId: string;
  outletId?: string | null;
  customerMessage: string;
  resolvedIntent: ReceptionistIntent;
  confidence: number;
  knowledgeSourcesRetrieved: KnowledgeReferenceDto[];
  toolsConsidered: string[];
  toolsExecuted: ToolResultReferenceDto[];
  simulatedResponse: ReceptionistResponseDto;
  handoffRecommended: boolean;
  safetyEvaluations: {
    passed: boolean;
    flags: string[];
  };
}

export interface ReceptionistAnalyticsDto {
  totalConversations: number;
  activeConversations: number;
  resolvedConversations: number;
  escalatedConversations: number;
  totalMessages: number;
  totalHandoffs: number;
  unknownQuestionsCount: number;
  averageResponseLatencyMs: number;
  languageDistribution: Record<string, number>;
  channelDistribution: Record<string, number>;
  intentDistribution: Record<string, number>;
  aiRequestsCount: number;
  estimatedCost: number;
}

export interface KnowledgeGapDto {
  id: string;
  organisationId: string;
  outletId?: string | null;
  questionCategory: string;
  normalizedQuestion: string;
  frequency: number;
  firstSeenAt: string;
  lastSeenAt: string;
  status: 'NEW' | 'REVIEW_REQUIRED' | 'RESOLVED' | 'IGNORED';
}

export interface ReceptionistFeedbackDto {
  id: string;
  organisationId: string;
  conversationId: string;
  messageId?: string | null;
  rating: 'THUMBS_UP' | 'THUMBS_DOWN';
  category?: string | null;
  comment?: string | null;
  createdAt: string;
}

export interface CreateFeedbackDto {
  messageId?: string;
  rating: 'THUMBS_UP' | 'THUMBS_DOWN';
  category?: 'INCORRECT_INFO' | 'OUTDATED_INFO' | 'DIDNT_ANSWER' | 'WANTED_HUMAN' | 'OTHER';
  comment?: string;
}

export interface ReceptionistToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  access: 'PUBLIC' | 'MEMBER_AUTHENTICATED' | 'STAFF';
  scope: 'ORGANISATION' | 'OUTLET' | 'MEMBER';
  operation: 'READ' | 'WRITE';
  requiresConfirmation: boolean;
}

// ============================================================================
// DAY 32 — BOOKING INTELLIGENCE & CONFIRMATION TYPES
// ============================================================================

export type SessionAvailabilityStatus =
  | 'AVAILABLE'
  | 'LIMITED'
  | 'FULL'
  | 'WAITLIST_AVAILABLE'
  | 'BOOKING_CLOSED'
  | 'CANCELLED'
  | 'NOT_ELIGIBLE'
  | 'UNKNOWN';

export interface SessionAvailabilityItemDto {
  sessionId: string;
  classTypeId: string;
  className: string;
  category: string;
  description?: string;
  outletId: string;
  outletName: string;
  trainerId?: string | null;
  trainerName?: string | null;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  capacity: number;
  confirmedBookingCount: number;
  spotsRemaining: number;
  waitlistCount: number;
  status: SessionAvailabilityStatus;
  userBookingStatus?: string | null;
  userWaitlistPosition?: number | null;
  eligibility?: {
    eligible: boolean;
    reason?: string;
    message?: string;
  };
}

export interface ClassAvailabilityQueryDto {
  outletId?: string;
  classTypeId?: string;
  className?: string;
  category?: string;
  trainerId?: string;
  trainerName?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  timeOfDay?: 'MORNING' | 'AFTERNOON' | 'EVENING';
  timeRange?: 'MORNING' | 'AFTERNOON' | 'EVENING';
  earliestTime?: string;
  latestTime?: string;
  includeWaitlistOnly?: boolean;
  limit?: number;
}

export interface ClassAvailabilityResultDto {
  outletId?: string;
  outletName?: string;
  queryDateRange: {
    start: string;
    end: string;
  };
  totalFound: number;
  sessions: SessionAvailabilityItemDto[];
  requiresOutletClarification?: boolean;
  availableOutlets?: { id: string; name: string }[];
}

export type BookingConfirmationAction =
  | 'CREATE_BOOKING'
  | 'CANCEL_BOOKING'
  | 'RESCHEDULE_BOOKING'
  | 'JOIN_WAITLIST';

export type BookingConfirmationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'EXECUTED'
  | 'FAILED';

export interface BookingConfirmationStateDto {
  id: string;
  organisationId: string;
  outletId?: string | null;
  conversationId: string;
  receptionistId?: string | null;
  memberProfileId: string;
  classSessionId: string;
  existingBookingId?: string | null;
  action: BookingConfirmationAction;
  confirmationToken: string;
  status: BookingConfirmationStatus;
  displayedDetails?: Record<string, any> | null;
  expiresAt: string;
  executedAt?: string | null;
  createdAt: string;
}

export interface CreateBookingConfirmationDto {
  conversationId: string;
  classSessionId: string;
  action: BookingConfirmationAction;
  existingBookingId?: string;
  displayedDetails?: Record<string, any>;
  ttlSeconds?: number;
}

export interface ExecuteBookingConfirmationDto {
  confirmationToken: string;
  idempotencyKey?: string;
  notes?: string;
}

export interface ReceptionistBookingActionDto {
  action: BookingConfirmationAction;
  sessionId: string;
  confirmationToken?: string;
  existingBookingId?: string;
}

export interface ReceptionistRescheduleDto {
  existingBookingId: string;
  targetSessionId: string;
  confirmationToken: string;
}

export interface ReceptionistCancelDto {
  bookingId: string;
  confirmationToken: string;
  reason?: string;
}

export interface ReceptionistWaitlistDto {
  sessionId: string;
  confirmationToken: string;
}

export interface ReceptionistBookingDryRunResultDto {
  identityStatus: 'VERIFIED' | 'UNVERIFIED' | 'PROSPECT_ONLY';
  availabilityStatus: SessionAvailabilityStatus;
  eligibilityStatus: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'REQUIRES_AUTH' | 'REQUIRES_MEMBERSHIP' | 'UNKNOWN';
  confirmationRequired: boolean;
  proposedAction: BookingConfirmationAction;
  productionSideEffect: 'NONE';
  reasons: string[];
  sessionSnapshot?: Partial<SessionAvailabilityItemDto>;
}

export interface ReceptionistBookingMetricsDto {
  availabilitySearches: number;
  bookingAttempts: number;
  confirmedBookings: number;
  cancellations: number;
  reschedules: number;
  waitlistJoins: number;
  bookingFailures: number;
  conversionFunnel: {
    conversations: number;
    searches: number;
    confirmations: number;
    completedBookings: number;
  };
}

