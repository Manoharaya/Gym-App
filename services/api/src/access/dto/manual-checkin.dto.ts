import { IsString, IsOptional } from 'class-validator';

export class ManualCheckInDto {
  @IsString()
  memberProfileId: string;

  @IsString()
  outletId: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ManualCheckOutDto {
  @IsString()
  memberProfileId: string;

  @IsString()
  outletId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
