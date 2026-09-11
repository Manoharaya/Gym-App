import { IsOptional, IsString, IsEnum } from 'class-validator';
import { BusinessMetricDomain, BusinessTimeRange } from '@fitcore/types';

export class BusinessAiQueryDto {
  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsString()
  focusDomain?: BusinessMetricDomain;

  @IsOptional()
  @IsEnum(['en', 'ne'])
  language?: 'en' | 'ne' = 'en';

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  timeRange?: BusinessTimeRange = 'LAST_30_DAYS';

  @IsOptional()
  @IsString()
  currency?: string;
}
