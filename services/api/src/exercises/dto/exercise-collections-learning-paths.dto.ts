import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  ValidateNested,
  Min,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export const COLLECTION_CATEGORIES = [
  'ESSENTIALS',
  'POSTURE',
  'STRENGTH',
  'MOBILITY',
  'REHAB',
  'HYPERTROPHY',
  'ATHLETIC',
  'WARMUP',
  'CORE',
] as const;

export const COLLECTION_DIFFICULTIES = [
  'ALL_LEVELS',
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
] as const;

export const CONTENT_STATUSES = [
  'DRAFT',
  'REVIEW',
  'APPROVED',
  'PUBLISHED',
  'ARCHIVED',
] as const;

export const OWNERSHIP_TYPES = ['SYSTEM', 'ORGANISATION', 'TRAINER'] as const;

export const PATH_CATEGORIES = [
  'FUNDAMENTALS',
  'SKILL_MASTERY',
  'MOBILITY',
  'REHAB',
  'HYPERTROPHY',
  'POSTURE',
  'EQUIPMENT_INTRO',
] as const;

export const LESSON_TYPES = [
  'EXERCISE_LESSON',
  'MOVEMENT_LESSON',
  'EQUIPMENT_LESSON',
  'CONCEPT_LESSON',
  'REVIEW',
] as const;

export const PATH_PROGRESS_STATUSES = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
] as const;

// ---------------------------------------------------------------------------
// Query DTOs
// ---------------------------------------------------------------------------

export class QueryExerciseCollectionsDto {
  @ApiPropertyOptional({ description: 'Filter by collection category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by difficulty' })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiPropertyOptional({ description: 'Filter by primary muscle group' })
  @IsOptional()
  @IsString()
  primaryMuscleGroup?: string;

  @ApiPropertyOptional({ description: 'Filter by equipment type' })
  @IsOptional()
  @IsString()
  equipmentType?: string;

  @ApiPropertyOptional({ description: 'Filter featured collections only' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ description: 'Search term against title or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by ownership type (SYSTEM, ORGANISATION)' })
  @IsOptional()
  @IsString()
  ownershipType?: string;

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
  limit?: number = 20;
}

export class QueryLearningPathsDto {
  @ApiPropertyOptional({ description: 'Filter by path category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by difficulty' })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiPropertyOptional({ description: 'Filter by primary training goal' })
  @IsOptional()
  @IsString()
  primaryGoal?: string;

  @ApiPropertyOptional({ description: 'Filter featured learning paths only' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ description: 'Search title or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by member progress status: NOT_STARTED, IN_PROGRESS, COMPLETED' })
  @IsOptional()
  @IsString()
  progressStatus?: string;

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
  limit?: number = 20;
}

// ---------------------------------------------------------------------------
// Collection Item Input DTO
// ---------------------------------------------------------------------------

export class CreateCollectionItemInputDto {
  @ApiProperty({ description: 'Target exercise ID' })
  @IsNotEmpty()
  @IsString()
  exerciseId: string;

  @ApiPropertyOptional({ description: 'Section title inside collection (e.g. Primary Movement, Finisher)' })
  @IsOptional()
  @IsString()
  sectionTitle?: string;

  @ApiProperty({ description: 'Display order (0-indexed or 1-indexed)', default: 0 })
  @IsInt()
  sortOrder: number = 0;

  @ApiPropertyOptional({ description: 'Custom display title for this exercise in context' })
  @IsOptional()
  @IsString()
  customTitle?: string;

  @ApiPropertyOptional({ description: 'Specific learning objective for this movement' })
  @IsOptional()
  @IsString()
  learningObjective?: string;

  @ApiPropertyOptional({ description: 'Trainer or curator notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ---------------------------------------------------------------------------
// Collection Create / Update DTOs
// ---------------------------------------------------------------------------

export class CreateExerciseCollectionDto {
  @ApiProperty({ description: 'Collection title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Unique slug. Generated automatically if omitted.' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ description: 'Collection description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Cover image or banner URL' })
  @IsOptional()
  @IsString()
  coverMediaUrl?: string;

  @ApiPropertyOptional({ description: 'Collection category', enum: COLLECTION_CATEGORIES })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Difficulty level', default: 'ALL_LEVELS' })
  @IsOptional()
  @IsString()
  difficulty?: string = 'ALL_LEVELS';

  @ApiPropertyOptional({ description: 'Target muscle group (e.g. CHEST, LEGS, CORE)' })
  @IsOptional()
  @IsString()
  primaryMuscleGroup?: string;

  @ApiPropertyOptional({ description: 'Target equipment requirement (e.g. DUMBBELL, BARBELL, BODYWEIGHT)' })
  @IsOptional()
  @IsString()
  equipmentType?: string;

  @ApiPropertyOptional({ description: 'Whether collection is featured on discovery screens', default: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean = false;

  @ApiPropertyOptional({ description: 'Sort order priority', default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number = 0;

  @ApiPropertyOptional({ description: 'Initial items in collection', type: [CreateCollectionItemInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCollectionItemInputDto)
  items?: CreateCollectionItemInputDto[];
}

export class UpdateExerciseCollectionDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryMuscleGroup?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  equipmentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ enum: CONTENT_STATUSES })
  @IsOptional()
  @IsString()
  contentStatus?: string;
}

export class SetCollectionItemsDto {
  @ApiProperty({ description: 'Full replacement list of items in ordered sequence', type: [CreateCollectionItemInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCollectionItemInputDto)
  items: CreateCollectionItemInputDto[];
}

// ---------------------------------------------------------------------------
// Learning Path Lesson & Section Input DTOs
// ---------------------------------------------------------------------------

export class CreateLearningPathLessonInputDto {
  @ApiProperty({ description: 'Lesson title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Short description or synopsis' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Order of lesson within section/path', default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number = 0;

  @ApiPropertyOptional({ description: 'Type of lesson', enum: LESSON_TYPES, default: 'EXERCISE_LESSON' })
  @IsOptional()
  @IsString()
  lessonType?: string = 'EXERCISE_LESSON';

  @ApiPropertyOptional({ description: 'Associated exercise ID if applicable' })
  @IsOptional()
  @IsString()
  exerciseId?: string;

  @ApiPropertyOptional({ description: 'Instructional video/media URL' })
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional({ description: 'Primary learning goal or skill objective' })
  @IsOptional()
  @IsString()
  learningObjective?: string;

  @ApiPropertyOptional({ description: 'Detailed markdown guide / breakdown' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Bullet points / key takeaways', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyTakeaways?: string[];

  @ApiPropertyOptional({ description: 'Estimated reading/watching time in minutes', default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number = 5;

  @ApiPropertyOptional({ description: 'Is required to complete the path', default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean = true;

  @ApiPropertyOptional({ description: 'Optional section ID to nest within' })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiPropertyOptional({ description: 'Modular rich content blocks (CALLOUT, EXERCISE_REF, GLOSSARY_REF, etc.)', type: [Object] })
  @IsOptional()
  @IsArray()
  contentBlocks?: any[];
}

export class CreateLearningPathSectionInputDto {
  @ApiProperty({ description: 'Section title (e.g. Setup & Alignment, Execution, Common Faults)' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Section description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Section sort order', default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number = 0;

  @ApiPropertyOptional({ description: 'Lessons contained within this section', type: [CreateLearningPathLessonInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLearningPathLessonInputDto)
  lessons?: CreateLearningPathLessonInputDto[];
}

// ---------------------------------------------------------------------------
// Learning Path Create / Update DTOs
// ---------------------------------------------------------------------------

export class CreateLearningPathDto {
  @ApiProperty({ description: 'Path title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Unique path slug' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ description: 'Comprehensive description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Cover image URL' })
  @IsOptional()
  @IsString()
  coverMediaUrl?: string;

  @ApiPropertyOptional({ description: 'Path category', enum: PATH_CATEGORIES })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Difficulty level', default: 'BEGINNER' })
  @IsOptional()
  @IsString()
  difficulty?: string = 'BEGINNER';

  @ApiPropertyOptional({ description: 'Primary training goal: TECHNIQUE, STRENGTH, INJURY_PREVENTION, HYPERTROPHY' })
  @IsOptional()
  @IsString()
  primaryGoal?: string;

  @ApiPropertyOptional({ description: 'Estimated duration in minutes', default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedDurationMinutes?: number = 30;

  @ApiPropertyOptional({ description: 'Featured on discover tabs', default: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean = false;

  @ApiPropertyOptional({ description: 'Display order priority', default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number = 0;

  @ApiPropertyOptional({ description: 'Structured sections of the path', type: [CreateLearningPathSectionInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLearningPathSectionInputDto)
  sections?: CreateLearningPathSectionInputDto[];

  @ApiPropertyOptional({ description: 'Unsectioned direct lessons', type: [CreateLearningPathLessonInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLearningPathLessonInputDto)
  lessons?: CreateLearningPathLessonInputDto[];
}

export class UpdateLearningPathDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
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
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ enum: CONTENT_STATUSES })
  @IsOptional()
  @IsString()
  contentStatus?: string;
}

// ---------------------------------------------------------------------------
// Progress & Assignment DTOs
// ---------------------------------------------------------------------------

export class CompleteLessonDto {
  @ApiPropertyOptional({ description: 'Optional member feedback or personal reflection note' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AssignLearningPathDto {
  @ApiProperty({ description: 'Target member profile ID' })
  @IsNotEmpty()
  @IsString()
  memberProfileId: string;

  @ApiPropertyOptional({ description: 'Personalized guidance notes from trainer' })
  @IsOptional()
  @IsString()
  notes?: string;
}
