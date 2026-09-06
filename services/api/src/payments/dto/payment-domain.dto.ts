import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodType, DiscountType } from '@fitcore/types';

export class InvoiceLineItemDto {
  @ApiProperty({ example: 'Second Wind Monthly Membership' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 11999, description: 'Amount in minor units (e.g. cents: 11999 = $119.99)' })
  @IsNumber()
  @Min(0)
  unitAmountMinor: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 0, description: 'Discount in minor units' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  discountMinor?: number;

  @ApiPropertyOptional({ example: 1200, description: 'Tax in minor units' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  taxMinor?: number;

  @ApiPropertyOptional({ example: 'clx12345678' })
  @IsString()
  @IsOptional()
  membershipPlanId?: string;

  @ApiPropertyOptional({ example: 'clx87654321' })
  @IsString()
  @IsOptional()
  memberMembershipId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateInvoiceDto {
  @ApiProperty({ example: 'mem_prof_123' })
  @IsString()
  @IsNotEmpty()
  memberProfileId: string;

  @ApiPropertyOptional({ example: 'AUD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: '2026-09-30T00:00:00.000Z' })
  @IsOptional()
  dueDate?: Date;

  @ApiPropertyOptional({ example: 'September 2026 dues' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 'WELCOME10' })
  @IsString()
  @IsOptional()
  discountCode?: string;

  @ApiPropertyOptional({ example: 10, description: 'Tax percentage if auto-calculating GST/VAT' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  taxRatePercentage?: number;

  @ApiPropertyOptional({ example: 0, description: 'Additional fees in minor units' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  feeMinor?: number;

  @ApiProperty({ type: [InvoiceLineItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  items: InvoiceLineItemDto[];

  @ApiPropertyOptional({ example: 'idem_key_abc123' })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

export class ProcessPaymentDto {
  @ApiProperty({ example: 'mem_prof_123' })
  @IsString()
  @IsNotEmpty()
  memberProfileId: string;

  @ApiPropertyOptional({ example: 'inv_123' })
  @IsString()
  @IsOptional()
  invoiceId?: string;

  @ApiProperty({ example: 11999, description: 'Amount in minor units (e.g. cents)' })
  @IsNumber()
  @Min(1)
  amountMinor: number;

  @ApiProperty({ example: 'AUD' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiPropertyOptional({ example: 'pm_123' })
  @IsString()
  @IsOptional()
  paymentMethodId?: string;

  @ApiPropertyOptional({ example: 'tok_mock_success' })
  @IsString()
  @IsOptional()
  providerPaymentMethodId?: string;

  @ApiPropertyOptional({ example: 'CARD', enum: ['CARD', 'BANK_TRANSFER', 'MOCK', 'MANUAL_CASH', 'MANUAL_POS', 'MANUAL_OTHER'] })
  @IsString()
  @IsOptional()
  paymentMethodType?: PaymentMethodType;

  @ApiPropertyOptional({ example: 'MOCK' })
  @IsString()
  @IsOptional()
  provider?: string;

  @ApiPropertyOptional({ example: 'Membership renewal payment' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'idem_key_xyz987' })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ProcessManualPaymentDto {
  @ApiProperty({ example: 'mem_prof_123' })
  @IsString()
  @IsNotEmpty()
  memberProfileId: string;

  @ApiProperty({ example: 'inv_123' })
  @IsString()
  @IsNotEmpty()
  invoiceId: string;

  @ApiProperty({ example: 5000, description: 'Amount in minor units' })
  @IsNumber()
  @Min(1)
  amountMinor: number;

  @ApiProperty({ example: 'AUD' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({ example: 'MANUAL_CASH', enum: ['MANUAL_CASH', 'MANUAL_POS', 'MANUAL_OTHER'] })
  @IsString()
  @IsNotEmpty()
  paymentMethodType: PaymentMethodType;

  @ApiPropertyOptional({ example: 'Paid cash at front reception desk' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateRefundDto {
  @ApiProperty({ example: 'tx_123' })
  @IsString()
  @IsNotEmpty()
  paymentTransactionId: string;

  @ApiProperty({ example: 2500, description: 'Refund amount in minor units' })
  @IsNumber()
  @Min(1)
  amountMinor: number;

  @ApiPropertyOptional({ example: 'Customer requested refund after early departure' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class CreatePaymentMethodDto {
  @ApiProperty({ example: 'mem_prof_123' })
  @IsString()
  @IsNotEmpty()
  memberProfileId: string;

  @ApiProperty({ example: 'CARD', enum: ['CARD', 'BANK_TRANSFER', 'MOCK'] })
  @IsString()
  @IsNotEmpty()
  type: PaymentMethodType;

  @ApiProperty({ example: 'MOCK' })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiProperty({ example: 'tok_mock_1234' })
  @IsString()
  @IsNotEmpty()
  providerPaymentMethodId: string;

  @ApiPropertyOptional({ example: 'VISA' })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({ example: '4242' })
  @IsString()
  @IsOptional()
  last4?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(12)
  expiryMonth?: number;

  @ApiPropertyOptional({ example: 2028 })
  @IsNumber()
  @IsOptional()
  @Min(2025)
  expiryYear?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateDiscountDto {
  @ApiProperty({ example: 'SUMMER20' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Summer Special 20% Off' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Discount for all summer recruits' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'PERCENTAGE', enum: ['PERCENTAGE', 'FIXED_AMOUNT'] })
  @IsString()
  @IsNotEmpty()
  type: DiscountType;

  @ApiPropertyOptional({ example: 1000, description: 'Minor units if FIXED_AMOUNT' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  valueMinor?: number;

  @ApiPropertyOptional({ example: 20, description: '1-100 if PERCENTAGE' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  percentage?: number;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  validUntil?: Date;

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  usageLimit?: number;
}

export class VoidInvoiceDto {
  @ApiPropertyOptional({ example: 'Invoice issued in error' })
  @IsString()
  @IsOptional()
  reason?: string;
}
