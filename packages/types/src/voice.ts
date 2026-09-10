/**
 * FitCore Day 34 — AI Voice Receptionist Domain Contracts & Types
 *
 * Real-time voice channel contracts:
 * Telephony Provider -> STT -> Voice Session -> AI Receptionist -> Tools -> Gym OS -> Response -> TTS -> Customer
 */

export type VoiceCallStatus =
  | 'RINGING'
  | 'CONNECTED'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'TRANSFERRING'
  | 'TRANSFERRED'
  | 'COMPLETED'
  | 'FAILED'
  | 'ABANDONED';

export type VoiceTurnState =
  | 'LISTENING'
  | 'THINKING'
  | 'TOOL_EXECUTION'
  | 'SPEAKING'
  | 'INTERRUPTED'
  | 'WAITING';

export type CallerIdentityState =
  | 'UNKNOWN_CALLER'
  | 'KNOWN_CONTACT'
  | 'VERIFIED_MEMBER'
  | 'VERIFIED_LEAD';

export type AfterHoursMode =
  | 'PLAY_MESSAGE'
  | 'TAKE_LEAD'
  | 'OFFER_CALLBACK'
  | 'TRANSFER_TO_EXTERNAL_NUMBER'
  | 'END_CALL';

export type CallOutcome =
  | 'INFORMATION_PROVIDED'
  | 'BOOKING_CREATED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_RESCHEDULED'
  | 'WAITLIST_JOINED'
  | 'LEAD_CREATED'
  | 'LEAD_UPDATED'
  | 'STAFF_HANDOFF'
  | 'CALLBACK_REQUESTED'
  | 'NO_ACTION'
  | 'FAILED'
  | 'ABANDONED';

export type VoiceRecordingPolicy =
  | 'RECORDING_DISABLED'
  | 'RECORDING_ENABLED'
  | 'REQUIRES_CONSENT';

export type VoiceTranscriptionPolicy = 'ENABLED' | 'DISABLED';

export type VoiceLanguage = 'en' | 'ne';

export type VoiceAccent = 'US' | 'UK' | 'AU' | 'NEPALI';

export type VoiceGender = 'MALE' | 'FEMALE' | 'NEUTRAL';

export type VoiceHandoffReason =
  | 'CUSTOMER_REQUESTED'
  | 'LOW_AI_CONFIDENCE'
  | 'COMPLAINT'
  | 'COMPLEX_REQUEST'
  | 'PRICING_EXCEPTION'
  | 'POLICY_EXCEPTION'
  | 'SPECIAL_REQUEST'
  | 'IDENTITY_VERIFICATION_REQUIRED'
  | 'TECHNICAL_FAILURE';

export interface VoicePhoneNumberDto {
  id: string;
  organisationId: string;
  outletId?: string | null;
  phoneNumber: string;
  provider: string;
  providerReference?: string | null;
  status: string;
  businessHoursConfig?: Record<string, any> | null;
  afterHoursMode: AfterHoursMode;
  greetingMessage?: string | null;
  voiceProfileId?: string | null;
  recordingPolicy: VoiceRecordingPolicy;
  transcriptionPolicy: VoiceTranscriptionPolicy;
  humanHandoffNumber?: string | null;
  fallbackNumber?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceProfileDto {
  id: string;
  organisationId?: string | null;
  name: string;
  provider: string;
  providerVoiceId: string;
  language: VoiceLanguage;
  accent?: VoiceAccent | null;
  gender?: VoiceGender | null;
  speakingRate: number;
  pitch: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceSessionDto {
  id: string;
  organisationId: string;
  outletId?: string | null;
  conversationId: string;
  voicePhoneNumberId?: string | null;
  callId: string;
  callerPhone?: string | null;
  callerIdentityState: CallerIdentityState;
  verifiedMemberId?: string | null;
  verifiedLeadId?: string | null;
  channel: 'VOICE';
  status: VoiceCallStatus;
  turnState: VoiceTurnState;
  language: VoiceLanguage;
  voiceProfileId?: string | null;
  recordingPolicy: VoiceRecordingPolicy;
  recordingConsent: boolean;
  recordingUrl?: string | null;
  startedAt: Date;
  connectedAt?: Date | null;
  endedAt?: Date | null;
  durationSeconds?: number | null;
  summary?: string | null;
  outcome: CallOutcome;
  handoffReason?: VoiceHandoffReason | null;
  handoffStaffNotes?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceTranscriptDto {
  id: string;
  voiceSessionId: string;
  organisationId: string;
  speaker: 'CALLER' | 'AI' | 'SYSTEM' | 'STAFF';
  text: string;
  confidence?: number | null;
  language: VoiceLanguage;
  isFinal: boolean;
  startTimeMs?: number | null;
  durationMs?: number | null;
  interrupted: boolean;
  metadata?: Record<string, any> | null;
  createdAt: Date;
}

export interface CreateVoicePhoneNumberDto {
  phoneNumber: string;
  outletId?: string;
  provider?: string;
  providerReference?: string;
  afterHoursMode?: AfterHoursMode;
  greetingMessage?: string;
  voiceProfileId?: string;
  recordingPolicy?: VoiceRecordingPolicy;
  transcriptionPolicy?: VoiceTranscriptionPolicy;
  humanHandoffNumber?: string;
  fallbackNumber?: string;
  businessHoursConfig?: Record<string, any>;
}

export interface UpdateVoicePhoneNumberDto {
  outletId?: string | null;
  status?: string;
  afterHoursMode?: AfterHoursMode;
  greetingMessage?: string;
  voiceProfileId?: string | null;
  recordingPolicy?: VoiceRecordingPolicy;
  transcriptionPolicy?: VoiceTranscriptionPolicy;
  humanHandoffNumber?: string | null;
  fallbackNumber?: string | null;
  businessHoursConfig?: Record<string, any>;
}

export interface CreateVoiceProfileDto {
  name: string;
  provider: string;
  providerVoiceId: string;
  language?: VoiceLanguage;
  accent?: VoiceAccent;
  gender?: VoiceGender;
  speakingRate?: number;
  pitch?: number;
}

export interface UpdateVoiceProfileDto {
  name?: string;
  providerVoiceId?: string;
  language?: VoiceLanguage;
  accent?: VoiceAccent;
  gender?: VoiceGender;
  speakingRate?: number;
  pitch?: number;
  active?: boolean;
}

export interface InboundCallWebhookDto {
  callId: string;
  calledNumber: string;
  callerNumber?: string;
  callerCity?: string;
  callerCountry?: string;
  provider?: string;
  signature?: string;
  timestamp?: number;
}

export interface VoiceStreamTurnDto {
  callId: string;
  text?: string;
  audioBase64?: string;
  audioDurationMs?: number;
  isFinal?: boolean;
  confidence?: number;
  language?: VoiceLanguage;
  isBargeIn?: boolean;
}

export interface VoiceTurnResultDto {
  callId: string;
  turnState: VoiceTurnState;
  textResponse: string;
  audioResponseUrl?: string;
  audioResponseBase64?: string;
  durationMs?: number;
  intent: string;
  toolResults?: any[];
  handoffRecommended?: boolean;
  handoffReason?: VoiceHandoffReason;
  transferInitiated?: boolean;
  transferNumber?: string;
  callEnded?: boolean;
  outcome?: CallOutcome;
}

export interface VoiceMetricsDto {
  callsToday: number;
  answered: number;
  missed: number;
  abandoned: number;
  transferred: number;
  leadsCreated: number;
  bookingsCreated: number;
  averageCallDurationSeconds: number;
  aiFailureRatePercent: number;
}
