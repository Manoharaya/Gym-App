import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrganisationDto {
  @ApiPropertyOptional({ example: 'Second Wind Athletic Club Pty Ltd' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Australia/Perth' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'AUD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'Australia' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'ACTIVE', description: 'Status: ACTIVE, SUSPENDED, TRIAL' })
  @IsOptional()
  @IsString()
  status?: string;
}
