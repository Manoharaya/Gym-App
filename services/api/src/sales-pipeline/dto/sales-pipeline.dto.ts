import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SalesStage,
  SalesActivityType,
  SalesTaskType,
  SalesTaskPriority,
  SalesTaskStatus,
  SalesLossReason,
  SalesTransitionActorType,
  LeadSource,
} from '@fitcore/types';

export class CreatePipelineDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  outletId?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class CreateOpportunityDto {
  @IsString()
  leadId: string;

  @IsString()
  @IsOptional()
  pipelineId?: string;

  @IsString()
  @IsOptional()
  outletId?: string;

  @IsString()
  title: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  estimatedValue?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  interestedPlanId?: string;

  @IsString()
  @IsOptional()
  source?: LeadSource;

  @IsString()
  @IsOptional()
  ownerStaffId?: string;

  @IsDateString()
  @IsOptional()
  expectedCloseDate?: string;

  @IsOptional()
  customFields?: Record<string, any>;
}

export class UpdateOpportunityDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  estimatedValue?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  interestedPlanId?: string;

  @IsString()
  @IsOptional()
  ownerStaffId?: string | null;

  @IsDateString()
  @IsOptional()
  expectedCloseDate?: string | null;

  @IsOptional()
  customFields?: Record<string, any>;
}

export class TransitionStageDto {
  @IsString()
  toStage: SalesStage;

  @IsNumber()
  version: number;

  @IsString()
  @IsOptional()
  actorType?: SalesTransitionActorType;

  @IsString()
  @IsOptional()
  actorId?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  lossReason?: SalesLossReason;

  @IsString()
  @IsOptional()
  lossReasonDetails?: string;

  @IsString()
  @IsOptional()
  reopenReason?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class LogActivityDto {
  @IsString()
  activityType: SalesActivityType;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  actorType?: SalesTransitionActorType;

  @IsString()
  @IsOptional()
  actorId?: string;

  @IsNumber()
  @IsOptional()
  durationMinutes?: number;

  @IsString()
  @IsOptional()
  communicationLogId?: string;

  @IsString()
  @IsOptional()
  aiConversationId?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateSalesTaskDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  taskType?: SalesTaskType;

  @IsString()
  @IsOptional()
  priority?: SalesTaskPriority;

  @IsDateString()
  dueAt: string;

  @IsString()
  @IsOptional()
  assignedStaffId?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateSalesTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  taskType?: SalesTaskType;

  @IsString()
  @IsOptional()
  priority?: SalesTaskPriority;

  @IsString()
  @IsOptional()
  status?: SalesTaskStatus;

  @IsDateString()
  @IsOptional()
  dueAt?: string;

  @IsString()
  @IsOptional()
  assignedStaffId?: string | null;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class ReopenOpportunityDto {
  @IsString()
  toStage: SalesStage;

  @IsNumber()
  version: number;

  @IsString()
  reopenReason: string;

  @IsString()
  @IsOptional()
  actorId?: string;
}

export class VerifyConversionDto {
  @IsNumber()
  version: number;

  @IsString()
  @IsOptional()
  membershipId?: string;

  @IsString()
  @IsOptional()
  membershipPlanId?: string;

  @IsString()
  @IsOptional()
  eventId?: string;

  @IsString()
  @IsOptional()
  actorId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class OpportunityFilterDto {
  @IsString()
  @IsOptional()
  pipelineId?: string;

  @IsString()
  @IsOptional()
  stage?: SalesStage;

  @IsString()
  @IsOptional()
  outletId?: string;

  @IsString()
  @IsOptional()
  ownerStaffId?: string;

  @IsString()
  @IsOptional()
  leadId?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isStale?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  offset?: number;
}

export class PipelineMetricsQueryDto {
  @IsString()
  @IsOptional()
  pipelineId?: string;

  @IsString()
  @IsOptional()
  outletId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
