import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EngagementFeedbackDto {
  @ApiProperty({ description: 'ID of the EngagementInsight record' })
  @IsString()
  @IsNotEmpty()
  insightId!: string;

  @ApiProperty({ description: 'Rating: HELPFUL or NOT_HELPFUL', enum: ['HELPFUL', 'NOT_HELPFUL'] })
  @IsString()
  @IsIn(['HELPFUL', 'NOT_HELPFUL'])
  rating!: 'HELPFUL' | 'NOT_HELPFUL';

  @ApiPropertyOptional({ description: 'Optional feedback comment' })
  @IsString()
  @IsOptional()
  comment?: string;
}
