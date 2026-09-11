import { IsEnum, IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { MarketplaceReviewStatus } from '@fitcore/types';

export class ModerateMarketplaceReviewDto {
  @IsEnum(['PUBLISHED', 'FLAGGED', 'HIDDEN', 'REMOVED'])
  status: MarketplaceReviewStatus;

  @IsString()
  @IsOptional()
  moderationNotes?: string;
}

export class FlagMarketplaceReviewDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
