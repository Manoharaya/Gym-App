import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsObject,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import {
  MovementCoachPhaseDto,
  MovementExpectationItemDto,
  TechniqueChecklistItemDto,
} from './visual-movement-coach.dto';

export const SESSION_STATUSES = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'PAUSED',
  'COMPLETED',
  'ABANDONED',
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const SESSION_STEPS = [
  'INTRO',
  'PREPARATION',
  'PHASE_LEARNING',
  'PHASE_PRACTICE',
  'PHASE_REVIEW',
  'SELF_REVIEW',
  'KNOWLEDGE_CHECK',
  'SUMMARY',
  'COMPLETED',
] as const;
export type SessionStep = (typeof SESSION_STEPS)[number];

export const SESSION_TYPES = [
  'GUIDED_PRACTICE',
  'PHASE_FOCUS',
  'QUICK_REHEARSAL',
] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const SELF_REFLECTION_TOPICS = [
  'STARTING_POSITION',
  'MOVEMENT_DIRECTION',
  'BODY_ALIGNMENT',
  'BREATHING',
  'TEMPO',
  'COMMON_MISTAKES',
  'NONE',
] as const;
export type SelfReflectionTopic = (typeof SELF_REFLECTION_TOPICS)[number];

export class StartMovementPracticeSessionDto {
  @IsString()
  exerciseId: string;

  @IsOptional()
  @IsIn(SESSION_TYPES)
  sessionType?: SessionType;
}

export class UpdateMovementPracticeSessionDto {
  @IsOptional()
  @IsIn(SESSION_STEPS)
  currentStep?: SessionStep;

  @IsOptional()
  @IsString()
  currentPhaseId?: string;

  @IsOptional()
  @IsNumber()
  currentPhaseIndex?: number;

  @IsOptional()
  @IsObject()
  checklistState?: Record<string, boolean>;

  @IsOptional()
  @IsIn(SESSION_STATUSES)
  status?: SessionStatus;
}

export class RecordPhasePracticeDto {
  @IsString()
  phaseId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reps?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  durationSeconds?: number;
}

export class RecordPhaseReviewDto {
  @IsString()
  phaseId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reviewedItems?: string[];
}

export class CompleteMovementPracticeSessionDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selfReflectionTopics?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  knowledgeCheckScore?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export interface PhasePracticeRecord {
  phaseId: string;
  reps?: number;
  durationSeconds?: number;
  completedAt: string;
}

export interface SelfReflectionData {
  selectedTopics?: string[];
  notes?: string;
}

export interface MovementPracticeSessionResponseDto {
  id: string;
  userId: string;
  organisationId: string;
  exerciseId: string;
  tutorialId?: string | null;
  sessionType: SessionType;
  status: SessionStatus;
  currentStep: SessionStep;
  currentPhaseId?: string | null;
  currentPhaseIndex: number;
  totalSteps: number;
  progressPercent: number;
  completedPhases: string[];
  checklistState: Record<string, boolean>;
  phasePracticeData: PhasePracticeRecord[];
  selfReflection?: SelfReflectionData | null;
  knowledgeCheckScore?: number | null;
  knowledgeCheckCompleted: boolean;
  startedAt?: Date | null;
  lastActiveAt: Date;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PracticeKnowledgeCheckQuestionDto {
  id: string;
  question: string;
  questionType: string;
  options: Array<{
    id: string;
    text: string;
  }>;
  explanation?: string | null;
}

export interface GuidedMovementPracticePayloadDto {
  exercise: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    difficulty: string;
    exerciseType: string;
    movementPattern: string;
    primaryMuscleGroup: string;
    secondaryMuscleGroups?: string[] | null;
    equipment: string;
    bodyPosition?: string | null;
    tempo?: string | null;
    rangeOfMotion?: string | null;
    breathingInstructions?: string | null;
    setupInstructions?: string | null;
    executionInstructions?: string | null;
    estimatedLearningMinutes: number;
  };
  media: {
    heroMediaUrl?: string | null;
    thumbnailUrl?: string | null;
    mediaType?: string | null;
  };
  phases: MovementCoachPhaseDto[];
  techniqueChecklist: TechniqueChecklistItemDto[];
  equipmentRequired: Array<{
    id: string;
    name: string;
    category?: string;
    isRequired: boolean;
  }>;
  safetyGuidelines: Array<{
    id: string;
    category: string;
    title?: string | null;
    description: string;
    severity: string;
  }>;
  knowledgeCheck?: {
    id: string;
    title: string;
    description?: string | null;
    questions: PracticeKnowledgeCheckQuestionDto[];
  } | null;
  activeSession?: MovementPracticeSessionResponseDto | null;
  completionFeedback?: {
    reviewedPhasesCount: number;
    totalPhasesCount: number;
    checklistCompletedCount: number;
    totalChecklistCount: number;
    knowledgeCheckScore?: number | null;
    summaryMessage: string;
    suggestedReviewTopics: string[];
    recommendedNextExercise?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  } | null;
}
