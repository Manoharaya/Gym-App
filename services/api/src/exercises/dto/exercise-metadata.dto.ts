import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  Min,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import type {
  MuscleRole,
  MuscleActivationLevel,
  MuscleTaxonomyGroup,
  EquipmentRequirementType,
  EquipmentCategoryType,
  EquipmentAvailabilityContext,
  ExerciseCategoryType,
  ExerciseMechanics,
  TrainingGoalType,
  MetadataItemType,
} from '@fitcore/types';

export const MUSCLE_ROLES = ['PRIMARY', 'SECONDARY', 'STABILIZER'] as const;
export const MUSCLE_ACTIVATION_LEVELS = ['LOW', 'MODERATE', 'HIGH'] as const;
export const MUSCLE_TAXONOMY_GROUPS = ['UPPER_BODY', 'LOWER_BODY', 'CORE', 'FULL_BODY'] as const;

export const EQUIPMENT_REQUIREMENT_TYPES = ['REQUIRED', 'OPTIONAL', 'ALTERNATIVE', 'NONE'] as const;
export const EQUIPMENT_CATEGORY_TYPES = [
  'FREE_WEIGHTS',
  'MACHINES',
  'BENCHES_SUPPORTS',
  'BODYWEIGHT',
  'ACCESSORIES',
  'CABLE',
  'OTHER',
] as const;
export const EQUIPMENT_AVAILABILITY_CONTEXTS = [
  'HOME',
  'GYM',
  'OUTDOOR',
  'STUDIO',
  'NONE',
] as const;

export const EXERCISE_CATEGORY_TYPES = [
  'STRENGTH',
  'CARDIO',
  'MOBILITY',
  'FLEXIBILITY',
  'BALANCE',
  'CORE',
  'REHABILITATION_SUPPORT',
  'RECOVERY',
  'BODYWEIGHT',
] as const;

export const EXERCISE_MECHANICS_TYPES = [
  'COMPOUND',
  'ISOLATION',
  'COMBINATION',
  'ISOMETRIC',
  'PLYOMETRIC',
  'CARDIO',
  'MOBILITY',
  'STRETCH',
] as const;

export const TRAINING_GOAL_TYPES = [
  'STRENGTH',
  'MUSCLE_BUILDING',
  'ENDURANCE',
  'FAT_LOSS',
  'MOBILITY',
  'FLEXIBILITY',
  'BALANCE',
  'GENERAL_FITNESS',
  'PERFORMANCE',
] as const;

export const METADATA_ITEM_TYPES = ['MUSCLE', 'EQUIPMENT', 'CATEGORY', 'GOAL', 'TAG'] as const;

export class AddExerciseMuscleRelationDto {
  @ApiProperty({ description: 'Muscle code e.g. CHEST, QUADRICEPS, GLUTES, LATS' })
  @IsString()
  @IsNotEmpty()
  muscle: string;

  @ApiProperty({ enum: MUSCLE_TAXONOMY_GROUPS, default: 'UPPER_BODY' })
  @IsIn(MUSCLE_TAXONOMY_GROUPS)
  muscleGroup: MuscleTaxonomyGroup;

  @ApiProperty({ enum: MUSCLE_ROLES, default: 'PRIMARY' })
  @IsIn(MUSCLE_ROLES)
  role: MuscleRole;

  @ApiPropertyOptional({ enum: MUSCLE_ACTIVATION_LEVELS, default: 'HIGH' })
  @IsOptional()
  @IsIn(MUSCLE_ACTIVATION_LEVELS)
  activationLevel?: MuscleActivationLevel;

  @ApiPropertyOptional({ description: 'Qualitative biomechanical context' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateExerciseMuscleRelationDto {
  @ApiPropertyOptional({ enum: MUSCLE_ROLES })
  @IsOptional()
  @IsIn(MUSCLE_ROLES)
  role?: MuscleRole;

  @ApiPropertyOptional({ enum: MUSCLE_ACTIVATION_LEVELS })
  @IsOptional()
  @IsIn(MUSCLE_ACTIVATION_LEVELS)
  activationLevel?: MuscleActivationLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BatchSetExerciseMusclesDto {
  @ApiProperty({ type: [AddExerciseMuscleRelationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddExerciseMuscleRelationDto)
  muscles: AddExerciseMuscleRelationDto[];
}

export class AddExerciseEquipmentRelationExtendedDto {
  @ApiProperty({ description: 'Equipment name e.g. Dumbbell, Olympic Barbell, Flat Bench' })
  @IsString()
  @IsNotEmpty()
  equipmentName: string;

  @ApiPropertyOptional({ enum: EQUIPMENT_REQUIREMENT_TYPES, default: 'REQUIRED' })
  @IsOptional()
  @IsIn(EQUIPMENT_REQUIREMENT_TYPES)
  requirementType?: EquipmentRequirementType;

  @ApiPropertyOptional({ enum: EQUIPMENT_CATEGORY_TYPES, default: 'FREE_WEIGHTS' })
  @IsOptional()
  @IsIn(EQUIPMENT_CATEGORY_TYPES)
  equipmentCategory?: EquipmentCategoryType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Structured alternative equipment names' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alternatives?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Supported environments e.g. HOME, GYM, OUTDOOR' })
  @IsOptional()
  @IsArray()
  @IsIn(EQUIPMENT_AVAILABILITY_CONTEXTS, { each: true })
  availabilityContexts?: EquipmentAvailabilityContext[];

  @ApiPropertyOptional({ description: 'Specific setup or substitution notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateExerciseEquipmentRelationExtendedDto extends PartialType(
  AddExerciseEquipmentRelationExtendedDto
) {}

export class CreateExerciseMetadataItemDto {
  @ApiProperty({ enum: METADATA_ITEM_TYPES })
  @IsIn(METADATA_ITEM_TYPES)
  type: MetadataItemType;

  @ApiProperty({ description: 'Canonical code e.g. CHEST, DUMBBELL, STRENGTH' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Human readable display name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Sub-group e.g. UPPER_BODY, FREE_WEIGHTS' })
  @IsOptional()
  @IsString()
  group?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Icon identifier' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Extra configuration or properties' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateExerciseMetadataItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  group?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'ARCHIVED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'ARCHIVED'])
  status?: 'ACTIVE' | 'ARCHIVED';

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ExerciseTaxonomyQueryDto {
  @ApiPropertyOptional({ enum: METADATA_ITEM_TYPES })
  @IsOptional()
  @IsIn(METADATA_ITEM_TYPES)
  type?: MetadataItemType;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeArchived?: boolean;
}

export class UpdateExerciseClassificationDto {
  @ApiPropertyOptional({ enum: EXERCISE_CATEGORY_TYPES })
  @IsOptional()
  @IsIn(EXERCISE_CATEGORY_TYPES)
  exerciseCategory?: ExerciseCategoryType;

  @ApiPropertyOptional({ enum: EXERCISE_MECHANICS_TYPES })
  @IsOptional()
  @IsIn(EXERCISE_MECHANICS_TYPES)
  exerciseMechanics?: ExerciseMechanics;

  @ApiPropertyOptional({ enum: EQUIPMENT_REQUIREMENT_TYPES })
  @IsOptional()
  @IsIn(EQUIPMENT_REQUIREMENT_TYPES)
  equipmentRequirement?: EquipmentRequirementType;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsIn(EQUIPMENT_AVAILABILITY_CONTEXTS, { each: true })
  availableEnvironments?: EquipmentAvailabilityContext[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsIn(TRAINING_GOAL_TYPES, { each: true })
  trainingGoals?: TrainingGoalType[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
