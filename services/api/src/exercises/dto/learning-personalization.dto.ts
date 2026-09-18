import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExerciseTutorialResponseDto } from './exercise-tutorial.dto';

export const LEARNING_DEPTHS = ['BASIC', 'STANDARD', 'DETAILED', 'ADVANCED'] as const;
export type LearningDepth = (typeof LEARNING_DEPTHS)[number];

export const PERSONALIZED_TUTORIAL_MODES = [
  'PERSONALIZED',
  'QUICK_LEARN',
  'STEP_BY_STEP',
  'MOVEMENT_BREAKDOWN',
  'TECHNIQUE_CHECKLIST',
] as const;
export type PersonalizedTutorialMode = (typeof PERSONALIZED_TUTORIAL_MODES)[number];

export const PRACTICE_PREFERENCES = ['REPS', 'TIMED', 'BOTH'] as const;
export type PracticePreference = (typeof PRACTICE_PREFERENCES)[number];

export class UpdateLearningPreferencesDto {
  @ApiPropertyOptional({
    description: 'Educational depth for tutorial presentations',
    enum: LEARNING_DEPTHS,
    example: 'STANDARD',
  })
  @IsOptional()
  @IsIn(LEARNING_DEPTHS)
  preferredLearningDepth?: LearningDepth;

  @ApiPropertyOptional({
    description: 'Preferred interactive tutorial mode',
    enum: PERSONALIZED_TUTORIAL_MODES,
    example: 'PERSONALIZED',
  })
  @IsOptional()
  @IsIn(PERSONALIZED_TUTORIAL_MODES)
  preferredTutorialMode?: PersonalizedTutorialMode;

  @ApiPropertyOptional({
    description: 'Preferred primary media format',
    example: 'VIDEO',
  })
  @IsOptional()
  @IsString()
  preferredMediaType?: string;

  @ApiPropertyOptional({
    description: 'Preferred demonstration angle (FRONT, SIDE, THREE_QUARTER, etc.)',
    example: 'SIDE',
  })
  @IsOptional()
  @IsString()
  preferredViewAngle?: string;

  @ApiPropertyOptional({
    description: 'Whether tutorial advances phases automatically on completion',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  autoAdvancePreference?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to show comprehensive text instructions',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  showDetailedInstructions?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to expose muscle and anatomical details',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  showAnatomyDetails?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to display advanced technique and biomechanical cues',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  showTechniqueDetails?: boolean;

  @ApiPropertyOptional({
    description: 'Practice style preference (REPS, TIMED, BOTH)',
    enum: PRACTICE_PREFERENCES,
    example: 'REPS',
  })
  @IsOptional()
  @IsIn(PRACTICE_PREFERENCES)
  practicePreference?: PracticePreference;

  @ApiPropertyOptional({
    description: 'Whether knowledge check is enabled at end of tutorial',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  knowledgeCheckPreference?: boolean;

  @ApiPropertyOptional({
    description: 'Default playback speed multiplier',
    minimum: 0.5,
    maximum: 2.0,
    example: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2.0)
  playbackSpeed?: number;
}

export class LearningPreferencesResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  organisationId: string;

  @ApiProperty({ enum: LEARNING_DEPTHS })
  preferredLearningDepth: LearningDepth;

  @ApiProperty({ enum: PERSONALIZED_TUTORIAL_MODES })
  preferredTutorialMode: PersonalizedTutorialMode;

  @ApiPropertyOptional()
  preferredMediaType?: string | null;

  @ApiPropertyOptional()
  preferredViewAngle?: string | null;

  @ApiProperty()
  autoAdvancePreference: boolean;

  @ApiProperty()
  showDetailedInstructions: boolean;

  @ApiProperty()
  showAnatomyDetails: boolean;

  @ApiProperty()
  showTechniqueDetails: boolean;

  @ApiProperty({ enum: PRACTICE_PREFERENCES })
  practicePreference: PracticePreference;

  @ApiProperty()
  knowledgeCheckPreference: boolean;

  @ApiProperty()
  playbackSpeed: number;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class PersonalizedTutorialPlanDto {
  @ApiProperty({ enum: LEARNING_DEPTHS })
  learningDepth: LearningDepth;

  @ApiProperty({ enum: PERSONALIZED_TUTORIAL_MODES })
  recommendedMode: PersonalizedTutorialMode;

  @ApiProperty({ description: 'Ordered list of section identifiers for presentation priority' })
  orderedSections: string[];

  @ApiProperty({ description: 'Preferred camera view angle resolved deterministically' })
  preferredAngle: string;

  @ApiProperty({ description: 'Resolved media details' })
  mediaSelection: {
    preferredAngle: string;
    activeMediaId?: string | null;
    isFallback: boolean;
  };

  @ApiProperty({ description: 'Playback speed recommendation' })
  playbackSpeed: number;

  @ApiProperty({ description: 'Instructional text depth level' })
  instructionDepth: 'ESSENTIAL' | 'COMPREHENSIVE' | 'ADVANCED_BIOMECHANICAL';

  @ApiProperty({ description: 'Adapted practice checklist items' })
  practiceChecklist: string[];

  @ApiProperty({ description: 'Practice rehearsal mode' })
  practiceMode: 'REPS' | 'TIMED';

  @ApiProperty({ description: 'Knowledge check configuration recommendation' })
  knowledgeCheckConfig: {
    enabled: boolean;
    recommendedDifficulty: 'BASIC' | 'STANDARD' | 'ADVANCED';
    questionCount: number;
  };

  @ApiProperty({ description: 'Whether targeted review is recommended based on prior assessments' })
  targetedReviewRecommended: boolean;

  @ApiProperty({ description: 'Phase IDs or mistake keys recommended for review' })
  recommendedReviewPhases: string[];

  @ApiProperty({ description: 'Estimated learning duration in minutes' })
  estimatedLearningTimeMinutes: number;

  @ApiProperty({ description: 'Transparent human-readable personalization rationale' })
  personalizationReason: string;
}

export class PersonalizedTutorialResponseDto {
  @ApiProperty()
  tutorial: ExerciseTutorialResponseDto;

  @ApiProperty()
  plan: PersonalizedTutorialPlanDto;

  @ApiProperty({ description: 'Member learning context and history for this exercise' })
  learningContext: {
    hasCompletedTutorial: boolean;
    completedSteps: number;
    totalSteps: number;
    knowledgeCheckScore?: number | null;
    phasesExplored: boolean;
    lastInteractedAt?: string | null;
  };
}

export class TargetedReviewResponseDto {
  @ApiProperty()
  exerciseId: string;

  @ApiProperty()
  exerciseName: string;

  @ApiProperty()
  suggestedPhases: Array<{
    id: string;
    name: string;
    cue: string;
    orderIndex: number;
  }>;

  @ApiProperty()
  commonMistakesToAvoid: Array<{
    id: string;
    name: string;
    cue: string;
    severity: string;
  }>;

  @ApiPropertyOptional()
  breathingGuidance?: string | null;

  @ApiProperty()
  reviewPrompt: string;
}

export class LearningRecommendationsResponseDto {
  @ApiProperty()
  continueLearning: Array<{
    exerciseId: string;
    name: string;
    difficulty: string;
    completedSteps: number;
    totalSteps: number;
    percentComplete: number;
    lastAccessedAt: string;
  }>;

  @ApiProperty()
  reviewRecommended: Array<{
    exerciseId: string;
    name: string;
    difficulty: string;
    reason: string;
    lastScore?: number | null;
  }>;

  @ApiProperty()
  recentlyMastered: Array<{
    exerciseId: string;
    name: string;
    difficulty: string;
    completedAt: string;
    score?: number | null;
  }>;
}
