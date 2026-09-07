import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum MeasurementTypeEnum {
  WEIGHT = 'WEIGHT',
  HEIGHT = 'HEIGHT',
  BODY_FAT_PERCENT = 'BODY_FAT_PERCENT',
  BMI = 'BMI',
  CHEST = 'CHEST',
  WAIST = 'WAIST',
  HIPS = 'HIPS',
  NECK = 'NECK',
  LEFT_ARM = 'LEFT_ARM',
  RIGHT_ARM = 'RIGHT_ARM',
  LEFT_THIGH = 'LEFT_THIGH',
  RIGHT_THIGH = 'RIGHT_THIGH',
  LEFT_CALF = 'LEFT_CALF',
  RIGHT_CALF = 'RIGHT_CALF',
  SHOULDERS = 'SHOULDERS',
  CUSTOM = 'CUSTOM',
}

export enum MeasurementSourceEnum {
  MEMBER = 'MEMBER',
  TRAINER = 'TRAINER',
  STAFF = 'STAFF',
  SYSTEM = 'SYSTEM',
  ASSESSMENT = 'ASSESSMENT',
  WORKOUT = 'WORKOUT',
  IMPORT = 'IMPORT',
}

export class RecordBodyMeasurementDto {
  @IsEnum(MeasurementTypeEnum)
  measurementType!: MeasurementTypeEnum;

  @IsNumber()
  @Min(0.01)
  value!: number;

  @IsString()
  unit!: string;

  @IsOptional()
  @IsDateString()
  recordedAt?: string;

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsEnum(MeasurementSourceEnum)
  source?: MeasurementSourceEnum;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryMeasurementsDto {
  @IsOptional()
  @IsString()
  measurementType?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

export enum AssessmentCategoryEnum {
  STRENGTH = 'STRENGTH',
  ENDURANCE = 'ENDURANCE',
  CARDIO = 'CARDIO',
  MOBILITY = 'MOBILITY',
  FLEXIBILITY = 'FLEXIBILITY',
  BALANCE = 'BALANCE',
  BODY_COMPOSITION = 'BODY_COMPOSITION',
  FUNCTIONAL = 'FUNCTIONAL',
  CUSTOM = 'CUSTOM',
}

export enum AssessmentMetricTypeEnum {
  REPETITIONS = 'REPETITIONS',
  WEIGHT = 'WEIGHT',
  TIME = 'TIME',
  DISTANCE = 'DISTANCE',
  SCORE = 'SCORE',
  RATING = 'RATING',
  PERCENTAGE = 'PERCENTAGE',
  BOOLEAN = 'BOOLEAN',
  TEXT = 'TEXT',
  CUSTOM = 'CUSTOM',
}

export class CreateAssessmentTemplateDto {
  @IsString()
  name!: string;

  @IsEnum(AssessmentCategoryEnum)
  category!: AssessmentCategoryEnum;

  @IsEnum(AssessmentMetricTypeEnum)
  metricType!: AssessmentMetricTypeEnum;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  defaultUnit?: string;

  @IsOptional()
  @IsString()
  scoringProtocol?: string;

  @IsOptional()
  @IsString()
  targetGender?: string;

  @IsOptional()
  @IsString()
  targetAgeRange?: string;
}

export class RecordAssessmentResultItemDto {
  @IsString()
  metricName!: string;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  textValue?: string;

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsNumber()
  repetitions?: number;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsNumber()
  distance?: number;

  @IsOptional()
  @IsNumber()
  durationSeconds?: number;

  @IsOptional()
  @IsNumber()
  percentage?: number;

  @IsOptional()
  @IsBoolean()
  booleanResult?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateAssessmentDto {
  @IsOptional()
  @IsString()
  templateId?: string;

  @IsString()
  title!: string;

  @IsEnum(AssessmentCategoryEnum)
  category!: AssessmentCategoryEnum;

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  trainerProfileId?: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  summaryScore?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecordAssessmentResultItemDto)
  results?: RecordAssessmentResultItemDto[];
}

export class QueryTimeRangeDto {
  @IsOptional()
  @IsString()
  period?: string; // 7D, 14D, 30D, 90D, 6M, 1Y, ALL, CUSTOM

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CompareProgressDto {
  @IsOptional()
  @IsString()
  period?: string; // 7D, 30D, 90D

  @IsOptional()
  @IsDateString()
  primaryStart?: string;

  @IsOptional()
  @IsDateString()
  primaryEnd?: string;

  @IsOptional()
  @IsDateString()
  comparisonStart?: string;

  @IsOptional()
  @IsDateString()
  comparisonEnd?: string;
}
