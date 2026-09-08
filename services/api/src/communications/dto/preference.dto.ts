import { IsEnum, IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommunicationChannel, CommunicationType } from '../communications.types';

export class UpdatePreferenceDto {
  @ApiProperty({
    description: 'Channel',
    enum: ['EMAIL', 'SMS', 'PUSH', 'WHATSAPP', 'IN_APP', 'VOICE'],
  })
  @IsNotEmpty()
  channel!: CommunicationChannel;

  @ApiProperty({
    description: 'Communication Type',
    enum: [
      'TRANSACTIONAL',
      'OPERATIONAL',
      'ENGAGEMENT',
      'REACTIVATION',
      'REMINDER',
      'SYSTEM',
      'MARKETING',
      'STAFF',
      'SECURITY',
    ],
  })
  @IsNotEmpty()
  type!: CommunicationType;

  @ApiProperty({ description: 'Whether notifications for this channel/type are enabled' })
  @IsBoolean()
  enabled!: boolean;
}
