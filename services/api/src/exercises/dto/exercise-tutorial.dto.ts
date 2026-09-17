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

export type TutorialMode =
  | 'QUICK_LEARN'
  | 'STEP_BY_STEP'
  | 'MOVEMENT_BREAKDOWN'
  | 'TECHNIQUE_CHECKLIST';

export type TutorialProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type TutorialSection =
  | 'OVERVIEW'
  | 'DEMONSTRATION'
  | 'COACHING'
  | 'BREAKDOWN'
  | 'PRACTICE'
  | 'KNOWLEDGE_CHECK'
  | 'COMPLETE';

export class TutorialConfigDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  checklist?: string[];

  @IsOptional()
  @IsString()
  audioGuidanceUrl?: string;

  @IsOptional()
  @IsString()
  audioGuidanceTranscript?: string;

  @IsOptional()
  @IsString()
  @IsIn(['QUICK_LEARN', 'STEP_BY_STEP', 'MOVEMENT_BREAKDOWN', 'TECHNIQUE_CHECKLIST'])
  defaultMode?: TutorialMode;

  @IsOptional()
  @IsNumber()
  estimatedMinutes?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyTechniquePoints?: string[];
}

export class UpdateExerciseTutorialConfigDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  checklist?: string[];

  @IsOptional()
  @IsString()
  audioGuidanceUrl?: string;

  @IsOptional()
  @IsString()
  audioGuidanceTranscript?: string;

  @IsOptional()
  @IsString()
  @IsIn(['QUICK_LEARN', 'STEP_BY_STEP', 'MOVEMENT_BREAKDOWN', 'TECHNIQUE_CHECKLIST'])
  defaultMode?: TutorialMode;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  estimatedMinutes?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyTechniquePoints?: string[];
}

export class StartExerciseTutorialDto {
  @IsOptional()
  @IsString()
  @IsIn(['QUICK_LEARN', 'STEP_BY_STEP', 'MOVEMENT_BREAKDOWN', 'TECHNIQUE_CHECKLIST'])
  mode?: TutorialMode;
}

export class UpdateExerciseTutorialProgressDto {
  @IsOptional()
  @IsString()
  @IsIn(['QUICK_LEARN', 'STEP_BY_STEP', 'MOVEMENT_BREAKDOWN', 'TECHNIQUE_CHECKLIST'])
  mode?: TutorialMode;

  @IsOptional()
  @IsNumber()
  @Min(0)
  phaseIndex?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stepIndex?: number;

  @IsOptional()
  @IsString()
  section?: TutorialSection;

  @IsOptional()
  @IsObject()
  checklistState?: Record<string, boolean>;

  @IsOptional()
  @IsBoolean()
  practiceCompleted?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSpentSeconds?: number;
}

export class CompleteExerciseTutorialDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSpentSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  knowledgeCheckScore?: number;
}

export interface TutorialDemonstrationDto {
  id: string;
  mediaType: string;
  url: string;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  isPrimary: boolean;
  purpose: string;
  altText?: string | null;
}

export interface TutorialPhaseDto {
  id: string;
  orderIndex: number;
  phaseName: string;
  phaseType: string;
  title?: string | null;
  description?: string | null;
  cueText?: string | null;
  bodyPosition?: string | null;
  bodyOrientation?: string | null;
  jointAlignments?: any;
  rangeOfMotionType?: string | null;
  breathingPattern?: string | null;
  breathingNotes?: string | null;
  tempoSeconds?: number | null;
  visualCues?: any;
  commonMistakes?: any;
  safetyNotes?: string | null;
  phaseMuscles?: any;
  videoStartTimeSeconds?: number | null;
  videoEndTimeSeconds?: number | null;
}

export interface TutorialStepDto {
  id: string;
  stepNumber: number;
  stepType: string;
  phase?: string | null;
  movementPhase?: string | null;
  title: string;
  description: string;
  detailedInstruction?: string | null;
  coachingCue?: string | null;
  bodyPosition?: string | null;
  breathing?: string | null;
  tempo?: string | null;
  visualCue?: string | null;
  visualCueCategory?: string | null;
  videoStartTimeSeconds?: number | null;
  videoEndTimeSeconds?: number | null;
}

export interface TechniqueCoachingPanelDto {
  setup: string[];
  position: {
    feet?: string;
    hands?: string;
    spine?: string;
    head?: string;
    core?: string;
  };
  movement: {
    direction?: string;
    movementPattern?: string;
    phase?: string;
    rangeOfMotion?: string;
  };
  breathing: {
    pattern?: string;
    cues?: string[];
  };
  tempo: {
    value?: string;
    explanation?: string;
  };
}

export interface TutorialCommonMistakeDto {
  id: string;
  mistake: string;
  consequence?: string | null;
  correction: string;
  severity: string;
  mediaUrl?: string | null;
}

export interface TutorialSafetyGuidelineDto {
  id: string;
  category: string;
  title?: string | null;
  description: string;
  severity: string;
}

export interface TutorialEquipmentDto {
  required: string[];
  optional: string[];
  alternatives: Array<{ from: string; to: string; notes?: string }>;
}

export interface TutorialMusclesDto {
  primary: string[];
  secondary: string[];
  stabilizers: string[];
}

export interface TutorialVariationsDto {
  progressions: any[];
  regressions: any[];
  alternatives: any[];
}

export interface TutorialUserProgressDto {
  status: TutorialProgressStatus;
  currentMode: TutorialMode;
  currentPhaseIndex: number;
  currentStepIndex: number;
  completedSections: string[];
  checklistState: Record<string, boolean>;
  practiceCompleted: boolean;
  practiceCompletedAt?: string | null;
  timeSpentSeconds: number;
  knowledgeCheckCompleted: boolean;
  knowledgeCheckScore?: number | null;
  lastInteractedAt: Date;
  completedAt?: Date | null;
}

export interface TutorialKnowledgeCheckDto {
  id: string;
  title: string;
  passingScore: number;
  questionCount: number;
}

export interface TutorialRelatedLearningDto {
  movementPattern: string;
  primaryMuscle: string;
  relatedExercises: Array<{
    id: string;
    name: string;
    slug: string;
    difficulty: string;
    equipment: string;
  }>;
  learningPaths: Array<{
    id: string;
    title: string;
    slug: string;
    category: string;
  }>;
}

export interface ExerciseTutorialResponseDto {
  exercise: {
    id: string;
    name: string;
    slug: string;
    difficulty: string;
    equipment: string;
    movementPattern: string;
    primaryMuscleGroup: string;
    secondaryMuscleGroups?: string[];
    description?: string | null;
    setupInstructions?: string | null;
    executionInstructions?: string | null;
    safetyNotes?: string | null;
    tempo?: string | null;
    breathingInstructions?: string | null;
    rangeOfMotion?: string | null;
  };
  tutorialConfig: TutorialConfigDto;
  demonstrations: TutorialDemonstrationDto[];
  phases: TutorialPhaseDto[];
  steps: TutorialStepDto[];
  coaching: TechniqueCoachingPanelDto;
  commonMistakes: TutorialCommonMistakeDto[];
  safetyGuidelines: TutorialSafetyGuidelineDto[];
  equipment: TutorialEquipmentDto;
  muscles: TutorialMusclesDto;
  variations: TutorialVariationsDto;
  whyItWorks: any;
  knowledgeCheck?: TutorialKnowledgeCheckDto | null;
  userProgress?: TutorialUserProgressDto | null;
  relatedLearning: TutorialRelatedLearningDto;
}
