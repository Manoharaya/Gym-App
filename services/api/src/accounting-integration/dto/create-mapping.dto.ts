/**
 * FitCore — Day 43: Create & Update Accounting Mapping DTOs
 */

import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateAccountingMappingDto {
  @IsString()
  @IsNotEmpty()
  @IsIn([
    'REVENUE_ACCOUNT',
    'RETAIL_REVENUE_ACCOUNT',
    'MEMBERSHIP_REVENUE_ACCOUNT',
    'PERSONAL_TRAINING_REVENUE_ACCOUNT',
    'CLASS_REVENUE_ACCOUNT',
    'OTHER_REVENUE_ACCOUNT',
    'TAX_RATE',
    'PAYMENT_ACCOUNT',
    'REFUND_ACCOUNT',
  ])
  mappingType: any;

  @IsString()
  @IsNotEmpty()
  fitcoreReference: string;

  @IsString()
  @IsNotEmpty()
  externalReference: string;

  @IsString()
  @IsOptional()
  externalName?: string;

  @IsString()
  @IsOptional()
  outletId?: string;
}

export class UpdateAccountingMappingDto {
  @IsString()
  @IsOptional()
  externalReference?: string;

  @IsString()
  @IsOptional()
  externalName?: string;

  @IsString()
  @IsOptional()
  status?: string;
}

export class CreateAccountingTaxMappingDto {
  @IsString()
  @IsNotEmpty()
  fitcoreTaxIdentifier: string;

  @IsString()
  @IsNotEmpty()
  externalTaxIdentifier: string;

  @IsOptional()
  externalTaxRate?: number;
}
