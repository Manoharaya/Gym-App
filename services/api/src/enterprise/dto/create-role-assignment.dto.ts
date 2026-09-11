import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoleAssignmentDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  roleName!: string;

  @IsEnum(['PLATFORM', 'ORGANISATION', 'BRAND', 'REGION', 'OUTLET'])
  scopeType!: 'PLATFORM' | 'ORGANISATION' | 'BRAND' | 'REGION' | 'OUTLET';

  @IsString()
  @IsOptional()
  scopeId?: string;

  @IsString()
  @IsOptional()
  brandId?: string;

  @IsString()
  @IsOptional()
  outletId?: string;

  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @IsDateString()
  @IsOptional()
  validTo?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class UpdateRoleAssignmentDto {
  @IsEnum(['ACTIVE', 'SCHEDULED', 'EXPIRED', 'REVOKED'])
  @IsOptional()
  status?: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'REVOKED';

  @IsDateString()
  @IsOptional()
  validTo?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
