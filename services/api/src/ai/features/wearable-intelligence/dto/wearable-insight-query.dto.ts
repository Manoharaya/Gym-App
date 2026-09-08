import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class WearableInsightQueryDto {
  @ApiPropertyOptional({
    description: 'Optional natural language question (e.g. How has my recovery been recently?)',
  })
  @IsOptional()
  @IsString()
  prompt?: string;

  @ApiPropertyOptional({ description: 'Start date YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Preferred response language (en, ne)', default: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Bypass cache and force recalculation', default: false })
  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;
}
