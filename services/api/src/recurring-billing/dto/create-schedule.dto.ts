import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsIn,
  IsDateString,
  IsObject,
} from 'class-validator';
import { BillingInterval } from '@fitcore/types';

export class CreateBillingScheduleDtoInput {
  @IsString()
  @IsNotEmpty()
  memberProfileId: string;

  @IsString()
  @IsNotEmpty()
  memberMembershipId: string;

  @IsString()
  @IsNotEmpty()
  membershipPlanId: string;

  @IsString()
  @IsOptional()
  originOutletId?: string;

  @IsString()
  @IsOptional()
  currency?: string;

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
  billingInterval: BillingInterval;

  @IsInt()
  @Min(1)
  @IsOptional()
  intervalCount?: number;

  @IsInt()
  @Min(0)
  amountMinor: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  paymentMethodId?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
