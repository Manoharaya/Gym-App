import { IsOptional, IsEnum, IsString } from 'class-validator';
import { IntegrationCategory, IntegrationConnectionStatus, IntegrationScope } from '@fitcore/types';

export class ConnectionFilterDto {
  @IsOptional()
  @IsEnum([
    'PAYMENTS',
    'ACCOUNTING',
    'COMMUNICATION',
    'MESSAGING',
    'EMAIL',
    'SMS',
    'PUSH',
    'WEARABLE',
    'CALENDAR',
    'ACCESS_CONTROL',
    'ANALYTICS',
    'STORAGE',
    'OTHER',
  ])
  category?: IntegrationCategory;

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
  @IsEnum(['ORGANISATION', 'OUTLET', 'MEMBER', 'STAFF'])
  scope?: IntegrationScope;

  @IsOptional()
  @IsString()
  integrationKey?: string;

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  memberId?: string;

  @IsOptional()
  @IsString()
  staffId?: string;
}
