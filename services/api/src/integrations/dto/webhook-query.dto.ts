import { IsOptional, IsEnum, IsString } from 'class-validator';
import { IntegrationWebhookStatus } from '@fitcore/types';

export class WebhookQueryDto {
  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsEnum(['RECEIVED', 'VERIFIED', 'QUEUED', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED', 'DUPLICATE'])
  status?: IntegrationWebhookStatus;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsString()
  connectionId?: string;
}
