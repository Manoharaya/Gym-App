import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class OAuthTokenRequestInputDto {
  @IsIn(['authorization_code', 'refresh_token'])
  grant_type: 'authorization_code' | 'refresh_token';

  @IsString()
  @IsNotEmpty()
  client_id: string;

  @IsString()
  @IsOptional()
  client_secret?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  redirect_uri?: string;

  @IsString()
  @IsOptional()
  code_verifier?: string;

  @IsString()
  @IsOptional()
  refresh_token?: string;
}

export class OAuthRevokeTokenInputDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsIn(['access_token', 'refresh_token'])
  @IsOptional()
  token_type_hint?: 'access_token' | 'refresh_token';

  @IsString()
  @IsNotEmpty()
  client_id: string;

  @IsString()
  @IsOptional()
  client_secret?: string;
}
