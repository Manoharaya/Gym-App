import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsIn,
  IsDateString,
  IsObject,
} from 'class-validator';
import { BillingInterval } from '@fitcore/types';

export class UpdateBillingScheduleDtoInput {
  @IsString()
  @IsIn([
    'WEEKLY',
    'BIWEEKLY',
    'MONTHLY',
    'QUARTERLY',
    'SEMI_ANNUALLY',
    'ANNUALLY',
    'CUSTOM',
  ])
  @IsOptional()
  billingInterval?: BillingInterval;

  @IsInt()
  @Min(1)
  @IsOptional()
  intervalCount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  amountMinor?: number;

  @IsString()
  @IsOptional()
  paymentMethodId?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
