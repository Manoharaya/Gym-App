/**
 * FitCore — Day 43: Connect Accounting Provider DTO
 */

import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class ConnectProviderDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['XERO', 'QUICKBOOKS'])
  provider: 'XERO' | 'QUICKBOOKS';

  @IsString()
  @IsNotEmpty()
  redirectUri: string;
}
