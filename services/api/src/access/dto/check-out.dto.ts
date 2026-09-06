import { IsString, IsOptional } from 'class-validator';

export class CheckOutDto {
  @IsString()
  outletId: string;

  @IsOptional()
  @IsString()
  memberProfileId?: string;

  @IsOptional()
  @IsString()
  credentialReference?: string;

  @IsOptional()
  @IsString()
  accessPointId?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  deviceEventId?: string;
}
