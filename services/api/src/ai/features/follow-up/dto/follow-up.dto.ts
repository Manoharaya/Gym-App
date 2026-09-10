/**
 * Day 39 — Automated Follow-Up Request & Response DTOs
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  FollowUpSequenceType,
  FollowUpSequenceStatus,
  FollowUpStepChannel,
  FollowUpMessageMode,
  FollowUpResponseType,
} from '@fitcore/types';

export class StepConfigurationDto {
  @IsOptional()
  @IsEnum(['EMAIL', 'SMS', 'WHATSAPP', 'PUSH', 'IN_APP', 'VOICE'])
  fallbackChannel?: FollowUpStepChannel;

  @IsOptional()
  @IsArray()
  allowedVariables?: string[];

  @IsOptional()
  aiContextRules?: {
    includeGoals?: boolean;
    includeSchedule?: boolean;
    includeObjections?: boolean;
    includePipelineStage?: boolean;
  };

  @IsOptional()
  @IsString()
  templateBody?: string;

  @IsOptional()
  @IsString()
  templateSubject?: string;
}

export class CreateFollowUpStepDto {
  @IsNumber()
  @Min(1)
  stepOrder!: number;

  @IsString()
  name!: string;

  @IsNumber()
  @Min(0)
  delayMinutes!: number; // 0 = Day 0, 1440 = Day 1, etc.

  @IsEnum(['EMAIL', 'SMS', 'WHATSAPP', 'PUSH', 'IN_APP', 'VOICE'])
  channel!: FollowUpStepChannel;

  @IsOptional()
  @IsEnum(['STATIC_TEMPLATE', 'PERSONALIZED_TEMPLATE', 'AI_ASSISTED'])
  messageMode?: FollowUpMessageMode = 'PERSONALIZED_TEMPLATE';

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  promptId?: string;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean = false;

  @IsOptional()
  @IsBoolean()
  stopOnReply?: boolean = true;

  @IsOptional()
  @IsBoolean()
  stopOnBooking?: boolean = true;

  @IsOptional()
  @IsBoolean()
  stopOnConversion?: boolean = true;

  @IsOptional()
  @IsBoolean()
  stopOnStaffHandoff?: boolean = true;

  @IsOptional()
  @ValidateNested()
  @Type(() => StepConfigurationDto)
  configuration?: StepConfigurationDto;
}

export class SequenceConfigurationDto {
  @IsOptional()
  @IsNumber()
  cooldownHours?: number = 24;

  @IsOptional()
  @IsNumber()
  maxFollowUpsPerWeek?: number = 4;

  @IsOptional()
  @IsString()
  quietHoursStart?: string = '21:00';

  @IsOptional()
  @IsString()
  quietHoursEnd?: string = '08:00';

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsEnum(['EMAIL', 'SMS', 'WHATSAPP', 'PUSH', 'IN_APP', 'VOICE'])
  defaultChannel?: FollowUpStepChannel = 'WHATSAPP';

  @IsOptional()
  @IsEnum(['EMAIL', 'SMS', 'WHATSAPP', 'PUSH', 'IN_APP', 'VOICE'])
  fallbackChannel?: FollowUpStepChannel = 'SMS';

  @IsOptional()
  @IsEnum(['AUTO_SEND', 'APPROVAL_REQUIRED', 'STAFF_ONLY'])
  approvalPolicy?: 'AUTO_SEND' | 'APPROVAL_REQUIRED' | 'STAFF_ONLY' = 'AUTO_SEND';
}

export class CreateFollowUpSequenceDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum([
    'LEAD_FOLLOW_UP',
    'MISSED_CALL',
    'WEB_ENQUIRY',
    'TRIAL_FOLLOW_UP',
    'TOUR_FOLLOW_UP',
    'QUALIFIED_LEAD',
    'OFFER_FOLLOW_UP',
    'NO_RESPONSE',
    'CALLBACK',
    'REENGAGEMENT',
    'STAFF_HANDOFF',
    'POST_CONVERSATION',
    'CUSTOM',
  ])
  sequenceType!: FollowUpSequenceType;

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  triggerType?: string = 'EVENT_DRIVEN';

  @IsOptional()
  @ValidateNested()
  @Type(() => SequenceConfigurationDto)
  configuration?: SequenceConfigurationDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFollowUpStepDto)
  steps?: CreateFollowUpStepDto[];
}

export class UpdateFollowUpSequenceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'])
  status?: FollowUpSequenceStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => SequenceConfigurationDto)
  configuration?: SequenceConfigurationDto;
}

export class UpdateFollowUpStepDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  delayMinutes?: number;

  @IsOptional()
  @IsEnum(['EMAIL', 'SMS', 'WHATSAPP', 'PUSH', 'IN_APP', 'VOICE'])
  channel?: FollowUpStepChannel;

  @IsOptional()
  @IsEnum(['STATIC_TEMPLATE', 'PERSONALIZED_TEMPLATE', 'AI_ASSISTED'])
  messageMode?: FollowUpMessageMode;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  stopOnReply?: boolean;

  @IsOptional()
  @IsBoolean()
  stopOnBooking?: boolean;

  @IsOptional()
  @IsBoolean()
  stopOnConversion?: boolean;

  @IsOptional()
  @IsBoolean()
  stopOnStaffHandoff?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => StepConfigurationDto)
  configuration?: StepConfigurationDto;
}

export class EnrollLeadDto {
  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  opportunityId?: string;

  @IsOptional()
  @IsString()
  memberId?: string;

  @IsString()
  sequenceId!: string;

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  customVariables?: Record<string, any>;
}

export class PreviewFollowUpDto {
  @IsString()
  sequenceId!: string;

  @IsNumber()
  stepOrder!: number;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  language?: string = 'en';
}

export class ApproveExecutionDto {
  @IsString()
  executionId!: string;

  @IsOptional()
  @IsString()
  overrideMessage?: string;
}

export class RejectExecutionDto {
  @IsString()
  executionId!: string;

  @IsString()
  rejectionReason!: string;
}

export class RecordResponseDto {
  @IsString()
  enrollmentId!: string;

  @IsEnum([
    'REPLIED',
    'NO_RESPONSE',
    'BOOKED',
    'CANCELLED',
    'TOUR_BOOKED',
    'TRIAL_BOOKED',
    'CONVERTED',
    'REQUESTED_HUMAN',
    'OPTED_OUT',
    'INVALID',
    'OTHER',
  ])
  responseType!: FollowUpResponseType;

  @IsString()
  channel!: string;

  @IsOptional()
  @IsString()
  rawContent?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  source?: string = 'INBOUND_COMMUNICATION';
}
