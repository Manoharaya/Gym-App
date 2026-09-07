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
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  ExerciseDifficulty,
  PrescriptionType,
  WorkoutTemplateStatus,
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
export const WORKOUT_TEMPLATE_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
export const LOAD_UNITS = ['KG', 'LB'] as const;
export const DISTANCE_UNITS = ['KM', 'MI', 'M', 'FT'] as const;

export class CreateWorkoutTemplateExerciseDto {
  @ApiProperty({ description: 'ID of the exercise from the Exercise library' })
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

  @ApiPropertyOptional({ description: 'Tempo notation, e.g. 3-0-1-0' })
  @IsOptional()
  @IsString()
  tempo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  supersetOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supersetIdentifier?: string;
}

export class CreateWorkoutTemplateDto {
  @ApiProperty({ description: 'Template name, e.g. Upper Body Strength A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsInt()
  @Min(5)
  estimatedDurationMinutes?: number = 60;

  @ApiProperty({ enum: EXERCISE_DIFFICULTIES, default: 'INTERMEDIATE' })
  @IsEnum(EXERCISE_DIFFICULTIES)
  difficulty: ExerciseDifficulty = 'INTERMEDIATE';

  @ApiPropertyOptional({ description: 'Category or goal e.g. Hypertrophy, Strength' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ type: [CreateWorkoutTemplateExerciseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkoutTemplateExerciseDto)
  exercises: CreateWorkoutTemplateExerciseDto[];
}

export class UpdateWorkoutTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(5)
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional({ enum: EXERCISE_DIFFICULTIES })
  @IsOptional()
  @IsEnum(EXERCISE_DIFFICULTIES)
  difficulty?: ExerciseDifficulty;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [CreateWorkoutTemplateExerciseDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkoutTemplateExerciseDto)
  exercises?: CreateWorkoutTemplateExerciseDto[];
}

export class WorkoutTemplateQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: EXERCISE_DIFFICULTIES })
  @IsOptional()
  @IsEnum(EXERCISE_DIFFICULTIES)
  difficulty?: ExerciseDifficulty;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: WORKOUT_TEMPLATE_STATUSES })
  @IsOptional()
  @IsEnum(WORKOUT_TEMPLATE_STATUSES)
  status?: WorkoutTemplateStatus;

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
