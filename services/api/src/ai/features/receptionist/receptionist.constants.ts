/**
 * Day 31 — AI Receptionist Constants & Configuration Defaults
 */

import { AIFeature } from '@fitcore/types';

export const RECEPTIONIST_FEATURE: AIFeature = 'RECEPTIONIST';
export const RECEPTIONIST_PROMPT_KEY = 'receptionist.v1';
export const RECEPTIONIST_PROMPT_VERSION = 1;

export const RECEPTIONIST_AUDIT_EVENTS = {
  RECEPTIONIST_CREATED: 'RECEPTIONIST_CREATED',
  RECEPTIONIST_UPDATED: 'RECEPTIONIST_UPDATED',
  RECEPTIONIST_ACTIVATED: 'RECEPTIONIST_ACTIVATED',
  RECEPTIONIST_PAUSED: 'RECEPTIONIST_PAUSED',
  RECEPTIONIST_MESSAGE_RECEIVED: 'RECEPTIONIST_MESSAGE_RECEIVED',
  RECEPTIONIST_RESPONSE_GENERATED: 'RECEPTIONIST_RESPONSE_GENERATED',
  RECEPTIONIST_TOOL_CALLED: 'RECEPTIONIST_TOOL_CALLED',
  RECEPTIONIST_HANDOFF_CREATED: 'RECEPTIONIST_HANDOFF_CREATED',
  RECEPTIONIST_HANDOFF_COMPLETED: 'RECEPTIONIST_HANDOFF_COMPLETED',
  RECEPTIONIST_SAFETY_TRIGGERED: 'RECEPTIONIST_SAFETY_TRIGGERED',
  RECEPTIONIST_UNKNOWN_INFORMATION: 'RECEPTIONIST_UNKNOWN_INFORMATION',
  RECEPTIONIST_KNOWLEDGE_RETRIEVED: 'RECEPTIONIST_KNOWLEDGE_RETRIEVED',
} as const;

export const RECEPTIONIST_INTENTS = [
  // Information
  'GYM_INFORMATION',
  'OPENING_HOURS',
  'LOCATION',
  'FACILITIES',
  'MEMBERSHIP_INFORMATION',
  'MEMBERSHIP_PRICING',
  'CLASS_INFORMATION',
  'TRAINER_INFORMATION',
  'POLICY_INFORMATION',
  'TRIAL_INFORMATION',
  'CONTACT_INFORMATION',
  'PARKING_INFORMATION',
  'GUEST_INFORMATION',
  // Actions
  'BOOKING',
  'CANCELLATION',
  'RESCHEDULE',
  'MEMBERSHIP_CHANGE',
  'LEAD_CAPTURE',
  'HUMAN_HANDOFF',
  // General
  'GREETING',
  'THANKS',
  'GOODBYE',
  'UNKNOWN',
] as const;

export const RECEPTIONIST_SAFETY_PATTERNS = {
  PROMPT_INJECTION: [
    /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
    /system\s+prompt/i,
    /reveal\s+(your\s+)?(instructions|prompt)/i,
    /show\s+(me\s+)?(your\s+)?(developer\s+prompt|rules)/i,
    /you\s+are\s+now\s+in\s+developer\s+mode/i,
    /disregard\s+(all\s+)?rules/i,
    /send\s+(all\s+)?customer\s+data\s+to/i,
  ],
  MEDICAL_EMERGENCY: [
    /chest\s+pain/i,
    /heart\s+attack/i,
    /cannot\s+breathe|difficulty\s+breathing/i,
    /severe\s+(injury|bleeding|fracture)/i,
    /acute\s+swelling/i,
    /loss\s+of\s+consciousness/i,
  ],
  SHAMING_OR_ABUSIVE: [
    /\b(lazy|fat|worthless|disgrace|loser|failure)\b/i,
  ],
};

export const PROMPT_INJECTION_PATTERNS = RECEPTIONIST_SAFETY_PATTERNS.PROMPT_INJECTION;

export const SENSITIVE_DATA_PATTERNS = [
  /\b(?:\d[ -]*?){13,19}\b/, // Credit card numbers
  /\b(?:bearer\s+)?[a-zA-Z0-9_\-\.]{20,}\b/i, // Tokens
  /password\s*[:=]\s*\S+/i,
];

export const MEDICAL_TERMS_PATTERNS = [
  ...RECEPTIONIST_SAFETY_PATTERNS.MEDICAL_EMERGENCY,
  /diagnos(e|is)/i,
  /torn\s+muscle/i,
  /prescribe\s+(medication|treatment)/i,
  /severe\s+pain/i,
];

export const RECEPTIONIST_DEFAULT_GREETING =
  'Hi there! Welcome to FitCore. How can I help you today with our gym facilities, memberships, or classes?';

export const RECEPTIONIST_DEFAULT_GREETING_NEPALI =
  'नमस्ते! FitCore मा स्वागत छ। हाम्रो जिम सुविधा, सदस्यता वा कक्षाहरू बारे म तपाईंलाई कसरी मद्दत गर्न सक्छु?';
