/**
 * FitCore Day 35 — AI Receptionist Production Workflow Types & Contracts
 *
 * Connects conversational chat, voice calls, decision rules, human handoffs,
 * follow-up tasks, callback requests, and operational dashboards.
 */

export type ReceptionistChannel = 'WEB' | 'WHATSAPP' | 'SMS' | 'EMAIL' | 'VOICE';

export type ReceptionistInteractionStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'ABANDONED'
  | 'FAILED'
  | 'HANDED_OFF'
  | 'FOLLOW_UP_REQUIRED';

export type ReceptionistOutcome =
  | 'INFORMATION_PROVIDED'
  | 'BOOKING_CREATED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_RESCHEDULED'
  | 'WAITLIST_JOINED'
  | 'LEAD_CREATED'
  | 'LEAD_QUALIFIED'
  | 'STAFF_HANDOFF'
  | 'CALLBACK_REQUESTED'
  | 'FOLLOW_UP_REQUIRED'
  | 'UNRESOLVED'
  | 'FAILED';

export type ReceptionistOutcomeSource = 'AI' | 'CUSTOMER' | 'STAFF' | 'SYSTEM';

export type ReceptionistSummaryType =
  | 'INITIAL_SUMMARY'
  | 'HANDOFF_SUMMARY'
  | 'COMPLETION_SUMMARY'
  | 'FOLLOWUP_SUMMARY'
  | 'CALL_SUMMARY';

export interface ReceptionistSummary {
  type: ReceptionistSummaryType;
  requestedTopic?: string;
  preferredOutlet?: string;
  goal?: string;
  outcome: ReceptionistOutcome;
  reason?: string;
  keyPoints: string[];
  actionItems: string[];
  isObservedOnly: boolean;
}

export type WorkflowHandoffPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type WorkflowHandoffReason =
  | 'CUSTOMER_REQUESTED'
  | 'LOW_CONFIDENCE'
  | 'COMPLEX_REQUEST'
  | 'COMPLAINT'
  | 'PRICING_EXCEPTION'
  | 'POLICY_EXCEPTION'
  | 'SPECIAL_REQUEST'
  | 'IDENTITY_VERIFICATION'
  | 'TECHNICAL_FAILURE'
  | 'TOOL_FAILURE'
  | 'BOOKING_FAILURE'
  | 'PAYMENT_QUESTION'
  | 'MEMBERSHIP_EXCEPTION'
  | 'OTHER';

export type WorkflowHandoffStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export type StaffRoutingRule =
  | 'BY_OUTLET'
  | 'BY_ROLE'
  | 'BY_BUSINESS_HOURS'
  | 'BY_PRIORITY'
  | 'ROUND_ROBIN'
  | 'MANUAL';

export type CallbackChannel = 'PHONE' | 'WHATSAPP' | 'SMS' | 'EMAIL';

export type CallbackStatus =
  | 'REQUESTED'
  | 'ASSIGNED'
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export type FollowUpTaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type FollowUpTaskStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DISMISSED'
  | 'EXPIRED';

export type FollowUpTaskOutcome =
  | 'CUSTOMER_CONTACTED'
  | 'BOOKING_CREATED'
  | 'LEAD_UPDATED'
  | 'QUESTION_RESOLVED'
  | 'CALLBACK_COMPLETED'
  | 'TRANSFERRED'
  | 'NO_RESPONSE'
  | 'NOT_REQUIRED'
  | 'OTHER';

export type EscalationTrigger =
  | 'LOW_AI_CONFIDENCE'
  | 'REPEATED_FAILURE'
  | 'CUSTOMER_REQUEST'
  | 'COMPLAINT'
  | 'POLICY_EXCEPTION'
  | 'IDENTITY_FAILURE'
  | 'TOOL_FAILURE'
  | 'SAFETY_TRIGGER';

export type EscalationAction =
  | 'STAFF_HANDOFF'
  | 'CALLBACK'
  | 'FOLLOW_UP_TASK'
  | 'SAFE_RESPONSE'
  | 'END_INTERACTION';

export type ReceptionistWorkflowEventType =
  | 'RECEPTIONIST_INTERACTION_STARTED'
  | 'RECEPTIONIST_INTERACTION_COMPLETED'
  | 'RECEPTIONIST_INTERACTION_ABANDONED'
  | 'RECEPTIONIST_HANDOFF_CREATED'
  | 'RECEPTIONIST_HANDOFF_ACCEPTED'
  | 'RECEPTIONIST_HANDOFF_COMPLETED'
  | 'RECEPTIONIST_FOLLOWUP_CREATED'
  | 'RECEPTIONIST_FOLLOWUP_COMPLETED'
  | 'RECEPTIONIST_UNRESOLVED'
  | 'RECEPTIONIST_ESCALATED'
  | 'RECEPTIONIST_CALLBACK_REQUESTED'
  | 'RECEPTIONIST_MISSED_CALL'
  | 'RECEPTIONIST_SALES_HANDOFF_REQUESTED';

export interface ReceptionistWorkflowContext {
  organisationId: string;
  outletId?: string | null;
  channel: ReceptionistChannel;
  interactionId?: string;
  conversationId?: string;
  sessionId?: string;
  memberId?: string | null;
  leadId?: string | null;
  intent?: string;
  requestedAction?: string;
  identityState?: string;
  turnCount?: number;
  consecutiveFailures?: number;
  language?: string;
  metadata?: Record<string, any>;
}

export interface ReceptionistInteractionDto {
  id: string;
  organisationId: string;
  outletId?: string | null;
  channel: ReceptionistChannel;
  sessionId?: string | null;
  conversationId: string;
  memberId?: string | null;
  leadId?: string | null;
  status: ReceptionistInteractionStatus;
  intent?: string | null;
  outcome?: ReceptionistOutcome | null;
  outcomeSource?: ReceptionistOutcomeSource | null;
  startedAt: Date | string;
  endedAt?: Date | string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ReceptionistFollowUpTaskDto {
  id: string;
  organisationId: string;
  outletId?: string | null;
  interactionId?: string | null;
  leadId?: string | null;
  memberId?: string | null;
  assignedStaffId?: string | null;
  priority: FollowUpTaskPriority;
  reason: string;
  status: FollowUpTaskStatus;
  dueAt?: Date | string | null;
  completedAt?: Date | string | null;
  outcome?: FollowUpTaskOutcome | null;
  notes?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CallbackRequestDto {
  id: string;
  organisationId: string;
  outletId?: string | null;
  memberId?: string | null;
  leadId?: string | null;
  interactionId?: string | null;
  phoneNumber?: string | null;
  preferredTime?: Date | string | null;
  preferredTimeNote?: string | null;
  preferredChannel: CallbackChannel;
  reason: string;
  status: CallbackStatus;
  assignedStaffId?: string | null;
  notes?: string | null;
  completedAt?: Date | string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ReceptionistWorkflowConfigDto {
  id?: string;
  organisationId: string;
  outletId?: string | null;
  receptionistEnabled: boolean;
  greetingMessage?: string | null;
  businessHours?: Record<string, any> | null;
  defaultOutletId?: string | null;
  supportedChannels?: ReceptionistChannel[] | null;
  handoffEnabled: boolean;
  handoffRouting: StaffRoutingRule;
  callbackEnabled: boolean;
  afterHoursMode: 'PLAY_MESSAGE' | 'TAKE_LEAD' | 'OFFER_CALLBACK' | 'TRANSFER_TO_EXTERNAL_NUMBER' | 'END_CALL';
  recordingPolicy: string;
  transcriptionPolicy: string;
  notificationPreferences?: Record<string, any> | null;
  escalationRules?: Record<string, any> | null;
  loopProtectionRules?: {
    maxToolCalls?: number;
    maxTurns?: number;
    maxFailures?: number;
  } | null;
  businessRules?: {
    requireHumanForPricing?: boolean;
    requireHumanForComplaints?: boolean;
    requireVerificationForMemberData?: boolean;
    requireConfirmationForBookingMutation?: boolean;
  } | null;
}

export interface ReceptionistInboxFilterDto {
  organisationId: string;
  outletId?: string;
  priority?: WorkflowHandoffPriority | FollowUpTaskPriority;
  status?: string;
  type?: 'HANDOFF' | 'FOLLOW_UP' | 'CALLBACK' | 'ALL';
  assignedStaffId?: string;
  channel?: ReceptionistChannel;
  limit?: number;
  offset?: number;
}

export interface ReceptionistOperationsDashboardDto {
  kpis: {
    totalInteractions: number;
    resolvedInteractions: number;
    unresolvedInteractions: number;
    resolutionRate: number;
    handoffCount: number;
    handoffRate: number;
    callbackCount: number;
    missedCallsCount: number;
    abandonedCallsCount: number;
    leadsCreated: number;
    leadsQualified: number;
    bookingsCreated: number;
    bookingFailures: number;
    averageResolutionSeconds?: number;
  };
  channelBreakdown: Record<ReceptionistChannel, number>;
  openHandoffs: any[];
  pendingFollowUps: any[];
  pendingCallbacks: any[];
  recentInteractions: any[];
}
