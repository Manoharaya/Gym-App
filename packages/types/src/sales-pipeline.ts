/**
 * Day 37 — Sales Pipeline & Opportunity Management
 * Shared TypeScript Contracts & Domain Models
 */

export type PipelineStageType =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'TRIAL'
  | 'TOUR_BOOKED'
  | 'OFFERED'
  | 'CONVERTED'
  | 'LOST';

export type SalesStage = PipelineStageType;

export type SalesActivityType =
  | 'AI_CONVERSATION'
  | 'STAFF_CONVERSATION'
  | 'PHONE_CALL'
  | 'MISSED_CALL'
  | 'EMAIL'
  | 'SMS'
  | 'WHATSAPP'
  | 'WEB_CHAT'
  | 'TRIAL_BOOKED'
  | 'TRIAL_COMPLETED'
  | 'TOUR_BOOKED'
  | 'TOUR_COMPLETED'
  | 'OFFER_CREATED'
  | 'OFFER_PRESENTED'
  | 'FOLLOW_UP'
  | 'HANDOFF'
  | 'NOTE'
  | 'STAGE_CHANGE'
  | 'OTHER';

export type SalesTaskType =
  | 'CALL_PROSPECT'
  | 'FOLLOW_UP_TRIAL'
  | 'FOLLOW_UP_TOUR'
  | 'REVIEW_OFFER'
  | 'CONTACT_HIGH_INTENT'
  | 'RESOLVE_INQUIRY'
  | 'GENERAL';

export type SalesTaskStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DISMISSED'
  | 'EXPIRED';

export type SalesTaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type SalesLossReason =
  | 'PRICE'
  | 'NO_RESPONSE'
  | 'NOT_INTERESTED'
  | 'CHOSE_COMPETITOR'
  | 'LOCATION'
  | 'SCHEDULE'
  | 'SERVICE_MISMATCH'
  | 'TIMING'
  | 'FAILED_TRIAL'
  | 'FAILED_TOUR'
  | 'COULD_NOT_CONTACT'
  | 'DUPLICATE'
  | 'INVALID_LEAD'
  | 'OTHER';

export type SalesTransitionActorType =
  | 'SYSTEM'
  | 'AI_RECOMMENDATION'
  | 'STAFF'
  | 'CUSTOMER'
  | 'BOOKING_SYSTEM'
  | 'MEMBERSHIP_SYSTEM'
  | 'WORKFLOW';

export type SalesPipelineEventType =
  | 'sales.opportunity.created'
  | 'sales.opportunity.stage_changed'
  | 'sales.opportunity.converted'
  | 'sales.opportunity.lost'
  | 'sales.activity.logged'
  | 'sales.task.created'
  | 'sales.task.completed';

// ============================================================================
// Pipeline & Stage DTOs
// ============================================================================

export interface SalesPipelineStageDto {
  id: string;
  pipelineId: string;
  type: PipelineStageType;
  name: string;
  description: string | null;
  position: number;
  color: string | null;
  isActive: boolean;
  isTerminal: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SalesPipelineDto {
  id: string;
  organisationId: string;
  outletId: string | null;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  stages: SalesPipelineStageDto[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateSalesPipelineDto {
  name: string;
  outletId?: string;
  description?: string;
  isDefault?: boolean;
  stages?: Array<{
    type: PipelineStageType;
    name: string;
    description?: string;
    position?: number;
    color?: string;
    isTerminal?: boolean;
  }>;
}

export interface UpdateSalesPipelineDto {
  name?: string;
  description?: string;
  isActive?: boolean;
}

// ============================================================================
// Opportunity DTOs
// ============================================================================

export interface SalesOpportunityDto {
  id: string;
  organisationId: string;
  outletId: string | null;
  leadId: string;
  pipelineId: string;
  stageId: string;
  currentStage: PipelineStageType;
  ownerStaffId: string | null;
  ownerStaffName?: string | null;
  source: string | null;
  sourceReferenceId: string | null;
  serviceInterest: string[];
  membershipInterest: string | null;
  estimatedValue: number | null;
  currency: string;
  probability: number;
  expectedCloseDate: Date | string | null;
  lastActivityAt: Date | string;
  nextActionAt: Date | string | null;
  nextActionType: string | null;
  nextActionNotes: string | null;
  convertedAt: Date | string | null;
  conversionReferenceId: string | null;
  lostAt: Date | string | null;
  lossReason: SalesLossReason | string | null;
  lossNotes: string | null;
  staleSince: Date | string | null;
  isStale: boolean;
  version: number;
  lead?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    status: string;
    score: number;
  } | null;
  stage?: SalesPipelineStageDto | null;
  metadata?: Record<string, any> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateSalesOpportunityDto {
  leadId: string;
  pipelineId?: string;
  outletId?: string;
  ownerStaffId?: string;
  source?: string;
  sourceReferenceId?: string;
  serviceInterest?: string[];
  membershipInterest?: string;
  estimatedValue?: number;
  currency?: string;
  expectedCloseDate?: string;
  metadata?: Record<string, any>;
}

export interface UpdateSalesOpportunityDto {
  ownerStaffId?: string | null;
  serviceInterest?: string[];
  membershipInterest?: string | null;
  estimatedValue?: number | null;
  currency?: string;
  probability?: number;
  expectedCloseDate?: string | null;
  nextActionAt?: string | null;
  nextActionType?: string | null;
  nextActionNotes?: string | null;
  metadata?: Record<string, any>;
}

// ============================================================================
// Stage Transition & History DTOs
// ============================================================================

export interface TransitionStageDto {
  targetStage: PipelineStageType;
  reason?: string;
  actorType?: SalesTransitionActorType;
  actorId?: string;
  source?: string;
  lossReason?: SalesLossReason;
  lossNotes?: string;
  conversionReferenceId?: string;
  metadata?: Record<string, any>;
}

export interface SalesStageHistoryDto {
  id: string;
  opportunityId: string;
  fromStageId: string | null;
  toStageId: string;
  fromStageType: PipelineStageType | null;
  toStageType: PipelineStageType;
  reason: string | null;
  actorType: SalesTransitionActorType;
  actorId: string | null;
  source: string | null;
  durationSeconds: number | null;
  metadata?: Record<string, any> | null;
  createdAt: Date | string;
}

// ============================================================================
// Sales Activity DTOs
// ============================================================================

export interface LogSalesActivityDto {
  opportunityId: string;
  type: SalesActivityType;
  title: string;
  summary?: string;
  actorType?: 'STAFF' | 'AI' | 'CUSTOMER' | 'SYSTEM';
  actorId?: string;
  channel?: 'WEB' | 'WHATSAPP' | 'SMS' | 'EMAIL' | 'VOICE' | 'IN_PERSON';
  sourceReferenceId?: string;
  metadata?: Record<string, any>;
}

export interface SalesActivityDto {
  id: string;
  organisationId: string;
  outletId: string | null;
  opportunityId: string;
  leadId: string;
  type: SalesActivityType;
  actorType: string;
  actorId: string | null;
  channel: string | null;
  title: string;
  summary: string | null;
  sourceReferenceId: string | null;
  occurredAt: Date | string;
  metadata?: Record<string, any> | null;
  createdAt: Date | string;
}

// ============================================================================
// Sales Task DTOs
// ============================================================================

export interface CreateSalesTaskDto {
  opportunityId: string;
  type: SalesTaskType;
  title: string;
  description?: string;
  dueAt: string;
  assignedStaffId?: string;
  priority?: SalesTaskPriority;
  metadata?: Record<string, any>;
}

export interface UpdateSalesTaskDto {
  assignedStaffId?: string | null;
  priority?: SalesTaskPriority;
  status?: SalesTaskStatus;
  dueAt?: string;
  completionNotes?: string;
}

export interface SalesTaskDto {
  id: string;
  organisationId: string;
  outletId: string | null;
  opportunityId: string;
  leadId: string;
  assignedStaffId: string | null;
  assignedStaffName?: string | null;
  type: SalesTaskType;
  priority: SalesTaskPriority;
  status: SalesTaskStatus;
  title: string;
  description: string | null;
  dueAt: Date | string;
  completedAt: Date | string | null;
  completedById: string | null;
  completionNotes: string | null;
  createdBy: string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ============================================================================
// Pipeline Board & Metrics DTOs
// ============================================================================

export interface SalesOpportunityCardDto {
  id: string;
  leadId: string;
  leadName: string;
  leadEmail: string | null;
  leadPhone: string | null;
  outletId: string | null;
  outletName: string | null;
  ownerStaffId: string | null;
  ownerStaffName: string | null;
  source: string | null;
  serviceInterest: string[];
  membershipInterest: string | null;
  estimatedValue: number | null;
  currency: string;
  probability: number;
  currentStage: PipelineStageType;
  lastActivityAt: Date | string;
  nextActionType: string | null;
  nextActionAt: Date | string | null;
  isStale: boolean;
  daysInCurrentStage: number;
  qualificationStatus?: string;
}

export interface SalesPipelineColumnDto {
  stageId: string;
  stageType: PipelineStageType;
  stageName: string;
  color: string | null;
  position: number;
  isTerminal: boolean;
  opportunityCount: number;
  totalEstimatedValue: number;
  opportunities: SalesOpportunityCardDto[];
}

export interface SalesPipelineBoardDto {
  pipelineId: string;
  pipelineName: string;
  columns: SalesPipelineColumnDto[];
  totalOpportunities: number;
  totalValue: number;
}

export interface SalesPipelineMetricsDto {
  pipelineId: string;
  totalOpportunities: number;
  activeOpportunities: number;
  conversions: number;
  losses: number;
  winRate: number; // percentage
  stageBreakdown: Record<PipelineStageType, { count: number; value: number }>;
  stageConversionRates: {
    qualifiedToTrialRate: number;
    trialToConvertedRate: number;
    tourToConvertedRate: number;
    offeredToConvertedRate: number;
    overallConversionRate: number;
  };
  velocity: {
    averageDaysInStage: Record<PipelineStageType, number>;
    averageDaysToConversion: number;
  };
}

export interface SalesOpportunityFilterDto {
  outletId?: string;
  ownerStaffId?: string;
  stage?: PipelineStageType;
  source?: string;
  isStale?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export type PipelineBoardColumnDto = SalesPipelineColumnDto;
export type PipelineBoardDto = SalesPipelineBoardDto;
export type PipelineMetricsDto = SalesPipelineMetricsDto;

