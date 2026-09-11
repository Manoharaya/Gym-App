import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { MarketplaceListingType, MarketplacePricingType } from '@fitcore/types';

export class MarketplaceDiscoveryQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  categorySlug?: string;

  @IsEnum(['APP', 'INTEGRATION', 'AI_AGENT', 'TRAINER', 'PROGRAM', 'SERVICE'])
  @IsOptional()
  listingType?: MarketplaceListingType;

  @IsEnum(['FREE', 'PAID', 'SUBSCRIPTION', 'USAGE_BASED', 'CONTACT_SALES'])
  @IsOptional()
  pricingType?: MarketplacePricingType;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  featured?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  verified?: boolean;

  @IsString()
  @IsOptional()
  sort?: 'popular' | 'rating' | 'newest' | 'name';

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
