import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export type LearningMasteryStatus =
  | 'NOT_STARTED'
  | 'EXPLORING'
  | 'LEARNING'
  | 'PRACTICING'
  | 'REVIEW'
  | 'PROGRESSING'
  | 'COMPLETED'
  | 'MASTERED';

export type LearningContentType =
  | 'EXERCISE'
  | 'TUTORIAL'
  | 'LESSON'
  | 'LEARNING_PATH'
  | 'COLLECTION'
  | 'GUIDED_SESSION'
  | 'CURRICULUM'
  | 'MOVEMENT'
  | 'MUSCLE'
  | 'EQUIPMENT';

export const CANONICAL_LEARNING_SECTIONS = [
  'INTRODUCTION',
  'EQUIPMENT',
  'SETUP',
  'MOVEMENT_PHASES',
  'BREATHING',
  'MUSCLES',
  'WHY_IT_WORKS',
  'COMMON_MISTAKES',
  'SAFETY',
  'PRACTICE',
  'KNOWLEDGE_CHECK',
] as const;

export type CanonicalLearningSection = typeof CANONICAL_LEARNING_SECTIONS[number];

// =========================================================================
// 1. EVENT TELEMETRY DTO
// =========================================================================

export class TrackLearningEventDto {
  @ApiProperty({
    description: 'Identifier for learning telemetry event',
    example: 'exercise_learning_started',
  })
  @IsString()
  eventType!: string;

  @ApiProperty({
    description: 'Educational content type',
    enum: [
      'EXERCISE',
      'TUTORIAL',
      'LESSON',
      'LEARNING_PATH',
      'COLLECTION',
      'GUIDED_SESSION',
      'CURRICULUM',
      'MOVEMENT',
      'MUSCLE',
      'EQUIPMENT',
    ],
    example: 'EXERCISE',
  })
  @IsString()
  contentType!: LearningContentType;

  @ApiProperty({
    description: 'ID of target exercise, tutorial, lesson, path, etc.',
    example: 'ex-barbell-squat-101',
  })
  @IsString()
  contentId!: string;

  @ApiPropertyOptional({
    description: 'Section or phase key if section-specific event',
    example: 'MOVEMENT_PHASES',
  })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiPropertyOptional({
    description: 'Optional client session or guided session run ID',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Arbitrary structured educational metadata (e.g. angle viewed, check score)',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// =========================================================================
// 2. QUERY DTO
// =========================================================================

export class QueryLearningMasteryDto {
  @ApiPropertyOptional({ description: 'Filter by content type' })
  @IsOptional()
  @IsString()
  contentType?: LearningContentType;

  @ApiPropertyOptional({ description: 'Filter by mastery status' })
  @IsOptional()
  @IsString()
  status?: LearningMasteryStatus;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// =========================================================================
// 3. MASTERY RECORD RESPONSE DTO
// =========================================================================

export class LearningMasteryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  organisationId!: string;

  @ApiProperty()
  contentType!: LearningContentType;

  @ApiProperty()
  contentId!: string;

  @ApiPropertyOptional()
  contentTitle?: string;

  @ApiProperty({
    description: 'Standardized educational mastery state',
    enum: [
      'NOT_STARTED',
      'EXPLORING',
      'LEARNING',
      'PRACTICING',
      'REVIEW',
      'PROGRESSING',
      'COMPLETED',
      'MASTERED',
    ],
  })
  status!: LearningMasteryStatus;

  @ApiProperty({ description: 'Percentage completion (0.0 to 100.0)' })
  completionPercent!: number;

  @ApiPropertyOptional()
  knowledgeCheckScore?: number | null;

  @ApiProperty()
  knowledgeCheckAttempts!: number;

  @ApiProperty({ description: 'Array of completed section checkpoints' })
  sectionsCompleted!: string[];

  @ApiProperty()
  lastActivityAt!: Date;

  @ApiPropertyOptional()
  firstCompletedAt?: Date | null;

  @ApiPropertyOptional()
  masteredAt?: Date | null;

  @ApiPropertyOptional()
  reviewRecommendedAt?: Date | null;

  @ApiPropertyOptional()
  reviewReason?: string | null;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;
}

// =========================================================================
// 4. MEMBER LEARNING SUMMARY RESPONSE DTO
// =========================================================================

export class ContinueLearningItemDto {
  @ApiProperty()
  contentType!: LearningContentType;

  @ApiProperty()
  contentId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  progressPercent!: number;

  @ApiProperty()
  lastActivityAt!: string;

  @ApiProperty()
  resumeActionTitle!: string;
}

export class RecentlyLearnedItemDto {
  @ApiProperty()
  contentType!: LearningContentType;

  @ApiProperty()
  contentId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  status!: LearningMasteryStatus;

  @ApiProperty()
  completedAt!: string;
}

export class ReviewQueueItemDto {
  @ApiProperty()
  contentType!: LearningContentType;

  @ApiProperty()
  contentId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  reason!: string;

  @ApiProperty()
  reviewRecommendedAt!: string;

  @ApiPropertyOptional()
  score?: number | null;
}

export class LearningSummaryResponseDto {
  @ApiProperty({ description: 'Total exercises or lessons where requirements were completed' })
  totalLearned!: number;

  @ApiProperty({ description: 'Total exercises or items that achieved MASTERED status' })
  totalMastered!: number;

  @ApiProperty({ description: 'Estimated hours spent in tutorials and lessons' })
  totalHoursLearned!: number;

  @ApiProperty()
  activeLearningPathsCount!: number;

  @ApiProperty()
  completedLearningPathsCount!: number;

  @ApiProperty({ type: [ContinueLearningItemDto] })
  continueLearning!: ContinueLearningItemDto[];

  @ApiProperty({ type: [RecentlyLearnedItemDto] })
  recentlyLearned!: RecentlyLearnedItemDto[];

  @ApiProperty({ type: [ReviewQueueItemDto] })
  reviewItems!: ReviewQueueItemDto[];
}

// =========================================================================
// 5. CONTENT ANALYTICS & DROPOFF FUNNEL DTO
// =========================================================================

export class DropoffFunnelStageDto {
  @ApiProperty({ example: 'INTRODUCTION' })
  stage!: string;

  @ApiProperty({ example: 120 })
  count!: number;

  @ApiProperty({ example: 95.2 })
  percentage!: number;
}

export class ContentMasteryAnalyticsDto {
  @ApiProperty()
  contentId!: string;

  @ApiProperty()
  contentType!: LearningContentType;

  @ApiProperty()
  contentTitle!: string;

  @ApiProperty()
  uniqueLearnersCount!: number;

  @ApiProperty()
  totalStarts!: number;

  @ApiProperty()
  totalCompletions!: number;

  @ApiProperty({ description: 'Completions / Starts percentage' })
  completionRate!: number;

  @ApiProperty()
  averageTimeSpentSeconds!: number;

  @ApiPropertyOptional()
  knowledgeCheckPassRate?: number | null;

  @ApiProperty({ description: 'Percentage of completed members who entered review queue' })
  reviewRate!: number;

  @ApiProperty({ type: [DropoffFunnelStageDto] })
  dropoffFunnel!: DropoffFunnelStageDto[];
}

// =========================================================================
// 6. PLATFORM LEARNING ANALYTICS DTO
// =========================================================================

export class TopLearnedExerciseDto {
  @ApiProperty()
  exerciseId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  learnersCount!: number;

  @ApiProperty()
  masteryRate!: number;
}

export class HighDropoffStageDto {
  @ApiProperty()
  stage!: string;

  @ApiProperty()
  dropoffPercentage!: number;
}

export class PlatformLearningAnalyticsDto {
  @ApiProperty()
  totalLearners!: number;

  @ApiProperty()
  totalEventsLogged!: number;

  @ApiProperty()
  totalExercisesMastered!: number;

  @ApiProperty()
  totalPathsCompleted!: number;

  @ApiProperty()
  overallCompletionRate!: number;

  @ApiProperty({ type: [TopLearnedExerciseDto] })
  topLearnedExercises!: TopLearnedExerciseDto[];

  @ApiProperty({ type: [HighDropoffStageDto] })
  highDropoffStages!: HighDropoffStageDto[];
}
