import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateResourceDto {
  @ApiProperty({ description: 'Outlet ID where resource is located' })
  @IsString()
  @IsNotEmpty()
  outletId: string;

  @ApiProperty({ description: 'Resource name (e.g. Studio A, Yoga Room, Pool Lane 1)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Resource type',
    enum: ['STUDIO', 'ROOM', 'COURT', 'AREA', 'EQUIPMENT_BAY'],
    default: 'STUDIO',
  })
  @IsString()
  @IsOptional()
  @IsIn(['STUDIO', 'ROOM', 'COURT', 'AREA', 'EQUIPMENT_BAY'])
  type?: string;

  @ApiPropertyOptional({ description: 'Resource physical capacity', default: 30 })
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;
}
