/**
 * Day 30 — Canonical Workflow Action Definitions
 */

import { WorkflowActionType } from '@fitcore/types';

export interface ActionDefinitionMetadata {
  actionType: WorkflowActionType;
  category: 'COMMUNICATION' | 'STAFF' | 'NOTIFICATION' | 'WORKFLOW_CONTROL';
  displayName: string;
  description: string;
  supportsApproval: boolean;
  requiredParams: string[];
  optionalParams: string[];
}

export const WORKFLOW_ACTION_DEFINITIONS: Record<string, ActionDefinitionMetadata> = {
  // Communication Actions
  SEND_COMMUNICATION: {
    actionType: 'SEND_COMMUNICATION',
    category: 'COMMUNICATION',
    displayName: 'Send Communication',
    description: 'Routes outbound communication through Day 28 Communication Engine.',
    supportsApproval: true,
    requiredParams: ['channel', 'message'],
    optionalParams: ['subject', 'messageNepali', 'templateId', 'variables'],
  },
  SEND_IN_APP: {
    actionType: 'SEND_IN_APP',
    category: 'COMMUNICATION',
    displayName: 'Send In-App Notification',
    description: 'Displays notification banner inside the mobile app.',
    supportsApproval: false,
    requiredParams: ['title', 'message'],
    optionalParams: ['variables', 'priority'],
  },
  SEND_PUSH: {
    actionType: 'SEND_PUSH',
    category: 'COMMUNICATION',
    displayName: 'Send Push Notification',
    description: 'Dispatches push notification to member device via Day 28 engine.',
    supportsApproval: true,
    requiredParams: ['title', 'message'],
    optionalParams: ['variables', 'priority'],
  },
  SEND_EMAIL: {
    actionType: 'SEND_EMAIL',
    category: 'COMMUNICATION',
    displayName: 'Send Email',
    description: 'Dispatches email message via Day 28 engine.',
    supportsApproval: true,
    requiredParams: ['subject', 'message'],
    optionalParams: ['templateId', 'variables'],
  },
  SEND_SMS: {
    actionType: 'SEND_SMS',
    category: 'COMMUNICATION',
    displayName: 'Send SMS',
    description: 'Dispatches SMS text via Day 28 engine.',
    supportsApproval: true,
    requiredParams: ['message'],
    optionalParams: ['messageNepali', 'variables'],
  },
  SEND_WHATSAPP: {
    actionType: 'SEND_WHATSAPP',
    category: 'COMMUNICATION',
    displayName: 'Send WhatsApp Message',
    description: 'Dispatches approved WhatsApp notification template.',
    supportsApproval: true,
    requiredParams: ['message'],
    optionalParams: ['templateId', 'variables'],
  },

  // Staff & Task Actions
  CREATE_STAFF_TASK: {
    actionType: 'CREATE_STAFF_TASK',
    category: 'STAFF',
    displayName: 'Create Staff Task',
    description: 'Enqueues a task for staff follow-up in the retention tasks queue.',
    supportsApproval: false,
    requiredParams: ['title', 'description'],
    optionalParams: ['priority', 'assignedStaffId', 'dueDays'],
  },
  ASSIGN_TRAINER_TASK: {
    actionType: 'ASSIGN_TRAINER_TASK',
    category: 'STAFF',
    displayName: 'Assign Trainer Task',
    description: 'Creates a coaching task specifically for the assigned personal trainer.',
    supportsApproval: false,
    requiredParams: ['title', 'description'],
    optionalParams: ['priority', 'dueDays'],
  },
  CREATE_RETENTION_FOLLOWUP: {
    actionType: 'CREATE_RETENTION_FOLLOWUP',
    category: 'STAFF',
    displayName: 'Create Retention Follow-up',
    description: 'Creates retention outreach item requiring staff review and check-in.',
    supportsApproval: true,
    requiredParams: ['title', 'description'],
    optionalParams: ['priority', 'recommendedChannel', 'dueDays'],
  },

  // Notifications
  NOTIFY_STAFF: {
    actionType: 'NOTIFY_STAFF',
    category: 'NOTIFICATION',
    displayName: 'Notify Staff',
    description: 'Sends in-app alert to active staff on shift.',
    supportsApproval: false,
    requiredParams: ['title', 'message'],
    optionalParams: ['priority'],
  },
  NOTIFY_TRAINER: {
    actionType: 'NOTIFY_TRAINER',
    category: 'NOTIFICATION',
    displayName: 'Notify Assigned Trainer',
    description: 'Alerts member’s assigned trainer directly.',
    supportsApproval: false,
    requiredParams: ['title', 'message'],
    optionalParams: ['priority'],
  },
  NOTIFY_OUTLET_MANAGER: {
    actionType: 'NOTIFY_OUTLET_MANAGER',
    category: 'NOTIFICATION',
    displayName: 'Notify Outlet Manager',
    description: 'Escalates issue or alert to the gym manager.',
    supportsApproval: false,
    requiredParams: ['title', 'message'],
    optionalParams: ['priority'],
  },

  // Workflow Control Actions
  WAIT: {
    actionType: 'WAIT',
    category: 'WORKFLOW_CONTROL',
    displayName: 'Wait / Delay',
    description: 'Pauses instance execution for designated duration or until next daylight window.',
    supportsApproval: false,
    requiredParams: ['delayMinutes'],
    optionalParams: ['untilTime'],
  },
  END_WORKFLOW: {
    actionType: 'END_WORKFLOW',
    category: 'WORKFLOW_CONTROL',
    displayName: 'End Workflow',
    description: 'Terminates the workflow instance marking outcome as COMPLETED.',
    supportsApproval: false,
    requiredParams: [],
    optionalParams: ['outcome', 'reason'],
  },
  CANCEL_WORKFLOW: {
    actionType: 'CANCEL_WORKFLOW',
    category: 'WORKFLOW_CONTROL',
    displayName: 'Cancel Workflow',
    description: 'Terminates remaining steps marking instance as CANCELLED.',
    supportsApproval: false,
    requiredParams: [],
    optionalParams: ['reason'],
  },
  START_WORKFLOW: {
    actionType: 'START_WORKFLOW',
    category: 'WORKFLOW_CONTROL',
    displayName: 'Start Sub-Workflow',
    description: 'Triggers a secondary workflow for the same member.',
    supportsApproval: false,
    requiredParams: ['targetWorkflowId'],
    optionalParams: ['payload'],
  },
  BRANCH: {
    actionType: 'BRANCH',
    category: 'WORKFLOW_CONTROL',
    displayName: 'Conditional Branching (IF / ELSE IF / ELSE)',
    description: 'Evaluates deterministic branch criteria to select next action path.',
    supportsApproval: false,
    requiredParams: ['branches'],
    optionalParams: ['defaultActions'],
  },
};
