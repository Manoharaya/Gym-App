import { IsString, IsNotEmpty, IsOptional, IsArray, IsUrl } from 'class-validator';

export class CreateWebhookSubscriptionInputDto {
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  endpointUrl: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  eventTypes: string[];
}
