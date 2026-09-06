import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordTrainerUnavailabilityDto {
  @ApiProperty({ description: 'Trainer User ID' })
  @IsString()
  @IsNotEmpty()
  trainerId: string;

  @ApiProperty({ description: 'Start date of unavailability or specific single date (ISO string)' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'End date of unavailability for multi-day leave (ISO string)' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Reason for unavailability (e.g. SICK_LEAVE, VACATION, PERSONAL, CONFERENCE)' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Optional operational notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
