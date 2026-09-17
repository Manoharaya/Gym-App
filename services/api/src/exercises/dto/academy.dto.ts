import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsIn,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export const CURRICULUM_CATEGORIES = [
  'FITNESS_FUNDAMENTALS',
  'MOVEMENT_FUNDAMENTALS',
  'EXERCISE_FUNDAMENTALS',
  'GYM_EQUIPMENT',
  'TRAINING_PRINCIPLES',
  'WARMUP_COOLDOWN',
  'STRENGTH_TRAINING',
  'CARDIO',
  'MOBILITY',
  'FLEXIBILITY',
  'RECOVERY',
  'WELLNESS',
] as const;

export type CurriculumCategoryType = typeof CURRICULUM_CATEGORIES[number];

export const CONTENT_BLOCK_TYPES = [
  'TEXT',
  'CALLOUT',
  'IMAGE',
  'VIDEO',
  'ANIMATION',
  'EXERCISE_REF',
  'MOVEMENT_REF',
  'EQUIPMENT_REF',
  'GLOSSARY_REF',
  'KNOWLEDGE_CHECK',
  'SUMMARY',
] as const;

export type ContentBlockType = typeof CONTENT_BLOCK_TYPES[number];

export const CALLOUT_TYPES = [
  'TIP',
  'KEY_POINT',
  'SAFETY',
  'REMEMBER',
  'EXAMPLE',
  'DEFINITION',
] as const;

export type CalloutType = typeof CALLOUT_TYPES[number];

export class ContentBlockDto {
  @IsString()
  id: string;

  @IsIn(CONTENT_BLOCK_TYPES)
  type: ContentBlockType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  mediaAltText?: string;

  @IsOptional()
  @IsIn(CALLOUT_TYPES)
  calloutType?: CalloutType;

  @IsOptional()
  @IsString()
  exerciseId?: string;

  @IsOptional()
  @IsString()
  exerciseName?: string;

  @IsOptional()
  @IsString()
  movementPattern?: string;

  @IsOptional()
  @IsString()
  equipmentType?: string;

  @IsOptional()
  @IsString()
  glossaryTermId?: string;

  @IsOptional()
  @IsString()
  glossaryTerm?: string;

  @IsOptional()
  @IsString()
  knowledgeCheckId?: string;

  @IsInt()
  sortOrder: number;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateCurriculumDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(CURRICULUM_CATEGORIES)
  category: CurriculumCategoryType;

  @IsOptional()
  @IsIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
  difficulty?: string;

  @IsOptional()
  @IsString()
  iconName?: string;

  @IsOptional()
  @IsString()
  coverMediaUrl?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningPathIds?: string[];
}

export class UpdateCurriculumDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(CURRICULUM_CATEGORIES)
  category?: CurriculumCategoryType;

  @IsOptional()
  @IsIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
  difficulty?: string;

  @IsOptional()
  @IsString()
  iconName?: string;

  @IsOptional()
  @IsString()
  coverMediaUrl?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED'])
  contentStatus?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningPathIds?: string[];
}

export class CurriculumQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(CURRICULUM_CATEGORIES)
  category?: CurriculumCategoryType;

  @IsOptional()
  @IsIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
  difficulty?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class CreateGlossaryTermDto {
  @IsString()
  term: string;

  @IsString()
  definition: string;

  @IsOptional()
  @IsString()
  shortExplanation?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
  difficulty?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedExerciseIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedMovementPatterns?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedLessonIds?: string[];

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateGlossaryTermDto {
  @IsOptional()
  @IsString()
  term?: string;

  @IsOptional()
  @IsString()
  definition?: string;

  @IsOptional()
  @IsString()
  shortExplanation?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
  difficulty?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedExerciseIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedMovementPatterns?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedLessonIds?: string[];

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class GlossaryQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  letter?: string; // Alphabetical filter: A, B, C...

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
