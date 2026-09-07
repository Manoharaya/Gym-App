import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNotEmpty,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  FitnessCoachCoachingStyle,
  FitnessCoachResponseLength,
  FitnessCoachTrainingFocus,
  AIFeedbackRating,
} from '@fitcore/types';

export class CreateConversationDto {
  @ApiPropertyOptional({ description: 'Optional title for the conversation' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;
}

export class SendMessageDto {
  @ApiProperty({ description: 'The question or training prompt from the member' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({ description: 'Optional specific training topic focus' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  focusTopic?: string;

  @ApiPropertyOptional({ description: 'Explicit authorization to include limited nutrition summary' })
  @IsOptional()
  @IsBoolean()
  includeNutritionContext?: boolean;
}

export class UpdateCoachProfileDto {
  @ApiPropertyOptional({ enum: ['ENCOURAGING', 'DIRECT', 'TECHNICAL', 'BALANCED', 'MOTIVATIONAL'] })
  @IsOptional()
  @IsEnum(['ENCOURAGING', 'DIRECT', 'TECHNICAL', 'BALANCED', 'MOTIVATIONAL'])
  coachingStyle?: FitnessCoachCoachingStyle;

  @ApiPropertyOptional({ enum: ['CONCISE', 'BALANCED', 'DETAILED'] })
  @IsOptional()
  @IsEnum(['CONCISE', 'BALANCED', 'DETAILED'])
  responseLength?: FitnessCoachResponseLength;

  @ApiPropertyOptional({ description: 'Preferred response language code (e.g. en)' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @ApiPropertyOptional({ enum: ['METRIC', 'IMPERIAL'] })
  @IsOptional()
  @IsEnum(['METRIC', 'IMPERIAL'])
  unitPreference?: 'METRIC' | 'IMPERIAL';

  @ApiPropertyOptional({
    enum: ['STRENGTH', 'HYPERTROPHY', 'ENDURANCE', 'GENERAL_FITNESS', 'FAT_LOSS', 'MOBILITY'],
  })
  @IsOptional()
  @IsEnum(['STRENGTH', 'HYPERTROPHY', 'ENDURANCE', 'GENERAL_FITNESS', 'FAT_LOSS', 'MOBILITY'])
  trainingFocus?: FitnessCoachTrainingFocus;

  @ApiPropertyOptional({ description: 'Whether AI Fitness Coach is enabled for member' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class SubmitCoachFeedbackDto {
  @ApiPropertyOptional({ description: 'ID of the specific message rated' })
  @IsOptional()
  @IsString()
  messageId?: string;

  @ApiProperty({ enum: ['HELPFUL', 'NOT_HELPFUL', 'REPORT'] })
  @IsNotEmpty()
  @IsEnum(['HELPFUL', 'NOT_HELPFUL', 'REPORT'])
  rating: AIFeedbackRating;

  @ApiPropertyOptional({ description: 'Feedback category reason' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reason?: string;

  @ApiPropertyOptional({ description: 'Additional comments' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class ConversationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by conversation status' })
  @IsOptional()
  @IsEnum(['ACTIVE', 'ARCHIVED', 'DELETED'])
  status?: 'ACTIVE' | 'ARCHIVED' | 'DELETED';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
