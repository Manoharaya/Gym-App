import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsBoolean, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { HealthDataType, HealthUnit, WearableSyncType } from '@fitcore/types';

export class IngestHealthRecordDto {
  @ApiPropertyOptional({ enum: ['STEPS', 'DISTANCE', 'ACTIVE_CALORIES', 'HEART_RATE', 'RESTING_HEART_RATE', 'SLEEP', 'WORKOUT', 'WEIGHT'] })
  dataType: HealthDataType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceRecordId?: string;

  @ApiPropertyOptional()
  startTime: string;

  @ApiPropertyOptional()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional()
  value: number;

  @ApiPropertyOptional()
  unit: HealthUnit;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceDevice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class SyncRequestDto {
  @ApiPropertyOptional({
    description: 'Type of synchronization to perform',
    enum: ['INITIAL', 'INCREMENTAL', 'RETRY', 'MANUAL'],
    default: 'INCREMENTAL',
  })
  @IsOptional()
  @IsEnum(['INITIAL', 'INCREMENTAL', 'RETRY', 'MANUAL'])
  syncType?: WearableSyncType;

  @ApiPropertyOptional({
    description: 'Force a full synchronization window ignoring lastSuccessfulSyncAt',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  forceFullSync?: boolean;

  @ApiPropertyOptional({
    description: 'Optional sync window start (ISO 8601 UTC)',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Optional sync window end (ISO 8601 UTC)',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Batch of client-read records forwarded by native SDK (HealthKit / Health Connect)',
    type: [IngestHealthRecordDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngestHealthRecordDto)
  records?: IngestHealthRecordDto[];
}
