/**
 * FitCore AI Lead Qualification DTOs (Day 38)
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsNumber,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  LeadGoal,
  LeadExperienceLevel,
  LeadScheduleFlexibility,
  LeadBudgetSensitivity,
  LeadObjectionType,
  LeadObjectionStatus,
  LeadDecisionFactor,
  LeadTimeline,
  LeadReadiness,
  LeadQualificationStatus,
  QualificationDataSource,
} from '@fitcore/types';

export class ExtractLeadQualificationDto {
  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  userMessage?: string;

  @IsOptional()
  @IsEnum(['DIRECT_CUSTOMER_STATEMENT', 'VERIFIED_BUSINESS_EVENT', 'STAFF_ENTERED', 'AI_EXTRACTION', 'AI_INFERENCE'])
  source?: QualificationDataSource;

  @IsOptional()
  @IsBoolean()
  forceDeterministic?: boolean;
}

export class SchedulePreferenceDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredDays?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredTimes?: string[];

  @IsOptional()
  @IsString()
  frequencyPreference?: string;

  @IsOptional()
  @IsEnum(['VERY_FLEXIBLE', 'MODERATELY_FLEXIBLE', 'RIGID', 'UNKNOWN'])
  scheduleFlexibility?: LeadScheduleFlexibility;
}

export class StaffOverrideQualificationDto {
  @IsOptional()
  @IsString()
  primaryGoal?: LeadGoal;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  secondaryGoals?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceInterests?: string[];

  @IsOptional()
  @IsString()
  preferredOutletId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SchedulePreferenceDto)
  schedule?: SchedulePreferenceDto;

  @IsOptional()
  @IsString()
  experienceLevel?: LeadExperienceLevel;

  @IsOptional()
  @IsString()
  readiness?: LeadReadiness;

  @IsOptional()
  @IsString()
  budgetSensitivity?: LeadBudgetSensitivity;

  @IsOptional()
  @IsString()
  budgetRange?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  decisionFactors?: LeadDecisionFactor[];

  @IsOptional()
  @IsString()
  timeline?: LeadTimeline;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  constraints?: string[];

  @IsOptional()
  @IsString()
  qualificationStatus?: LeadQualificationStatus;

  @IsOptional()
  @IsString()
  overrideReason?: string;
}

export class CreateLeadObjectionDto {
  @IsEnum([
    'PRICE_OR_MEMBERSHIP_COST',
    'SCHEDULE_OR_TIME_COMMITMENT',
    'LOCATION_OR_DISTANCE',
    'COMMUTE',
    'CONTRACT_OR_COMMITMENT_TERMS',
    'CHILDCARE',
    'INTIMIDATION_OR_CONFIDENCE',
    'OVERCROWDING',
    'PARKING',
    'FACILITY_FEATURES',
    'SPOUSAL_OR_PARTNER_CONSULTATION',
    'OTHER',
  ])
  objectionType!: LeadObjectionType;

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'BLOCKER'])
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKER';

  @IsString()
  rawCustomerStatement!: string;

  @IsString()
  normalizedSummary!: string;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;

  @IsOptional()
  @IsEnum(['DIRECT_CUSTOMER_STATEMENT', 'VERIFIED_BUSINESS_EVENT', 'STAFF_ENTERED', 'AI_EXTRACTION', 'AI_INFERENCE'])
  source?: QualificationDataSource;
}

export class UpdateLeadObjectionDto {
  @IsOptional()
  @IsEnum(['OPEN', 'PARTIALLY_ADDRESSED', 'RESOLVED', 'DISMISSED'])
  status?: LeadObjectionStatus;

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'BLOCKER'])
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKER';

  @IsOptional()
  @IsString()
  normalizedSummary?: string;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}

export class GenerateDiscoveryQuestionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  limit?: number;

  @IsOptional()
  @IsString()
  language?: string;
}
