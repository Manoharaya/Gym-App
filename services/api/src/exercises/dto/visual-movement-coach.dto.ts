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

export const EXPECTATION_TYPES = [
  'POSTURE',
  'ALIGNMENT',
  'BODY_POSITION',
  'MOVEMENT_DIRECTION',
  'RANGE_OF_MOTION',
  'TEMPO',
  'BREATHING',
  'STABILITY',
  'CONTROL',
  'BALANCE',
  'FOOT_POSITION',
  'HAND_POSITION',
  'SPINE_POSITION',
  'HEAD_POSITION',
  'JOINT_POSITION',
  'EQUIPMENT_POSITION',
  'SAFETY',
  'FOCUS',
] as const;

export type ExpectationType = (typeof EXPECTATION_TYPES)[number];

export const EXPECTATION_PRIORITIES = ['ESSENTIAL', 'IMPORTANT', 'OPTIONAL'] as const;
export type ExpectationPriority = (typeof EXPECTATION_PRIORITIES)[number];

export const BODY_REGIONS = [
  'HEAD',
  'NECK',
  'SHOULDERS',
  'CHEST',
  'UPPER_BACK',
  'SPINE',
  'CORE',
  'HIPS',
  'GLUTES',
  'KNEES',
  'ANKLES',
  'FEET',
  'ELBOWS',
  'WRISTS',
  'HANDS',
  'FULL_BODY',
] as const;

export type BodyRegion = (typeof BODY_REGIONS)[number];

export const CONDITION_TYPES = [
  'PHASE_MISMATCH',
  'POSITION_DEVIATION',
  'ALIGNMENT_DEVIATION',
  'ROM_DEVIATION',
  'TEMPO_DEVIATION',
  'STABILITY_DEVIATION',
  'BREATHING_MISMATCH',
  'MOVEMENT_DIRECTION',
] as const;

export type ConditionType = (typeof CONDITION_TYPES)[number];

export const FEEDBACK_TYPES = ['POSITIVE', 'GUIDANCE', 'REMINDER', 'CAUTION', 'REVIEW'] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const FEEDBACK_SEVERITIES = ['LOW', 'MODERATE', 'HIGH'] as const;
export type FeedbackSeverity = (typeof FEEDBACK_SEVERITIES)[number];

export const CONTENT_STATUSES = ['DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export class CreateMovementExpectationDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsIn(EXPECTATION_TYPES)
  expectationType?: ExpectationType;

  @IsOptional()
  @IsIn(EXPECTATION_PRIORITIES)
  priority?: ExpectationPriority;

  @IsOptional()
  @IsIn(BODY_REGIONS)
  bodyRegion?: BodyRegion;

  @IsOptional()
  @IsString()
  movementPhaseId?: string;

  @IsOptional()
  @IsString()
  expectedState?: string;

  @IsOptional()
  @IsString()
  expectedDirection?: string;

  @IsOptional()
  @IsString()
  expectedPosition?: string;

  @IsOptional()
  @IsString()
  expectedAlignment?: string;

  @IsOptional()
  @IsString()
  expectedRangeOfMotion?: string;

  @IsOptional()
  @IsString()
  expectedTempo?: string;

  @IsOptional()
  @IsString()
  expectedBreathing?: string;

  @IsOptional()
  @IsString()
  visualCueId?: string;

  @IsOptional()
  @IsString()
  safetyNote?: string;

  @IsOptional()
  @IsString()
  commonMistakeId?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsIn(CONTENT_STATUSES)
  status?: ContentStatus;
}

export class UpdateMovementExpectationDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(EXPECTATION_TYPES)
  expectationType?: ExpectationType;

  @IsOptional()
  @IsIn(EXPECTATION_PRIORITIES)
  priority?: ExpectationPriority;

  @IsOptional()
  @IsIn(BODY_REGIONS)
  bodyRegion?: BodyRegion;

  @IsOptional()
  @IsString()
  movementPhaseId?: string;

  @IsOptional()
  @IsString()
  expectedState?: string;

  @IsOptional()
  @IsString()
  expectedDirection?: string;

  @IsOptional()
  @IsString()
  expectedPosition?: string;

  @IsOptional()
  @IsString()
  expectedAlignment?: string;

  @IsOptional()
  @IsString()
  expectedRangeOfMotion?: string;

  @IsOptional()
  @IsString()
  expectedTempo?: string;

  @IsOptional()
  @IsString()
  expectedBreathing?: string;

  @IsOptional()
  @IsString()
  visualCueId?: string;

  @IsOptional()
  @IsString()
  safetyNote?: string;

  @IsOptional()
  @IsString()
  commonMistakeId?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsIn(CONTENT_STATUSES)
  status?: ContentStatus;
}

export class CreateMovementFeedbackRuleDto {
  @IsOptional()
  @IsString()
  movementPhaseId?: string;

  @IsOptional()
  @IsString()
  expectationId?: string;

  @IsIn(CONDITION_TYPES)
  conditionType: ConditionType;

  @IsOptional()
  @IsObject()
  conditionParameters?: Record<string, any>;

  @IsOptional()
  @IsIn(FEEDBACK_TYPES)
  feedbackType?: FeedbackType;

  @IsString()
  feedbackMessage: string;

  @IsOptional()
  @IsIn(FEEDBACK_SEVERITIES)
  severity?: FeedbackSeverity;

  @IsOptional()
  @IsIn(EXPECTATION_PRIORITIES)
  priority?: ExpectationPriority;

  @IsOptional()
  @IsIn(CONTENT_STATUSES)
  status?: ContentStatus;
}

export class UpdateMovementFeedbackRuleDto {
  @IsOptional()
  @IsString()
  movementPhaseId?: string;

  @IsOptional()
  @IsString()
  expectationId?: string;

  @IsOptional()
  @IsIn(CONDITION_TYPES)
  conditionType?: ConditionType;

  @IsOptional()
  @IsObject()
  conditionParameters?: Record<string, any>;

  @IsOptional()
  @IsIn(FEEDBACK_TYPES)
  feedbackType?: FeedbackType;

  @IsOptional()
  @IsString()
  feedbackMessage?: string;

  @IsOptional()
  @IsIn(FEEDBACK_SEVERITIES)
  severity?: FeedbackSeverity;

  @IsOptional()
  @IsIn(EXPECTATION_PRIORITIES)
  priority?: ExpectationPriority;

  @IsOptional()
  @IsIn(CONTENT_STATUSES)
  status?: ContentStatus;
}

export interface MovementExpectationItemDto {
  id: string;
  exerciseId: string;
  movementPhaseId?: string | null;
  phaseName?: string | null;
  title: string;
  description: string;
  expectationType: ExpectationType;
  priority: ExpectationPriority;
  bodyRegion: BodyRegion;
  expectedState?: string | null;
  expectedDirection?: string | null;
  expectedPosition?: string | null;
  expectedAlignment?: string | null;
  expectedRangeOfMotion?: string | null;
  expectedTempo?: string | null;
  expectedBreathing?: string | null;
  visualCueId?: string | null;
  visualCue?: {
    id: string;
    type: string;
    label: string;
    description?: string | null;
    x: number;
    y: number;
  } | null;
  safetyNote?: string | null;
  commonMistakeId?: string | null;
  commonMistake?: {
    id: string;
    mistake: string;
    correction: string;
    severity: string;
  } | null;
  sortOrder: number;
  status: string;
}

export interface TechniqueChecklistItemDto {
  id: string;
  title: string;
  description?: string;
  category: 'SETUP' | 'ALIGNMENT' | 'EXECUTION' | 'BREATHING' | 'TEMPO' | 'SAFETY';
  priority: ExpectationPriority;
  phaseName?: string;
  isRequired: boolean;
  order: number;
}

export interface MovementCoachPhaseDto {
  id: string;
  phaseName: string;
  phaseType: string;
  title?: string | null;
  description?: string | null;
  orderIndex: number;
  cueText?: string | null;
  bodyPosition?: string | null;
  bodyOrientation?: string | null;
  breathingPattern?: string | null;
  breathingNotes?: string | null;
  tempoSeconds?: number | null;
  holdDurationSeconds?: number | null;
  mediaUrl?: string | null;
  videoStartTimeSeconds?: number | null;
  videoEndTimeSeconds?: number | null;
  expectations: MovementExpectationItemDto[];
  visualCues: Array<{
    id: string;
    type: string;
    label: string;
    description?: string | null;
    category: string;
    x: number;
    y: number;
    startTime?: number | null;
    endTime?: number | null;
  }>;
  mistakes: Array<{
    id: string;
    mistake: string;
    consequence?: string | null;
    correction: string;
    severity: string;
  }>;
  safetyGuidelines: Array<{
    id: string;
    category: string;
    title?: string | null;
    description: string;
    severity: string;
  }>;
}

export interface WhatToFocusOnGroupDto {
  essential: MovementExpectationItemDto[];
  important: MovementExpectationItemDto[];
  optional: MovementExpectationItemDto[];
}

export interface VisualMovementCoachResponseDto {
  exercise: {
    id: string;
    name: string;
    slug: string;
    difficulty: string;
    exerciseType: string;
    movementPattern: string;
    primaryMuscleGroup: string;
    equipment: string;
    bodyPosition?: string | null;
    tempo?: string | null;
    rangeOfMotion?: string | null;
    breathingInstructions?: string | null;
  };
  media: {
    heroMediaUrl?: string | null;
    thumbnailUrl?: string | null;
    mediaType?: string | null;
  };
  phases: MovementCoachPhaseDto[];
  whatToFocusOn: WhatToFocusOnGroupDto;
  techniqueChecklist: TechniqueChecklistItemDto[];
  safetyGuidance: Array<{
    id: string;
    category: string;
    title?: string | null;
    description: string;
    severity: string;
  }>;
  commonMistakes: Array<{
    id: string;
    mistake: string;
    consequence?: string | null;
    correction: string;
    severity: string;
    phaseName?: string | null;
  }>;
  learningStatus?: {
    isCompleted?: boolean;
    completedAt?: Date | null;
    masteryLevel?: string;
  };
}
