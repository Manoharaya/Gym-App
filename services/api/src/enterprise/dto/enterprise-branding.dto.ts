import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class SetBrandingDto {
  @IsEnum(['ORGANISATION', 'BRAND', 'OUTLET'])
  @IsNotEmpty()
  scopeType!: 'ORGANISATION' | 'BRAND' | 'OUTLET';

  @IsString()
  @IsOptional()
  scopeId?: string;

  @IsString()
  @IsOptional()
  brandId?: string;

  @IsString()
  @IsOptional()
  outletId?: string;

  @IsString()
  @IsOptional()
  brandName?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  logoDarkUrl?: string;

  @IsString()
  @IsOptional()
  faviconUrl?: string;

  @IsString()
  @IsOptional()
  primaryColor?: string;

  @IsString()
  @IsOptional()
  secondaryColor?: string;

  @IsString()
  @IsOptional()
  accentColor?: string;

  @IsString()
  @IsOptional()
  backgroundColor?: string;

  @IsString()
  @IsOptional()
  surfaceColor?: string;

  @IsString()
  @IsOptional()
  fontFamily?: string;

  @IsString()
  @IsOptional()
  emailHeaderUrl?: string;

  @IsString()
  @IsOptional()
  customCss?: string;

  @IsObject()
  @IsOptional()
  themeJson?: Record<string, any>;
}
