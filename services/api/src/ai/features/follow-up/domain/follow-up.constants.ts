/**
 * Day 39 — Automated Follow-Up Domain Constants & System Templates
 */

import {
  FollowUpSequenceType,
  FollowUpStepChannel,
  FollowUpMessageMode,
} from '@fitcore/types';

export interface DefaultStepDefinition {
  stepOrder: number;
  name: string;
  delayMinutes: number;
  channel: FollowUpStepChannel;
  messageMode: FollowUpMessageMode;
  fallbackChannel?: FollowUpStepChannel;
  requiresApproval: boolean;
  stopOnReply: boolean;
  stopOnBooking: boolean;
  stopOnConversion: boolean;
  stopOnStaffHandoff: boolean;
  templateBody: string;
  templateSubject?: string;
}

export interface DefaultSequenceDefinition {
  sequenceType: FollowUpSequenceType;
  name: string;
  description: string;
  triggerType: string;
  cooldownHours: number;
  maxFollowUpsPerWeek: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  steps: DefaultStepDefinition[];
}

export const DEFAULT_FOLLOW_UP_TEMPLATES: Record<string, DefaultSequenceDefinition> = {
  LEAD_FOLLOW_UP: {
    sequenceType: 'LEAD_FOLLOW_UP',
    name: 'New Lead Standard Follow-Up',
    description: 'Day 0, Day 1, Day 3, and Day 7 progressive outreach for newly captured leads.',
    triggerType: 'LEAD_CREATED',
    cooldownHours: 0,
    maxFollowUpsPerWeek: 4,
    quietHoursStart: '23:30',
    quietHoursEnd: '06:00',
    steps: [
      {
        stepOrder: 1,
        name: 'Day 0 Instant Welcome',
        delayMinutes: 0,
        channel: 'WHATSAPP',
        fallbackChannel: 'SMS',
        messageMode: 'PERSONALIZED_TEMPLATE',
        requiresApproval: false,
        stopOnReply: true,
        stopOnBooking: true,
        stopOnConversion: true,
        stopOnStaffHandoff: true,
        templateBody:
          'Hi {{firstName}}, thank you for contacting {{outletName}}! We are excited to support your fitness journey. Would you like to come in for a complimentary trial pass this week?',
      },
      {
        stepOrder: 2,
        name: 'Day 1 Schedule Check-In',
        delayMinutes: 1440,
        channel: 'WHATSAPP',
        fallbackChannel: 'SMS',
        messageMode: 'PERSONALIZED_TEMPLATE',
        requiresApproval: false,
        stopOnReply: true,
        stopOnBooking: true,
        stopOnConversion: true,
        stopOnStaffHandoff: true,
        templateBody:
          'Hi {{firstName}}, checking in from {{outletName}}! We would love to show you around our facility. Do mornings or evenings suit your schedule best?',
      },
      {
        stepOrder: 3,
        name: 'Day 3 Goals & Programs Overview',
        delayMinutes: 4320,
        channel: 'EMAIL',
        fallbackChannel: 'SMS',
        messageMode: 'PERSONALIZED_TEMPLATE',
        requiresApproval: false,
        stopOnReply: true,
        stopOnBooking: true,
        stopOnConversion: true,
        stopOnStaffHandoff: true,
        templateSubject: 'Your fitness goals at {{outletName}}',
        templateBody:
          'Hi {{firstName}},\n\nWe wanted to follow up regarding your fitness goals! At {{outletName}}, we offer coaching, classes, and open gym hours tailored to your routine.\n\nReply to this email or click below to schedule your free facility tour!\n\nBest regards,\nThe {{outletName}} Team',
      },
      {
        stepOrder: 4,
        name: 'Day 7 Final Check-In',
        delayMinutes: 10080,
        channel: 'SMS',
        messageMode: 'PERSONALIZED_TEMPLATE',
        requiresApproval: false,
        stopOnReply: true,
        stopOnBooking: true,
        stopOnConversion: true,
        stopOnStaffHandoff: true,
        templateBody:
          'Hi {{firstName}}, just a quick final follow-up from {{outletName}}. Whenever you are ready to visit or try a workout, our team is here to welcome you!',
      },
    ],
  },

  MISSED_CALL: {
    sequenceType: 'MISSED_CALL',
    name: 'Missed Call Rapid Follow-Up',
    description: 'Immediate text follow-up followed by Day 1 check-in for unanswered calls.',
    triggerType: 'MISSED_CALL_DETECTED',
    cooldownHours: 0,
    maxFollowUpsPerWeek: 2,
    quietHoursStart: '23:30',
    quietHoursEnd: '06:00',
    steps: [
      {
        stepOrder: 1,
        name: 'Immediate Missed Call SMS',
        delayMinutes: 0,
        channel: 'SMS',
        messageMode: 'PERSONALIZED_TEMPLATE',
        requiresApproval: false,
        stopOnReply: true,
        stopOnBooking: true,
        stopOnConversion: true,
        stopOnStaffHandoff: true,
        templateBody:
          'Hi, we missed your call to {{outletName}}! How can we assist you today? Feel free to reply here or let us know if you would like us to call you right back.',
      },
      {
        stepOrder: 2,
        name: 'Day 1 Missed Call Check',
        delayMinutes: 1440,
        channel: 'WHATSAPP',
        fallbackChannel: 'SMS',
        messageMode: 'PERSONALIZED_TEMPLATE',
        requiresApproval: false,
        stopOnReply: true,
        stopOnBooking: true,
        stopOnConversion: true,
        stopOnStaffHandoff: true,
        templateBody:
          'Hi {{firstName}}, following up from our missed call yesterday at {{outletName}}. Would you like to schedule a tour or chat with our team?',
      },
    ],
  },

  TRIAL_FOLLOW_UP: {
    sequenceType: 'TRIAL_FOLLOW_UP',
    name: 'Post-Trial Workout Experience Follow-Up',
    description: 'Post-session check-in, Day 1 feedback, and Day 3 membership review.',
    triggerType: 'TRIAL_COMPLETED',
    cooldownHours: 0,
    maxFollowUpsPerWeek: 3,
    quietHoursStart: '23:30',
    quietHoursEnd: '06:00',
    steps: [
      {
        stepOrder: 1,
        name: 'Post-Workout Check-in',
        delayMinutes: 60,
        channel: 'WHATSAPP',
        fallbackChannel: 'SMS',
        messageMode: 'PERSONALIZED_TEMPLATE',
        requiresApproval: false,
        stopOnReply: true,
        stopOnBooking: true,
        stopOnConversion: true,
        stopOnStaffHandoff: true,
        templateBody:
          'Hi {{firstName}}, hope you enjoyed your workout at {{outletName}} today! How did the session feel?',
      },
      {
        stepOrder: 2,
        name: 'Day 1 Trial Feedback & Memberships',
        delayMinutes: 1440,
        channel: 'WHATSAPP',
        fallbackChannel: 'SMS',
        messageMode: 'PERSONALIZED_TEMPLATE',
        requiresApproval: false,
        stopOnReply: true,
        stopOnBooking: true,
        stopOnConversion: true,
        stopOnStaffHandoff: true,
        templateBody:
          'Hi {{firstName}}, we loved having you in! Would you like us to walk you through our membership options to keep your momentum going?',
      },
      {
        stepOrder: 3,
        name: 'Day 3 Continuation Offer',
        delayMinutes: 4320,
        channel: 'EMAIL',
        fallbackChannel: 'SMS',
        messageMode: 'PERSONALIZED_TEMPLATE',
        requiresApproval: false,
        stopOnReply: true,
        stopOnBooking: true,
        stopOnConversion: true,
        stopOnStaffHandoff: true,
        templateSubject: 'Continue your fitness journey at {{outletName}}',
        templateBody:
          'Hi {{firstName}},\n\nFollowing up on your recent trial session at {{outletName}}! We have membership options with zero lock-in contracts and full facility access.\n\nLet us know if you would like to set up your membership today!\n\nBest regards,\nThe {{outletName}} Team',
      },
    ],
  },

  TOUR_FOLLOW_UP: {
    sequenceType: 'TOUR_FOLLOW_UP',
    name: 'Post-Facility Tour Follow-Up',
    description: 'Post-tour check-in, Day 1 follow-up, and Day 3 membership onboarding.',
    triggerType: 'TOUR_COMPLETED',
    cooldownHours: 0,
    maxFollowUpsPerWeek: 3,
    quietHoursStart: '23:30',
    quietHoursEnd: '06:00',
    steps: [
      {
        stepOrder: 1,
        name: 'Post-Tour Thank You',
        delayMinutes: 120,
        channel: 'WHATSAPP',
        fallbackChannel: 'SMS',
        messageMode: 'PERSONALIZED_TEMPLATE',
        requiresApproval: false,
        stopOnReply: true,
        stopOnBooking: true,
        stopOnConversion: true,
        stopOnStaffHandoff: true,
        templateBody:
          'Hi {{firstName}}, it was wonderful meeting you during your tour at {{outletName}} today! Let us know if you have any questions as you consider your options.',
      },
      {
        stepOrder: 2,
        name: 'Day 1 Tour Follow-Up',
        delayMinutes: 1440,
        channel: 'SMS',
        messageMode: 'PERSONALIZED_TEMPLATE',
        requiresApproval: false,
        stopOnReply: true,
        stopOnBooking: true,
        stopOnConversion: true,
        stopOnStaffHandoff: true,
        templateBody:
          'Hi {{firstName}}, following up from your tour at {{outletName}}. Whenever you are ready to activate your membership, we will have everything prepared for you!',
      },
    ],
  },

  QUALIFIED_LEAD: {
    sequenceType: 'QUALIFIED_LEAD',
    name: 'Qualified High-Intent Lead Sequence',
    description: 'Fast-paced consultation sequence for leads with verified fitness goals and high intent.',
    triggerType: 'LEAD_QUALIFIED',
    cooldownHours: 0,
    maxFollowUpsPerWeek: 4,
    quietHoursStart: '23:30',
    quietHoursEnd: '06:00',
    steps: [
      {
        stepOrder: 1,
        name: 'Immediate Consultation Offer',
        delayMinutes: 0,
        channel: 'WHATSAPP',
        fallbackChannel: 'SMS',
        messageMode: 'AI_ASSISTED',
        requiresApproval: false,
        stopOnReply: true,
        stopOnBooking: true,
        stopOnConversion: true,
        stopOnStaffHandoff: true,
        templateBody:
          'Hi {{firstName}}, great chatting about your goals! Would you like to come in for an in-person orientation and trial at {{outletName}} this week?',
      },
      {
        stepOrder: 2,
        name: 'Day 1 Schedule Alignment',
        delayMinutes: 1440,
        channel: 'WHATSAPP',
        fallbackChannel: 'SMS',
        messageMode: 'AI_ASSISTED',
        requiresApproval: false,
        stopOnReply: true,
        stopOnBooking: true,
        stopOnConversion: true,
        stopOnStaffHandoff: true,
        templateBody:
          'Hi {{firstName}}, following up on your preferred schedule. We have orientation slots available. Would morning or evening work best for your visit?',
      },
      {
        stepOrder: 3,
        name: 'Day 3 Plan Recommendation',
        delayMinutes: 4320,
        channel: 'EMAIL',
        fallbackChannel: 'SMS',
        messageMode: 'PERSONALIZED_TEMPLATE',
        requiresApproval: false,
        stopOnReply: true,
        stopOnBooking: true,
        stopOnConversion: true,
        stopOnStaffHandoff: true,
        templateSubject: 'Your tailored membership recommendations at {{outletName}}',
        templateBody:
          'Hi {{firstName}},\n\nBased on your expressed interest, we have put together the ideal membership options to match your schedule and training style at {{outletName}}.\n\nReply to lock in your start date!\n\nWarm regards,\n{{outletName}} Sales Team',
      },
    ],
  },

  OFFER_FOLLOW_UP: {
    sequenceType: 'OFFER_FOLLOW_UP',
    name: 'Membership Offer Follow-Up',
    description: 'Structured check-in sequence following a presented contract or proposal.',
    triggerType: 'OFFER_PRESENTED',
    cooldownHours: 0,
    maxFollowUpsPerWeek: 3,
    quietHoursStart: '23:30',
    quietHoursEnd: '06:00',
    steps: [
      {
        stepOrder: 1,
        name: 'Day 1 Offer Clarification',
        delayMinutes: 1440,
        channel: 'WHATSAPP',
        fallbackChannel: 'SMS',
        messageMode: 'PERSONALIZED_TEMPLATE',
        requiresApproval: false,
        stopOnReply: true,
        stopOnBooking: true,
        stopOnConversion: true,
        stopOnStaffHandoff: true,
        templateBody:
          'Hi {{firstName}}, just checking if you had any questions regarding the membership proposal we shared yesterday for {{outletName}}?',
      },
      {
        stepOrder: 2,
        name: 'Day 3 Decision Support',
        delayMinutes: 4320,
        channel: 'EMAIL',
        fallbackChannel: 'SMS',
        messageMode: 'PERSONALIZED_TEMPLATE',
        requiresApproval: false,
        stopOnReply: true,
        stopOnBooking: true,
        stopOnConversion: true,
        stopOnStaffHandoff: true,
        templateSubject: 'Following up on your {{outletName}} membership offer',
        templateBody:
          'Hi {{firstName}},\n\nChecking in on your membership proposal for {{outletName}}. Our team is available if you would like to clarify any inclusions or schedule your first coaching session.\n\nWe look forward to welcoming you!\n\nBest regards,\n{{outletName}} Management',
      },
    ],
  },
};

export const CHANNEL_FALLBACK_MAP: Record<FollowUpStepChannel, FollowUpStepChannel | null> = {
  WHATSAPP: 'SMS',
  EMAIL: 'SMS',
  PUSH: 'IN_APP',
  SMS: null,
  IN_APP: null,
  VOICE: 'SMS',
};

export const FOLLOW_UP_AUDIT_ACTIONS = {
  SEQUENCE_CREATED: 'FOLLOWUP_SEQUENCE_CREATED',
  SEQUENCE_UPDATED: 'FOLLOWUP_SEQUENCE_UPDATED',
  SEQUENCE_PUBLISHED: 'FOLLOWUP_SEQUENCE_PUBLISHED',
  SEQUENCE_PAUSED: 'FOLLOWUP_SEQUENCE_PAUSED',
  ENROLLMENT_CREATED: 'FOLLOWUP_ENROLLMENT_CREATED',
  STEP_SCHEDULED: 'FOLLOWUP_STEP_SCHEDULED',
  STEP_EXECUTED: 'FOLLOWUP_STEP_EXECUTED',
  STEP_SUPPRESSED: 'FOLLOWUP_STEP_SUPPRESSED',
  MESSAGE_SENT: 'FOLLOWUP_MESSAGE_SENT',
  MESSAGE_FAILED: 'FOLLOWUP_MESSAGE_FAILED',
  RESPONSE_RECEIVED: 'FOLLOWUP_RESPONSE_RECEIVED',
  SEQUENCE_STOPPED: 'FOLLOWUP_SEQUENCE_STOPPED',
  SEQUENCE_COMPLETED: 'FOLLOWUP_SEQUENCE_COMPLETED',
  APPROVAL_REQUESTED: 'FOLLOWUP_APPROVAL_REQUESTED',
  APPROVED: 'FOLLOWUP_APPROVED',
  REJECTED: 'FOLLOWUP_REJECTED',
  AI_DRAFT_GENERATED: 'FOLLOWUP_AI_DRAFT_GENERATED',
  MANUAL_OVERRIDE: 'FOLLOWUP_MANUAL_OVERRIDE',
} as const;
