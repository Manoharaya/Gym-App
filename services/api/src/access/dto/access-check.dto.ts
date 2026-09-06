import { IsString, IsOptional, IsUUID } from 'class-validator';

export class AccessCheckDto {
  @IsOptional()
  @IsString()
  memberProfileId?: string;

  @IsString()
  outletId: string;

  @IsOptional()
  @IsString()
  credentialReference?: string;

  @IsOptional()
  @IsString()
  credentialId?: string;

  @IsOptional()
  @IsString()
  accessPointId?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  requestedAt?: string;
}
