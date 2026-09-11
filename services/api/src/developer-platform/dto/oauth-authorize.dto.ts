import { IsString, IsNotEmpty, IsOptional, IsIn, IsArray, IsBoolean } from 'class-validator';
import { ApiScope } from '@fitcore/types';

export class OAuthAuthorizeQueryInputDto {
  @IsString()
  @IsNotEmpty()
  client_id: string;

  @IsString()
  @IsNotEmpty()
  redirect_uri: string;

  @IsIn(['code'])
  response_type: 'code';

  @IsString()
  @IsOptional()
  scope?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  code_challenge?: string;

  @IsIn(['S256', 'plain'])
  @IsOptional()
  code_challenge_method?: 'S256';
}

export class OAuthConsentDecisionInputDto {
  @IsString()
  @IsNotEmpty()
  client_id: string;

  @IsString()
  @IsNotEmpty()
  redirect_uri: string;

  @IsArray()
  @IsString({ each: true })
  scopes: ApiScope[];

  @IsBoolean()
  approved: boolean;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  code_challenge?: string;

  @IsIn(['S256', 'plain'])
  @IsOptional()
  code_challenge_method?: 'S256';
}
