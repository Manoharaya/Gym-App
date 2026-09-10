/**
 * FitCore — Day 43: Trigger Sync & Resolve Conflict DTOs
 */

import { IsString, IsNotEmpty, IsOptional, IsIn, IsDateString } from 'class-validator';

export class TriggerSyncDto {
  @IsString()
  @IsOptional()
  @IsIn([
    'INITIAL_SYNC',
    'INVOICE_SYNC',
    'PAYMENT_SYNC',
    'REFUND_SYNC',
    'CONTACT_SYNC',
    'FULL_SYNC',
    'INCREMENTAL_SYNC',
    'RECONCILIATION',
  ])
  syncType?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}

export class ResolveConflictDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['RESOLVED', 'IGNORED'])
  status: 'RESOLVED' | 'IGNORED';

  @IsString()
  @IsNotEmpty()
  resolutionNotes: string;
}

export class RunReconciliationDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
