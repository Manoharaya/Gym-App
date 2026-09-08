import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDeviceDto {
  @ApiProperty({ description: 'Client device unique ID' })
  @IsNotEmpty()
  @IsString()
  deviceId!: string;

  @ApiProperty({ description: 'Platform', enum: ['IOS', 'ANDROID', 'WEB'] })
  @IsNotEmpty()
  @IsEnum(['IOS', 'ANDROID', 'WEB'])
  platform!: 'IOS' | 'ANDROID' | 'WEB';

  @ApiProperty({ description: 'Push notification device token (FCM / APNs)' })
  @IsNotEmpty()
  @IsString()
  pushToken!: string;

  @ApiPropertyOptional({ description: 'Mobile app version' })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiPropertyOptional({ description: 'Friendly device name' })
  @IsOptional()
  @IsString()
  deviceName?: string;
}
