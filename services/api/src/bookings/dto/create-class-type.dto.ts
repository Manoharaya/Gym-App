import { IsString, IsOptional, IsInt, IsBoolean, Min, Max } from 'class-validator';
import { ClassCategory } from '@fitcore/types';

export class CreateClassTypeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: ClassCategory;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(360)
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  defaultCapacity?: number;

  @IsOptional()
  @IsBoolean()
  bookingRequired?: boolean;

  @IsOptional()
  @IsString()
  membershipEntitlementKey?: string;
}
