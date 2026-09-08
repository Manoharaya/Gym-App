import { IsBoolean, IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDailyCheckInSettingsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  checkInEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;

  @ApiPropertyOptional({ example: '08:30', description: 'HH:mm format' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'reminderTime must be formatted as HH:mm' })
  reminderTime?: string;

  @ApiPropertyOptional({ enum: ['NONE', 'SUMMARIZED', 'FULL'], example: 'SUMMARIZED' })
  @IsOptional()
  @IsEnum(['NONE', 'SUMMARIZED', 'FULL'])
  trainerVisibility?: 'NONE' | 'SUMMARIZED' | 'FULL';
}

export class DailyCheckInSettingsResponseDto {
  @ApiProperty({ example: 'dci_set_123' })
  id: string;

  @ApiProperty({ example: 'org_123' })
  organisationId: string;

  @ApiPropertyOptional({ example: 'mem_123' })
  memberId?: string | null;

  @ApiProperty({ example: true })
  checkInEnabled: boolean;

  @ApiProperty({ example: true })
  reminderEnabled: boolean;

  @ApiProperty({ example: '08:00' })
  reminderTime: string;

  @ApiProperty({ example: 'SUMMARIZED' })
  trainerVisibility: 'NONE' | 'SUMMARIZED' | 'FULL';

  @ApiPropertyOptional()
  availableQuestions?: Record<string, boolean>;
}
