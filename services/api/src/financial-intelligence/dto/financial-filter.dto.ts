import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import {
  FinancialTimeRange,
  FinancialTransactionType,
  FinancialPaymentStatus,
  FinancialInvoiceStatus,
} from '@fitcore/types';

export class FinancialFilterDto {
  @IsOptional()
  @IsString()
  timeRange?: FinancialTimeRange = 'LAST_30_DAYS';

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  transactionType?: FinancialTransactionType;

  @IsOptional()
  @IsString()
  paymentStatus?: FinancialPaymentStatus;

  @IsOptional()
  @IsString()
  invoiceStatus?: FinancialInvoiceStatus;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  memberId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsString()
  search?: string;
}
