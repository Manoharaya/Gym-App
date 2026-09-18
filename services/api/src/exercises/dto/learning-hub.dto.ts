import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { LearningMasteryStatus, LearningContentType } from './learning-mastery.dto';

// =========================================================================
// 1. CONTINUE LEARNING HUB ITEM DTO
// =========================================================================

export class ContinueLearningHubItemDto {
  @ApiProperty({ description: 'Educational content type (EXERCISE, TUTORIAL, PATH, GUIDED_SESSION, LESSON)' })
  contentType!: string;

  @ApiProperty({ description: 'Target content identifier' })
  contentId!: string;

  @ApiProperty({ description: 'Display title of the educational item' })
  title!: string;

  @ApiPropertyOptional({ description: 'Associated course or path title if part of a series' })
  parentTitle?: string | null;

  @ApiProperty({ description: 'Completion percentage (0.0 - 100.0)' })
  progressPercent!: number;

  @ApiPropertyOptional({ description: 'Current step number or lesson index' })
  currentStepIndex?: number;

  @ApiPropertyOptional({ description: 'Total steps or total lessons in item' })
  totalSteps?: number;

  @ApiPropertyOptional({ description: 'Primary thumbnail image URL' })
  thumbnailUrl?: string | null;

  @ApiProperty({ description: 'ISO timestamp of last activity' })
  lastActivityAt!: string;

  @ApiProperty({ description: 'Call-to-action text for resume button (e.g. "Resume Phase 3", "Continue Lesson")' })
  resumeActionTitle!: string;
}

// =========================================================================
// 2. RECOMMENDED LEARNING HUB ITEM DTO
// =========================================================================

export class RecommendedLearningHubItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  contentType!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  subtitle?: string | null;

  @ApiPropertyOptional()
  category?: string | null;

  @ApiPropertyOptional()
  difficulty?: string | null;

  @ApiPropertyOptional()
  thumbnailUrl?: string | null;

  @ApiProperty({ description: 'Transparent, deterministic reason code (e.g. GOAL_MATCH, NEXT_IN_PATH, REVIEW_NEEDED)' })
  reasonCode!: string;

  @ApiProperty({ description: 'Human-friendly educational explanation (e.g. "Next lesson in your active course")' })
  reasonText!: string;

  @ApiPropertyOptional({ description: 'Estimated minutes to complete' })
  estimatedMinutes?: number | null;
}

// =========================================================================
// 3. EXPLORE SECTION DTOS (Categories, Movements, Muscles, Equipment)
// =========================================================================

export class HubCategoryTileDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  exerciseCount!: number;

  @ApiPropertyOptional()
  thumbnailUrl?: string | null;
}

export class HubMovementTileDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  exerciseCount!: number;
}

export class HubMuscleTileDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['UPPER_BODY', 'CORE', 'LOWER_BODY'] })
  group!: string;

  @ApiProperty({ enum: ['ANTERIOR', 'POSTERIOR'] })
  region!: string;

  @ApiProperty()
  exerciseCount!: number;
}

export class HubEquipmentTileDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  group!: string;

  @ApiProperty()
  isNoEquipment!: boolean;

  @ApiProperty()
  exerciseCount!: number;
}

export class LearningHubExploreSectionDto {
  @ApiProperty({ type: [HubCategoryTileDto] })
  categories!: HubCategoryTileDto[];

  @ApiProperty({ type: [HubMovementTileDto] })
  movements!: HubMovementTileDto[];

  @ApiProperty({ type: [HubMuscleTileDto] })
  muscles!: HubMuscleTileDto[];

  @ApiProperty({ type: [HubEquipmentTileDto] })
  equipment!: HubEquipmentTileDto[];
}

// =========================================================================
// 4. GUIDED LEARNING SECTION DTOS (Paths, Collections, Sessions)
// =========================================================================

export class HubLearningPathPreviewDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  thumbnailUrl?: string | null;

  @ApiProperty()
  difficulty!: string;

  @ApiProperty()
  lessonCount!: number;

  @ApiProperty()
  exerciseCount!: number;

  @ApiProperty()
  percentComplete!: number;

  @ApiProperty()
  isEnrolled!: boolean;
}

export class HubCollectionPreviewDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  thumbnailUrl?: string | null;

  @ApiProperty()
  exerciseCount!: number;

  @ApiProperty()
  difficulty!: string;
}

export class HubGuidedSessionPreviewDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  thumbnailUrl?: string | null;

  @ApiProperty()
  difficulty!: string;

  @ApiProperty()
  estimatedMinutes!: number;

  @ApiProperty()
  exerciseCount!: number;

  @ApiProperty()
  percentComplete!: number;
}

export class LearningHubGuidedSectionDto {
  @ApiProperty({ type: [HubLearningPathPreviewDto] })
  paths!: HubLearningPathPreviewDto[];

  @ApiProperty({ type: [HubCollectionPreviewDto] })
  collections!: HubCollectionPreviewDto[];

  @ApiProperty({ type: [HubGuidedSessionPreviewDto] })
  sessions!: HubGuidedSessionPreviewDto[];
}

// =========================================================================
// 5. ACADEMY SECTION DTO
// =========================================================================

export class HubAcademyTrackDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  lessonCount!: number;

  @ApiProperty()
  completedLessonCount!: number;

  @ApiProperty()
  percentComplete!: number;
}

export class LearningHubAcademySectionDto {
  @ApiProperty({ type: [HubAcademyTrackDto] })
  tracks!: HubAcademyTrackDto[];

  @ApiProperty({ description: 'Total verified fitness glossary terms available' })
  totalGlossaryTerms!: number;
}

// =========================================================================
// 6. REVIEW ITEM DTO
// =========================================================================

export class HubReviewItemDto {
  @ApiProperty()
  contentType!: string;

  @ApiProperty()
  contentId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  reason!: string;

  @ApiPropertyOptional()
  score?: number | null;

  @ApiProperty()
  recommendedAt!: string;
}

// =========================================================================
// 7. MY LEARNING STATS SUMMARY DTO
// =========================================================================

export class HubMyLearningSummaryDto {
  @ApiProperty()
  totalLearned!: number;

  @ApiProperty()
  totalMastered!: number;

  @ApiProperty()
  totalHoursLearned!: number;

  @ApiProperty()
  currentStreakDays!: number;

  @ApiProperty()
  activePathsCount!: number;

  @ApiProperty()
  completedPathsCount!: number;
}

// =========================================================================
// 8. FEATURED EXERCISE DTO
// =========================================================================

export class HubFeaturedExerciseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  difficulty!: string;

  @ApiProperty()
  primaryMuscleGroup!: string;

  @ApiProperty()
  equipment!: string;

  @ApiPropertyOptional()
  movementPattern?: string | null;

  @ApiPropertyOptional()
  thumbnailUrl?: string | null;

  @ApiProperty({ enum: ['NOT_STARTED', 'EXPLORING', 'LEARNING', 'PRACTICING', 'PROGRESSING', 'COMPLETED', 'MASTERED', 'REVIEW'] })
  masteryStatus!: LearningMasteryStatus;

  @ApiProperty({ description: 'Completion percent 0.0 - 100.0' })
  completionPercent!: number;
}

// =========================================================================
// 9. MAIN LEARNING HUB CONSOLIDATED RESPONSE DTO
// =========================================================================

export class LearningHubResponseDto {
  @ApiProperty({ type: [ContinueLearningHubItemDto] })
  continueLearning!: ContinueLearningHubItemDto[];

  @ApiProperty({ type: [RecommendedLearningHubItemDto] })
  recommendedLearning!: RecommendedLearningHubItemDto[];

  @ApiProperty({ type: LearningHubExploreSectionDto })
  explore!: LearningHubExploreSectionDto;

  @ApiProperty({ type: LearningHubGuidedSectionDto })
  guidedLearning!: LearningHubGuidedSectionDto;

  @ApiProperty({ type: LearningHubAcademySectionDto })
  academy!: LearningHubAcademySectionDto;

  @ApiProperty({ type: [HubReviewItemDto] })
  reviewQueue!: HubReviewItemDto[];

  @ApiProperty({ type: HubMyLearningSummaryDto })
  myLearningSummary!: HubMyLearningSummaryDto;

  @ApiProperty({ type: [HubFeaturedExerciseDto] })
  featuredExercises!: HubFeaturedExerciseDto[];
}

// =========================================================================
// 10. UNIFIED LEARNING SEARCH QUERY & RESPONSE DTOS
// =========================================================================

export class LearningHubSearchQueryDto {
  @ApiProperty({ description: 'Search term', example: 'squat' })
  @IsString()
  q!: string;

  @ApiPropertyOptional({ description: 'Filter by content category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by difficulty' })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiPropertyOptional({ description: 'Filter by specific content type (EXERCISE, MOVEMENT, MUSCLE, EQUIPMENT, LEARNING)' })
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiPropertyOptional({ default: 15, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 15;
}

export class ExerciseSearchResultItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  difficulty!: string;

  @ApiProperty()
  primaryMuscleGroup!: string;

  @ApiProperty()
  equipment!: string;

  @ApiPropertyOptional()
  movementPattern?: string | null;

  @ApiPropertyOptional()
  thumbnailUrl?: string | null;

  @ApiProperty()
  masteryStatus!: LearningMasteryStatus;
}

export class MovementSearchResultItemDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  exerciseCount!: number;
}

export class MuscleSearchResultItemDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  group!: string;

  @ApiProperty()
  region!: string;

  @ApiProperty()
  exerciseCount!: number;
}

export class EquipmentSearchResultItemDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  group!: string;

  @ApiProperty()
  isNoEquipment!: boolean;

  @ApiProperty()
  exerciseCount!: number;
}

export class LearningContentSearchResultItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ description: 'PATH, COLLECTION, LESSON, or TUTORIAL' })
  type!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  subtitle?: string | null;

  @ApiPropertyOptional()
  thumbnailUrl?: string | null;

  @ApiPropertyOptional()
  difficulty?: string | null;

  @ApiPropertyOptional()
  category?: string | null;
}

export class LearningHubSearchResponseDto {
  @ApiProperty()
  query!: string;

  @ApiProperty()
  totalCount!: number;

  @ApiProperty({ type: [ExerciseSearchResultItemDto] })
  exercises!: ExerciseSearchResultItemDto[];

  @ApiProperty({ type: [MovementSearchResultItemDto] })
  movements!: MovementSearchResultItemDto[];

  @ApiProperty({ type: [MuscleSearchResultItemDto] })
  muscles!: MuscleSearchResultItemDto[];

  @ApiProperty({ type: [EquipmentSearchResultItemDto] })
  equipment!: EquipmentSearchResultItemDto[];

  @ApiProperty({ type: [LearningContentSearchResultItemDto] })
  learning!: LearningContentSearchResultItemDto[];
}
