import { IsString, IsOptional } from 'class-validator';

export class CancelBookingDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
