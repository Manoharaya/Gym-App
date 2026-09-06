import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordWalkInDto {
  @ApiProperty({ description: 'Member Profile ID admitted as a walk-in' })
  @IsString()
  @IsNotEmpty()
  memberProfileId: string;

  @ApiPropertyOptional({ description: 'Explicit staff authorization to admit past capacity', default: false })
  @IsBoolean()
  @IsOptional()
  allowCapacityOverride?: boolean;

  @ApiPropertyOptional({ description: 'Mandatory reason if capacity override is granted' })
  @IsString()
  @IsOptional()
  overrideReason?: string;

  @ApiPropertyOptional({ description: 'Optional operational notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
