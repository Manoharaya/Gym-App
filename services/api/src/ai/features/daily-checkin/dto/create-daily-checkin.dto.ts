import { IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDailyCheckInDto {
  @ApiPropertyOptional({
    description: 'Local check-in calendar date in YYYY-MM-DD format (defaults to current date)',
    example: '2026-09-07',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be formatted as YYYY-MM-DD' })
  date?: string;

  @ApiPropertyOptional({
    description: 'Member local timezone (e.g. Australia/Perth, Asia/Kathmandu)',
    example: 'Australia/Perth',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}
