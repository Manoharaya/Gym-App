import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DailyCheckInFeedbackRating {
  HELPFUL = 'HELPFUL',
  NOT_HELPFUL = 'NOT_HELPFUL',
  INCORRECT = 'INCORRECT',
  NOT_RELEVANT = 'NOT_RELEVANT',
  UNSAFE = 'UNSAFE',
}

export class DailyCheckInFeedbackDto {
  @ApiProperty({
    enum: DailyCheckInFeedbackRating,
    description: 'Member rating on generated daily intelligence',
    example: DailyCheckInFeedbackRating.HELPFUL,
  })
  @IsEnum(DailyCheckInFeedbackRating)
  rating: DailyCheckInFeedbackRating;

  @ApiPropertyOptional({
    description: 'Optional feedback text (untrusted input)',
    example: 'Spot on recommendation for my shoulder tightness.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
