import { IsString, IsNotEmpty } from 'class-validator';

export class CreatePublicBookingInputDto {
  @IsString()
  @IsNotEmpty()
  classSessionId: string;

  @IsString()
  @IsNotEmpty()
  memberId: string;
}
