import { IsOptional, IsEnum, IsObject } from 'class-validator';
import { IntegrationEnvironment, IntegrationConnectionStatus } from '@fitcore/types';

export class UpdateConnectionDto {
  @IsOptional()
  @IsEnum(['DEVELOPMENT', 'STAGING', 'PRODUCTION'])
  environment?: IntegrationEnvironment;

  @IsOptional()
  @IsEnum([
    'PENDING',
    'CONNECTING',
    'CONNECTED',
    'SYNCING',
    'DEGRADED',
    'AUTHENTICATION_REQUIRED',
    'ERROR',
    'DISCONNECTED',
    'REVOKED',
    'SUSPENDED',
  ])
  status?: IntegrationConnectionStatus;

  @IsOptional()
  @IsObject()
  credentials?: Record<string, any>;

  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;
}
