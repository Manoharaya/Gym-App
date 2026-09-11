import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import {
  BusinessTimeRange,
  BusinessComparisonType,
  BusinessTrendInterval,
} from '@fitcore/types';

export class BusinessFilterDto {
  @IsOptional()
  @IsString()
  organisationId?: string;

  @IsOptional()
  @IsString()
  outletId?: string;

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
  @IsString()
  membershipPlanId?: string;

  @IsOptional()
  @IsString()
  salesSourceId?: string;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsString()
  trainerId?: string;

  @IsOptional()
  @IsString()
  classTypeId?: string;

  @IsOptional()
  @IsEnum(['DAILY', 'WEEKLY', 'MONTHLY'])
  interval?: BusinessTrendInterval = 'DAILY';

  @IsOptional()
  @IsString()
  metricKey?: string;

  @IsOptional()
  @IsString()
  domain?: string;
}
