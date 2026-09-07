import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ProgressionTypeEnum {
  LINEAR_LOAD = 'LINEAR_LOAD',
  REP_PROGRESSION = 'REP_PROGRESSION',
  SET_PROGRESSION = 'SET_PROGRESSION',
  TIME_PROGRESSION = 'TIME_PROGRESSION',
  DISTANCE_PROGRESSION = 'DISTANCE_PROGRESSION',
  RPE_PROGRESSION = 'RPE_PROGRESSION',
  CUSTOM = 'CUSTOM',
}

export class CreateProgressionRuleDto {
  @ApiPropertyOptional({ description: 'Training plan ID this progression rule applies to' })
  @IsOptional()
  @IsString()
  trainingPlanId?: string;

  @ApiPropertyOptional({ description: 'Workout template ID this progression rule applies to' })
  @IsOptional()
  @IsString()
  workoutTemplateId?: string;

  @ApiPropertyOptional({ description: 'Target exercise ID (optional: if null, applies to whole template/plan)' })
  @IsOptional()
  @IsString()
  exerciseId?: string;

  @ApiProperty({ enum: ProgressionTypeEnum, default: ProgressionTypeEnum.LINEAR_LOAD })
  @IsEnum(ProgressionTypeEnum)
  progressionType!: ProgressionTypeEnum;

  @ApiProperty({
    description: 'Structured configuration (e.g. { loadIncrementKg: 2.5, frequencyWeeks: 1 })',
    example: { loadIncrementKg: 2.5, frequencyWeeks: 1, targetReps: 5 },
  })
  @IsObject()
  @IsNotEmpty()
  configuration!: Record<string, any>;

  @ApiPropertyOptional({ description: 'Coaching notes on this progression model' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Whether rule is actively applied', default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}

export class UpdateProgressionRuleDto {
  @ApiPropertyOptional({ enum: ProgressionTypeEnum })
  @IsOptional()
  @IsEnum(ProgressionTypeEnum)
  progressionType?: ProgressionTypeEnum;

  @ApiPropertyOptional({ description: 'Structured configuration' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Coaching notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Whether rule is active' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
