import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommunicationChannel, CommunicationType, TemplateVersionStatus } from '../communications.types';

export class CreateTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsNotEmpty()
  @IsString()
  name!: string;

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

  @ApiProperty({
    description: 'Delivery Channel',
    enum: ['EMAIL', 'SMS', 'PUSH', 'WHATSAPP', 'IN_APP', 'VOICE'],
  })
  @IsNotEmpty()
  channel!: CommunicationChannel;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Subject template with {{variables}}' })
  @IsOptional()
  @IsString()
  subjectTemplate?: string;

  @ApiProperty({ description: 'Body template with {{variables}}' })
  @IsNotEmpty()
  @IsString()
  bodyTemplate!: string;

  @ApiPropertyOptional({ description: 'Allowed / required variables schema' })
  @IsOptional()
  @IsObject()
  variablesSchema?: Record<string, any>;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional({ description: 'Updated template name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Updated status', enum: ['ACTIVE', 'ARCHIVED', 'DRAFT'] })
  @IsOptional()
  status?: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';

  @ApiPropertyOptional({ description: 'Updated subject template (creates new version)' })
  @IsOptional()
  @IsString()
  subjectTemplate?: string;

  @ApiPropertyOptional({ description: 'Updated body template (creates new version)' })
  @IsOptional()
  @IsString()
  bodyTemplate?: string;

  @ApiPropertyOptional({ description: 'Updated variables schema' })
  @IsOptional()
  @IsObject()
  variablesSchema?: Record<string, any>;
}

export class CreateTemplateVersionDto {
  @ApiPropertyOptional({ description: 'Subject template' })
  @IsOptional()
  @IsString()
  subjectTemplate?: string;

  @ApiProperty({ description: 'Body template' })
  @IsNotEmpty()
  @IsString()
  bodyTemplate!: string;

  @ApiPropertyOptional({ description: 'Variables schema' })
  @IsOptional()
  @IsObject()
  variablesSchema?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Status', enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'] })
  @IsOptional()
  status?: TemplateVersionStatus;
}
