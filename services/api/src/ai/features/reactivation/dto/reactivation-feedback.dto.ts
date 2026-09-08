import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsUUID,
} from 'class-validator';

export class SubmitReactivationFeedbackRequestDto {
  @IsEnum(['ACCEPTED', 'REJECTED', 'MODIFIED'], {
    message: 'feedback must be ACCEPTED, REJECTED, or MODIFIED',
  })
  feedback: 'ACCEPTED' | 'REJECTED' | 'MODIFIED';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  accuracyRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  strategyRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  toneRating?: number;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsUUID()
  memberRecoveryPlanId?: string;
}
