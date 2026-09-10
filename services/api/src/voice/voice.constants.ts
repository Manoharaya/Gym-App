/**
 * Day 34 — Voice Domain Constants & Canonical Events
 */

export const VOICE_FEATURE = 'AI_RECEPTIONIST_VOICE';
export const VOICE_PROMPT_KEY = 'receptionist_voice.v1';

export const VOICE_EVENTS = {
  CALL_RECEIVED: 'VOICE_CALL_RECEIVED',
  CALL_CONNECTED: 'VOICE_CALL_CONNECTED',
  CALL_COMPLETED: 'VOICE_CALL_COMPLETED',
  CALL_ABANDONED: 'VOICE_CALL_ABANDONED',
  CALL_TRANSFERRED: 'VOICE_CALL_TRANSFERRED',
  LEAD_CREATED: 'VOICE_LEAD_CREATED',
  BOOKING_CREATED: 'VOICE_BOOKING_CREATED',
  CALLBACK_REQUESTED: 'VOICE_CALLBACK_REQUESTED',
  IDENTITY_VERIFIED: 'VOICE_IDENTITY_VERIFIED',
  BARGE_IN_DETECTED: 'VOICE_BARGE_IN_DETECTED',
  TOOL_CALLED: 'VOICE_TOOL_CALLED',
} as const;

export const VOICE_SAFETY_LIMITS = {
  MAX_CALL_DURATION_SECONDS: 600, // 10 minutes maximum duration
  MAX_TURNS_PER_CALL: 25,          // Maximum conversational turns to prevent infinite loops
  MAX_TOOL_CALLS_PER_TURN: 3,      // Maximum tool calls in a single response
  MAX_CONFIRMATION_WAIT_TURNS: 2,  // Number of turns a booking confirmation remains pending
} as const;

export const VOICE_DEFAULTS = {
  LANGUAGE: 'en' as const,
  SPEAKING_RATE: 1.0,
  PITCH: 1.0,
  AFTER_HOURS_MODE: 'PLAY_MESSAGE' as const,
  RECORDING_POLICY: 'RECORDING_DISABLED' as const,
  TRANSCRIPTION_POLICY: 'ENABLED' as const,
} as const;
