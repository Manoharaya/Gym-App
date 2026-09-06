import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptInvitationDto {
  @ApiProperty({ description: 'Secure invitation raw token received by user' })
  @IsString()
  @IsNotEmpty({ message: 'Invitation token is required' })
  token!: string;

  @ApiProperty({ example: 'FitCoreDev2026!', description: 'New password (minimum 8 characters)' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  @ApiProperty({ example: 'Marcus', description: 'User first name' })
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName!: string;

  @ApiProperty({ example: 'Vance', description: 'User last name' })
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName!: string;
}
