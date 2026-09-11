import { IsString, IsOptional, IsEnum, IsArray, IsInt, Min, Max } from 'class-validator';
import { DeveloperEnvironment, ApiScope } from '@fitcore/types';

export class CreateApiKeyInputDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(['DEVELOPMENT', 'SANDBOX', 'PRODUCTION'])
  @IsOptional()
  environment?: DeveloperEnvironment;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: ApiScope[];

  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  expiresInDays?: number;
}
