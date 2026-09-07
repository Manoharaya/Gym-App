import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsISO8601,
  IsBoolean,
  IsArray,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TrainingPlanStatusEnum {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED',
}

export enum TrainingPlanWeekStatusEnum {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

export class CreateTrainingPlanDto {
  @ApiProperty({ description: 'Title or name of the training plan' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Detailed plan description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Specific training objective' })
  @IsOptional()
  @IsString()
  objective?: string;

  @ApiPropertyOptional({ description: 'Optional ID of overarching TrainingProgram' })
  @IsOptional()
  @IsString()
  trainingProgramId?: string;

  @ApiProperty({ description: 'Member profile ID' })
  @IsString()
  @IsNotEmpty()
  memberProfileId!: string;

  @ApiProperty({ description: 'Duration in weeks', default: 4 })
  @IsInt()
  @Min(1)
  @Max(52)
  durationWeeks!: number;

  @ApiProperty({ description: 'Start date (ISO-8601)' })
  @IsISO8601()
  startDate!: string;

  @ApiPropertyOptional({ description: 'End date (ISO-8601)' })
  @IsOptional()
  @IsISO8601()
  endDate?: string;
}

export class UpdateTrainingPlanDto {
  @ApiPropertyOptional({ description: 'Title or name of the training plan' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Detailed plan description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Specific training objective' })
  @IsOptional()
  @IsString()
  objective?: string;

  @ApiPropertyOptional({ description: 'Duration in weeks' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(52)
  durationWeeks?: number;

  @ApiPropertyOptional({ description: 'Start date (ISO-8601)' })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO-8601)' })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({ enum: TrainingPlanStatusEnum })
  @IsOptional()
  @IsEnum(TrainingPlanStatusEnum)
  status?: TrainingPlanStatusEnum;
}

export class CreateTrainingPlanWeekDto {
  @ApiProperty({ description: 'Week number (1-based)' })
  @IsInt()
  @Min(1)
  weekNumber!: number;

  @ApiPropertyOptional({ description: 'Week name/title' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Week focus description' })
  @IsOptional()
  @IsString()
  focus?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO-8601)' })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO-8601)' })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({ enum: TrainingPlanWeekStatusEnum })
  @IsOptional()
  @IsEnum(TrainingPlanWeekStatusEnum)
  status?: TrainingPlanWeekStatusEnum;
}

export class UpdateTrainingPlanWeekDto {
  @ApiPropertyOptional({ description: 'Week name/title' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Week focus description' })
  @IsOptional()
  @IsString()
  focus?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO-8601)' })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO-8601)' })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({ enum: TrainingPlanWeekStatusEnum })
  @IsOptional()
  @IsEnum(TrainingPlanWeekStatusEnum)
  status?: TrainingPlanWeekStatusEnum;
}

export class CreateTrainingPlanDayDto {
  @ApiProperty({ description: 'Day number (1=Mon ... 7=Sun)' })
  @IsInt()
  @Min(1)
  @Max(7)
  dayNumber!: number;

  @ApiPropertyOptional({ description: 'Calendar date for this day' })
  @IsOptional()
  @IsISO8601()
  date?: string;

  @ApiPropertyOptional({ description: 'Day title' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Focus description' })
  @IsOptional()
  @IsString()
  focus?: string;

  @ApiPropertyOptional({ description: 'Assigned workout ID' })
  @IsOptional()
  @IsString()
  workoutId?: string;

  @ApiPropertyOptional({ description: 'Whether this is designated as a rest day', default: false })
  @IsOptional()
  @IsBoolean()
  restDay?: boolean;

  @ApiPropertyOptional({ description: 'Trainer or coaching notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateTrainingPlanDayDto {
  @ApiPropertyOptional({ description: 'Calendar date for this day' })
  @IsOptional()
  @IsISO8601()
  date?: string;

  @ApiPropertyOptional({ description: 'Day title' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Focus description' })
  @IsOptional()
  @IsString()
  focus?: string;

  @ApiPropertyOptional({ description: 'Assigned workout ID' })
  @IsOptional()
  @IsString()
  workoutId?: string;

  @ApiPropertyOptional({ description: 'Whether this is designated as a rest day' })
  @IsOptional()
  @IsBoolean()
  restDay?: boolean;

  @ApiPropertyOptional({ description: 'Trainer or coaching notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class GenerateWorkoutsFromTemplateDto {
  @ApiProperty({ description: 'Workout template ID to generate from' })
  @IsString()
  @IsNotEmpty()
  workoutTemplateId!: string;

  @ApiProperty({ description: 'Array of day numbers (1..7) to schedule on each week', type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  dayNumbers!: number[];

  @ApiPropertyOptional({ description: 'Start week number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  startWeek?: number;

  @ApiPropertyOptional({ description: 'End week number' })
  @IsOptional()
  @IsInt()
  @Min(1)
  endWeek?: number;

  @ApiPropertyOptional({ description: 'Apply active progression rules to future weeks', default: true })
  @IsOptional()
  @IsBoolean()
  applyProgression?: boolean;
}

export class TrainingPlanQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  memberProfileId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trainerProfileId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trainingProgramId?: string;

  @ApiPropertyOptional({ enum: TrainingPlanStatusEnum })
  @IsOptional()
  @IsEnum(TrainingPlanStatusEnum)
  status?: TrainingPlanStatusEnum;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
