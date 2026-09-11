import { IsInt, IsOptional, Min, Max } from 'class-validator';

export class RotateApiKeyInputDto {
  @IsInt()
  @Min(0)
  @Max(720)
  @IsOptional()
  gracePeriodHours?: number = 24; // Default 24 hour overlap for zero-downtime rotation
}
