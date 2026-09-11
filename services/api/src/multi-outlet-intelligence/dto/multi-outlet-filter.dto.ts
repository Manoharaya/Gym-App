import { IsOptional, IsString, IsEnum, IsDateString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  BusinessTimeRange,
  BusinessComparisonType,
  BusinessTrendInterval,
  OutletNormalisationMode,
  BusinessMetricDomain,
} from '@fitcore/types';

export class MultiOutletFilterDto {
  @IsOptional()
  @IsString()
  organisationId?: string;

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  outletIds?: string; // Comma-separated or single

  @IsOptional()
  @IsEnum([
    'TODAY',
    'YESTERDAY',
    'LAST_7_DAYS',
    'LAST_30_DAYS',
    'THIS_MONTH',
    'LAST_MONTH',
    'THIS_QUARTER',
    'LAST_QUARTER',
    'THIS_YEAR',
    'LAST_YEAR',
    'CUSTOM',
  ])
  timeRange?: BusinessTimeRange = 'LAST_30_DAYS';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['PREVIOUS_PERIOD', 'YEAR_OVER_YEAR', 'QUARTER_OVER_QUARTER', 'MONTH_OVER_MONTH', 'CUSTOM'])
  comparisonType?: BusinessComparisonType = 'PREVIOUS_PERIOD';

  @IsOptional()
  @IsDateString()
  comparisonStartDate?: string;

  @IsOptional()
  @IsDateString()
  comparisonEndDate?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(['ABSOLUTE', 'PER_ACTIVE_MEMBER', 'PER_LEAD', 'PER_SESSION', 'PERCENTAGE', 'GROWTH_VS_BASELINE'])
  normalisation?: OutletNormalisationMode = 'PER_ACTIVE_MEMBER';

  @IsOptional()
  @IsEnum(['MEMBERSHIP', 'SALES', 'FINANCE', 'ATTENDANCE', 'BOOKINGS', 'TRAINING', 'NUTRITION', 'CHECK_INS', 'WEARABLES', 'ENGAGEMENT', 'RETENTION', 'COMMUNICATION', 'AI'])
  domain?: BusinessMetricDomain;

  @IsOptional()
  @IsString()
  metricKey?: string;

  @IsOptional()
  @IsEnum(['DAILY', 'WEEKLY', 'MONTHLY'])
  interval?: BusinessTrendInterval = 'DAILY';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minimumSample?: number = 5;
}
