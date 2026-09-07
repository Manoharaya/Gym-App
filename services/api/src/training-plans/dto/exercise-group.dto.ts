import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum WorkoutExerciseGroupTypeEnum {
  SINGLE = 'SINGLE',
  SUPERSET = 'SUPERSET',
  TRISET = 'TRISET',
  GIANT_SET = 'GIANT_SET',
  CIRCUIT = 'CIRCUIT',
  EMOM = 'EMOM',
  AMRAP = 'AMRAP',
  INTERVAL = 'INTERVAL',
}

export enum WorkoutSectionTypeEnum {
  WARM_UP = 'WARM_UP',
  ACTIVATION = 'ACTIVATION',
  MAIN = 'MAIN',
  ACCESSORY = 'ACCESSORY',
  CONDITIONING = 'CONDITIONING',
  COOL_DOWN = 'COOL_DOWN',
  RECOVERY = 'RECOVERY',
  OTHER = 'OTHER',
}

export class CreateExerciseGroupDto {
  @ApiProperty({ description: 'Name of the exercise group e.g. "Superset A"' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: WorkoutExerciseGroupTypeEnum, default: WorkoutExerciseGroupTypeEnum.SUPERSET })
  @IsEnum(WorkoutExerciseGroupTypeEnum)
  type!: WorkoutExerciseGroupTypeEnum;

  @ApiPropertyOptional({ enum: WorkoutSectionTypeEnum, default: WorkoutSectionTypeEnum.MAIN })
  @IsOptional()
  @IsEnum(WorkoutSectionTypeEnum)
  section?: WorkoutSectionTypeEnum = WorkoutSectionTypeEnum.MAIN;

  @ApiPropertyOptional({ description: 'Sort order index', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number = 0;

  @ApiPropertyOptional({ description: 'Total rounds through this group/circuit', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  rounds?: number = 1;

  @ApiPropertyOptional({ description: 'Rest between exercises in seconds', default: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600)
  restBetweenExercises?: number;

  @ApiPropertyOptional({ description: 'Rest between rounds in seconds', default: 90 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1200)
  restBetweenRounds?: number;

  @ApiPropertyOptional({ description: 'Duration in seconds for timed EMOM / AMRAP / Circuit' })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @ApiPropertyOptional({ description: 'Coach notes or prescription details' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'IDs of WorkoutExercise items to associate with this group', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exerciseIds?: string[];
}

export class UpdateExerciseGroupDto {
  @ApiPropertyOptional({ description: 'Name of the exercise group' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: WorkoutExerciseGroupTypeEnum })
  @IsOptional()
  @IsEnum(WorkoutExerciseGroupTypeEnum)
  type?: WorkoutExerciseGroupTypeEnum;

  @ApiPropertyOptional({ enum: WorkoutSectionTypeEnum })
  @IsOptional()
  @IsEnum(WorkoutSectionTypeEnum)
  section?: WorkoutSectionTypeEnum;

  @ApiPropertyOptional({ description: 'Sort order index' })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({ description: 'Total rounds through this group' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  rounds?: number;

  @ApiPropertyOptional({ description: 'Rest between exercises in seconds' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600)
  restBetweenExercises?: number;

  @ApiPropertyOptional({ description: 'Rest between rounds in seconds' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1200)
  restBetweenRounds?: number;

  @ApiPropertyOptional({ description: 'Duration in seconds for timed groups' })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @ApiPropertyOptional({ description: 'Coach notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'IDs of WorkoutExercise items in this group', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exerciseIds?: string[];
}
