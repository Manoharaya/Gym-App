/**
 * FitCore AI Retention Agent Constants (Day 29)
 */

export const RETENTION_AGENT_FEATURE = 'RETENTION_AGENT';
export const RETENTION_AGENT_PROMPT_KEY = 'retention_agent.v1';
export const RETENTION_AGENT_PROMPT_VERSION = 1;

/**
 * Cooldown period to prevent repeatedly messaging the same member
 */
export const RETENTION_OUTREACH_COOLDOWN_DAYS = 14;

/**
 * Days post-outreach to monitor for member reengagement
 */
export const REENGAGEMENT_WINDOW_DAYS = 14;

/**
 * Retention Agent Events
 */
export const RETENTION_AGENT_EVENTS = {
  ANALYSIS_CREATED: 'retention_agent.analysis.created',
  RECOMMENDATION_CREATED: 'retention_agent.recommendation.created',
  OUTREACH_CREATED: 'retention_agent.outreach.created',
  OUTREACH_APPROVAL_REQUIRED: 'retention_agent.outreach.approval_required',
  OUTREACH_APPROVED: 'retention_agent.outreach.approved',
  OUTREACH_REJECTED: 'retention_agent.outreach.rejected',
  OUTREACH_SCHEDULED: 'retention_agent.outreach.scheduled',
  OUTREACH_SENT: 'retention_agent.outreach.sent',
  OUTREACH_DELIVERED: 'retention_agent.outreach.delivered',
  OUTREACH_FAILED: 'retention_agent.outreach.failed',
  MEMBER_RESPONDED: 'retention_agent.member.responded',
  MEMBER_REENGAGED: 'member.reengaged',
  WORKFLOW_COMPLETED: 'retention_agent.workflow.completed',
} as const;

/**
 * Retention Agent Audit Actions
 */
export const RETENTION_AGENT_AUDIT_ACTIONS = {
  ANALYSIS_VIEWED: 'RETENTION_AGENT_ANALYSIS_VIEWED',
  RECOMMENDATION_VIEWED: 'RETENTION_RECOMMENDATION_VIEWED',
  MESSAGE_DRAFT_VIEWED: 'RETENTION_MESSAGE_DRAFT_VIEWED',
  MESSAGE_EDITED: 'RETENTION_MESSAGE_EDITED',
  OUTREACH_APPROVED: 'RETENTION_OUTREACH_APPROVED',
  OUTREACH_REJECTED: 'RETENTION_OUTREACH_REJECTED',
  OUTREACH_CANCELLED: 'RETENTION_OUTREACH_CANCELLED',
  OUTCOME_RECORDED: 'RETENTION_OUTCOME_RECORDED',
} as const;
