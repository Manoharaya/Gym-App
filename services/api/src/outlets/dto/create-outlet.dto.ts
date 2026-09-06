import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOutletDto {
  @ApiProperty({ example: 'Joondalup Club', description: 'Outlet branch name' })
  @IsString()
  @IsNotEmpty({ message: 'Outlet name is required' })
  name!: string;

  @ApiProperty({ example: 'SW-JOONDALUP', description: 'Unique outlet branch code within organisation' })
  @IsString()
  @IsNotEmpty({ message: 'Outlet code is required' })
  code!: string;

  @ApiPropertyOptional({ example: 'joondalup-club', description: 'Outlet slug (auto-generated if omitted)' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug can only contain lowercase letters, numbers, and hyphens' })
  slug?: string;

  @ApiPropertyOptional({ example: 'Australia/Perth', default: 'Australia/Perth' })
  @IsOptional()
  @IsString()
  timezone?: string = 'Australia/Perth';

  @ApiProperty({ example: '50 Grand Boulevard', description: 'Street address' })
  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  address!: string;

  @ApiProperty({ example: 'Joondalup', description: 'City' })
  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  city!: string;

  @ApiProperty({ example: 'WA', description: 'State or province' })
  @IsString()
  @IsNotEmpty({ message: 'State is required' })
  state!: string;

  @ApiPropertyOptional({ example: 'Australia', default: 'Australia' })
  @IsOptional()
  @IsString()
  country?: string = 'Australia';

  @ApiProperty({ example: '6027', description: 'Postal or ZIP code' })
  @IsString()
  @IsNotEmpty({ message: 'Postal code is required' })
  postalCode!: string;

  @ApiPropertyOptional({ example: '+61 8 9000 0003' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'joondalup@secondwind.com.au' })
  @IsOptional()
  @IsString()
  email?: string;
}
