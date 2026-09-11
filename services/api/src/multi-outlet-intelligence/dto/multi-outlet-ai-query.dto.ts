import { IsOptional, IsString, IsEnum } from 'class-validator';

export class MultiOutletAiQueryDto {
  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsEnum(['en', 'ne'])
  language?: 'en' | 'ne' = 'en';

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  metricFocus?: string;
}
