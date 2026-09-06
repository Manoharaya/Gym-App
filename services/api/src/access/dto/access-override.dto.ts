import { IsString, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { AccessOverrideReason } from '@fitcore/types';

export class CreateAccessOverrideDto {
  @IsString()
  memberProfileId: string;

  @IsString()
  outletId: string;

  @IsString()
  reason: AccessOverrideReason;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  durationHours?: number = 4;

  @IsOptional()
  @IsString()
  notes?: string;
}
