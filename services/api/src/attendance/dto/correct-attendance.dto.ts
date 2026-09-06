import { IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AttendanceStatusEnum {
  EXPECTED = 'EXPECTED',
  CHECKED_IN = 'CHECKED_IN',
  LATE = 'LATE',
  LEFT_EARLY = 'LEFT_EARLY',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
  CANCELLED = 'CANCELLED',
  EXCUSED = 'EXCUSED',
  WALK_IN = 'WALK_IN',
}

export class CorrectAttendanceDto {
  @ApiProperty({ enum: AttendanceStatusEnum, description: 'Corrected attendance status' })
  @IsEnum(AttendanceStatusEnum)
  @IsNotEmpty()
  status: AttendanceStatusEnum;

  @ApiProperty({ description: 'Mandatory justification for attendance correction' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ description: 'Adjusted check-in timestamp in ISO 8601 format' })
  @IsISO8601()
  @IsOptional()
  checkedInAt?: string;

  @ApiPropertyOptional({ description: 'Adjusted check-out timestamp in ISO 8601 format' })
  @IsISO8601()
  @IsOptional()
  checkedOutAt?: string;

  @ApiPropertyOptional({ description: 'Additional staff notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
