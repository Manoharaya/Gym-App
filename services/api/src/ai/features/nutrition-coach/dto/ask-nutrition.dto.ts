import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import type {
  NutritionCoachCoachingStyle,
  NutritionCoachResponseLength,
} from '@fitcore/types';

export class CreateNutritionConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;
}

export class AskNutritionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;

  @IsOptional()
  @IsBoolean()
  includeTrainingContext?: boolean;

  @IsOptional()
  @IsString()
  conversationId?: string;
}

export class UpdateNutritionCoachProfileDto {
  @IsOptional()
  @IsEnum(['SUPPORTIVE', 'CONCISE', 'EDUCATIONAL', 'MOTIVATIONAL', 'PRACTICAL'])
  coachingStyle?: NutritionCoachCoachingStyle;

  @IsOptional()
  @IsEnum(['CONCISE', 'BALANCED', 'DETAILED'])
  responseLength?: NutritionCoachResponseLength;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsEnum(['METRIC', 'IMPERIAL'])
  unitPreference?: 'METRIC' | 'IMPERIAL';

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class NutritionConversationQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  status?: string;
}

export class ParseFoodLogDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  text!: string;

  @IsOptional()
  @IsString()
  mealType?: string;

  @IsOptional()
  @IsString()
  consumedAt?: string;
}
