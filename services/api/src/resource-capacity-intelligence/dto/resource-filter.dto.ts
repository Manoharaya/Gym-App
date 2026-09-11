import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ResourceIntelligenceType, ResourceStatus } from '@fitcore/types';

export class ResourceFilterDto {
  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @IsString()
  trainerId?: string;

  @IsOptional()
  @IsString()
  classSessionId?: string;

  @IsOptional()
  @IsString()
  resourceType?: ResourceIntelligenceType;

  @IsOptional()
  @IsString()
  status?: ResourceStatus;

  @IsOptional()
  @IsString()
  timeRange?: string; // TODAY, LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, etc.

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsString()
  format?: 'json' | 'csv';
}
