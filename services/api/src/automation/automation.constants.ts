/**
 * Day 30 — Automated Engagement Workflows Constants & Defaults
 */

import { WorkflowTriggerType, WorkflowActionType } from '@fitcore/types';

export const WORKFLOW_DEFAULTS = {
  COOLDOWN_HOURS: 24,
  MAX_EXECUTIONS_PER_MEMBER: 1,
  MAX_DAILY_EXECUTIONS: 500,
  QUIET_HOURS_START: '22:00',
  QUIET_HOURS_END: '07:00',
  DEFAULT_TIMEZONE: 'Asia/Kathmandu',
};

export const PROHIBITED_WORKFLOW_ACTIONS = [
  'CANCEL_MEMBERSHIP',
  'MODIFY_PRICE',
  'APPLY_DISCOUNT',
  'UPDATE_PAYMENT_METHOD',
  'REVOKE_GATE_ACCESS',
  'TERMINATE_CONTRACT',
];

export interface WorkflowTemplateDefinition {
  templateKey: string;
  name: string;
  description: string;
  triggerType: WorkflowTriggerType;
  triggerConfig: {
    triggerType: WorkflowTriggerType;
    parameters: Record<string, any>;
    conditions?: any;
  };
  audienceFilter?: Record<string, any>;
  stopConditions?: Record<string, any>;
  safetyPolicy?: Record<string, any>;
  actions: Array<{
    id: string;
    type: WorkflowActionType;
    delayMinutes?: number;
    params: Record<string, any>;
    requireApproval?: boolean;
    approvalRole?: string;
  }>;
  tags: string[];
}

export const SEED_WORKFLOW_TEMPLATES: WorkflowTemplateDefinition[] = [
  {
    templateKey: 'INACTIVE_MEMBER_14D',
    name: '14-Day Inactivity Check-in',
    description: 'Engages members who have not visited the gym in 14 days with an encouraging check-in and creates a staff task.',
    triggerType: 'INACTIVITY_DAYS_REACHED',
    triggerConfig: {
      triggerType: 'INACTIVITY_DAYS_REACHED',
      parameters: { inactivityDays: 14 },
      conditions: {
        field: 'inactivityDays',
        operator: 'GREATER_THAN_OR_EQUAL',
        value: 14,
        fieldType: 'NUMBER',
      },
    },
    safetyPolicy: {
      cooldownHours: 168, // 7 days
      cooldownScope: 'MEMBER_AND_WORKFLOW',
      respectQuietHours: true,
    },
    stopConditions: {
      stopIfActivityDetected: true,
    },
    actions: [
      {
        id: 'step_1_comm',
        type: 'SEND_COMMUNICATION',
        params: {
          channel: 'SMS',
          message: 'Hi {{firstName}}, we missed you at the gym this past fortnight! Need help getting back into your routine? Let us know if you want to book a session.',
          messageNepali: 'नमस्ते {{firstName}}, बितेका दुई हप्तामा तपाईंलाई जिममा देख्न पाइएन! आफ्नो दिनचर्या पुनः सुरु गर्न कुनै मद्दत चाहिन्छ? सम्पर्क गर्नुहोस्।',
        },
        requireApproval: false,
      },
      {
        id: 'step_2_staff_task',
        type: 'CREATE_STAFF_TASK',
        params: {
          title: 'Follow up with inactive member: {{firstName}} {{lastName}}',
          description: 'Member has been inactive for 14+ days. Review their workout history and give a gentle check-in call.',
          priority: 'MEDIUM',
        },
        requireApproval: false,
      },
    ],
    tags: ['retention', 'inactivity', 'automated'],
  },
  {
    templateKey: 'ATTENDANCE_DROP',
    name: 'Attendance Decline Alert & Coach Follow-up',
    description: 'Triggers when a member attendance drops by 40% or more compared to their previous 4-week average.',
    triggerType: 'ATTENDANCE_DROP_PERCENT',
    triggerConfig: {
      triggerType: 'ATTENDANCE_DROP_PERCENT',
      parameters: { dropPercent: 40 },
      conditions: {
        field: 'attendanceDropPercent',
        operator: 'GREATER_THAN_OR_EQUAL',
        value: 40,
        fieldType: 'NUMBER',
      },
    },
    safetyPolicy: {
      cooldownHours: 336, // 14 days
      cooldownScope: 'MEMBER_AND_WORKFLOW',
      respectQuietHours: true,
    },
    actions: [
      {
        id: 'step_1_notify_trainer',
        type: 'NOTIFY_ASSIGNED_TRAINER',
        params: {
          title: 'Attendance drop detected for {{firstName}}',
          message: 'Member attendance dropped by 40% this cycle. Please reach out during your next session or send an encouraging note.',
        },
        requireApproval: false,
      },
      {
        id: 'step_2_task',
        type: 'CREATE_STAFF_TASK',
        params: {
          title: 'Review attendance drop: {{firstName}} {{lastName}}',
          description: 'Attendance dropped >= 40%. Verify if injury or schedule change occurred.',
          priority: 'HIGH',
        },
        requireApproval: false,
      },
    ],
    tags: ['attendance', 'trainer', 'coaching'],
  },
  {
    templateKey: 'CLASS_NO_SHOW_FOLLOWUP',
    name: 'Class No-Show Follow-up',
    description: 'Sends an understanding follow-up 30 minutes after a member misses a booked group fitness class.',
    triggerType: 'CLASS_MISSED',
    triggerConfig: {
      triggerType: 'CLASS_MISSED',
      parameters: {},
    },
    safetyPolicy: {
      cooldownHours: 24,
      cooldownScope: 'MEMBER_AND_WORKFLOW',
      respectQuietHours: true,
    },
    actions: [
      {
        id: 'step_1_comm',
        type: 'SEND_COMMUNICATION',
        delayMinutes: 30,
        params: {
          channel: 'PUSH',
          subject: 'We missed you in class!',
          message: 'Hey {{firstName}}, we noticed you could not make it to {{className}} today. Hope everything is alright! Check the schedule to rebook when you are ready.',
        },
        requireApproval: false,
      },
    ],
    tags: ['classes', 'no-show', 'engagement'],
  },
  {
    templateKey: 'MEMBERSHIP_EXPIRING_14D',
    name: '14-Day Membership Expiration Notice',
    description: 'Alerts members two weeks before their membership expires with renewal information and creates a staff renewal task.',
    triggerType: 'MEMBERSHIP_EXPIRING',
    triggerConfig: {
      triggerType: 'MEMBERSHIP_EXPIRING',
      parameters: { daysUntilExpiration: 14 },
      conditions: {
        field: 'daysUntilExpiration',
        operator: 'LESS_THAN_OR_EQUAL',
        value: 14,
        fieldType: 'NUMBER',
      },
    },
    safetyPolicy: {
      cooldownHours: 168, // 7 days
      cooldownScope: 'MEMBER_AND_WORKFLOW',
      respectQuietHours: true,
    },
    actions: [
      {
        id: 'step_1_email',
        type: 'SEND_COMMUNICATION',
        params: {
          channel: 'EMAIL',
          subject: 'Your FitCore membership expires in 14 days',
          message: 'Dear {{firstName}}, your membership is set to expire on {{expiryDate}}. Visit the front desk or renew through the app to maintain your fitness momentum!',
          messageNepali: 'प्रिय {{firstName}}, तपाईंको सदस्यता {{expiryDate}} मा समाप्त हुँदैछ। निरन्तरता दिन एपबाट नवीकरण गर्नुहोस्।',
        },
        requireApproval: false,
      },
      {
        id: 'step_2_staff_task',
        type: 'CREATE_STAFF_TASK',
        params: {
          title: 'Renewal follow-up: {{firstName}} {{lastName}} (14 days left)',
          description: 'Membership expires on {{expiryDate}}. Offer renewal assistance.',
          priority: 'MEDIUM',
        },
        requireApproval: false,
      },
    ],
    tags: ['membership', 'renewal', 'retention'],
  },
  {
    templateKey: 'MEMBER_REENGAGED',
    name: 'Re-engagement Celebration',
    description: 'Warmly welcomes back a member visiting after a period of prolonged inactivity.',
    triggerType: 'MEMBER_REENGAGED',
    triggerConfig: {
      triggerType: 'MEMBER_REENGAGED',
      parameters: { previousInactivityDays: 14 },
    },
    safetyPolicy: {
      cooldownHours: 720, // 30 days
      cooldownScope: 'MEMBER_AND_WORKFLOW',
      respectQuietHours: true,
    },
    actions: [
      {
        id: 'step_1_notif',
        type: 'SEND_IN_APP_NOTIFICATION',
        params: {
          title: 'Welcome back!',
          message: 'Great to see you on the gym floor today, {{firstName}}! Keep up the great energy.',
        },
        requireApproval: false,
      },
      {
        id: 'step_2_note',
        type: 'ADD_ENGAGEMENT_NOTE',
        params: {
          note: 'Member re-engaged following 14+ days of inactivity.',
        },
        requireApproval: false,
      },
    ],
    tags: ['reengagement', 'celebration'],
  },
  {
    templateKey: 'NEW_MEMBER_ONBOARDING',
    name: 'New Member 72-Hour Check-in',
    description: 'Encourages new members 3 days after sign-up to book their initial fitness consultation.',
    triggerType: 'ONBOARDING_STEP_COMPLETED',
    triggerConfig: {
      triggerType: 'ONBOARDING_STEP_COMPLETED',
      parameters: { step: 'WELCOME' },
    },
    safetyPolicy: {
      cooldownHours: 720,
      cooldownScope: 'MEMBER_AND_WORKFLOW',
      respectQuietHours: true,
    },
    actions: [
      {
        id: 'step_1_comm',
        type: 'SEND_COMMUNICATION',
        delayMinutes: 4320, // 72 hours
        params: {
          channel: 'SMS',
          message: 'Hi {{firstName}}, how are your first few days at FitCore going? Remember you have a complimentary fitness consultation included in your membership. Book it today at the front desk!',
        },
        requireApproval: false,
      },
    ],
    tags: ['onboarding', 'welcome', 'activation'],
  },
  {
    templateKey: 'MILESTONE_CELEBRATION',
    name: 'Workout Milestone Celebration',
    description: 'Congratulates a member upon completing a significant milestone like 25, 50, or 100 workouts.',
    triggerType: 'WORKOUT_MILESTONE_REACHED',
    triggerConfig: {
      triggerType: 'WORKOUT_MILESTONE_REACHED',
      parameters: { milestoneCount: 50 },
    },
    safetyPolicy: {
      cooldownHours: 168,
      cooldownScope: 'MEMBER_AND_WORKFLOW',
      respectQuietHours: false,
    },
    actions: [
      {
        id: 'step_1_in_app',
        type: 'SEND_IN_APP_NOTIFICATION',
        params: {
          title: 'Milestone Unlocked! 🎉',
          message: 'Incredible dedication, {{firstName}}! You just hit {{milestoneCount}} completed workouts with FitCore. Keep inspiring everyone!',
        },
        requireApproval: false,
      },
      {
        id: 'step_2_tag',
        type: 'ADD_MEMBER_TAG',
        params: {
          tag: 'Milestone-50',
        },
        requireApproval: false,
      },
    ],
    tags: ['milestone', 'celebration', 'gamification'],
  },
];
