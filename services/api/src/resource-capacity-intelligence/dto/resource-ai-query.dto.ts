import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ResourceAiQueryDto {
  @IsNotEmpty()
  @IsString()
  query!: string;

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @IsString()
  trainerId?: string;

  @IsOptional()
  @IsString()
  timeRange?: string;

  @IsOptional()
  @IsString()
  locale?: 'en' | 'ne';
}
