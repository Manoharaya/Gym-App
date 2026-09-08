/**
 * Day 30 — Automated Engagement Workflows DTOs
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  WorkflowTriggerType,
  WorkflowActionType,
  WorkflowStatus,
  WorkflowApprovalMode,
  WorkflowActionDefinition,
  WorkflowAudienceFilter,
  WorkflowStopCondition,
  WorkflowSafetyPolicy,
  WorkflowTriggerConfig,
} from '@fitcore/types';

export class WorkflowActionDto implements WorkflowActionDefinition {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  type!: WorkflowActionType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  delayMinutes?: number;

  @IsObject()
  params!: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;

  @IsOptional()
  @IsString()
  approvalRole?: string;
}

export class CreateWorkflowRequestDto {
  @IsOptional()
  @IsString()
  organisationId?: string;

  @IsOptional()
  @IsString()
  outletId?: string | null;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  triggerType!: WorkflowTriggerType;

  @IsObject()
  triggerConfig!: WorkflowTriggerConfig;

  @IsOptional()
  @IsObject()
  audienceFilter?: WorkflowAudienceFilter;

  @IsOptional()
  @IsObject()
  stopConditions?: WorkflowStopCondition;

  @IsOptional()
  @IsObject()
  safetyPolicy?: WorkflowSafetyPolicy;

  @IsArray()
  @Type(() => WorkflowActionDto)
  actions!: WorkflowActionDefinition[];

  @IsOptional()
  @IsString()
  approvalMode?: WorkflowApprovalMode;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateWorkflowRequestDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  triggerType?: WorkflowTriggerType;

  @IsOptional()
  @IsObject()
  triggerConfig?: WorkflowTriggerConfig;

  @IsOptional()
  @IsObject()
  audienceFilter?: WorkflowAudienceFilter;

  @IsOptional()
  @IsObject()
  stopConditions?: WorkflowStopCondition;

  @IsOptional()
  @IsObject()
  safetyPolicy?: WorkflowSafetyPolicy;

  @IsOptional()
  @IsArray()
  @Type(() => WorkflowActionDto)
  actions?: WorkflowActionDefinition[];

  @IsOptional()
  @IsString()
  approvalMode?: WorkflowApprovalMode;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class WorkflowFilterQueryDto {
  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  status?: WorkflowStatus;

  @IsOptional()
  @IsString()
  triggerType?: WorkflowTriggerType;

  @IsOptional()
  @IsString()
  search?: string;
}

export class WorkflowTriggerEventDto {
  @IsOptional()
  @IsString()
  organisationId?: string;

  @IsOptional()
  @IsString()
  outletId?: string | null;

  @IsString()
  @IsNotEmpty()
  memberId!: string;

  @IsString()
  @IsNotEmpty()
  eventType!: string;

  @IsOptional()
  @IsString()
  occurredAt?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class ApproveWorkflowActionRequestDto {
  @IsOptional()
  @IsBoolean()
  approved?: boolean = true;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectWorkflowActionRequestDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class DryRunWorkflowRequestDto {
  @IsString()
  @IsNotEmpty()
  memberId!: string;

  @IsOptional()
  @IsObject()
  triggerEventPayload?: Record<string, any>;
}

export class AIAssistWorkflowRequestDto {
  @IsString()
  @IsNotEmpty()
  intent!: string;

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsString()
  preferredTone?: 'SUPPORTIVE' | 'ENERGETIC' | 'PROFESSIONAL' | 'URGENT';

  @IsOptional()
  @IsString()
  language?: 'en' | 'ne';
}

export class InstantiateTemplateRequestDto {
  @IsString()
  @IsNotEmpty()
  templateKey!: string;

  @IsOptional()
  @IsString()
  outletId?: string | null;

  @IsOptional()
  @IsString()
  customName?: string;
}
