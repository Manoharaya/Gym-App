import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  Min,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export const INSTRUCTION_STEP_TYPES = [
  'PREPARATION',
  'START_POSITION',
  'EXECUTION',
  'HOLD',
  'RETURN',
  'BREATHING',
  'COMPLETION',
] as const;

export const INSTRUCTION_MOVEMENT_PHASES = [
  'SETUP',
  'START',
  'ECCENTRIC',
  'TRANSITION',
  'CONCENTRIC',
  'HOLD',
  'FINISH',
] as const;

export const VISUAL_CUE_CATEGORIES = [
  'POSTURE',
  'ALIGNMENT',
  'BREATHING',
  'TEMPO',
  'RANGE_OF_MOTION',
  'SAFETY',
  'FOCUS',
] as const;

export const INSTRUCTION_STATUSES = [
  'DRAFT',
  'REVIEW',
  'PUBLISHED',
  'ARCHIVED',
] as const;

export class UpsertExerciseInstructionDto {
  @ApiPropertyOptional({ description: 'Optional instruction title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Executive exercise overview & objective' })
  @IsOptional()
  @IsString()
  overview?: string;

  @ApiPropertyOptional({ description: 'Preparation & equipment guide' })
  @IsOptional()
  @IsString()
  preparationGuide?: string;

  @ApiPropertyOptional({ description: 'Starting position setup guidance' })
  @IsOptional()
  @IsString()
  startingPosition?: string;

  @ApiPropertyOptional({ description: 'Full execution summary' })
  @IsOptional()
  @IsString()
  executionSummary?: string;

  @ApiPropertyOptional({ description: 'Breathing rhythm & cadence guide' })
  @IsOptional()
  @IsString()
  breathingSummary?: string;

  @ApiPropertyOptional({ description: 'Completion and rack-down summary' })
  @IsOptional()
  @IsString()
  completionSummary?: string;

  @ApiPropertyOptional({ description: 'Crucial safety warnings & contraindications' })
  @IsOptional()
  @IsString()
  safetySummary?: string;

  @ApiPropertyOptional({ enum: INSTRUCTION_STATUSES, default: 'DRAFT' })
  @IsOptional()
  @IsIn(INSTRUCTION_STATUSES)
  status?: string;
}

export class CreateExerciseInstructionStepDto {
  @ApiProperty({ description: 'Step order sequence index (1-based)', example: 1 })
  @IsNumber()
  @Min(1)
  stepNumber: number;

  @ApiPropertyOptional({ enum: INSTRUCTION_STEP_TYPES, default: 'EXECUTION' })
  @IsOptional()
  @IsIn(INSTRUCTION_STEP_TYPES)
  stepType?: string;

  @ApiPropertyOptional({ description: 'Legacy instruction phase string' })
  @IsOptional()
  @IsString()
  phase?: string;

  @ApiProperty({ description: 'Step title / headline', example: 'Brace Core & Hinge Hips' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Primary concise step direction', example: 'Push hips back while maintaining a neutral spine.' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'In-depth anatomical and biomechanical walkthrough' })
  @IsOptional()
  @IsString()
  detailedInstruction?: string;

  @ApiPropertyOptional({ description: 'Quick audio/coaching trigger cue', example: 'Proud chest, push the floor away' })
  @IsOptional()
  @IsString()
  coachingCue?: string;

  @ApiPropertyOptional({ enum: INSTRUCTION_MOVEMENT_PHASES })
  @IsOptional()
  @IsIn(INSTRUCTION_MOVEMENT_PHASES)
  movementPhase?: string;

  @ApiPropertyOptional({ description: 'Body orientation/stance', example: 'Standing, feet shoulder-width' })
  @IsOptional()
  @IsString()
  bodyPosition?: string;

  @ApiPropertyOptional({ description: 'Breathing instruction', example: 'Inhale on descent, exhale on drive' })
  @IsOptional()
  @IsString()
  breathing?: string;

  @ApiPropertyOptional({ description: 'Cadence / tempo (e.g. 3-1-1-0)' })
  @IsOptional()
  @IsString()
  tempo?: string;

  @ApiPropertyOptional({ description: 'Expected duration in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  durationSeconds?: number;

  @ApiPropertyOptional({ description: 'Isometric hold duration in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  holdDurationSeconds?: number;

  @ApiPropertyOptional({ description: 'Repetitions recommended for this step' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  repetitions?: number;

  @ApiPropertyOptional({ description: 'Visual focus cue', example: 'Knees tracking over second toes' })
  @IsOptional()
  @IsString()
  visualCue?: string;

  @ApiPropertyOptional({ enum: VISUAL_CUE_CATEGORIES })
  @IsOptional()
  @IsIn(VISUAL_CUE_CATEGORIES)
  visualCueCategory?: string;

  @ApiPropertyOptional({ description: 'Trainer pro-tip' })
  @IsOptional()
  @IsString()
  trainerTip?: string;

  @ApiPropertyOptional({ description: 'Injury prevention or safety note' })
  @IsOptional()
  @IsString()
  safetyNote?: string;

  @ApiPropertyOptional({ description: 'ExerciseMedia asset UUID to bind to step' })
  @IsOptional()
  @IsString()
  mediaId?: string;

  @ApiPropertyOptional({ description: 'Direct media URL if available' })
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional({ description: 'Video playback clip start offset in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  videoStartTimeSeconds?: number;

  @ApiPropertyOptional({ description: 'Video playback clip end offset in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  videoEndTimeSeconds?: number;
}

export class UpdateExerciseInstructionStepDto extends PartialType(CreateExerciseInstructionStepDto) {
  @ApiPropertyOptional({ enum: INSTRUCTION_STATUSES })
  @IsOptional()
  @IsIn(INSTRUCTION_STATUSES)
  status?: string;
}

export class ReorderInstructionStepsDto {
  @ApiProperty({ description: 'Ordered list of ExerciseInstructionStep IDs', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  stepIds: string[];
}

export class AttachStepMediaDto {
  @ApiProperty({ description: 'ExerciseMedia ID to link' })
  @IsString()
  mediaId: string;

  @ApiPropertyOptional({ description: 'Video start offset in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  videoStartTimeSeconds?: number;

  @ApiPropertyOptional({ description: 'Video end offset in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  videoEndTimeSeconds?: number;
}

export class UpdateInstructionStatusDto {
  @ApiProperty({ enum: INSTRUCTION_STATUSES, description: 'Publication status' })
  @IsIn(INSTRUCTION_STATUSES)
  status: string;
}
