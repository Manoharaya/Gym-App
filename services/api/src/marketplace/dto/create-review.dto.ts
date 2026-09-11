import { IsInt, Min, Max, IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateMarketplaceReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsNotEmpty()
  comment: string;
}
