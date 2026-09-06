import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Smith' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+61 400 111 222' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://cdn.fitcore.io/avatars/user.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'ACTIVE', description: 'Account status: ACTIVE, SUSPENDED, DISABLED' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateInvitationDto {
  @ApiProperty({ example: 'trainer.marcus@secondwind.com.au', description: 'Staff email address' })
  @IsEmail({}, { message: 'Must be a valid email' })
  email!: string;

  @ApiProperty({ example: 'TRAINER', description: 'Role name: OUTLET_MANAGER, RECEPTION, TRAINER, FINANCE, MEMBER' })
  @IsString()
  @IsNotEmpty({ message: 'Role is required' })
  role!: string;

  @ApiPropertyOptional({ example: 'outlet_dev_perth_cbd_001', description: 'Optional assigned outlet' })
  @IsOptional()
  @IsString()
  outletId?: string;
}

export class AssignRoleDto {
  @ApiProperty({ example: 'TRAINER', description: 'Role name to assign' })
  @IsString()
  @IsNotEmpty({ message: 'Role name is required' })
  roleName!: string;

  @ApiPropertyOptional({ example: 'outlet_dev_perth_cbd_001', description: 'Optional outlet scope' })
  @IsOptional()
  @IsString()
  outletId?: string;
}
