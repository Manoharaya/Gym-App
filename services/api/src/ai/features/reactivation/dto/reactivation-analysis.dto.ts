import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ReactivationLifecycleState,
  ReactivationStatus,
  RecoveryState,
  ReactivationStrategyType,
  RecoveryPlanStatus,
} from '@fitcore/types';

export class AnalyzeReactivationDto {
  @IsUUID()
  memberId: string;

  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;

  @IsOptional()
  @IsBoolean()
  includeAIAssessment?: boolean;
}

export class ReactivationQueueQueryDto {
  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  assignedStaffId?: string;

  @IsOptional()
  @IsString()
  lifecycleState?: ReactivationLifecycleState;

  @IsOptional()
  @IsString()
  reactivationStatus?: ReactivationStatus;

  @IsOptional()
  @IsString()
  recoveryState?: RecoveryState;

  @IsOptional()
  @IsString()
  strategyType?: ReactivationStrategyType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

export class ReactivationSummaryQueryDto {
  @IsOptional()
  @IsString()
  outletId?: string;
}

export class CreateRecoveryPlanRequestDto {
  @IsUUID()
  memberId: string;

  @IsString()
  strategyType: ReactivationStrategyType;

  @IsString()
  targetChannel: string;

  @IsString()
  recommendedAction: string;

  @IsOptional()
  @IsString()
  draftMessage?: string;

  @IsOptional()
  @IsString()
  staffNotes?: string;

  @IsOptional()
  @IsString()
  assignedStaffId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(90)
  expiresInDays?: number = 14;
}

export class UpdateRecoveryPlanRequestDto {
  @IsOptional()
  @IsString()
  status?: RecoveryPlanStatus;

  @IsOptional()
  @IsString()
  strategyType?: ReactivationStrategyType;

  @IsOptional()
  @IsString()
  targetChannel?: string;

  @IsOptional()
  @IsString()
  recommendedAction?: string;

  @IsOptional()
  @IsString()
  draftMessage?: string;

  @IsOptional()
  @IsString()
  staffNotes?: string;

  @IsOptional()
  @IsString()
  assignedStaffId?: string;

  @IsOptional()
  @IsString()
  dismissalReason?: string;
}
