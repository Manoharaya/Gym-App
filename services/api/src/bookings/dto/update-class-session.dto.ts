import { IsString, IsOptional, IsInt, IsDateString, Min, Max } from 'class-validator';
import { ClassSessionStatus } from '@fitcore/types';

export class UpdateClassSessionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  trainerId?: string;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  capacity?: number;

  @IsOptional()
  @IsString()
  status?: ClassSessionStatus;

  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
