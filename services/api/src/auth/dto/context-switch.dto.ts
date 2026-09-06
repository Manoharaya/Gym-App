import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContextSwitchDto {
  @ApiProperty({ example: 'org_dev_secondwind_001', description: 'Target active organisation identifier' })
  @IsString()
  @IsNotEmpty({ message: 'Organisation ID is required' })
  organisationId!: string;

  @ApiPropertyOptional({ example: 'outlet_dev_perth_cbd_001', description: 'Target active outlet identifier' })
  @IsOptional()
  @IsString()
  outletId?: string;
}
