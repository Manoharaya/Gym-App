import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsObject,
} from 'class-validator';
import {
  MarketplaceListingType,
  MarketplacePublisherType,
  MarketplaceListingVisibility,
  MarketplacePricingType,
  MarketplaceInstallationScope,
} from '@fitcore/types';

export class CreateMarketplaceListingDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsNotEmpty()
  tagline: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(['APP', 'INTEGRATION', 'AI_AGENT', 'TRAINER', 'PROGRAM', 'SERVICE'])
  listingType: MarketplaceListingType;

  @IsEnum(['FIRST_PARTY', 'VERIFIED_PARTNER', 'COMMUNITY', 'TRAINER'])
  @IsOptional()
  publisherType?: MarketplacePublisherType;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  publisherName: string;

  @IsString()
  @IsNotEmpty()
  publisherEmail: string;

  @IsString()
  @IsOptional()
  publisherWebsite?: string;

  @IsString()
  @IsOptional()
  supportUrl?: string;

  @IsString()
  @IsOptional()
  privacyPolicyUrl?: string;

  @IsString()
  @IsOptional()
  termsUrl?: string;

  @IsString()
  @IsOptional()
  documentationUrl?: string;

  @IsString()
  @IsOptional()
  iconUrl?: string;

  @IsString()
  @IsOptional()
  bannerUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  screenshots?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  badges?: string[];

  @IsEnum(['PUBLIC', 'PRIVATE', 'UNLISTED', 'RESTRICTED'])
  @IsOptional()
  visibility?: MarketplaceListingVisibility;

  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  @IsBoolean()
  @IsOptional()
  verified?: boolean;

  @IsEnum(['FREE', 'PAID', 'SUBSCRIPTION', 'USAGE_BASED', 'CONTACT_SALES'])
  @IsOptional()
  pricingType?: MarketplacePricingType;

  @IsObject()
  @IsOptional()
  pricingModel?: Record<string, any>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredPermissions?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supportedScopes?: MarketplaceInstallationScope[];

  @IsBoolean()
  @IsOptional()
  healthPiiRequested?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  capabilities?: string[];

  @IsArray()
  @IsOptional()
  dependencies?: Array<{ slug: string; minVersion?: string; optional?: boolean }>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  conflicts?: string[];

  @IsString()
  @IsOptional()
  developerAppId?: string;

  @IsString()
  @IsOptional()
  trainerProfileId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
