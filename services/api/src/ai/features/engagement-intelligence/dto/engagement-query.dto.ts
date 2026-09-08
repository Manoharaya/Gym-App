import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class EngagementQueryDto {
  @ApiPropertyOptional({ description: 'Specific member ID (for staff/trainer queries)' })
  @IsString()
  @IsOptional()
  memberId?: string;

  @ApiPropertyOptional({ description: 'Specific outlet ID' })
  @IsString()
  @IsOptional()
  outletId?: string;

  @ApiPropertyOptional({ description: 'Bypass cache and force recalculation' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  refresh?: boolean;
}
