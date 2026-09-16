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

export const MOVEMENT_PHASE_TYPES = [
  'SETUP',
  'START_POSITION',
  'ECCENTRIC',
  'TRANSITION_BOTTOM',
  'ISOMETRIC_HOLD',
  'CONCENTRIC',
  'TRANSITION_TOP',
  'LOCKOUT_FINISH',
  'RESET_RETURN',
] as const;

export const BODY_POSITION_TYPES = [
  'STANDING',
  'SQUATTING',
  'HINGED',
  'SUPINE',
  'PRONE',
  'KNEELING',
  'HANGING',
  'SEATED',
  'PLANK',
  'QUADRUPED',
  'INVERTED',
  'OTHER',
] as const;

export const BODY_ORIENTATION_TYPES = [
  'UPRIGHT',
  'HORIZONTAL',
  'INCLINED',
  'DECLINED',
  'SIDEWAYS',
] as const;

export const JOINT_REGIONS = [
  'ANKLES',
  'KNEES',
  'HIPS',
  'LUMBAR_SPINE',
  'THORACIC_SPINE',
  'CERVICAL_SPINE',
  'SCAPULAE',
  'SHOULDERS',
  'ELBOWS',
  'WRISTS',
  'CORE_PELVIS',
] as const;

export const RANGE_OF_MOTION_TYPES = [
  'FULL',
  'PARTIAL',
  'DEEP',
  'PARALLEL',
  'TERMINAL',
  'ISOMETRIC',
] as const;

export const BREATHING_PATTERNS = [
  'INHALE_DESCENT',
  'EXHALE_EFFORT',
  'HOLD_VALSALVA',
  'CONTINUOUS_RHYTHMIC',
  'EXHALE_RECOVERY',
] as const;

export const REPETITION_TYPES = [
  'REPETITION',
  'ISOMETRIC_HOLD',
  'DISTANCE_INTERVAL',
  'TIME_INTERVAL',
  'COMPLEX',
] as const;

export const ALIGNMENT_STATUSES = ['OPTIMAL', 'ACCEPTABLE', 'FAULT'] as const;

export const PHASE_STATUSES = [
  'DRAFT',
  'REVIEW',
  'APPROVED',
  'PUBLISHED',
  'ARCHIVED',
] as const;

export class JointAlignmentDto {
  @ApiProperty({ description: 'Joint region being aligned', example: 'KNEES' })
  @IsString()
  joint: string;

  @ApiProperty({
    description: 'Biomechanical alignment recommendation',
    example: 'Tracking inline with 2nd toe, preventing valgus inward collapse',
  })
  @IsString()
  alignment: string;

  @ApiPropertyOptional({ enum: ALIGNMENT_STATUSES, default: 'OPTIMAL' })
  @IsOptional()
  @IsIn(ALIGNMENT_STATUSES)
  status?: string;

  @ApiPropertyOptional({ description: 'Coaching cue for this joint', example: 'Spread the floor' })
  @IsOptional()
  @IsString()
  cue?: string;

  @ApiPropertyOptional({ description: 'Target joint angle in degrees', example: 90 })
  @IsOptional()
  @IsNumber()
  angleDegrees?: number;
}

export class PhaseVisualCueDto {
  @ApiProperty({ description: 'Visual cue text description', example: 'Knees stay tracked over toes' })
  @IsString()
  text: string;

  @ApiPropertyOptional({ description: 'Category of visual cue', example: 'ALIGNMENT' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: ['STANDARD', 'CRITICAL'], default: 'STANDARD' })
  @IsOptional()
  @IsIn(['STANDARD', 'CRITICAL'])
  emphasis?: 'STANDARD' | 'CRITICAL';
}

export class PhaseMistakeDto {
  @ApiProperty({ description: 'Specific mistake made during this phase', example: 'Knees collapse inwards' })
  @IsString()
  mistake: string;

  @ApiPropertyOptional({ description: 'Biomechanical consequence', example: 'Excess patellofemoral stress' })
  @IsOptional()
  @IsString()
  consequence?: string;

  @ApiProperty({ description: 'Actionable correction', example: 'Actively push knees outward against imaginary bands' })
  @IsString()
  correction: string;

  @ApiPropertyOptional({ enum: ['MINOR', 'MODERATE', 'SEVERE'], default: 'MODERATE' })
  @IsOptional()
  @IsIn(['MINOR', 'MODERATE', 'SEVERE'])
  severity?: 'MINOR' | 'MODERATE' | 'SEVERE';
}

export class TempoStructureDto {
  @ApiPropertyOptional({ description: 'Eccentric lowering seconds', example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  eccentricSeconds?: number;

  @ApiPropertyOptional({ description: 'Bottom pause/inflection seconds', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bottomHoldSeconds?: number;

  @ApiPropertyOptional({ description: 'Concentric lifting seconds', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  concentricSeconds?: number;

  @ApiPropertyOptional({ description: 'Top lockout hold seconds', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  topHoldSeconds?: number;

  @ApiPropertyOptional({ description: 'Tempo guidance notes', example: 'Control descent strictly' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateMovementPhaseDto {
  @ApiProperty({ description: 'Phase identifier name', example: 'DESCENT' })
  @IsString()
  phaseName: string;

  @ApiPropertyOptional({ enum: MOVEMENT_PHASE_TYPES, default: 'ECCENTRIC' })
  @IsOptional()
  @IsIn(MOVEMENT_PHASE_TYPES)
  phaseType?: string;

  @ApiPropertyOptional({ description: 'Human readable title', example: 'Eccentric Lowering Phase' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Phase description and purpose' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Order sequence index (0-based)', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({ description: 'Concise real-time verbal cue', example: 'Hips back, knees out, controlled descent' })
  @IsOptional()
  @IsString()
  cueText?: string;

  @ApiPropertyOptional({ description: 'Video timestamp in milliseconds', example: 1500 })
  @IsOptional()
  @IsNumber()
  timestampMs?: number;

  @ApiPropertyOptional({ description: 'Checkpoints for phase validation', example: ['Chest upright', 'Knees track over toes'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyCheckpoints?: string[];

  @ApiPropertyOptional({ enum: BODY_POSITION_TYPES, example: 'STANDING' })
  @IsOptional()
  @IsIn(BODY_POSITION_TYPES)
  bodyPosition?: string;

  @ApiPropertyOptional({ enum: BODY_ORIENTATION_TYPES, example: 'UPRIGHT' })
  @IsOptional()
  @IsIn(BODY_ORIENTATION_TYPES)
  bodyOrientation?: string;

  @ApiPropertyOptional({ description: 'Biomechanical joint alignments for this phase', type: [JointAlignmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JointAlignmentDto)
  jointAlignments?: JointAlignmentDto[];

  @ApiPropertyOptional({ enum: RANGE_OF_MOTION_TYPES, example: 'FULL' })
  @IsOptional()
  @IsIn(RANGE_OF_MOTION_TYPES)
  rangeOfMotionType?: string;

  @ApiPropertyOptional({ description: 'Range of motion specific guidance' })
  @IsOptional()
  @IsString()
  rangeOfMotionNotes?: string;

  @ApiPropertyOptional({ enum: BREATHING_PATTERNS, example: 'INHALE_DESCENT' })
  @IsOptional()
  @IsIn(BREATHING_PATTERNS)
  breathingPattern?: string;

  @ApiPropertyOptional({ description: 'Phase breathing notes' })
  @IsOptional()
  @IsString()
  breathingNotes?: string;

  @ApiPropertyOptional({ description: 'Duration target for this phase in seconds', example: 3.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tempoSeconds?: number;

  @ApiPropertyOptional({ description: 'Hold duration for this phase in seconds', example: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  holdDurationSeconds?: number;

  @ApiPropertyOptional({ description: 'Visual cues displayed during phase', type: [PhaseVisualCueDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhaseVisualCueDto)
  visualCues?: PhaseVisualCueDto[];

  @ApiPropertyOptional({ description: 'Common mistakes during phase', type: [PhaseMistakeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhaseMistakeDto)
  commonMistakes?: PhaseMistakeDto[];

  @ApiPropertyOptional({ description: 'Phase specific safety cautions' })
  @IsOptional()
  @IsString()
  safetyNotes?: string;

  @ApiPropertyOptional({ description: 'Associated ExerciseMedia ID' })
  @IsOptional()
  @IsString()
  mediaId?: string;

  @ApiPropertyOptional({ description: 'Direct media URL if available' })
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional({ description: 'Sub-second video loop start time in seconds', example: 2.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  videoStartTimeSeconds?: number;

  @ApiPropertyOptional({ description: 'Sub-second video loop end time in seconds', example: 5.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  videoEndTimeSeconds?: number;

  @ApiPropertyOptional({ enum: PHASE_STATUSES, default: 'PUBLISHED' })
  @IsOptional()
  @IsIn(PHASE_STATUSES)
  status?: string;
}

export class UpdateMovementPhaseDto extends PartialType(CreateMovementPhaseDto) {}

export class ReorderMovementPhasesDto {
  @ApiProperty({
    description: 'Ordered array of movement phase IDs',
    example: ['phase_1', 'phase_2', 'phase_3'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  phaseIds: string[];
}

export class AttachPhaseMediaDto {
  @ApiProperty({ description: 'Target ExerciseMedia ID to attach to this movement phase' })
  @IsString()
  mediaId: string;

  @ApiPropertyOptional({ description: 'Loop start offset in seconds', example: 1.2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  startTimeSeconds?: number;

  @ApiPropertyOptional({ description: 'Loop end offset in seconds', example: 4.8 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  endTimeSeconds?: number;
}

export class LinkPhaseInstructionStepsDto {
  @ApiProperty({ description: 'IDs of instruction steps belonging to this phase' })
  @IsArray()
  @IsString({ each: true })
  stepIds: string[];
}

export class UpdateExerciseMovementStructureDto {
  @ApiPropertyOptional({ description: 'Secondary movement patterns (e.g. HINGE, ROTATION)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  secondaryMovementPatterns?: string[];

  @ApiPropertyOptional({ enum: REPETITION_TYPES, default: 'REPETITION' })
  @IsOptional()
  @IsIn(REPETITION_TYPES)
  repetitionType?: string;

  @ApiPropertyOptional({ description: 'Structured tempo blueprint for exercise repetitions', type: TempoStructureDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TempoStructureDto)
  tempoStructure?: TempoStructureDto;
}
