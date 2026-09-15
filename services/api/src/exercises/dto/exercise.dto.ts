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
  ExerciseContentStatus,
  InstructionPhaseType,
  MistakeSeverity,
  SafetyCategory,
  SafetySeverity,
  VariationRelationshipType,
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

export const EXERCISE_CONTENT_STATUSES = [
  'DRAFT',
  'REVIEW',
  'APPROVED',
  'PUBLISHED',
  'ARCHIVED',
] as const;

export const INSTRUCTION_PHASE_TYPES = [
  'PREPARATION',
  'SETUP',
  'EXECUTION',
  'BREATHING',
  'COMPLETION',
  'SAFETY',
] as const;

export const MISTAKE_SEVERITIES = ['MINOR', 'MODERATE', 'SEVERE'] as const;

export const SAFETY_CATEGORIES = [
  'SAFETY_NOTE',
  'GENERAL_PRECAUTION',
  'TECHNIQUE_WARNING',
  'EQUIPMENT_WARNING',
  'BEGINNER_WARNING',
  'PROFESSIONAL_GUIDANCE',
] as const;

export const SAFETY_SEVERITIES = ['LOW', 'STANDARD', 'HIGH', 'CRITICAL'] as const;

export const VARIATION_RELATIONSHIP_TYPES = [
  'VARIATION',
  'REGRESSION',
  'PROGRESSION',
  'ALTERNATIVE',
] as const;

export const EXTENDED_MEDIA_TYPES = [
  'IMAGE',
  'VIDEO',
  'ANIMATION',
  'MODEL_3D',
  'GIF',
  'THUMBNAIL',
  'ILLUSTRATION',
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

  @ApiPropertyOptional({ enum: EXERCISE_CONTENT_STATUSES })
  @IsOptional()
  @IsEnum(EXERCISE_CONTENT_STATUSES)
  contentStatus?: ExerciseContentStatus;

  @ApiPropertyOptional({ description: 'Filter exercises with video demonstration' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasVideo?: boolean;

  @ApiPropertyOptional({ description: 'Filter exercises with animation' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasAnimation?: boolean;

  @ApiPropertyOptional({ description: 'Filter exercises with 3D model asset' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasModel3d?: boolean;

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

  @ApiPropertyOptional({ enum: EXERCISE_CONTENT_STATUSES, default: 'PUBLISHED' })
  @IsOptional()
  @IsEnum(EXERCISE_CONTENT_STATUSES)
  contentStatus?: ExerciseContentStatus;

  @ApiPropertyOptional({ description: 'Inhalation / exhalation timing' })
  @IsOptional()
  @IsString()
  breathingInstructions?: string;

  @ApiPropertyOptional({ description: 'Eccentric-pause-concentric-pause cadence e.g. 3-0-1-0' })
  @IsOptional()
  @IsString()
  tempo?: string;

  @ApiPropertyOptional({ description: 'Expected joint range of motion' })
  @IsOptional()
  @IsString()
  rangeOfMotion?: string;

  @ApiPropertyOptional({ type: [String], description: 'Muscles acting as dynamic or static stabilizers' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stabilizerMuscles?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Practical trainer tips' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  educationalTips?: string[];

  @ApiPropertyOptional({ description: 'Metadata for computer vision and form tracking' })
  @IsOptional()
  movementPatternMetadata?: Record<string, any>;
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

  @ApiPropertyOptional({ enum: EXERCISE_CONTENT_STATUSES })
  @IsOptional()
  @IsEnum(EXERCISE_CONTENT_STATUSES)
  contentStatus?: ExerciseContentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  breathingInstructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tempo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rangeOfMotion?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stabilizerMuscles?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  educationalTips?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  movementPatternMetadata?: Record<string, any>;
}

export class AttachExerciseMediaDto {
  @ApiProperty({ enum: EXTENDED_MEDIA_TYPES })
  @IsEnum(EXTENDED_MEDIA_TYPES)
  mediaType: 'IMAGE' | 'VIDEO' | 'ANIMATION' | 'MODEL_3D' | 'GIF' | 'THUMBNAIL' | 'ILLUSTRATION';

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
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  width?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  height?: number;

  @ApiPropertyOptional({ enum: ['GLB', 'GLTF', 'USDZ'] })
  @IsOptional()
  @IsString()
  format3d?: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH'] })
  @IsOptional()
  @IsString()
  modelLod?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

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

  @ApiProperty({ description: 'Mime type, e.g. image/jpeg, video/mp4, model/gltf-binary' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ enum: EXTENDED_MEDIA_TYPES })
  @IsEnum(EXTENDED_MEDIA_TYPES)
  mediaType: 'IMAGE' | 'VIDEO' | 'ANIMATION' | 'MODEL_3D' | 'GIF' | 'THUMBNAIL' | 'ILLUSTRATION';
}

export class CreateInstructionStepDto {
  @ApiProperty({ default: 1 })
  @IsInt()
  @Min(1)
  stepNumber: number;

  @ApiPropertyOptional({ enum: INSTRUCTION_PHASE_TYPES })
  @IsOptional()
  @IsEnum(INSTRUCTION_PHASE_TYPES)
  phase?: InstructionPhaseType;

  @ApiProperty({ description: 'Step headline' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Detailed instruction description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Specific verbal coaching cue' })
  @IsOptional()
  @IsString()
  coachingCue?: string;

  @ApiPropertyOptional({ description: 'Illustration or step media URL' })
  @IsOptional()
  @IsString()
  mediaUrl?: string;
}

export class UpdateInstructionStepDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  stepNumber?: number;

  @ApiPropertyOptional({ enum: INSTRUCTION_PHASE_TYPES })
  @IsOptional()
  @IsEnum(INSTRUCTION_PHASE_TYPES)
  phase?: InstructionPhaseType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coachingCue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mediaUrl?: string;
}

export class CreateMovementPhaseDto {
  @ApiProperty({ description: 'Phase identifier e.g. SETUP, DESCENT, BOTTOM, ASCENT, LOCKOUT' })
  @IsString()
  @IsNotEmpty()
  phaseName: string;

  @ApiProperty({ default: 0 })
  @IsInt()
  orderIndex: number;

  @ApiPropertyOptional({ description: 'Coaching cue for this movement phase' })
  @IsOptional()
  @IsString()
  cueText?: string;

  @ApiPropertyOptional({ description: 'Target video offset in milliseconds' })
  @IsOptional()
  @IsInt()
  @Min(0)
  timestampMs?: number;

  @ApiPropertyOptional({ type: [String], description: 'Key body checkpoints to inspect' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyCheckpoints?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mediaUrl?: string;
}

export class UpdateMovementPhaseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phaseName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  orderIndex?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cueText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  timestampMs?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyCheckpoints?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mediaUrl?: string;
}

export class CreateCommonMistakeDto {
  @ApiProperty({ description: 'Description of the error or faulty movement' })
  @IsString()
  @IsNotEmpty()
  mistake: string;

  @ApiPropertyOptional({ description: 'Why this mistake is detrimental or hazardous' })
  @IsOptional()
  @IsString()
  consequence?: string;

  @ApiProperty({ description: 'Corrective action or mental cue' })
  @IsString()
  @IsNotEmpty()
  correction: string;

  @ApiPropertyOptional({ enum: MISTAKE_SEVERITIES, default: 'MODERATE' })
  @IsOptional()
  @IsEnum(MISTAKE_SEVERITIES)
  severity?: MistakeSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateCommonMistakeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mistake?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  consequence?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  correction?: string;

  @ApiPropertyOptional({ enum: MISTAKE_SEVERITIES })
  @IsOptional()
  @IsEnum(MISTAKE_SEVERITIES)
  severity?: MistakeSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class CreateSafetyGuidelineDto {
  @ApiPropertyOptional({ enum: SAFETY_CATEGORIES, default: 'GENERAL_PRECAUTION' })
  @IsOptional()
  @IsEnum(SAFETY_CATEGORIES)
  category?: SafetyCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Safety warning or anatomical contraindication' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ enum: SAFETY_SEVERITIES, default: 'STANDARD' })
  @IsOptional()
  @IsEnum(SAFETY_SEVERITIES)
  severity?: SafetySeverity;

  @ApiPropertyOptional({ description: 'Certifying clinician or coach name' })
  @IsOptional()
  @IsString()
  reviewedBy?: string;
}

export class UpdateSafetyGuidelineDto {
  @ApiPropertyOptional({ enum: SAFETY_CATEGORIES })
  @IsOptional()
  @IsEnum(SAFETY_CATEGORIES)
  category?: SafetyCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: SAFETY_SEVERITIES })
  @IsOptional()
  @IsEnum(SAFETY_SEVERITIES)
  severity?: SafetySeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewedBy?: string;
}

export class CreateExerciseVariationDto {
  @ApiProperty({ description: 'ID of target related exercise' })
  @IsString()
  @IsNotEmpty()
  targetExerciseId: string;

  @ApiProperty({ enum: VARIATION_RELATIONSHIP_TYPES, default: 'VARIATION' })
  @IsEnum(VARIATION_RELATIONSHIP_TYPES)
  relationshipType: VariationRelationshipType;

  @ApiPropertyOptional({ description: 'Coaching context for why to select this variation' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateEquipmentRelationDto {
  @ApiProperty({ description: 'Equipment name e.g. Olympic Barbell, Squat Rack' })
  @IsString()
  @IsNotEmpty()
  equipmentName: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @ApiPropertyOptional({ description: 'Setup requirements or alternatives' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateContentStatusDto {
  @ApiProperty({ enum: EXERCISE_CONTENT_STATUSES })
  @IsEnum(EXERCISE_CONTENT_STATUSES)
  contentStatus: ExerciseContentStatus;
}
