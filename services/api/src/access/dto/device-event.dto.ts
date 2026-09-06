import { IsString, IsOptional } from 'class-validator';
import { DeviceType, DeviceDirection, AccessEventType } from '@fitcore/types';

export class RegisterAccessDeviceDto {
  @IsString()
  outletId: string;

  @IsOptional()
  @IsString()
  accessPointId?: string;

  @IsString()
  name: string;

  @IsString()
  type: DeviceType;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  providerDeviceId?: string;

  @IsOptional()
  @IsString()
  direction?: DeviceDirection;

  @IsOptional()
  @IsString()
  location?: string;
}

export class DeviceEventDto {
  @IsString()
  deviceId: string;

  @IsString()
  deviceEventId: string;

  @IsString()
  eventType: AccessEventType;

  @IsOptional()
  @IsString()
  credentialReference?: string;

  @IsOptional()
  @IsString()
  occurredAt?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
