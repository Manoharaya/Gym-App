import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LearningDashboardSummaryDto {
  @ApiProperty()
  pathsStarted: number;

  @ApiProperty()
  pathsCompleted: number;

  @ApiProperty()
  lessonsCompleted: number;

  @ApiProperty()
  exercisesLearned: number;

  @ApiProperty()
  collectionsExplored: number;

  @ApiProperty()
  learningTimeMinutes: number;

  @ApiProperty()
  currentStreakDays: number;

  @ApiPropertyOptional()
  lastActivityAt: string | null;
}

export class ResumePositionDto {
  @ApiProperty()
  pathId: string;

  @ApiProperty()
  pathTitle: string;

  @ApiPropertyOptional()
  pathCoverUrl?: string | null;

  @ApiPropertyOptional()
  category?: string | null;

  @ApiProperty()
  difficulty: string;

  @ApiPropertyOptional()
  sectionId?: string | null;

  @ApiPropertyOptional()
  sectionTitle?: string | null;

  @ApiProperty()
  lessonId: string;

  @ApiProperty()
  lessonTitle: string;

  @ApiProperty()
  lessonNumber: number;

  @ApiProperty()
  totalLessons: number;

  @ApiProperty()
  percentComplete: number;

  @ApiProperty()
  estimatedMinutes: number;
}

export type LearningActivityType =
  | 'PATH_STARTED'
  | 'LESSON_COMPLETED'
  | 'PATH_COMPLETED'
  | 'EXERCISE_LEARNED'
  | 'COLLECTION_STARTED'
  | 'COLLECTION_COMPLETED';

export class LearningActivityItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: LearningActivityType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  subtitle: string;

  @ApiProperty()
  timestamp: string;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;
}

export class RecentlyLearnedExerciseDto {
  @ApiProperty()
  exerciseId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  primaryMuscleGroup?: string | null;

  @ApiPropertyOptional()
  equipment?: string | null;

  @ApiPropertyOptional()
  difficulty?: string | null;

  @ApiPropertyOptional()
  thumbnailUrl?: string | null;

  @ApiProperty()
  learnedAt: string;

  @ApiPropertyOptional()
  masteryState?: string;
}

export class RecommendedLearningPathDto {
  @ApiProperty()
  pathId: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  coverMediaUrl?: string | null;

  @ApiPropertyOptional()
  category?: string | null;

  @ApiProperty()
  difficulty: string;

  @ApiProperty()
  lessonCount: number;

  @ApiProperty()
  estimatedMinutes: number;

  @ApiProperty()
  reason: string;
}

export class ActivePathOverviewDto {
  @ApiProperty()
  pathId: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  coverMediaUrl?: string | null;

  @ApiPropertyOptional()
  category?: string | null;

  @ApiProperty()
  difficulty: string;

  @ApiProperty()
  completedLessons: number;

  @ApiProperty()
  totalLessons: number;

  @ApiProperty()
  percentComplete: number;

  @ApiPropertyOptional()
  currentLessonId?: string | null;

  @ApiPropertyOptional()
  currentLessonTitle?: string | null;

  @ApiProperty()
  lastInteractedAt: string;
}

export class LearningDashboardResponseDto {
  @ApiProperty()
  summary: LearningDashboardSummaryDto;

  @ApiPropertyOptional()
  continueLearning: ResumePositionDto | null;

  @ApiProperty({ type: [ActivePathOverviewDto] })
  activePaths: ActivePathOverviewDto[];

  @ApiProperty({ type: [LearningActivityItemDto] })
  recentActivity: LearningActivityItemDto[];

  @ApiProperty({ type: [RecentlyLearnedExerciseDto] })
  recentExercises: RecentlyLearnedExerciseDto[];

  @ApiProperty({ type: [RecommendedLearningPathDto] })
  recommendations: RecommendedLearningPathDto[];

  @ApiProperty()
  categories: Array<{ key: string; label: string; count: number }>;
}

export class QueryLearningHistoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;
}

export class ExerciseLearningMasteryStatusDto {
  @ApiProperty()
  exerciseId: string;

  @ApiProperty()
  status: 'DISCOVERED' | 'VIEWED' | 'IN_PROGRESS' | 'LEARNED' | 'REVIEW_RECOMMENDED';

  @ApiPropertyOptional()
  learnedAt?: string | null;

  @ApiPropertyOptional()
  lastInteractedAt?: string | null;

  @ApiProperty()
  instructionsCompleted: boolean;

  @ApiProperty()
  phasesExplored: boolean;

  @ApiProperty()
  mediaViewed: boolean;

  @ApiPropertyOptional()
  relatedLearningPath?: {
    pathId: string;
    pathTitle: string;
    lessonId: string;
    lessonTitle: string;
    lessonNumber: number;
    totalLessons: number;
    percentComplete: number;
  } | null;
}
