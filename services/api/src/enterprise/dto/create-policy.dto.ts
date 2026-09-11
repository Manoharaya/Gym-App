import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePolicyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsEnum(['ORGANISATION', 'BRAND', 'REGION', 'OUTLET'])
  scopeType!: 'ORGANISATION' | 'BRAND' | 'REGION' | 'OUTLET';

  @IsString()
  @IsOptional()
  scopeId?: string;

  @IsString()
  @IsOptional()
  brandId?: string;

  @IsString()
  @IsOptional()
  outletId?: string;

  @IsBoolean()
  @IsOptional()
  isHardCeiling?: boolean = false;

  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number = 0;

  @IsEnum(['DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED'])
  @IsOptional()
  status?: 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED' = 'ACTIVE';

  @IsObject()
  @IsNotEmpty()
  configJson!: Record<string, any>;

  @IsEnum(['ENFORCED', 'ADVISORY', 'AUDIT_ONLY'])
  @IsOptional()
  enforcementMode?: 'ENFORCED' | 'ADVISORY' | 'AUDIT_ONLY' = 'ENFORCED';

  @IsString()
  @IsOptional()
  changeReason?: string;
}

export class UpdatePolicyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isHardCeiling?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;

  @IsEnum(['DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED'])
  @IsOptional()
  status?: 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';

  @IsObject()
  @IsOptional()
  configJson?: Record<string, any>;

  @IsEnum(['ENFORCED', 'ADVISORY', 'AUDIT_ONLY'])
  @IsOptional()
  enforcementMode?: 'ENFORCED' | 'ADVISORY' | 'AUDIT_ONLY';

  @IsString()
  @IsOptional()
  changeReason?: string;
}

export class SimulatePolicyDto {
  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsString()
  @IsOptional()
  brandId?: string;

  @IsString()
  @IsOptional()
  regionCode?: string;

  @IsString()
  @IsOptional()
  outletId?: string;

  @IsObject()
  @IsOptional()
  proposedConfig?: Record<string, any>;
}
