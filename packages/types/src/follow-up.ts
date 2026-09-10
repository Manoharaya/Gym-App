/**
 * Day 39 — Automated Follow-Up & Multi-Channel Sales Sequences
 * Canonical TypeScript Types & Interfaces
 */

export type FollowUpSequenceType =
  | 'LEAD_FOLLOW_UP'
  | 'MISSED_CALL'
  | 'WEB_ENQUIRY'
  | 'TRIAL_FOLLOW_UP'
  | 'TOUR_FOLLOW_UP'
  | 'QUALIFIED_LEAD'
  | 'OFFER_FOLLOW_UP'
  | 'NO_RESPONSE'
  | 'CALLBACK'
  | 'REENGAGEMENT'
  | 'STAFF_HANDOFF'
  | 'POST_CONVERSATION'
  | 'CUSTOM';

export type FollowUpSequenceStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export type FollowUpStepChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH' | 'IN_APP' | 'VOICE';

export type FollowUpMessageMode = 'STATIC_TEMPLATE' | 'PERSONALIZED_TEMPLATE' | 'AI_ASSISTED';

export type FollowUpEnrollmentStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'STOPPED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED';

export type FollowUpExecutionStatus =
  | 'PENDING'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'EXECUTING'
  | 'SUCCESS'
  | 'TRANSIENT_FAILURE'
  | 'PERMANENT_FAILURE'
  | 'SUPPRESSED'
  | 'CANCELLED'
  | 'SKIPPED';

export type FollowUpStopReason =
  | 'CUSTOMER_REPLIED'
  | 'CUSTOMER_BOOKED'
  | 'CUSTOMER_CANCELLED'
  | 'CUSTOMER_CONVERTED'
  | 'STAFF_HANDOFF'
  | 'LEAD_DISQUALIFIED'
  | 'OPTED_OUT'
  | 'CONSENT_WITHDRAWN'
  | 'MEMBERSHIP_PURCHASED'
  | 'TRIAL_COMPLETED'
  | 'TOUR_COMPLETED'
  | 'SEQUENCE_EXPIRED'
  | 'MANUAL_STOP';

export type FollowUpResponseType =
  | 'REPLIED'
  | 'NO_RESPONSE'
  | 'BOOKED'
  | 'CANCELLED'
  | 'TOUR_BOOKED'
  | 'TRIAL_BOOKED'
  | 'CONVERTED'
  | 'REQUESTED_HUMAN'
  | 'OPTED_OUT'
  | 'INVALID'
  | 'OTHER';

export type FollowUpOutcomeType =
  | 'NO_RESPONSE'
  | 'ENGAGED'
  | 'BOOKING_CREATED'
  | 'TRIAL_BOOKED'
  | 'TOUR_BOOKED'
  | 'HUMAN_HANDOFF'
  | 'QUALIFIED'
  | 'CONVERTED'
  | 'LOST'
  | 'OPTED_OUT'
  | 'SEQUENCE_COMPLETED'
  | 'STOPPED';

export type FollowUpAssignmentType =
  | 'UNASSIGNED'
  | 'LEAD_OWNER'
  | 'OPPORTUNITY_OWNER'
  | 'TRAINER'
  | 'RECEPTION'
  | 'OUTLET_MANAGER'
  | 'SALES_ROLE'
  | 'SPECIFIC_STAFF';

export type FollowUpEligibilityStatus =
  | 'ELIGIBLE'
  | 'ALREADY_ENROLLED'
  | 'SUPPRESSED'
  | 'NO_CONSENT'
  | 'NO_VALID_CHANNEL'
  | 'OUTSIDE_POLICY'
  | 'STAFF_HANDOFF_ACTIVE'
  | 'ALREADY_CONVERTED'
  | 'ALREADY_BOOKED'
  | 'COOLDOWN_ACTIVE'
  | 'INVALID_STATUS';

export type FollowUpSuppressionReason =
  | 'OPTOUT'
  | 'CONSENT_WITHDRAWN'
  | 'INVALID_CHANNEL'
  | 'CUSTOMER_REQUESTED'
  | 'STAFF_SUPPRESSED'
  | 'COOLDOWN'
  | 'FREQUENCY_EXCEEDED'
  | 'QUIET_HOURS'
  | 'CONVERTED'
  | 'BOOKED'
  | 'HANDOFF'
  | 'OUTSIDE_BUSINESS_HOURS'
  | 'POLICY_VIOLATION';

export interface FollowUpSequenceVersionConfig {
  cooldownHours?: number;
  maxFollowUpsPerWeek?: number;
  quietHoursStart?: string; // HH:mm format, e.g. "21:00"
  quietHoursEnd?: string;   // HH:mm format, e.g. "08:00"
  timezone?: string;
  defaultChannel?: FollowUpStepChannel;
  fallbackChannel?: FollowUpStepChannel;
  stopConditions?: FollowUpStopReason[];
  approvalPolicy?: 'AUTO_SEND' | 'APPROVAL_REQUIRED' | 'STAFF_ONLY';
}

export interface FollowUpStepConfig {
  fallbackChannel?: FollowUpStepChannel;
  allowedVariables?: string[];
  aiContextRules?: {
    includeGoals?: boolean;
    includeSchedule?: boolean;
    includeObjections?: boolean;
    includePipelineStage?: boolean;
  };
}

export interface FollowUpStepDto {
  id: string;
  sequenceVersionId: string;
  stepOrder: number;
  name: string;
  delayMinutes: number;
  channel: FollowUpStepChannel;
  messageMode: FollowUpMessageMode;
  templateId?: string | null;
  promptId?: string | null;
  requiresApproval: boolean;
  stopOnReply: boolean;
  stopOnBooking: boolean;
  stopOnConversion: boolean;
  stopOnStaffHandoff: boolean;
  status: string;
  configuration?: FollowUpStepConfig | null;
}

export interface FollowUpSequenceVersionDto {
  id: string;
  sequenceId: string;
  version: number;
  status: string;
  configuration: FollowUpSequenceVersionConfig;
  createdBy?: string | null;
  createdAt: string | Date;
  publishedAt?: string | Date | null;
  steps?: FollowUpStepDto[];
}

export interface FollowUpSequenceDto {
  id: string;
  organisationId: string;
  outletId?: string | null;
  name: string;
  description?: string | null;
  sequenceType: FollowUpSequenceType;
  status: FollowUpSequenceStatus;
  triggerType: string;
  activeVersionId?: string | null;
  activeVersion?: FollowUpSequenceVersionDto | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface FollowUpEnrollmentDto {
  id: string;
  organisationId: string;
  outletId?: string | null;
  leadId?: string | null;
  opportunityId?: string | null;
  memberId?: string | null;
  sequenceId: string;
  sequenceVersionId: string;
  status: FollowUpEnrollmentStatus;
  currentStep: number;
  enrolledAt: string | Date;
  startedAt?: string | Date | null;
  completedAt?: string | Date | null;
  cancelledAt?: string | Date | null;
  pausedAt?: string | Date | null;
  nextExecutionAt?: string | Date | null;
  lastExecutionAt?: string | Date | null;
  stopReason?: string | null;
  createdBy?: string | null;
  metadata?: Record<string, any> | null;
  sequence?: FollowUpSequenceDto;
}

export interface FollowUpStepExecutionDto {
  id: string;
  enrollmentId: string;
  stepId: string;
  organisationId: string;
  status: FollowUpExecutionStatus;
  executionKey: string;
  channel: FollowUpStepChannel;
  communicationId?: string | null;
  scheduledAt: string | Date;
  executedAt?: string | Date | null;
  attemptCount: number;
  maxAttempts: number;
  errorDetails?: string | null;
  metadata?: Record<string, any> | null;
}

export interface FollowUpResponseDto {
  id: string;
  organisationId: string;
  enrollmentId: string;
  leadId?: string | null;
  responseType: FollowUpResponseType;
  channel: string;
  rawContent?: string | null;
  referenceId?: string | null;
  source: string;
  classification?: string | null;
  confidence?: number | null;
  receivedAt: string | Date;
}

export interface FollowUpOutcomeDto {
  id: string;
  organisationId: string;
  enrollmentId: string;
  outcomeType: FollowUpOutcomeType;
  attribution: string;
  metadata?: Record<string, any> | null;
  recordedAt: string | Date;
}

export interface FollowUpEligibilityResult {
  eligible: boolean;
  status: FollowUpEligibilityStatus;
  reason?: string;
  channel?: FollowUpStepChannel;
  availableChannels?: FollowUpStepChannel[];
}

export interface FollowUpSuppressionResult {
  suppressed: boolean;
  reason?: FollowUpSuppressionReason;
  message?: string;
  activeUntil?: Date;
}

export interface FollowUpPreviewDto {
  stepOrder: number;
  stepName: string;
  channel: FollowUpStepChannel;
  delayMinutes: number;
  renderedSubject?: string;
  renderedBody: string;
  messageMode: FollowUpMessageMode;
  variablesUsed: Record<string, any>;
  requiresApproval: boolean;
  isAiGenerated: boolean;
  aiSafetyFlags?: string[];
}

export interface FollowUpQueueItemDto {
  enrollmentId: string;
  executionId?: string;
  leadId?: string;
  leadName?: string;
  leadPhone?: string;
  leadEmail?: string;
  opportunityId?: string;
  opportunityTitle?: string;
  pipelineStage?: string;
  sequenceName: string;
  sequenceType: FollowUpSequenceType;
  stepOrder: number;
  stepName: string;
  channel: FollowUpStepChannel;
  status: FollowUpExecutionStatus;
  dueAt: string | Date;
  assignedStaffId?: string;
  assignedStaffName?: string;
  previewBody?: string;
  requiresApproval: boolean;
}

export interface AIFollowUpDraftOutput {
  message: string;
  channel: FollowUpStepChannel;
  tone: string;
  purpose: string;
  personalizationUsed: string[];
  callToAction: string;
  confidence: number;
  requiresApproval: boolean;
  safetyFlags: string[];
}
