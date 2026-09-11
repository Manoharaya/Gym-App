import { IsString, IsOptional, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { DeveloperApplicationStatus, ApiScope } from '@fitcore/types';

export class UpdateDeveloperApplicationInputDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  redirectUris?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedScopes?: ApiScope[];

  @IsEnum(['DRAFT', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'ARCHIVED'])
  @IsOptional()
  status?: DeveloperApplicationStatus;

  @IsBoolean()
  @IsOptional()
  webhookEnabled?: boolean;
}
