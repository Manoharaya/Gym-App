import { IsString, IsOptional, IsInt, IsDateString, Min, Max } from 'class-validator';

export class CreateClassSessionDto {
  @IsString()
  outletId: string;

  @IsString()
  classTypeId: string;

  @IsOptional()
  @IsString()
  classTemplateId?: string;

  @IsOptional()
  @IsString()
  trainerId?: string;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @IsString()
  bookingPolicyId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  capacity?: number;

  @IsOptional()
  @IsDateString()
  bookingOpensAt?: string;

  @IsOptional()
  @IsDateString()
  bookingClosesAt?: string;

  @IsOptional()
  @IsDateString()
  cancellationClosesAt?: string;
}
