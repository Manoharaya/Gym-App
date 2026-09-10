import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { DunningResolutionType } from '@fitcore/types';

export class ResolveDunningInputDto {
  @IsString()
  @IsNotEmpty()
  @IsIn([
    'PAYMENT_RECOVERED',
    'PAYMENT_METHOD_UPDATED',
    'MANUAL_PAYMENT',
    'INVOICE_VOIDED',
    'INVOICE_ADJUSTED',
    'MEMBERSHIP_CANCELLED',
    'STAFF_RESOLVED',
    'CUSTOMER_DISPUTE',
    'OTHER',
  ])
  resolutionType: DunningResolutionType;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AssignStaffTaskInputDto {
  @IsString()
  @IsNotEmpty()
  assignedStaffId: string;
}
