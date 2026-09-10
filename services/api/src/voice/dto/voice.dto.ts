/**
 * Day 34 — Voice DTOs & Request Validation
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import {
  AfterHoursMode,
  VoiceRecordingPolicy,
  VoiceTranscriptionPolicy,
  VoiceLanguage,
  VoiceAccent,
  VoiceGender,
} from '@fitcore/types';

export class InboundCallWebhookDto {
  @IsString()
  @IsNotEmpty()
  callId!: string;

  @IsString()
  @IsNotEmpty()
  calledNumber!: string;

  @IsString()
  @IsOptional()
  callerNumber?: string;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  @IsOptional()
  signature?: string;

  @IsNumber()
  @IsOptional()
  timestamp?: number;
}

export class VoiceStreamTurnDto {
  @IsString()
  @IsNotEmpty()
  callId!: string;

  @IsString()
  @IsOptional()
  text?: string;

  @IsString()
  @IsOptional()
  audioBase64?: string;

  @IsNumber()
  @IsOptional()
  audioDurationMs?: number;

  @IsBoolean()
  @IsOptional()
  isFinal?: boolean;

  @IsNumber()
  @IsOptional()
  confidence?: number;

  @IsString()
  @IsOptional()
  language?: VoiceLanguage;

  @IsBoolean()
  @IsOptional()
  isBargeIn?: boolean;
}

export class VerifyCallerDto {
  @IsString()
  @IsNotEmpty()
  verificationCode!: string;
}

export class CreateVoicePhoneNumberDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber!: string;

  @IsString()
  @IsOptional()
  outletId?: string;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  @IsOptional()
  providerReference?: string;

  @IsString()
  @IsOptional()
  afterHoursMode?: AfterHoursMode;

  @IsString()
  @IsOptional()
  greetingMessage?: string;

  @IsString()
  @IsOptional()
  voiceProfileId?: string;

  @IsString()
  @IsOptional()
  recordingPolicy?: VoiceRecordingPolicy;

  @IsString()
  @IsOptional()
  transcriptionPolicy?: VoiceTranscriptionPolicy;

  @IsString()
  @IsOptional()
  humanHandoffNumber?: string;

  @IsString()
  @IsOptional()
  fallbackNumber?: string;

  @IsOptional()
  businessHoursConfig?: Record<string, any>;
}

export class UpdateVoicePhoneNumberDto {
  @IsString()
  @IsOptional()
  outletId?: string | null;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  afterHoursMode?: AfterHoursMode;

  @IsString()
  @IsOptional()
  greetingMessage?: string;

  @IsString()
  @IsOptional()
  voiceProfileId?: string | null;

  @IsString()
  @IsOptional()
  recordingPolicy?: VoiceRecordingPolicy;

  @IsString()
  @IsOptional()
  transcriptionPolicy?: VoiceTranscriptionPolicy;

  @IsString()
  @IsOptional()
  humanHandoffNumber?: string | null;

  @IsString()
  @IsOptional()
  fallbackNumber?: string | null;

  @IsOptional()
  businessHoursConfig?: Record<string, any>;
}

export class CreateVoiceProfileDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  provider!: string;

  @IsString()
  @IsNotEmpty()
  providerVoiceId!: string;

  @IsString()
  @IsOptional()
  language?: VoiceLanguage;

  @IsString()
  @IsOptional()
  accent?: VoiceAccent;

  @IsString()
  @IsOptional()
  gender?: VoiceGender;

  @IsNumber()
  @IsOptional()
  speakingRate?: number;

  @IsNumber()
  @IsOptional()
  pitch?: number;
}
