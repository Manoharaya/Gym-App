import { IsString, IsOptional } from 'class-validator';

export class CreateBookingDto {
  @IsOptional()
  @IsString()
  memberProfileId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
