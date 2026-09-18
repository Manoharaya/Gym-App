import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum GuidedSessionItemType {
  INTRO = 'INTRO',
  WARMUP = 'WARMUP',
  EXERCISE_TUTORIAL = 'EXERCISE_TUTORIAL',
  PRACTICE = 'PRACTICE',
  REST = 'REST',
  TRANSITION = 'TRANSITION',
  KNOWLEDGE_CHECK = 'KNOWLEDGE_CHECK',
  COOLDOWN = 'COOLDOWN',
  SUMMARY = 'SUMMARY',
}

export enum GuidedSessionCategory {
  FUNDAMENTALS = 'FUNDAMENTALS',
  SKILL_MASTERY = 'SKILL_MASTERY',
  STRENGTH = 'STRENGTH',
  MOBILITY = 'MOBILITY',
  REHAB = 'REHAB',
  POSTURE = 'POSTURE',
}

export enum GuidedSessionDifficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export enum GuidedSessionContentStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum GuidedSessionOwnershipType {
  SYSTEM = 'SYSTEM',
  ORGANISATION = 'ORGANISATION',
  TRAINER = 'TRAINER',
}

export enum GuidedSessionProgressStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

// ==========================================
// QUERY DTOS
// ==========================================

export class QueryGuidedSessionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: GuidedSessionCategory })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: GuidedSessionDifficulty })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryGoal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  equipment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  movementPattern?: string;

  @ApiPropertyOptional({ enum: GuidedSessionOwnershipType })
  @IsOptional()
  @IsString()
  ownershipType?: string;

  @ApiPropertyOptional({ enum: GuidedSessionContentStatus })
  @IsOptional()
  @IsString()
  contentStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  featured?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

// ==========================================
// SESSION CRUD DTOS
// ==========================================

export class CreateGuidedSessionDto {
  @ApiProperty({ description: 'Title of the guided session' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'URL slug (auto-generated if omitted)' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ description: 'Detailed educational description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Cover image or video thumbnail URL' })
  @IsOptional()
  @IsString()
  coverMediaUrl?: string;

  @ApiPropertyOptional({ enum: GuidedSessionCategory })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: GuidedSessionDifficulty, default: GuidedSessionDifficulty.BEGINNER })
  @IsOptional()
  @IsString()
  difficulty?: string = GuidedSessionDifficulty.BEGINNER;

  @ApiPropertyOptional({ description: 'Primary goal, e.g. TECHNIQUE, STRENGTH, MOBILITY' })
  @IsOptional()
  @IsString()
  primaryGoal?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  estimatedDurationMinutes?: number = 20;

  @ApiPropertyOptional({ enum: GuidedSessionOwnershipType, default: GuidedSessionOwnershipType.ORGANISATION })
  @IsOptional()
  @IsString()
  ownershipType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateGuidedSessionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverMediaUrl?: string;

  @ApiPropertyOptional({ enum: GuidedSessionCategory })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: GuidedSessionDifficulty })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryGoal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional({ enum: GuidedSessionContentStatus })
  @IsOptional()
  @IsString()
  contentStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

// ==========================================
// SECTION DTOS
// ==========================================

export class CreateGuidedSessionSectionDto {
  @ApiProperty({ description: 'Section title, e.g. Section 1 - Prepare' })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sortOrder?: number = 0;
}

export class UpdateGuidedSessionSectionDto {
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
  @IsInt()
  @Type(() => Number)
  sortOrder?: number;
}

// ==========================================
// ITEM DTOS
// ==========================================

export class CreateGuidedSessionItemDto {
  @ApiPropertyOptional({ description: 'Optional section ID to group this item' })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiProperty({ enum: GuidedSessionItemType })
  @IsEnum(GuidedSessionItemType)
  itemType: GuidedSessionItemType;

  @ApiProperty({ description: 'Item title, e.g. Squat Technique Tutorial' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Item description or instructions' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Configured duration in seconds (e.g. 30s rest, 45s practice)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  durationSeconds?: number;

  @ApiPropertyOptional({ description: 'Target repetitions for rep-based practice (e.g. 8 reps)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  repetitionCount?: number;

  @ApiPropertyOptional({ description: 'Referenced Exercise ID (required for EXERCISE_TUTORIAL and PRACTICE)' })
  @IsOptional()
  @IsString()
  exerciseId?: string;

  @ApiPropertyOptional({ description: 'Referenced Knowledge Check ID (required for KNOWLEDGE_CHECK)' })
  @IsOptional()
  @IsString()
  knowledgeCheckId?: string;

  @ApiPropertyOptional({ description: 'Item specific configuration/cues' })
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean = true;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sortOrder?: number = 0;
}

export class UpdateGuidedSessionItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiPropertyOptional({ enum: GuidedSessionItemType })
  @IsOptional()
  @IsEnum(GuidedSessionItemType)
  itemType?: GuidedSessionItemType;

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
  @IsInt()
  @Min(0)
  @Type(() => Number)
  durationSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  repetitionCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exerciseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  knowledgeCheckId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sortOrder?: number;
}

export class ReorderItemDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsInt()
  sortOrder: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sectionId?: string;
}

export class ReorderGuidedSessionItemsDto {
  @ApiProperty({ type: [ReorderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items: ReorderItemDto[];
}

// ==========================================
// PROGRESS & LIFECYCLE DTOS
// ==========================================

export class StartGuidedSessionDto {
  @ApiPropertyOptional({ description: 'Whether to reset previous progress and start from Item 1' })
  @IsOptional()
  @IsBoolean()
  resetProgress?: boolean;
}

export class UpdateGuidedSessionProgressDto {
  @ApiPropertyOptional({ description: 'ID of item currently being viewed/active' })
  @IsOptional()
  @IsString()
  currentItemId?: string;

  @ApiPropertyOptional({ description: 'Active step index (0-indexed)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  currentStepIndex?: number;

  @ApiPropertyOptional({ description: 'ID of item just completed' })
  @IsOptional()
  @IsString()
  completedItemId?: string;

  @ApiPropertyOptional({ description: 'Optional completion payload (checklistState, completedReps, restSkipped, score)' })
  @IsOptional()
  itemCompletionData?: {
    completedReps?: number;
    checklistState?: Record<string, boolean>;
    restSkipped?: boolean;
    score?: number;
    notes?: string;
  };

  @ApiPropertyOptional({ description: 'Incremental active seconds spent during this step' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  timeSpentSecondsIncrement?: number;
}

export class CompleteGuidedSessionDto {
  @ApiPropertyOptional({ description: 'Total study/practice duration in seconds' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  totalTimeSpentSeconds?: number;

  @ApiPropertyOptional({ description: 'Self-reflection notes or rating' })
  @IsOptional()
  practiceFeedback?: Record<string, any>;
}

// ==========================================
// PUBLISHING & VALIDATION REPORT DTO
// ==========================================

export class PublishValidationResultDto {
  @ApiProperty()
  isValid: boolean;

  @ApiProperty({ type: [String] })
  errors: string[];

  @ApiProperty({ type: [String] })
  warnings: string[];

  @ApiPropertyOptional()
  summary?: {
    totalItems: number;
    exerciseTutorialCount: number;
    practiceCount: number;
    knowledgeCheckCount: number;
    estimatedDurationMinutes: number;
    equipmentNeeded: string[];
  };
}
