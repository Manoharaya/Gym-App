import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppEngagementEventType } from '@fitcore/types';

export class RecordAppEngagementEventDto {
  @ApiProperty({
    description: 'Intentional event type from standard taxonomy',
    example: 'WORKOUT_COMPLETED',
  })
  @IsString()
  @IsNotEmpty()
  eventType!: AppEngagementEventType;

  @ApiPropertyOptional({ description: 'Outlet ID if relevant' })
  @IsString()
  @IsOptional()
  outletId?: string;

  @ApiPropertyOptional({ description: 'Non-sensitive event metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Idempotency key' })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @ApiPropertyOptional({ description: 'Timestamp of occurrence' })
  @IsString()
  @IsOptional()
  occurredAt?: string;
}
