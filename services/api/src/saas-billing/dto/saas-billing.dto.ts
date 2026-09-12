import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SaasPlanStatusEnum {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  RETIRED = 'RETIRED',
}

export enum SaasPlanVisibilityEnum {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  INVITE_ONLY = 'INVITE_ONLY',
}

export enum SaasBillingIntervalEnum {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMI_ANNUALLY = 'SEMI_ANNUALLY',
  ANNUALLY = 'ANNUALLY',
  CUSTOM = 'CUSTOM',
}

export enum SaasEntitlementTypeEnum {
  BOOLEAN = 'BOOLEAN',
  COUNT = 'COUNT',
  QUOTA = 'QUOTA',
  METERED = 'METERED',
  UNLIMITED = 'UNLIMITED',
}

export class CreateEntitlementDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(SaasEntitlementTypeEnum)
  type: SaasEntitlementTypeEnum;

  @IsString()
  @IsOptional()
  meterKey?: string;

  @IsString()
  @IsOptional()
  category?: string;
}

export class PlanEntitlementConfigDto {
  @IsString()
  @IsNotEmpty()
  entitlementCode: string;

  @IsEnum(SaasEntitlementTypeEnum)
  limitType: SaasEntitlementTypeEnum;

  @IsInt()
  @Min(0)
  includedAllowance: number;

  @IsBoolean()
  @IsOptional()
  overageAllowed?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  overageUnitMinor?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  overageBatchSize?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  softLimitThresholdPercent?: number;
}

export class CreateSaasPlanDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(SaasPlanVisibilityEnum)
  @IsOptional()
  visibility?: SaasPlanVisibilityEnum;

  @IsEnum(SaasBillingIntervalEnum)
  @IsOptional()
  billingInterval?: SaasBillingIntervalEnum;

  @IsInt()
  @Min(0)
  basePriceMinor: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  trialDays?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanEntitlementConfigDto)
  @IsOptional()
  entitlements?: PlanEntitlementConfigDto[];
}

export class CreatePlanVersionDto {
  @IsInt()
  @Min(0)
  basePriceMinor: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(SaasBillingIntervalEnum)
  @IsOptional()
  billingInterval?: SaasBillingIntervalEnum;

  @IsInt()
  @Min(0)
  @IsOptional()
  trialDays?: number;

  @IsString()
  @IsOptional()
  changeNotes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanEntitlementConfigDto)
  @IsOptional()
  entitlements?: PlanEntitlementConfigDto[];
}

export class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  planCode: string;

  @IsString()
  @IsOptional()
  billingInterval?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  billingEmail?: string;

  @IsString()
  @IsOptional()
  billingContactName?: string;

  @IsBoolean()
  @IsOptional()
  startTrial?: boolean;
}

export class UpgradeSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  targetPlanCode: string;

  @IsBoolean()
  @IsOptional()
  immediate?: boolean;
}

export class DowngradeSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  targetPlanCode: string;

  @IsBoolean()
  @IsOptional()
  confirmResourceCompliance?: boolean;
}

export class CancelSubscriptionDto {
  @IsBoolean()
  @IsOptional()
  immediate?: boolean;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class RecordUsageEventDto {
  @IsString()
  @IsNotEmpty()
  meterKey: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsString()
  @IsNotEmpty()
  source: string;

  @IsString()
  @IsOptional()
  sourceReferenceId?: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @IsString()
  @IsOptional()
  outletId?: string;
}

export class UpdateBillingContactDto {
  @IsString()
  @IsOptional()
  billingEmail?: string;

  @IsString()
  @IsOptional()
  billingContactName?: string;

  @IsString()
  @IsOptional()
  taxIdentifier?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsOptional()
  billingAddress?: Record<string, any>;
}

export class GrantCreditDto {
  @IsInt()
  @Min(1)
  amountMinor: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
