import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';

export class SubmitNutritionFeedbackDto {
  @IsString()
  @IsNotEmpty()
  messageId!: string;

  @IsEnum(['HELPFUL', 'NOT_HELPFUL', 'REPORT'])
  rating!: 'HELPFUL' | 'NOT_HELPFUL' | 'REPORT';

  @IsOptional()
  @IsEnum([
    'ALLERGY_CONCERN',
    'WRONG_INFORMATION',
    'UNSAFE_ADVICE',
    'CONFUSING',
    'NOT_RELEVANT',
    'OTHER',
  ])
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
