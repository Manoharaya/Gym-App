import {
  IsInt,
  IsBoolean,
  IsArray,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class UpdateBillingPolicyInputDto {
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  retryMaxAttempts?: number;

  @IsArray()
  @IsOptional()
  retryIntervalsDays?: number[];

  @IsInt()
  @Min(0)
  @Max(60)
  @IsOptional()
  gracePeriodDays?: number;

  @IsBoolean()
  @IsOptional()
  gracePeriodAccessAllowed?: boolean;

  @IsInt()
  @Min(1)
  @Max(90)
  @IsOptional()
  dunningAutoEscalateDays?: number;

  @IsInt()
  @Min(1)
  @Max(180)
  @IsOptional()
  dunningMaxPeriodDays?: number;

  @IsArray()
  @IsOptional()
  communicationChannels?: string[];
}
