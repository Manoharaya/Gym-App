import { IsString, IsOptional, IsEnum } from 'class-validator';
import { CheckInMethod } from '@fitcore/types';

export class CheckInDto {
  @IsString()
  outletId: string;

  @IsOptional()
  @IsString()
  memberProfileId?: string;

  @IsOptional()
  @IsString()
  credentialReference?: string;

  @IsOptional()
  @IsString()
  credentialId?: string;

  @IsOptional()
  @IsString()
  accessPointId?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  method?: CheckInMethod;

  @IsOptional()
  @IsString()
  deviceEventId?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
