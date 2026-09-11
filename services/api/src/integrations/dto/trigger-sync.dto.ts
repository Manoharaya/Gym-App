import { IsOptional, IsEnum, IsString } from 'class-validator';
import { IntegrationSyncType } from '@fitcore/types';

export class TriggerSyncDto {
  @IsOptional()
  @IsEnum(['INITIAL', 'INCREMENTAL', 'FULL', 'ENTITY', 'RECONCILIATION'])
  syncType?: IntegrationSyncType = 'INCREMENTAL';

  @IsOptional()
  @IsString()
  entityType?: string;
}
