import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOwnerDto {
  @ApiProperty({ example: 'jack@secondwind.com.au', description: 'Owner email address' })
  @IsEmail({}, { message: 'Must be a valid email' })
  email!: string;

  @ApiProperty({ example: 'FitCoreDev2026!', description: 'Owner initial password' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  @ApiProperty({ example: 'Jack', description: 'Owner first name' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Darling', description: 'Owner last name' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiPropertyOptional({ example: '+61 400 000 001', description: 'Owner phone' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateOrganisationDto {
  @ApiProperty({ example: 'Apex Performance Gym', description: 'Organisation corporate name' })
  @IsString()
  @IsNotEmpty({ message: 'Organisation name is required' })
  name!: string;

  @ApiPropertyOptional({ example: 'apex-performance-gym', description: 'Unique URL slug (auto-generated if omitted)' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug can only contain lowercase letters, numbers, and hyphens' })
  slug?: string;

  @ApiPropertyOptional({ example: 'Australia/Perth', default: 'Australia/Perth' })
  @IsOptional()
  @IsString()
  timezone?: string = 'Australia/Perth';

  @ApiPropertyOptional({ example: 'AUD', default: 'AUD' })
  @IsOptional()
  @IsString()
  currency?: string = 'AUD';

  @ApiPropertyOptional({ example: 'Australia', default: 'Australia' })
  @IsOptional()
  @IsString()
  country?: string = 'Australia';

  @ApiPropertyOptional({ description: 'Optional initial organisation owner to create in transaction' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateOwnerDto)
  owner?: CreateOwnerDto;
}
