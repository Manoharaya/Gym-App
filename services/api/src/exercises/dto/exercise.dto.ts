import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  ExerciseDifficulty,
  ExerciseType,
  MovementPattern,
  MuscleGroup,
  EquipmentType,
} from '@fitcore/types';

export const EXERCISE_DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;
export const EXERCISE_TYPES = [
  'STRENGTH',
  'CARDIO',
  'MOBILITY',
  'FLEXIBILITY',
  'BALANCE',
  'PLYOMETRIC',
  'REHABILITATION',
  'RECOVERY',
  'FUNCTIONAL',
  'CORE',
  'OTHER',
] as const;
export const MOVEMENT_PATTERNS = [
  'SQUAT',
  'HINGE',
  'LUNGE',
  'PUSH',
  'PULL',
  'CARRY',
  'ROTATION',
  'ANTI_ROTATION',
  'GAIT',
  'JUMP',
  'ISOMETRIC',
  'OTHER',
] as const;
export const MUSCLE_GROUPS = [
  'CHEST',
  'BACK',
  'SHOULDERS',
  'BICEPS',
  'TRICEPS',
  'FOREARMS',
  'QUADRICEPS',
  'HAMSTRINGS',
  'GLUTES',
  'CALVES',
  'CORE',
  'FULL_BODY',
  'OTHER',
] as const;
export const EQUIPMENT_TYPES = [
  'BODYWEIGHT',
  'BARBELL',
  'DUMBBELL',
  'KETTLEBELL',
  'CABLE',
  'MACHINE',
  'BAND',
  'BENCH',
  'RACK',
  'MEDICINE_BALL',
  'TRX',
  'ROWER',
  'BIKE',
  'TREADMILL',
  'OTHER',
  'NONE',
] as const;

export class ExerciseQueryDto {
  @ApiPropertyOptional({ description: 'Search term for name or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: MUSCLE_GROUPS })
  @IsOptional()
  @IsEnum(MUSCLE_GROUPS)
  muscleGroup?: MuscleGroup;

  @ApiPropertyOptional({ enum: MOVEMENT_PATTERNS })
  @IsOptional()
  @IsEnum(MOVEMENT_PATTERNS)
  movementPattern?: MovementPattern;

  @ApiPropertyOptional({ enum: EQUIPMENT_TYPES })
  @IsOptional()
  @IsEnum(EQUIPMENT_TYPES)
  equipmentType?: EquipmentType;

  @ApiPropertyOptional({ enum: EXERCISE_DIFFICULTIES })
  @IsOptional()
  @IsEnum(EXERCISE_DIFFICULTIES)
  difficulty?: ExerciseDifficulty;

  @ApiPropertyOptional({ enum: EXERCISE_TYPES })
  @IsOptional()
  @IsEnum(EXERCISE_TYPES)
  exerciseType?: ExerciseType;

  @ApiPropertyOptional({ enum: ['ALL', 'SYSTEM', 'ORGANISATION'] })
  @IsOptional()
  @IsEnum(['ALL', 'SYSTEM', 'ORGANISATION'])
  ownership?: 'ALL' | 'SYSTEM' | 'ORGANISATION';

  @ApiPropertyOptional({ description: 'Include archived exercises' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeArchived?: boolean;

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

export class CreateExerciseDto {
  @ApiProperty({ description: 'Name of the exercise' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: EXERCISE_DIFFICULTIES, default: 'INTERMEDIATE' })
  @IsEnum(EXERCISE_DIFFICULTIES)
  difficulty: ExerciseDifficulty;

  @ApiProperty({ enum: EXERCISE_TYPES, default: 'STRENGTH' })
  @IsEnum(EXERCISE_TYPES)
  exerciseType: ExerciseType;

  @ApiProperty({ enum: MOVEMENT_PATTERNS, default: 'OTHER' })
  @IsEnum(MOVEMENT_PATTERNS)
  movementPattern: MovementPattern;

  @ApiProperty({ enum: MUSCLE_GROUPS, default: 'FULL_BODY' })
  @IsEnum(MUSCLE_GROUPS)
  primaryMuscleGroup: MuscleGroup;

  @ApiPropertyOptional({ enum: MUSCLE_GROUPS, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(MUSCLE_GROUPS, { each: true })
  secondaryMuscleGroups?: MuscleGroup[];

  @ApiProperty({ enum: EQUIPMENT_TYPES, default: 'BODYWEIGHT' })
  @IsEnum(EQUIPMENT_TYPES)
  equipmentType: EquipmentType;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  instructions?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coachingCues?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  safetyNotes?: string;

  @ApiPropertyOptional({ default: 90 })
  @IsOptional()
  @IsInt()
  @Min(0)
  defaultRestSeconds?: number;
}

export class UpdateExerciseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: EXERCISE_DIFFICULTIES })
  @IsOptional()
  @IsEnum(EXERCISE_DIFFICULTIES)
  difficulty?: ExerciseDifficulty;

  @ApiPropertyOptional({ enum: EXERCISE_TYPES })
  @IsOptional()
  @IsEnum(EXERCISE_TYPES)
  exerciseType?: ExerciseType;

  @ApiPropertyOptional({ enum: MOVEMENT_PATTERNS })
  @IsOptional()
  @IsEnum(MOVEMENT_PATTERNS)
  movementPattern?: MovementPattern;

  @ApiPropertyOptional({ enum: MUSCLE_GROUPS })
  @IsOptional()
  @IsEnum(MUSCLE_GROUPS)
  primaryMuscleGroup?: MuscleGroup;

  @ApiPropertyOptional({ enum: MUSCLE_GROUPS, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(MUSCLE_GROUPS, { each: true })
  secondaryMuscleGroups?: MuscleGroup[];

  @ApiPropertyOptional({ enum: EQUIPMENT_TYPES })
  @IsOptional()
  @IsEnum(EQUIPMENT_TYPES)
  equipmentType?: EquipmentType;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  instructions?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coachingCues?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  safetyNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  defaultRestSeconds?: number;
}

export class AttachExerciseMediaDto {
  @ApiProperty({ enum: ['IMAGE', 'VIDEO', 'ANIMATION', 'THUMBNAIL'] })
  @IsEnum(['IMAGE', 'VIDEO', 'ANIMATION', 'THUMBNAIL'])
  mediaType: 'IMAGE' | 'VIDEO' | 'ANIMATION' | 'THUMBNAIL';

  @ApiProperty({ description: 'Public or relative URL' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ description: 'Storage key for private signed access' })
  @IsOptional()
  @IsString()
  storageKey?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  caption?: string;
}

export class PresignMediaUploadDto {
  @ApiProperty({ description: 'Original file name' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({ description: 'Mime type, e.g. image/jpeg, video/mp4' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ enum: ['IMAGE', 'VIDEO', 'ANIMATION', 'THUMBNAIL'] })
  @IsEnum(['IMAGE', 'VIDEO', 'ANIMATION', 'THUMBNAIL'])
  mediaType: 'IMAGE' | 'VIDEO' | 'ANIMATION' | 'THUMBNAIL';
}
