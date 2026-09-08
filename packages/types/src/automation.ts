/**
 * FitCore Day 30 — Automated Engagement Workflows Contracts & Types
 *
 * Deterministic, event-driven engagement engine:
 * EVENT -> RULE -> ELIGIBILITY -> SAFETY -> ACTION -> APPROVAL -> EXECUTION -> OUTCOME
 *
 * Zero autonomous high-risk actions.
 * Multi-tenant isolation & trainer client scoping.
 * Non-causal outcome framing ("FOLLOWING WORKFLOW").
 */

export type WorkflowCategory =
  | 'ONBOARDING'
  | 'ENGAGEMENT'
  | 'RETENTION'
  | 'REACTIVATION'
  | 'MILESTONE'
  | 'MEMBERSHIP'
  | 'ATTENDANCE'
  | 'TRAINING'
  | 'COMMUNICATION'
  | 'SYSTEM';

export type WorkflowTriggerType =
  | 'INACTIVITY_DAYS_REACHED'
  | 'ATTENDANCE_DROP_PERCENT'
  | 'CLASS_MISSED'
  | 'MULTIPLE_SESSIONS_MISSED'
  | 'MEMBERSHIP_EXPIRING'
  | 'MEMBER_REENGAGED'
  | 'WORKOUT_MILESTONE_REACHED'
  | 'SCHEDULED_WORKOUT_MISSED'
  | 'DAILY_CHECKIN_MISSED'
  | 'MEMBER_BIRTHDAY'
  | 'MEMBERSHIP_ANNIVERSARY'
  | 'GOAL_ACHIEVED'
  | 'TRAINER_ASSIGNED'
  | 'TRIAL_EXPIRING'
  | 'ONBOARDING_STEP_COMPLETED'
  | 'CUSTOM_EVENT'
  // Slice 3 Platform Domain Events
  | 'MEMBER_CREATED'
  | 'MEMBER_ACTIVATED'
  | 'MEMBER_ONBOARDED'
  | 'MEMBER_REACTIVATED'
  | 'MEMBER_CHECKED_IN'
  | 'MEMBER_CHECKED_OUT'
  | 'CLASS_ATTENDED'
  | 'CLASS_NO_SHOW'
  | 'PT_SESSION_COMPLETED'
  | 'BOOKING_CREATED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_NO_SHOW'
  | 'WAITLIST_PROMOTED'
  | 'WORKOUT_COMPLETED'
  | 'WORKOUT_SKIPPED'
  | 'WORKOUT_OVERDUE'
  | 'TRAINING_GOAL_COMPLETED'
  | 'MEMBERSHIP_STARTED'
  | 'MEMBERSHIP_RENEWED'
  | 'MEMBERSHIP_EXPIRED'
  | 'MEMBER_INACTIVE'
  | 'ENGAGEMENT_DECLINED'
  | 'ENGAGEMENT_IMPROVED'
  | 'COMMUNICATION_DELIVERED'
  | 'COMMUNICATION_FAILED'
  | 'MEMBER_RESPONDED'
  | 'MEMBER_MILESTONE_REACHED';

export type WorkflowActionType =
  | 'SEND_COMMUNICATION'
  | 'CREATE_STAFF_TASK'
  | 'SEND_IN_APP_NOTIFICATION'
  | 'NOTIFY_ASSIGNED_TRAINER'
  | 'NOTIFY_MANAGER'
  | 'ADD_ENGAGEMENT_NOTE'
  | 'ADD_MEMBER_TAG'
  | 'REMOVE_MEMBER_TAG'
  | 'DELAY'
  // Slice 7 Controlled Actions
  | 'SEND_IN_APP'
  | 'SEND_PUSH'
  | 'SEND_EMAIL'
  | 'SEND_SMS'
  | 'SEND_WHATSAPP'
  | 'ASSIGN_TRAINER_TASK'
  | 'CREATE_RETENTION_FOLLOWUP'
  | 'NOTIFY_STAFF'
  | 'NOTIFY_TRAINER'
  | 'NOTIFY_OUTLET_MANAGER'
  | 'WAIT'
  | 'END_WORKFLOW'
  | 'START_WORKFLOW'
  | 'CANCEL_WORKFLOW'
  | 'BRANCH';

export type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export type WorkflowApprovalMode =
  | 'AUTOMATIC'
  | 'REQUIRE_APPROVAL'
  | 'ALWAYS_REQUIRED'
  | 'CONFIGURABLE'
  | 'NOT_REQUIRED';

export type ConditionOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN'
  | 'LESS_THAN_OR_EQUAL'
  | 'IN'
  | 'NOT_IN'
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'BETWEEN'
  | 'IS_TRUE'
  | 'IS_FALSE'
  | 'IS_NULL'
  | 'IS_NOT_NULL'
  | 'EXISTS'
  | 'NOT_EXISTS'
  | 'CHANGED'
  | 'INCREASED'
  | 'DECREASED'
  | 'BEFORE'
  | 'AFTER'
  | 'WITHIN_DATE_RANGE'
  // Lowercase aliases
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'contains'
  | 'exists'
  | 'notExists'
  | 'changed'
  | 'increased'
  | 'decreased'
  | 'before'
  | 'after'
  | 'withinDateRange';

export type ConditionFieldType = 'NUMBER' | 'STRING' | 'BOOLEAN' | 'DATE' | 'ARRAY';

export type ConditionLogic = 'AND' | 'OR' | 'NOT';

export interface WorkflowConditionLeaf {
  field: string;
  operator: ConditionOperator;
  value?: any;
  valueTo?: any;
  fieldType?: ConditionFieldType;
}

export interface WorkflowConditionCompound {
  logic: ConditionLogic;
  conditions: WorkflowCondition[];
}

export type WorkflowCondition = WorkflowConditionLeaf | WorkflowConditionCompound;

export function isCompoundCondition(cond: WorkflowCondition): cond is WorkflowConditionCompound {
  return 'logic' in cond && Array.isArray((cond as any).conditions);
}

export interface WorkflowActionDefinition {
  id: string;
  type: WorkflowActionType;
  delayMinutes?: number;
  params: Record<string, any>;
  requireApproval?: boolean;
  approvalRole?: string;
}

export interface WorkflowAudienceFilter {
  membershipTypes?: string[];
  membershipStatuses?: string[];
  trainerId?: string;
  minDaysSinceJoin?: number;
  maxDaysSinceJoin?: number;
  tags?: string[];
  excludeTags?: string[];
  customConditions?: WorkflowCondition[];
}

export interface WorkflowStopCondition {
  eventTypes?: string[];
  stopIfActivityDetected?: boolean;
  stopIfGoalAchieved?: boolean;
  customConditions?: WorkflowCondition[];
}

export type CooldownScope = 'MEMBER' | 'WORKFLOW' | 'MEMBER_AND_WORKFLOW' | 'ORGANISATION';

export interface WorkflowSafetyPolicy {
  cooldownHours?: number;
  cooldownScope?: CooldownScope;
  maxExecutionsPerMember?: number;
  maxDailyExecutions?: number;
  respectQuietHours?: boolean;
  quietHoursStart?: string; // '22:00'
  quietHoursEnd?: string;   // '07:00'
  timezone?: string;
}

export interface WorkflowTriggerConfig {
  triggerType: WorkflowTriggerType;
  parameters: Record<string, any>;
  conditions?: WorkflowCondition;
}

export type WorkflowInstanceStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'WAITING'
  | 'AWAITING_APPROVAL'
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED'
  | 'EXPIRED'
  | 'SUPPRESSED'
  // Aliases for compatibility
  | 'WAITING_DELAY'
  | 'EXECUTING'
  | 'REJECTED';

export type WorkflowExecutionStatus =
  | 'SUCCESS'
  | 'FAILED'
  | 'SKIPPED'
  | 'WAITING_APPROVAL'
  | 'CANCELLED';

export interface WorkflowTriggerEvent {
  organisationId: string;
  outletId?: string | null;
  memberId: string;
  eventType: WorkflowTriggerType | string;
  occurredAt?: string;
  payload: Record<string, any>;
  idempotencyKey?: string;
}

export interface WorkflowConditionEvaluationResult {
  condition: WorkflowCondition;
  passed: boolean;
  field?: string;
  actualValue?: any;
  expectedValue?: any;
  operator?: ConditionOperator;
  reason?: string;
}

export interface WorkflowDryRunResultDto {
  workflowId: string;
  memberId: string;
  triggered: boolean;
  triggerReason?: string;
  conditionsEvaluated: WorkflowConditionEvaluationResult[];
  actionsPlanned: Array<{
    stepIndex: number;
    actionType: WorkflowActionType;
    params: Record<string, any>;
    delayMinutes?: number;
    willRequireApproval: boolean;
    approvalRole?: string;
  }>;
  safeguardChecks: Array<{
    check: string;
    passed: boolean;
    detail?: string;
  }>;
  outcome: 'WOULD_EXECUTE' | 'WOULD_REQUIRE_APPROVAL' | 'WOULD_BE_BLOCKED' | 'DID_NOT_MATCH';
  blockReason?: string;
}

export interface WorkflowAnalyticsDto {
  workflowId: string;
  totalInstances: number;
  completedInstances: number;
  activeInstances: number;
  cancelledInstances: number;
  failedInstances: number;
  actionsExecuted: Record<string, number>;
  subsequentVisitsFollowingWorkflow: number;
  subsequentBookingsFollowingWorkflow: number;
  engagementTrendFollowingWorkflow: 'INCREASED' | 'STABLE' | 'DECREASED' | 'INSUFFICIENT_DATA';
  lastEvaluatedAt: string;
}

export interface EngagementWorkflowSummaryDto {
  id: string;
  organisationId: string;
  outletId?: string | null;
  name: string;
  description?: string | null;
  triggerType: WorkflowTriggerType;
  status: WorkflowStatus;
  approvalMode: WorkflowApprovalMode;
  currentVersion: number;
  activeInstanceCount?: number;
  completedInstanceCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EngagementWorkflowDetailDto extends EngagementWorkflowSummaryDto {
  triggerConfig: WorkflowTriggerConfig;
  audienceFilter?: WorkflowAudienceFilter | null;
  stopConditions?: WorkflowStopCondition | null;
  safetyPolicy?: WorkflowSafetyPolicy | null;
  actions: WorkflowActionDefinition[];
  tags: string[];
}

export interface CreateWorkflowDto {
  organisationId?: string;
  outletId?: string | null;
  name: string;
  description?: string;
  category?: WorkflowCategory;
  triggerType: WorkflowTriggerType;
  triggerConfig: WorkflowTriggerConfig;
  audienceFilter?: WorkflowAudienceFilter;
  stopConditions?: WorkflowStopCondition;
  safetyPolicy?: WorkflowSafetyPolicy;
  actions: WorkflowActionDefinition[];
  approvalMode?: WorkflowApprovalMode;
  tags?: string[];
}

export interface UpdateWorkflowDto {
  name?: string;
  description?: string;
  category?: WorkflowCategory;
  triggerType?: WorkflowTriggerType;
  triggerConfig?: WorkflowTriggerConfig;
  audienceFilter?: WorkflowAudienceFilter;
  stopConditions?: WorkflowStopCondition;
  safetyPolicy?: WorkflowSafetyPolicy;
  actions?: WorkflowActionDefinition[];
  approvalMode?: WorkflowApprovalMode;
  tags?: string[];
}

export interface WorkflowInstanceDetailDto {
  id: string;
  workflowId: string;
  workflowName: string;
  workflowVersion: number;
  organisationId: string;
  outletId?: string | null;
  memberId: string;
  memberName?: string;
  currentStepIndex: number;
  totalSteps: number;
  status: WorkflowInstanceStatus;
  outcome?: string | null;
  outcomeRecordedAt?: string | null;
  outcomeDetails?: Record<string, any> | null;
  triggerPayload: Record<string, any>;
  nextExecutionAt?: string | null;
  stoppedReason?: string | null;
  startedAt: string;
  completedAt?: string | null;
  executions: WorkflowExecutionDetailDto[];
}

export interface WorkflowExecutionDetailDto {
  id: string;
  instanceId: string;
  stepIndex: number;
  actionType: WorkflowActionType;
  actionPayload: Record<string, any>;
  status: WorkflowExecutionStatus;
  resultPayload?: Record<string, any> | null;
  errorMessage?: string | null;
  approvedByUserId?: string | null;
  executedAt: string;
}

export interface ApproveWorkflowActionDto {
  approved: boolean;
  notes?: string;
}

export interface RejectWorkflowActionDto {
  reason: string;
}

export interface AIAssistWorkflowPromptDto {
  intent: string;
  targetAudience?: string;
  preferredTone?: 'SUPPORTIVE' | 'ENERGETIC' | 'PROFESSIONAL' | 'URGENT';
  language?: 'en' | 'ne';
  organisationId: string;
}

export interface AIAssistWorkflowResponseDto {
  recommendedName: string;
  description: string;
  triggerType: WorkflowTriggerType;
  triggerConfig: WorkflowTriggerConfig;
  audienceFilter: WorkflowAudienceFilter;
  stopConditions: WorkflowStopCondition;
  safetyPolicy: WorkflowSafetyPolicy;
  actions: WorkflowActionDefinition[];
  suggestedMessageTemplates: Array<{
    channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';
    subject?: string;
    body: string;
    language: 'en' | 'ne';
  }>;
  explanation: string;
}
