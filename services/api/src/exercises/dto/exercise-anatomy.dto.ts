import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type MuscleRole = 'PRIMARY' | 'SECONDARY' | 'STABILIZER';
export type AnatomicalRegion = 'ANTERIOR' | 'POSTERIOR';
export type MuscleGroupCategory = 'UPPER_BODY' | 'CORE' | 'LOWER_BODY';

export class MuscleInvolvedItemDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  group: string; // UPPER_BODY, CORE, LOWER_BODY

  @ApiProperty({ enum: ['ANTERIOR', 'POSTERIOR'] })
  region: AnatomicalRegion;

  @ApiProperty({ enum: ['PRIMARY', 'SECONDARY', 'STABILIZER'] })
  role: MuscleRole;

  @ApiProperty()
  roleExplanation: string;

  @ApiProperty()
  educationalDescription: string;

  @ApiPropertyOptional()
  activationLevel?: string;

  @ApiPropertyOptional()
  notes?: string;
}

export class MovementMechanicsPhaseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  phaseName: string;

  @ApiProperty()
  phaseType: string;

  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  orderIndex: number;

  @ApiPropertyOptional()
  cueText?: string;

  @ApiPropertyOptional()
  bodyPosition?: string;

  @ApiPropertyOptional()
  jointAlignments?: any;

  @ApiPropertyOptional()
  rangeOfMotionType?: string;

  @ApiPropertyOptional()
  rangeOfMotionNotes?: string;

  @ApiPropertyOptional()
  breathingPattern?: string;

  @ApiPropertyOptional()
  breathingNotes?: string;

  @ApiPropertyOptional()
  tempoSeconds?: number;

  @ApiPropertyOptional()
  holdDurationSeconds?: number;

  @ApiPropertyOptional()
  visualCues?: any;

  @ApiPropertyOptional()
  phaseMuscles?: Array<{ muscle: string; role: string; actionType: string }>;
}

export class WhyThisExerciseWorksDto {
  @ApiProperty()
  overview: string;

  @ApiProperty()
  mechanicsExplanation: string;

  @ApiProperty({ type: [String] })
  primaryDrivers: string[];

  @ApiProperty()
  jointAction: string;

  @ApiProperty()
  stabilizationFocus: string;

  @ApiProperty({ type: [String] })
  benefits: string[];

  @ApiProperty()
  educationalDisclaimer: string;
}

export class ExerciseAnatomyResponseDto {
  @ApiProperty()
  exercise: {
    id: string;
    name: string;
    slug: string;
    difficulty: string;
    movementPattern: string;
    exerciseMechanics?: string;
    bodyPosition?: string;
    laterality?: string;
    tempo?: string;
    tempoStructure?: any;
    rangeOfMotion?: string;
    breathingInstructions?: string;
    educationalTips?: string[];
    safetyNotes?: string;
  };

  @ApiProperty()
  musclesInvolved: {
    primary: MuscleInvolvedItemDto[];
    secondary: MuscleInvolvedItemDto[];
    stabilizers: MuscleInvolvedItemDto[];
    totalCount: number;
  };

  @ApiProperty()
  movementMechanics: {
    pattern: {
      code: string;
      name: string;
      definition: string;
      primaryJointActions: string[];
    };
    phases: MovementMechanicsPhaseDto[];
    tempoSummary: {
      tempoString?: string;
      eccentricSeconds?: number;
      bottomHoldSeconds?: number;
      concentricSeconds?: number;
      topHoldSeconds?: number;
      tempoExplanation: string;
    };
    breathingSummary: {
      instructions?: string;
      patternType?: string;
      guidance: string;
    };
  };

  @ApiProperty()
  equipment: Array<{
    id: string;
    equipmentName: string;
    requirementType: string;
    equipmentCategory?: string;
    alternatives?: string[];
    notes?: string;
  }>;

  @ApiProperty()
  whyThisExerciseWorks: WhyThisExerciseWorksDto;

  @ApiProperty()
  bodyMapData: {
    anteriorHighlighted: string[];
    posteriorHighlighted: string[];
    allInvolvedMuscles: Array<{
      code: string;
      label: string;
      role: MuscleRole;
      region: AnatomicalRegion;
    }>;
  };

  @ApiProperty()
  relatedExercises: Array<{
    id: string;
    name: string;
    slug: string;
    difficulty: string;
    primaryMuscleGroup: string;
    movementPattern: string;
    mediaUrl?: string;
  }>;

  @ApiProperty()
  relatedLearning: Array<{
    id: string;
    title: string;
    type: 'CURRICULUM' | 'LEARNING_PATH' | 'LESSON';
    pathId?: string;
    lessonId?: string;
  }>;

  @ApiProperty()
  knowledgeChecks: Array<{
    id: string;
    title: string;
    questionCount: number;
  }>;
}

export class MuscleCatalogItemDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  group: MuscleGroupCategory;

  @ApiProperty({ enum: ['ANTERIOR', 'POSTERIOR'] })
  region: AnatomicalRegion;

  @ApiProperty()
  exerciseCount: number;

  @ApiProperty()
  educationalSummary: string;
}

export class MuscleDetailResponseDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  group: MuscleGroupCategory;

  @ApiProperty({ enum: ['ANTERIOR', 'POSTERIOR'] })
  region: AnatomicalRegion;

  @ApiProperty()
  educationalDescription: string;

  @ApiProperty({ type: [String] })
  primaryActions: string[];

  @ApiProperty({ type: [String] })
  synergistMuscles: string[];

  @ApiProperty()
  exercises: {
    primary: Array<{
      id: string;
      name: string;
      difficulty: string;
      movementPattern: string;
      equipment: string;
    }>;
    secondary: Array<{
      id: string;
      name: string;
      difficulty: string;
      movementPattern: string;
      equipment: string;
    }>;
  };

  @ApiProperty()
  relatedLessons: Array<{
    id: string;
    title: string;
    learningPathTitle: string;
    learningPathId: string;
  }>;
}

export class MovementCatalogItemDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  definition: string;

  @ApiProperty()
  exerciseCount: number;
}

export class MovementPatternDetailResponseDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  definition: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: [String] })
  primaryJointActions: string[];

  @ApiProperty({ type: [String] })
  commonBodyPositions: string[];

  @ApiProperty()
  exercises: Array<{
    id: string;
    name: string;
    difficulty: string;
    primaryMuscleGroup: string;
    equipment: string;
  }>;

  @ApiProperty()
  relatedCurricula: Array<{
    id: string;
    title: string;
    category: string;
  }>;
}

export class UpdateExerciseWhyItWorksDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  overview?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mechanicsExplanation?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  primaryDrivers?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jointAction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stabilizationFocus?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];
}
