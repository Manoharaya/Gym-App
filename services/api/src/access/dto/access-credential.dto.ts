import { IsString, IsOptional, IsEnum } from 'class-validator';
import { CredentialType } from '@fitcore/types';

export class CreateAccessCredentialDto {
  @IsString()
  memberProfileId: string;

  @IsString()
  type: CredentialType;

  @IsOptional()
  @IsString()
  displayIdentifier?: string;

  @IsOptional()
  @IsString()
  credentialReference?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class DynamicQRRequestDto {
  @IsOptional()
  @IsString()
  outletId?: string;
}
