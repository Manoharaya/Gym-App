/**
 * Day 32 — AI Receptionist Booking DTOs
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BookingConfirmationAction } from '@fitcore/types';

export class ClassAvailabilityQueryRequestDto {
  @IsString()
  @IsOptional()
  outletId?: string;

  @IsString()
  @IsOptional()
  className?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsEnum(['MORNING', 'AFTERNOON', 'EVENING'])
  @IsOptional()
  timeRange?: 'MORNING' | 'AFTERNOON' | 'EVENING';

  @IsString()
  @IsOptional()
  trainerName?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeWaitlistOnly?: boolean;
}

export class CreateConfirmationRequestDto {
  @IsEnum(['CREATE_BOOKING', 'CANCEL_BOOKING', 'RESCHEDULE_BOOKING', 'JOIN_WAITLIST'])
  @IsNotEmpty()
  action!: BookingConfirmationAction;

  @IsString()
  @IsNotEmpty()
  classSessionId!: string;

  @IsString()
  @IsOptional()
  conversationId?: string;

  @IsString()
  @IsOptional()
  existingBookingId?: string;

  @IsString()
  @IsOptional()
  outletId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(60)
  @Type(() => Number)
  ttlMinutes?: number;
}

export class ExecuteConfirmationRequestDto {
  @IsString()
  @IsNotEmpty()
  confirmationToken!: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

export class CancelBookingRequestDto {
  @IsString()
  @IsNotEmpty()
  confirmationToken!: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class RescheduleBookingRequestDto {
  @IsString()
  @IsNotEmpty()
  confirmationToken!: string;
}

export class JoinWaitlistRequestDto {
  @IsString()
  @IsNotEmpty()
  confirmationToken!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class DryRunBookingRequestDto {
  @IsString()
  @IsNotEmpty()
  classSessionId!: string;

  @IsString()
  @IsOptional()
  memberProfileId?: string;
}
