import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AssignStaffOutletDto {
  @IsString()
  @IsNotEmpty()
  staffProfileId!: string;

  @IsString()
  @IsNotEmpty()
  outletId!: string;

  @IsString()
  @IsOptional()
  roleScope?: string;

  @IsEnum(['PRIMARY', 'SECONDARY', 'TEMPORARY', 'REGIONAL'])
  @IsOptional()
  assignmentType?: 'PRIMARY' | 'SECONDARY' | 'TEMPORARY' | 'REGIONAL' = 'PRIMARY';

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean = false;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}

export class TransferStaffDto {
  @IsString()
  @IsNotEmpty()
  staffProfileId!: string;

  @IsString()
  @IsNotEmpty()
  fromOutletId!: string;

  @IsString()
  @IsNotEmpty()
  toOutletId!: string;

  @IsString()
  @IsOptional()
  newRoleScope?: string;

  @IsString()
  @IsOptional()
  transferReason?: string;

  @IsBoolean()
  @IsOptional()
  retainSecondaryAccess?: boolean = false;
}
