import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { EXERCISE_DIFFICULTIES } from './exercise.dto';

export type ExerciseDifficulty = (typeof EXERCISE_DIFFICULTIES)[number];

export const REASON_CODES = [
  'GOAL_MATCH',
  'EQUIPMENT_MATCH',
  'DIFFICULTY_MATCH',
  'RECENT_INTEREST',
  'FAVORITE',
  'WORKOUT_HISTORY',
  'NEW_DISCOVERY',
] as const;

export type ReasonCode = (typeof REASON_CODES)[number];

export class UpdateExercisePreferencesDto {
  @ApiPropertyOptional({
    description: 'Fitness goals for personalization (e.g. STRENGTH, MUSCLE_GAIN, MOBILITY, ENDURANCE)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fitnessGoals?: string[];

  @ApiPropertyOptional({
    enum: EXERCISE_DIFFICULTIES,
    description: 'Preferred training difficulty level',
  })
  @IsOptional()
  @IsEnum(EXERCISE_DIFFICULTIES)
  preferredDifficulty?: ExerciseDifficulty;

  @ApiPropertyOptional({
    description: 'Preferred exercise categories (e.g. STRENGTH, CARDIO, MOBILITY, CORE)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredCategories?: string[];

  @ApiPropertyOptional({
    description: 'Available equipment items (e.g. DUMBBELL, BARBELL, RESISTANCE_BAND, BODYWEIGHT)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableEquipment?: string[];

  @ApiPropertyOptional({
    description: 'Primary workout location (e.g. GYM, HOME, OUTDOOR)',
  })
  @IsOptional()
  @IsString()
  workoutLocation?: string;

  @ApiPropertyOptional({
    description: 'Preferred training styles or modalities',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredTrainingStyles?: string[];
}

export class UpdateExerciseLearningProgressDto {
  @ApiPropertyOptional({ description: 'Current step number in the instructional flow' })
  @IsOptional()
  @IsInt()
  @Min(1)
  stepNumber?: number;

  @ApiPropertyOptional({ description: 'Number of steps completed so far' })
  @IsOptional()
  @IsInt()
  @Min(0)
  completedSteps?: number;

  @ApiPropertyOptional({ description: 'Total number of steps in this exercise guide' })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalSteps?: number;

  @ApiPropertyOptional({ description: 'Whether the member viewed the demonstration media' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  mediaViewed?: boolean;

  @ApiPropertyOptional({ description: 'Whether the member reviewed written instructions' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  instructionsViewed?: boolean;

  @ApiPropertyOptional({ description: 'Whether the member explored biomechanical movement phases' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  phasesExplored?: boolean;

  @ApiPropertyOptional({ description: 'Mark the educational learning flow as complete' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isComplete?: boolean;
}

export interface PersonalizedExerciseItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  difficulty: string;
  exerciseType: string;
  movementPattern?: string | null;
  primaryMuscleGroup: string;
  equipment?: string | null;
  exerciseCategory?: string | null;
  exerciseMechanics?: string | null;
  media: any[];
  muscleRelations?: any[];
  equipmentRelations?: any[];
  isFavorite: boolean;
  reasonCode: ReasonCode;
  reasonText: string;
  learningProgress?: {
    status: string;
    completedSteps: number;
    totalSteps: number;
    lastStepNumber?: number | null;
    phasesExplored: boolean;
    completedAt?: Date | null;
  };
}

export interface PersonalizedDiscoveryResponse {
  preferences: {
    fitnessGoals: string[];
    preferredDifficulty: string | null;
    preferredCategories: string[];
    availableEquipment: string[];
    workoutLocation: string | null;
  };
  forYou: PersonalizedExerciseItem[];
  continueLearning: PersonalizedExerciseItem[];
  favorites: PersonalizedExerciseItem[];
  recentlyViewed: PersonalizedExerciseItem[];
  basedOnGoals: PersonalizedExerciseItem[];
  basedOnEquipment: PersonalizedExerciseItem[];
  usedInWorkouts: PersonalizedExerciseItem[];
  exploreNew: PersonalizedExerciseItem[];
}
