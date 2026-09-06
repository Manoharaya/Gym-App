import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsArray,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRecurringScheduleDto {
  @ApiProperty({ description: 'Outlet ID hosting the recurring schedule' })
  @IsString()
  @IsNotEmpty()
  outletId: string;

  @ApiProperty({ description: 'Class Template ID' })
  @IsString()
  @IsNotEmpty()
  classTemplateId: string;

  @ApiPropertyOptional({ description: 'Assigned Trainer ID' })
  @IsString()
  @IsOptional()
  trainerId?: string;

  @ApiPropertyOptional({ description: 'Assigned Resource / Studio Room ID' })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @ApiPropertyOptional({
    description: 'Recurrence frequency',
    enum: ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'],
    default: 'WEEKLY',
  })
  @IsString()
  @IsOptional()
  @IsIn(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'])
  frequency?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

  @ApiProperty({ description: 'Primary day of week (0=Sunday, 1=Monday, ..., 6=Saturday)', minimum: 0, maximum: 6 })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiPropertyOptional({ description: 'Selected weekdays (e.g. [1, 3, 5] for Mon/Wed/Fri)', type: [Number] })
  @IsArray()
  @IsOptional()
  daysOfWeek?: number[];

  @ApiProperty({ description: 'Local start time in 24h format (e.g. "06:30" or "18:00")', example: '09:00' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiPropertyOptional({ description: 'Duration in minutes', default: 60 })
  @IsInt()
  @Min(15)
  @Max(360)
  @IsOptional()
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Custom session capacity (overrides template default)' })
  @IsInt()
  @Min(1)
  @IsOptional()
  customCapacity?: number;

  @ApiProperty({ description: 'Start date of the recurrence schedule (ISO date string)' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'End date of the recurrence schedule (ISO date string)' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Local IANA timezone', default: 'Australia/Perth' })
  @IsString()
  @IsOptional()
  timezone?: string;
}

export class UpdateRecurringScheduleDto {
  @ApiPropertyOptional({ description: 'Assigned Trainer ID' })
  @IsString()
  @IsOptional()
  trainerId?: string;

  @ApiPropertyOptional({ description: 'Assigned Resource / Studio Room ID' })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @ApiPropertyOptional({ enum: ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'] })
  @IsString()
  @IsOptional()
  @IsIn(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'])
  frequency?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

  @ApiPropertyOptional({ description: 'Primary day of week', minimum: 0, maximum: 6 })
  @IsInt()
  @Min(0)
  @Max(6)
  @IsOptional()
  dayOfWeek?: number;

  @ApiPropertyOptional({ type: [Number] })
  @IsArray()
  @IsOptional()
  daysOfWeek?: number[];

  @ApiPropertyOptional({ description: 'Local start time in 24h format', example: '18:00' })
  @IsString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  @IsInt()
  @Min(15)
  @Max(360)
  @IsOptional()
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Custom capacity' })
  @IsInt()
  @Min(1)
  @IsOptional()
  customCapacity?: number;

  @ApiPropertyOptional({ description: 'End date (ISO date string)' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Active status of recurring schedule' })
  @IsOptional()
  isActive?: boolean;
}

export class GenerateScheduleSessionsDto {
  @ApiProperty({ description: 'Start date for session generation (ISO string)' })
  @IsDateString()
  fromDate: string;

  @ApiProperty({ description: 'End date for session generation (ISO string)' })
  @IsDateString()
  toDate: string;
}
