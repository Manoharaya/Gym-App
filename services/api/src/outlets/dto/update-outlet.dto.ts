import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOutletDto {
  @ApiPropertyOptional({ example: 'Joondalup Performance Hub' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'SW-JOON-HUB' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'Australia/Perth' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: '55 Grand Boulevard' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Joondalup' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'WA' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '6027' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: '+61 8 9000 0004' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'contact@secondwind.com.au' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'ACTIVE', description: 'Status: ACTIVE, MAINTENANCE, COMING_SOON' })
  @IsOptional()
  @IsString()
  status?: string;
}
