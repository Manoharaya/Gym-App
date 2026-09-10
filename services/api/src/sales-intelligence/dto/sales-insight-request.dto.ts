import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SalesFilterDto } from './sales-filter.dto';

export class SalesInsightRequestDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SalesFilterDto)
  filters?: SalesFilterDto;

  @IsOptional()
  @IsString()
  focusArea?: 'OVERVIEW' | 'FUNNEL' | 'SOURCES' | 'FOLLOW_UP' | 'STAFF';

  @IsOptional()
  @IsString()
  query?: string;
}
