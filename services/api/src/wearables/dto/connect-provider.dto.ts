import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsArray, IsNumber } from 'class-validator';
import { WearableProviderType } from '@fitcore/types';

export class ConnectProviderDto {
  @ApiProperty({
    description: 'Target wearable/health platform provider',
    enum: ['APPLE_HEALTH', 'GOOGLE_HEALTH_CONNECT', 'FITBIT', 'GARMIN', 'WHOOP', 'OURA'],
    example: 'APPLE_HEALTH',
  })
  @IsEnum(['APPLE_HEALTH', 'GOOGLE_HEALTH_CONNECT', 'FITBIT', 'GARMIN', 'WHOOP', 'OURA'])
  @IsNotEmpty()
  provider: WearableProviderType;

  @ApiPropertyOptional({
    description: 'OAuth 2.0 authorization code (for Web API providers like Fitbit)',
  })
  @IsOptional()
  @IsString()
  authCode?: string;

  @ApiPropertyOptional({
    description: 'OAuth 2.0 redirect URI used during authorization',
  })
  @IsOptional()
  @IsString()
  redirectUri?: string;

  @ApiPropertyOptional({
    description: 'Granted scopes / telemetry types',
    example: ['STEPS', 'HEART_RATE', 'SLEEP'],
  })
  @IsOptional()
  @IsArray()
  scopes?: string[];

  @ApiPropertyOptional({
    description: 'Provider-side user identifier if known from SDK handshake',
  })
  @IsOptional()
  @IsString()
  providerUserReference?: string;

  @ApiPropertyOptional({
    description: 'Native mobile access token (encrypted on receipt, never logged)',
  })
  @IsOptional()
  @IsString()
  nativeAccessToken?: string;

  @ApiPropertyOptional({
    description: 'Native mobile refresh token (encrypted on receipt, never logged)',
  })
  @IsOptional()
  @IsString()
  nativeRefreshToken?: string;

  @ApiPropertyOptional({
    description: 'Token expiry in seconds',
    example: 28800,
  })
  @IsOptional()
  @IsNumber()
  tokenExpiresIn?: number;
}

export class ReauthorizeProviderDto {
  @ApiPropertyOptional({
    description: 'Fresh authorization code for re-linking',
  })
  @IsOptional()
  @IsString()
  authCode?: string;

  @ApiPropertyOptional({
    description: 'Fresh native access token',
  })
  @IsOptional()
  @IsString()
  nativeAccessToken?: string;

  @ApiPropertyOptional({
    description: 'Fresh native refresh token',
  })
  @IsOptional()
  @IsString()
  nativeRefreshToken?: string;

  @ApiPropertyOptional({
    description: 'Token expiry in seconds',
  })
  @IsOptional()
  @IsNumber()
  tokenExpiresIn?: number;
}
