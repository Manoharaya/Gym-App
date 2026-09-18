import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// =========================================================================
// ENUMS & CONSTANTS
// =========================================================================

export const LEARNING_GAP_TYPES = {
  INCOMPLETE: 'INCOMPLETE',
  LOW_KNOWLEDGE_CHECK_RESULT: 'LOW_KNOWLEDGE_CHECK_RESULT',
  REPEATED_REVIEW: 'REPEATED_REVIEW',
  UNREVIEWED_PHASE: 'UNREVIEWED_PHASE',
  MISSED_PREREQUISITE: 'MISSED_PREREQUISITE',
  ABANDONED: 'ABANDONED',
  STALE_LEARNING: 'STALE_LEARNING',
} as const;

export type LearningGapType =
  (typeof LEARNING_GAP_TYPES)[keyof typeof LEARNING_GAP_TYPES];

export const LEARNING_GAP_PRIORITIES = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;

export type LearningGapPriority =
  (typeof LEARNING_GAP_PRIORITIES)[keyof typeof LEARNING_GAP_PRIORITIES];

export const LEARNING_GAP_STATUSES = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED',
} as const;

export type LearningGapStatus =
  (typeof LEARNING_GAP_STATUSES)[keyof typeof LEARNING_GAP_STATUSES];

export const PRACTICE_RECOMMENDATION_TYPES = {
  CONTINUE_TUTORIAL: 'CONTINUE_TUTORIAL',
  REVIEW_PHASE: 'REVIEW_PHASE',
  REVIEW_EXERCISE: 'REVIEW_EXERCISE',
  REVIEW_BREATHING: 'REVIEW_BREATHING',
  REVIEW_TEMPO: 'REVIEW_TEMPO',
  REVIEW_SETUP: 'REVIEW_SETUP',
  REVIEW_MOVEMENT_MECHANICS: 'REVIEW_MOVEMENT_MECHANICS',
  REVIEW_COMMON_MISTAKES: 'REVIEW_COMMON_MISTAKES',
  RETAKE_KNOWLEDGE_CHECK: 'RETAKE_KNOWLEDGE_CHECK',
  CONTINUE_LEARNING_PATH: 'CONTINUE_LEARNING_PATH',
  START_NEW_EXERCISE: 'START_NEW_EXERCISE',
} as const;

export type PracticeRecommendationType =
  (typeof PRACTICE_RECOMMENDATION_TYPES)[keyof typeof PRACTICE_RECOMMENDATION_TYPES];

// =========================================================================
// QUERY & MUTATION DTOS
// =========================================================================

export class QueryLearningGapsDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  exerciseId?: string;

  @IsOptional()
  @IsString()
  gapType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ResolveLearningGapDto {
  @IsString()
  status: 'RESOLVED' | 'DISMISSED';

  @IsOptional()
  @IsString()
  resolutionReason?: string;
}

export class CreateTargetedReviewSessionDto {
  @IsString()
  exerciseId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gapIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusPhaseIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusConcepts?: string[]; // e.g. SETUP, BREATHING, TEMPO, MISTAKES

  @IsOptional()
  @IsBoolean()
  includeKnowledgeCheck?: boolean;

  @IsOptional()
  @IsString()
  sessionType?: string; // TARGETED_REVIEW
}

// =========================================================================
// RESPONSE & READ MODEL DTOS
// =========================================================================

export interface LearningGapItemDto {
  id: string;
  organisationId: string;
  userId: string;
  contentType: string;
  contentId: string;
  exerciseId?: string | null;
  exerciseName?: string;
  movementPhaseId?: string | null;
  phaseName?: string;
  gapType: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';
  contextData?: Record<string, any> | null;
  detectedAt: Date | string;
  lastReviewedAt?: Date | string | null;
  resolvedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface QuickRefreshPhaseDto {
  id: string;
  orderIndex: number;
  name: string;
  phaseType: string;
  focusCue: string;
  breathing: string;
  tempo: string;
  keyMistakeToAvoid?: string;
}

export interface QuickRefreshResponseDto {
  exerciseId: string;
  exerciseName: string;
  estimatedDurationSeconds: number; // 30-60s
  setup: {
    keyNotes: string[];
    equipment: string[];
  };
  movementPhases: QuickRefreshPhaseDto[];
  cadenceSummary: {
    tempo: string;
    breathingPattern: string;
  };
  refresherChecklist: string[];
}

export interface RecommendedPracticeItemDto {
  recommendationType: PracticeRecommendationType;
  exerciseId: string;
  exerciseName: string;
  phaseId?: string;
  phaseName?: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  actionTitle: string;
}

export interface MovementLearningDashboardResponseDto {
  continueLearning: Array<{
    type: 'TUTORIAL' | 'PRACTICE_SESSION';
    id: string;
    exerciseId: string;
    exerciseName: string;
    progressPercent: number;
    currentStep: string;
    lastActiveAt: Date | string;
    reason: string;
  }>;
  needsReview: LearningGapItemDto[];
  recommendedPractice: RecommendedPracticeItemDto[];
  quickRefresh: Array<{
    exerciseId: string;
    exerciseName: string;
    estimatedDurationSeconds: number;
    reason: string;
  }>;
  recentlyLearned: Array<{
    exerciseId: string;
    exerciseName: string;
    status: string;
    completedAt: Date | string;
  }>;
  learningSummary: {
    totalExercisesLearned: number;
    totalPhasesCompleted: number;
    totalPracticesCompleted: number;
    activeGapsCount: number;
    highPriorityGapsCount: number;
    masteryCount: number;
  };
}

export interface ExerciseLearningIntelligenceResponseDto {
  exerciseId: string;
  exerciseName: string;
  activeGaps: LearningGapItemDto[];
  phaseProgress: Array<{
    phaseId: string;
    name: string;
    orderIndex: number;
    phaseType: string;
    isPracticed: boolean;
    practiceCount: number;
    hasGaps: boolean;
    gapReasons: string[];
  }>;
  prerequisites: Array<{
    prerequisiteExerciseId: string;
    prerequisiteExerciseName: string;
    isCompleted: boolean;
    status: string;
  }>;
  variations: {
    progressions: Array<{ id: string; name: string }>;
    regressions: Array<{ id: string; name: string }>;
    alternatives: Array<{ id: string; name: string }>;
  };
  quickRefreshAvailable: boolean;
  recommendedNextAction: {
    actionType: string;
    title: string;
    reason: string;
    phaseId?: string;
  };
}

export interface TrainerMemberLearningInsightsDto {
  memberId: string;
  memberName: string;
  totalExercisesLearned: number;
  totalTutorialsCompleted: number;
  totalGuidedPractices: number;
  knowledgeCheckAverage: number | null;
  activeGapsCount: number;
  recentActivity: Array<{
    type: string;
    exerciseName: string;
    completedAt: Date | string;
  }>;
  topReviewNeeds: LearningGapItemDto[];
}

export interface AdminLearningQualityInsightsDto {
  totalExercisesWithPhases: number;
  totalLearningGapsDetected: number;
  gapsByType: Record<string, number>;
  phaseDropoffHighlights: Array<{
    exerciseId: string;
    exerciseName: string;
    phaseId: string;
    phaseName: string;
    startCount: number;
    completionCount: number;
    dropoffRatePercent: number;
    flag: string;
  }>;
}
