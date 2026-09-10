/**
 * FitCore — Day 44: AI Finance Assistant DTOs
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  FinanceIntent,
  FinanceFeedbackRating,
} from '@fitcore/types';

export class FinanceChatDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsString()
  @IsOptional()
  conversationId?: string;

  @IsString()
  @IsOptional()
  organisationId?: string;

  @IsString()
  @IsOptional()
  outletId?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  language?: 'en' | 'ne';
}

export class SubmitFinanceFeedbackDto {
  @IsString()
  @IsOptional()
  conversationId?: string;

  @IsString()
  @IsOptional()
  messageId?: string;

  @IsEnum([
    'HELPFUL',
    'NOT_HELPFUL',
    'INACCURATE',
    'MISSING_INFO',
    'WRONG_CALCULATION',
    'WRONG_INTERPRETATION',
    'PERMISSION_CONCERN',
  ])
  rating: FinanceFeedbackRating;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  accuracyScore?: number;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
  @IsOptional()
  userComments?: string;
}

export class FinanceFilterQueryDto {
  @IsString()
  @IsOptional()
  outletId?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  timeRange?: string;

  @IsString()
  @IsOptional()
  metric?: string;
}
