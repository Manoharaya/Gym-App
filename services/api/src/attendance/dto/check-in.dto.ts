import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ClassCheckInMethodEnum {
  STAFF = 'STAFF',
  MEMBER_SELF_SERVICE = 'MEMBER_SELF_SERVICE',
  QR = 'QR',
  ACCESS_EVENT = 'ACCESS_EVENT',
  KIOSK = 'KIOSK',
  MANUAL = 'MANUAL',
  SYSTEM = 'SYSTEM',
}

export class CheckInDto {
  @ApiPropertyOptional({ description: 'Member profile ID (required when staff checks in member)' })
  @IsString()
  @IsOptional()
  memberProfileId?: string;

  @ApiPropertyOptional({ enum: ClassCheckInMethodEnum, default: ClassCheckInMethodEnum.MEMBER_SELF_SERVICE })
  @IsEnum(ClassCheckInMethodEnum)
  @IsOptional()
  method?: ClassCheckInMethodEnum;

  @ApiPropertyOptional({ description: 'Staff override for check-in window (-30m to +15m)' })
  @IsBoolean()
  @IsOptional()
  allowWindowOverride?: boolean;

  @ApiPropertyOptional({ description: 'Optional check-in notes or kiosk metadata' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CheckOutDto {
  @ApiPropertyOptional({ description: 'Member profile ID (required when staff checks out member)' })
  @IsString()
  @IsOptional()
  memberProfileId?: string;

  @ApiPropertyOptional({ enum: ClassCheckInMethodEnum, default: ClassCheckInMethodEnum.MEMBER_SELF_SERVICE })
  @IsEnum(ClassCheckInMethodEnum)
  @IsOptional()
  method?: ClassCheckInMethodEnum;
}
