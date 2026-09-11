import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject } from 'class-validator';
import { IntegrationEnvironment, IntegrationScope } from '@fitcore/types';

export class CreateConnectionDto {
  @IsString()
  @IsNotEmpty()
  integrationKey!: string;

  @IsOptional()
  @IsEnum(['ORGANISATION', 'OUTLET', 'MEMBER', 'STAFF'])
  scope?: IntegrationScope;

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  memberId?: string;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsEnum(['DEVELOPMENT', 'STAGING', 'PRODUCTION'])
  environment?: IntegrationEnvironment;

  @IsOptional()
  @IsObject()
  credentials?: Record<string, any>;

  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;
}
