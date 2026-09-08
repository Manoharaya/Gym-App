import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { HealthDataType, WearableProviderType } from '@fitcore/types';

export class QueryHealthDataDto {
  @ApiPropertyOptional({
    description: 'Filter by health metric type',
    enum: [
      'STEPS',
      'DISTANCE',
      'ACTIVE_CALORIES',
      'TOTAL_CALORIES',
      'HEART_RATE',
      'RESTING_HEART_RATE',
      'HEART_RATE_VARIABILITY',
      'SLEEP',
      'SLEEP_DURATION',
      'WEIGHT',
      'BODY_FAT',
      'WORKOUT',
    ],
  })
  @IsOptional()
  @IsEnum([
    'STEPS',
    'DISTANCE',
    'ACTIVE_CALORIES',
    'TOTAL_CALORIES',
    'HEART_RATE',
    'RESTING_HEART_RATE',
    'HEART_RATE_VARIABILITY',
    'SLEEP',
    'SLEEP_DURATION',
    'WEIGHT',
    'BODY_FAT',
    'WORKOUT',
  ])
  dataType?: HealthDataType;

  @ApiPropertyOptional({
    description: 'Filter by provider',
    enum: ['APPLE_HEALTH', 'GOOGLE_HEALTH_CONNECT', 'FITBIT'],
  })
  @IsOptional()
  @IsEnum(['APPLE_HEALTH', 'GOOGLE_HEALTH_CONNECT', 'FITBIT'])
  provider?: WearableProviderType;

  @ApiPropertyOptional({
    description: 'Filter records recorded on or after this ISO date',
    example: '2026-09-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter records recorded on or before this ISO date',
    example: '2026-09-07T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Page size for pagination',
    default: 50,
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
