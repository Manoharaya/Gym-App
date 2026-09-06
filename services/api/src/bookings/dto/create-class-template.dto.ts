import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateClassTemplateDto {
  @IsString()
  classTypeId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

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
  @IsString()
  defaultBookingPolicyId?: string;
}
