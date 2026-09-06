import { IsString, IsOptional, IsInt, IsBoolean, IsDateString, Min, Max } from 'class-validator';

export class CreateTrainerAvailabilityDto {
  @IsString()
  trainerId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsDateString()
  specificDate?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
