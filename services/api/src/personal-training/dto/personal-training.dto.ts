import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsBoolean,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  GoalCategory,
  GoalStatus,
  TrainerNoteType,
  TrainerNoteVisibility,
  PTSessionStatus,
  PTSessionType,
  TrainingProgramStatus,
} from '@fitcore/types';

// ==========================================
// 1. TRAINING PROGRAM DTOs
// ==========================================

export class CreateTrainingProgramDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  trainerProfileId?: string;

  @IsString()
  @IsOptional()
  outletId?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateTrainingProgramDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class ProgramActionDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

// ==========================================
// 2. TRAINING GOAL DTOs
// ==========================================

export class CreateTrainingGoalDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  category: GoalCategory;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  baselineValue?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  targetValue?: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsDateString()
  @IsOptional()
  targetDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  priority?: number;

  @IsString()
  @IsOptional()
  trainingProgramId?: string;
}

export class UpdateTrainingGoalDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: GoalCategory;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  baselineValue?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  targetValue?: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsDateString()
  @IsOptional()
  targetDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  priority?: number;
}

export class UpdateGoalProgressDto {
  @IsNumber()
  @Type(() => Number)
  currentValue: number;

  @IsString()
  @IsOptional()
  status?: GoalStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}

// ==========================================
// 3. TRAINER NOTE DTOs
// ==========================================

export class CreateTrainerNoteDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  visibility?: TrainerNoteVisibility; // Default 'PRIVATE'

  @IsString()
  @IsOptional()
  noteType?: TrainerNoteType; // Default 'GENERAL'

  @IsString()
  @IsOptional()
  trainingProgramId?: string;

  @IsString()
  @IsOptional()
  trainingGoalId?: string;

  @IsString()
  @IsOptional()
  personalTrainingSessionId?: string;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @IsString()
  @IsOptional()
  outletId?: string;
}

export class UpdateTrainerNoteDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  visibility?: TrainerNoteVisibility;

  @IsString()
  @IsOptional()
  noteType?: TrainerNoteType;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;
}

// ==========================================
// 4. PERSONAL TRAINING SESSION DTOs
// ==========================================

export class SchedulePTSessionDto {
  @IsString()
  @IsNotEmpty()
  memberProfileId: string;

  @IsString()
  @IsOptional()
  trainerProfileId?: string;

  @IsString()
  @IsNotEmpty()
  outletId: string;

  @IsDateString()
  scheduledStart: string;

  @IsDateString()
  scheduledEnd: string;

  @IsString()
  @IsOptional()
  sessionType?: PTSessionType;

  @IsString()
  @IsOptional()
  trainingProgramId?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  allowConflictOverride?: boolean;
}

export class CancelPTSessionDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class QueryPTSessionsDto {
  @IsString()
  @IsOptional()
  memberProfileId?: string;

  @IsString()
  @IsOptional()
  trainerProfileId?: string;

  @IsString()
  @IsOptional()
  outletId?: string;

  @IsString()
  @IsOptional()
  status?: PTSessionStatus;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
