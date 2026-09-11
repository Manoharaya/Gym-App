import { IsObject, IsOptional, IsArray, IsString, IsBoolean } from 'class-validator';

export class ConfigureMarketplaceInstallationDto {
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  approvedPermissions?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  revokedPermissions?: string[];

  @IsBoolean()
  @IsOptional()
  consentHealthPii?: boolean;
}
