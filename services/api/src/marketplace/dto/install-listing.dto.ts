import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { MarketplaceInstallationScope } from '@fitcore/types';

export class InstallMarketplaceListingDto {
  @IsString()
  @IsNotEmpty()
  listingId: string;

  @IsString()
  @IsOptional()
  version?: string;

  @IsEnum(['ORGANISATION', 'OUTLET'])
  @IsOptional()
  installationScope?: MarketplaceInstallationScope;

  @IsString()
  @IsOptional()
  outletId?: string;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  approvedPermissions?: string[];

  @IsBoolean()
  @IsOptional()
  consentHealthPii?: boolean;
}
