import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  IsNumber,
  Min,
  Max,
  IsNotEmpty,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  ExerciseDifficulty,
  PrescriptionType,
  WorkoutStatus,
  LoadUnit,
  DistanceUnit,
} from '@fitcore/types';

export const EXERCISE_DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;
export const PRESCRIPTION_TYPES = [
  'SETS_REPS',
  'REPETITIONS',
  'TIME_BASED',
  'TIME',
  'DISTANCE',
  'CALORIES',
  'LOAD',
  'AMRAP',
  'EMOM',
  'INTERVAL',
  'ISOMETRIC',
  'COMPLEX',
  'CUSTOM',
] as const;
export const WORKOUT_STATUSES = [
  'DRAFT',
  'ASSIGNED',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'SKIPPED',
  'CANCELLED',
  'EXPIRED',
] as const;
export const LOAD_UNITS = ['KG', 'LB'] as const;
export const DISTANCE_UNITS = ['KM', 'MI', 'M', 'FT'] as const;

export class AssignWorkoutExerciseDto {
  @ApiProperty({ description: 'ID of the exercise' })
  @IsString()
  @IsNotEmpty()
  exerciseId: string;

  @ApiProperty({ default: 0 })
  @IsInt()
  @Min(0)
  sortOrder: number;

  @ApiProperty({ enum: PRESCRIPTION_TYPES, default: 'REPETITIONS' })
  @IsEnum(PRESCRIPTION_TYPES)
  prescriptionType: PrescriptionType = 'REPETITIONS';

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  targetSets?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  targetReps?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  targetRepsMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  targetRepsMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  targetRpe?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  targetLoad?: number;

  @ApiPropertyOptional({ enum: LOAD_UNITS, default: 'KG' })
  @IsOptional()
  @IsEnum(LOAD_UNITS)
  loadUnit?: LoadUnit = 'KG';

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  targetDurationSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  targetDistance?: number;

  @ApiPropertyOptional({ enum: DISTANCE_UNITS })
  @IsOptional()
  @IsEnum(DISTANCE_UNITS)
  distanceUnit?: DistanceUnit;

  @ApiPropertyOptional({ default: 90 })
  @IsOptional()
  @IsInt()
  @Min(0)
  restSeconds?: number = 90;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tempo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trainerNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  supersetOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supersetIdentifier?: string;
}

export class AssignWorkoutDto {
  @ApiProperty({ description: 'Target member profile ID' })
  @IsString()
  @IsNotEmpty()
  memberProfileId: string;

  @ApiPropertyOptional({ description: 'Assigning trainer profile ID (optional if actor is trainer)' })
  @IsOptional()
  @IsString()
  trainerProfileId?: string;

  @ApiPropertyOptional({ description: 'Optional workout template ID to instantiate' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Optional training program ID to link' })
  @IsOptional()
  @IsString()
  trainingProgramId?: string;

  @ApiPropertyOptional({ description: 'Optional PT session ID to link' })
  @IsOptional()
  @IsString()
  personalTrainingSessionId?: string;

  @ApiProperty({ description: 'Name of the workout' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Scheduled date (ISO format, e.g. 2026-09-07T00:00:00Z)' })
  @IsString()
  @IsNotEmpty()
  scheduledDate: string;

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsInt()
  @Min(5)
  estimatedDurationMinutes?: number = 60;

  @ApiProperty({ enum: EXERCISE_DIFFICULTIES, default: 'INTERMEDIATE' })
  @IsEnum(EXERCISE_DIFFICULTIES)
  difficulty: ExerciseDifficulty = 'INTERMEDIATE';

  @ApiPropertyOptional({ type: [AssignWorkoutExerciseDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignWorkoutExerciseDto)
  exercises?: AssignWorkoutExerciseDto[];
}

export class LogWorkoutSetDto {
  @ApiProperty({ description: 'Set index, 1-based' })
  @IsInt()
  @Min(1)
  setNumber: number;

  @ApiPropertyOptional({ enum: ['WARMUP', 'WORKING', 'DROPSET', 'AMRAP', 'COOLDOWN'], default: 'WORKING' })
  @IsOptional()
  @IsEnum(['WARMUP', 'WORKING', 'DROPSET', 'AMRAP', 'COOLDOWN'])
  setKind?: 'WARMUP' | 'WORKING' | 'DROPSET' | 'AMRAP' | 'COOLDOWN' = 'WORKING';

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  targetReps?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  actualReps?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  targetLoad?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualLoad?: number;

  @ApiPropertyOptional({ enum: LOAD_UNITS, default: 'KG' })
  @IsOptional()
  @IsEnum(LOAD_UNITS)
  loadUnit?: LoadUnit = 'KG';

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  actualDurationSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualDistance?: number;

  @ApiPropertyOptional({ enum: DISTANCE_UNITS })
  @IsOptional()
  @IsEnum(DISTANCE_UNITS)
  distanceUnit?: DistanceUnit;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  actualRpe?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean = true;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Unique idempotency key to prevent double submission' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class CorrectWorkoutSetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  actualReps?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualLoad?: number;

  @ApiPropertyOptional({ enum: LOAD_UNITS })
  @IsOptional()
  @IsEnum(LOAD_UNITS)
  loadUnit?: LoadUnit;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  actualDurationSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualDistance?: number;

  @ApiPropertyOptional({ enum: DISTANCE_UNITS })
  @IsOptional()
  @IsEnum(DISTANCE_UNITS)
  distanceUnit?: DistanceUnit;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  actualRpe?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @ApiProperty({ description: 'Reason for retroactive set correction' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class CompleteWorkoutDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  memberNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trainerFeedback?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}

export class WorkoutQueryDto {
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

  @ApiPropertyOptional({ enum: WORKOUT_STATUSES })
  @IsOptional()
  @IsEnum(WORKOUT_STATUSES)
  status?: WorkoutStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

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
