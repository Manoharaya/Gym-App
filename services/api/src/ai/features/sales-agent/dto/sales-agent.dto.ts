/**
 * Day 36 — AI Sales Agent REST API DTOs
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsObject,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SalesChannel,
  SalesHandoffReason,
  SalesHandoffPriority,
  SalesStyle,
} from '@fitcore/types';

export class ContactDetailsDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateSalesConversationInputDto {
  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  channel?: SalesChannel;

  @IsOptional()
  @IsString()
  initialMessage?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsObject()
  @Type(() => ContactDetailsDto)
  contactDetails?: ContactDetailsDto;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SalesMessageDto {
  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  channel?: SalesChannel;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SalesHandoffRequestDto {
  @IsNotEmpty()
  @IsString()
  reason: SalesHandoffReason;

  @IsOptional()
  @IsString()
  priority?: SalesHandoffPriority;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  assignedStaffId?: string;
}

export class SalesFeedbackDto {
  @IsNotEmpty()
  @IsEnum(['THUMBS_UP', 'THUMBS_DOWN'])
  rating: 'THUMBS_UP' | 'THUMBS_DOWN';

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class UpdateSalesAgentConfigDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  tone?: string;

  @IsOptional()
  @IsString()
  salesStyle?: SalesStyle;

  @IsOptional()
  @IsString()
  businessDescription?: string;

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsString()
  defaultGreeting?: string;

  @IsOptional()
  @IsBoolean()
  qualificationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  recommendationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  humanHandoffEnabled?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ComparePlansInputDto {
  @IsArray()
  @IsString({ each: true })
  planIds: string[];
}
