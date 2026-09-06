import { IsString, IsOptional } from 'class-validator';

export class ManualBookingDto {
  @IsString()
  memberProfileId: string;

  @IsString()
  classSessionId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
