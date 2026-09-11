import { IsString, IsOptional, IsArray, IsEnum, IsUrl } from 'class-validator';
import { WebhookSubscriptionStatus } from '@fitcore/types';

export class UpdateWebhookSubscriptionInputDto {
  @IsUrl({ require_tld: false })
  @IsOptional()
  endpointUrl?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  eventTypes?: string[];

  @IsEnum(['ACTIVE', 'PAUSED', 'FAILING', 'DISABLED', 'REVOKED'])
  @IsOptional()
  status?: WebhookSubscriptionStatus;
}
