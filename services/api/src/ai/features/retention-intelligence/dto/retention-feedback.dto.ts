import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RetentionFeedbackRating } from '@fitcore/types';

export class SubmitRetentionFeedbackDto {
  @ApiProperty({ description: 'Target Member Profile ID' })
  @IsString()
  memberId: string;

  @ApiPropertyOptional({ description: 'Specific Retention Analysis ID being rated' })
  @IsOptional()
  @IsString()
  analysisId?: string;

  @ApiProperty({
    description: 'Rating feedback',
    enum: ['HELPFUL', 'NOT_HELPFUL', 'INCORRECT', 'NOT_RELEVANT'],
  })
  @IsEnum(['HELPFUL', 'NOT_HELPFUL', 'INCORRECT', 'NOT_RELEVANT'])
  rating: RetentionFeedbackRating;

  @ApiPropertyOptional({ description: 'Optional explanation or comments from staff' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'Feedback category' })
  @IsOptional()
  @IsString()
  category?: string;
}
