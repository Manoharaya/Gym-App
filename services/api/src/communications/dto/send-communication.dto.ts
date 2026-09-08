import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  IsDateString,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CommunicationChannel,
  CommunicationType,
  CommunicationSource,
} from '../communications.types';

export class SendCommunicationDto {
  @ApiPropertyOptional({ description: 'Specific outlet ID' })
  @IsOptional()
  @IsString()
  outletId?: string;

  @ApiPropertyOptional({ description: 'Recipient user ID' })
  @IsOptional()
  @IsString()
  recipientUserId?: string;

  @ApiPropertyOptional({ description: 'Recipient member profile ID' })
  @IsOptional()
  @IsString()
  recipientMemberId?: string;

  @ApiPropertyOptional({ description: 'Recipient staff user ID' })
  @IsOptional()
  @IsString()
  recipientStaffId?: string;

  @ApiPropertyOptional({ description: 'Recipient direct email override' })
  @IsOptional()
  @IsString()
  recipientEmail?: string;

  @ApiPropertyOptional({ description: 'Recipient direct phone override' })
  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @ApiProperty({
    description: 'Category / Communication Type',
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

  @ApiPropertyOptional({
    description: 'Preferred delivery channel',
    enum: ['EMAIL', 'SMS', 'PUSH', 'WHATSAPP', 'IN_APP', 'VOICE'],
  })
  @IsOptional()
  channel?: CommunicationChannel;

  @ApiPropertyOptional({ description: 'Template ID to render' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Subject line' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiPropertyOptional({ description: 'Direct message body if not using template' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ description: 'Variables for template interpolation' })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Source domain of this communication',
    enum: [
      'BOOKING',
      'PAYMENT',
      'MEMBERSHIP',
      'REACTIVATION',
      'DAILY_CHECKIN',
      'SYSTEM',
      'STAFF',
      'MARKETING',
      'AI_AGENT',
    ],
  })
  @IsOptional()
  source?: CommunicationSource;

  @ApiPropertyOptional({ description: 'Source entity reference ID e.g. bookingId, recoveryPlanId' })
  @IsOptional()
  @IsString()
  sourceReferenceId?: string;

  @ApiPropertyOptional({ description: 'Whether this requires staff approval before dispatch' })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ description: 'Future scheduled dispatch time' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({ description: 'Unique idempotency key' })
  @IsNotEmpty()
  @IsString()
  idempotencyKey!: string;

  @ApiPropertyOptional({ description: 'Arbitrary structured metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
