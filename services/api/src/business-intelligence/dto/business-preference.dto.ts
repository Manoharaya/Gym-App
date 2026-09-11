import { IsOptional, IsString, IsArray } from 'class-validator';
import { BusinessMetricDomain, BusinessTimeRange } from '@fitcore/types';

export class UpdateBusinessPreferenceDto {
  @IsOptional()
  @IsString()
  defaultOutletId?: string | null;

  @IsOptional()
  @IsString()
  defaultDateRange?: BusinessTimeRange;

  @IsOptional()
  @IsString()
  defaultCurrency?: string;

  @IsOptional()
  @IsArray()
  pinnedKpiKeys?: string[];

  @IsOptional()
  @IsArray()
  enabledDomains?: BusinessMetricDomain[];

  @IsOptional()
  layoutPreferences?: Record<string, any>;

  @IsOptional()
  chartPreferences?: Record<string, any>;
}
