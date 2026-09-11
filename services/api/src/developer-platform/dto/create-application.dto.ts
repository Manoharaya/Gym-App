import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { DeveloperApplicationType, DeveloperEnvironment, ApiScope } from '@fitcore/types';

export class CreateDeveloperApplicationInputDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['INTERNAL', 'ORGANISATION', 'PARTNER', 'THIRD_PARTY', 'MARKETPLACE'])
  @IsOptional()
  applicationType?: DeveloperApplicationType;

  @IsEnum(['DEVELOPMENT', 'SANDBOX', 'PRODUCTION'])
  @IsOptional()
  environment?: DeveloperEnvironment;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  redirectUris?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedScopes?: ApiScope[];

  @IsBoolean()
  @IsOptional()
  webhookEnabled?: boolean;
}
