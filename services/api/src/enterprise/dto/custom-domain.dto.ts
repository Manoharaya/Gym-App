import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class RegisterCustomDomainDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i, {
    message: 'Domain must be a valid FQDN (e.g. portal.gymenterprise.com)',
  })
  domain!: string;

  @IsEnum(['ORGANISATION', 'BRAND', 'OUTLET'])
  @IsOptional()
  scopeType?: 'ORGANISATION' | 'BRAND' | 'OUTLET' = 'ORGANISATION';

  @IsString()
  @IsOptional()
  scopeId?: string;

  @IsEnum(['DNS_TXT', 'DNS_CNAME', 'HTTP_TOKEN'])
  @IsOptional()
  verificationMethod?: 'DNS_TXT' | 'DNS_CNAME' | 'HTTP_TOKEN' = 'DNS_TXT';

  @IsString()
  @IsOptional()
  fallbackUrl?: string;
}

export class VerifyCustomDomainDto {
  @IsString()
  @IsNotEmpty()
  domain!: string;
}
