import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DailyCheckInStatus,
  DailyReadinessCategory,
  EnergyLevel,
  SorenessLevel,
} from '../domain/daily-checkin.enums';

export class DailyCheckInHistoryItemDto {
  @ApiProperty({ example: 'dci_123' })
  id: string;

  @ApiProperty({ example: '2026-09-07' })
  checkInDate: string;

  @ApiProperty({ enum: DailyCheckInStatus, example: DailyCheckInStatus.COMPLETED })
  status: DailyCheckInStatus;

  @ApiPropertyOptional({ example: 85 })
  readinessScore?: number | null;

  @ApiPropertyOptional({ enum: DailyReadinessCategory })
  readinessCategory?: DailyReadinessCategory | null;

  @ApiPropertyOptional({ enum: EnergyLevel })
  energyLevel?: EnergyLevel | null;

  @ApiPropertyOptional({ enum: SorenessLevel })
  sorenessLevel?: SorenessLevel | null;

  @ApiPropertyOptional({ example: '2026-09-07T08:00:00.000Z' })
  completedAt?: string | null;

  @ApiPropertyOptional({ example: 'Stay consistent with scheduled training' })
  todayFocus?: string | null;

  @ApiProperty({ example: false })
  safetyFlagged: boolean;
}

export class DailyCheckInHistoryResponseDto {
  @ApiProperty({ type: [DailyCheckInHistoryItemDto] })
  items: DailyCheckInHistoryItemDto[];

  @ApiProperty({ example: 14 })
  total: number;

  @ApiPropertyOptional({ example: ['TRAINING_CONSISTENCY_IMPROVING'] })
  detectedTrends?: string[];
}
