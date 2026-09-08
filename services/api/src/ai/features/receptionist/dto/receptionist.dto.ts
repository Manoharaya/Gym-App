/**
 * Day 31 — AI Receptionist DTOs
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  IsArray,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import {
  ReceptionistTone,
  ReceptionistStatus,
  ReceptionistScope,
  ReceptionistKnowledgeType,
  KnowledgeVisibility,
  ConversationChannel,
  HandoffReason,
  HandoffStatus,
} from '@fitcore/types';

export class CreateAIReceptionistDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsString()
  @IsOptional()
  outletId?: string | null;

  @IsEnum(['PROFESSIONAL', 'FRIENDLY', 'ENERGETIC', 'PREMIUM', 'CONCISE'])
  @IsOptional()
  tone?: ReceptionistTone;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  greeting?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsEnum(['ORGANISATION', 'OUTLET'])
  @IsOptional()
  knowledgeScope?: ReceptionistScope;

  @IsBoolean()
  @IsOptional()
  escalationEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  humanHandoffEnabled?: boolean;

  @IsObject()
  @IsOptional()
  guardrails?: Record<string, any>;

  @IsObject()
  @IsOptional()
  promptOverrides?: Record<string, any>;

  @IsArray()
  @IsOptional()
  supportedChannels?: string[];
}

export class UpdateAIReceptionistDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsEnum(['DRAFT', 'ACTIVE', 'PAUSED', 'DISABLED'])
  @IsOptional()
  status?: ReceptionistStatus;

  @IsEnum(['PROFESSIONAL', 'FRIENDLY', 'ENERGETIC', 'PREMIUM', 'CONCISE'])
  @IsOptional()
  tone?: ReceptionistTone;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  greeting?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsEnum(['ORGANISATION', 'OUTLET'])
  @IsOptional()
  knowledgeScope?: ReceptionistScope;

  @IsBoolean()
  @IsOptional()
  escalationEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  humanHandoffEnabled?: boolean;

  @IsObject()
  @IsOptional()
  guardrails?: Record<string, any>;

  @IsObject()
  @IsOptional()
  promptOverrides?: Record<string, any>;

  @IsArray()
  @IsOptional()
  supportedChannels?: string[];
}

export class ReceptionistChatDto {
  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsString()
  @IsOptional()
  conversationId?: string;

  @IsString()
  @IsOptional()
  outletId?: string | null;

  @IsEnum(['WEB_CHAT', 'MOBILE', 'SMS', 'WHATSAPP', 'VOICE', 'IN_APP'])
  @IsOptional()
  channel?: ConversationChannel;

  @IsString()
  @IsOptional()
  externalConversationId?: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsOptional()
  language?: string;
}

export class CreateKnowledgeSourceDto {
  @IsEnum([
    'ORGANISATION_PROFILE',
    'OUTLET_PROFILE',
    'OPENING_HOURS',
    'HOLIDAY_HOURS',
    'MEMBERSHIP_PLAN',
    'CLASS_TYPE',
    'CLASS_POLICY',
    'TRAINER_PROFILE',
    'FACILITY',
    'AMENITY',
    'POLICY',
    'FAQ',
    'TRIAL_INFORMATION',
    'CONTACT_INFORMATION',
    'PARKING_INFORMATION',
    'BOOKING_POLICY',
    'CANCELLATION_POLICY',
    'GUEST_POLICY',
    'CUSTOM',
  ])
  type!: ReceptionistKnowledgeType;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsOptional()
  outletId?: string | null;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsEnum(['PUBLIC', 'CUSTOMER_VISIBLE', 'STAFF_ONLY', 'INTERNAL'])
  @IsOptional()
  visibility?: KnowledgeVisibility;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateKnowledgeSourceDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsString()
  @IsOptional()
  outletId?: string | null;

  @IsEnum(['PUBLIC', 'CUSTOMER_VISIBLE', 'STAFF_ONLY', 'INTERNAL'])
  @IsOptional()
  visibility?: KnowledgeVisibility;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}

export class KnowledgeQueryDto {
  @IsString()
  @IsNotEmpty()
  query!: string;

  @IsString()
  @IsOptional()
  outletId?: string | null;

  @IsEnum([
    'ORGANISATION_PROFILE',
    'OUTLET_PROFILE',
    'OPENING_HOURS',
    'HOLIDAY_HOURS',
    'MEMBERSHIP_PLAN',
    'CLASS_TYPE',
    'CLASS_POLICY',
    'TRAINER_PROFILE',
    'FACILITY',
    'AMENITY',
    'POLICY',
    'FAQ',
    'TRIAL_INFORMATION',
    'CONTACT_INFORMATION',
    'PARKING_INFORMATION',
    'BOOKING_POLICY',
    'CANCELLATION_POLICY',
    'GUEST_POLICY',
    'CUSTOM',
  ])
  @IsOptional()
  type?: ReceptionistKnowledgeType;

  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class CreateHandoffDto {
  @IsString()
  @IsNotEmpty()
  conversationId!: string;

  @IsEnum([
    'LOW_CONFIDENCE',
    'UNKNOWN_INFORMATION',
    'CUSTOMER_REQUESTED',
    'COMPLEX_REQUEST',
    'COMPLAINT',
    'SENSITIVE_REQUEST',
    'POLICY_EXCEPTION',
    'TOOL_FAILURE',
    'REPEATED_MISUNDERSTANDING',
  ])
  reason!: HandoffReason;

  @IsString()
  @IsNotEmpty()
  reasonDescription!: string;

  @IsString()
  @IsOptional()
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @IsString()
  @IsOptional()
  summary?: string;

  @IsString()
  @IsOptional()
  outletId?: string | null;
}

export class UpdateHandoffDto {
  @IsEnum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'])
  @IsOptional()
  status?: HandoffStatus;

  @IsString()
  @IsOptional()
  assignedToUserId?: string;

  @IsString()
  @IsOptional()
  resolutionNotes?: string;
}

export class ReceptionistFeedbackDto {
  @IsString()
  @IsNotEmpty()
  conversationId!: string;

  @IsString()
  @IsOptional()
  messageId?: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @IsOptional()
  feedback?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];
}
