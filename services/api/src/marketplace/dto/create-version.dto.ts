import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { MarketplaceInstallationScope } from '@fitcore/types';

export class CreateMarketplaceListingVersionDto {
  @IsString()
  @IsNotEmpty()
  version: string;

  @IsString()
  @IsOptional()
  changelog?: string;

  @IsObject()
  @IsNotEmpty()
  manifest: Record<string, any>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredPermissions?: string[];

  @IsString()
  @IsOptional()
  minCoreVersion?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supportedScopes?: MarketplaceInstallationScope[];

  @IsArray()
  @IsOptional()
  dependencies?: Array<{ slug: string; minVersion?: string; optional?: boolean }>;

  @IsBoolean()
  @IsOptional()
  healthPiiRequested?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
