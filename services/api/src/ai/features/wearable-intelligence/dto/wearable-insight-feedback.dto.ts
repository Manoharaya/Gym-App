import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum, IsOptional, IsString } from 'class-validator';

export class WearableInsightFeedbackDto {
  @ApiProperty({ description: 'ID of the WearableInsight being evaluated' })
  @IsNotEmpty()
  @IsString()
  insightId: string;

  @ApiProperty({ description: 'Feedback rating', enum: ['HELPFUL', 'NOT_HELPFUL'] })
  @IsNotEmpty()
  @IsEnum(['HELPFUL', 'NOT_HELPFUL'])
  rating: 'HELPFUL' | 'NOT_HELPFUL';

  @ApiPropertyOptional({
    description: 'Category for unhelpful feedback',
    enum: ['NOT_RELEVANT', 'INCORRECT', 'TOO_GENERIC', 'CONFUSING', 'OTHER'],
  })
  @IsOptional()
  @IsEnum(['NOT_RELEVANT', 'INCORRECT', 'TOO_GENERIC', 'CONFUSING', 'OTHER'])
  category?: 'NOT_RELEVANT' | 'INCORRECT' | 'TOO_GENERIC' | 'CONFUSING' | 'OTHER';

  @ApiPropertyOptional({ description: 'Optional feedback comment' })
  @IsOptional()
  @IsString()
  comment?: string;
}
