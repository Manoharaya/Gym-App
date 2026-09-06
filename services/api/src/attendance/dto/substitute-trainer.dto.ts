import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubstituteTrainerDto {
  @ApiProperty({ description: 'User ID of the substitute trainer' })
  @IsString()
  @IsNotEmpty()
  substituteTrainerId: string;

  @ApiProperty({ description: 'Reason for trainer substitution' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ description: 'Optional operational notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
