/**
 * Day 33 — Lead DTOs
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  LeadStatus,
  LeadSource,
  LeadConsentStatus,
  PreferredContactChannel,
  QualificationStatus,
  PreferredSchedule,
  ExperienceLevel,
  ReadinessLevel,
  PriceSensitivity,
  LeadNextBestAction,
  LeadObjection,
} from '@fitcore/types';

export class CreateLeadDto {
  @IsString()
  @IsOptional()
  outletId?: string;

  @IsString()
  @IsOptional()
  source?: LeadSource;

  @IsOptional()
  sourceMetadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  status?: LeadStatus;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  preferredContactChannel?: PreferredContactChannel;

  @IsString()
  @IsOptional()
  preferredLanguage?: string;

  @IsString()
  @IsOptional()
  consentStatus?: LeadConsentStatus;

  @IsString()
  @IsOptional()
  consentSource?: string;

  @IsString()
  @IsOptional()
  originatingConversationId?: string;

  @IsArray()
  @IsOptional()
  initialGoals?: string[];

  @IsArray()
  @IsOptional()
  initialServiceInterests?: string[];

  @IsString()
  @IsOptional()
  initialReadiness?: ReadinessLevel;
}

export class UpdateLeadDto {
  @IsString()
  @IsOptional()
  outletId?: string;

  @IsString()
  @IsOptional()
  status?: LeadStatus;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  preferredContactChannel?: PreferredContactChannel;

  @IsString()
  @IsOptional()
  preferredLanguage?: string;

  @IsString()
  @IsOptional()
  consentStatus?: LeadConsentStatus;

  @IsString()
  @IsOptional()
  consentSource?: string;

  @IsString()
  @IsOptional()
  assignedStaffId?: string;

  @IsString()
  @IsOptional()
  assignedOutletId?: string;
}

export class UpdateLeadQualificationDto {
  @IsArray()
  @IsOptional()
  goals?: string[];

  @IsArray()
  @IsOptional()
  serviceInterests?: string[];

  @IsString()
  @IsOptional()
  preferredOutletId?: string;

  @IsString()
  @IsOptional()
  preferredSchedule?: PreferredSchedule;

  @IsString()
  @IsOptional()
  experienceLevel?: ExperienceLevel;

  @IsString()
  @IsOptional()
  readiness?: ReadinessLevel;

  @IsString()
  @IsOptional()
  priceSensitivity?: PriceSensitivity;

  @IsArray()
  @IsOptional()
  objections?: LeadObjection[];

  @IsString()
  @IsOptional()
  preferredContactChannel?: PreferredContactChannel;

  @IsString()
  @IsOptional()
  preferredLanguage?: string;

  @IsString()
  @IsOptional()
  qualificationStatus?: QualificationStatus;

  @IsString()
  @IsOptional()
  recommendedNextAction?: LeadNextBestAction;

  @IsString()
  @IsOptional()
  nextActionReason?: string;

  @IsString()
  @IsOptional()
  aiSummary?: string;
}

export class AssignStaffDto {
  @IsString()
  staffProfileId: string;

  @IsString()
  @IsOptional()
  outletId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class RequestLeadHandoffDto {
  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class QualifyLeadRequestDto {
  @IsString()
  @IsOptional()
  conversationId?: string;

  @IsString()
  @IsOptional()
  userMessage?: string;
}

export class LeadFilterDto {
  @IsString()
  @IsOptional()
  status?: LeadStatus;

  @IsString()
  @IsOptional()
  outletId?: string;

  @IsString()
  @IsOptional()
  source?: LeadSource;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  minScore?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  maxScore?: number;

  @IsString()
  @IsOptional()
  qualificationStatus?: QualificationStatus;

  @IsString()
  @IsOptional()
  assignedStaffId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}
