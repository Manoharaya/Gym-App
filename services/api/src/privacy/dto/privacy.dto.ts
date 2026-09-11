import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  IsInt,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import {
  PrivacyDataCategory,
  PrivacyDataClassification,
  PrivacyDataPurpose,
  PrivacyRequestType,
  PrivacyExportFormat,
  DeletionStrategyAction,
  RetentionAction,
  PrivacyHoldStatus,
  MemberPrivacyRestrictionStatus,
  PrivacyProcessorCategory,
} from '@fitcore/types';

export class CreatePrivacyRequestDto {
  @IsEnum([
    'ACCESS',
    'EXPORT',
    'CORRECTION',
    'RECTIFICATION',
    'DELETION',
    'RESTRICTION',
    'CONSENT_WITHDRAWAL',
    'OTHER',
  ])
  type: PrivacyRequestType;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  stepUpToken?: string;
}

export class UpdatePrivacyPreferencesDto {
  @IsOptional()
  @IsBoolean()
  aiPersonalization?: boolean;

  @IsOptional()
  @IsBoolean()
  aiPersonalizationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  analytics?: boolean;

  @IsOptional()
  @IsBoolean()
  marketing?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;

  @IsOptional()
  @IsBoolean()
  wearables?: boolean;

  @IsOptional()
  @IsBoolean()
  wearableDataSharing?: boolean;

  @IsOptional()
  @IsBoolean()
  dataSharing?: boolean;

  @IsOptional()
  @IsBoolean()
  personalization?: boolean;
}

export class RequestDataExportDto {
  @IsOptional()
  @IsArray()
  formats?: PrivacyExportFormat[];

  @IsOptional()
  @IsString()
  stepUpToken?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class RequestDataDeletionDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  stepUpToken?: string;

  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;
}

export class WithdrawConsentDto {
  @IsString()
  consentTypeKey: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateRetentionHoldDto {
  @IsOptional()
  @IsString()
  memberId?: string;

  @IsString()
  dataCategory: string;

  @IsString()
  reason: string;
}

export class UpdateRetentionHoldDto {
  @IsEnum(['ACTIVE', 'RELEASED', 'EXPIRED'])
  status: PrivacyHoldStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateRetentionPolicyDto {
  @IsString()
  dataCategory: PrivacyDataCategory;

  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  @Max(3650)
  retentionPeriodDays: number;

  @IsEnum(['DELETE', 'ANONYMIZE', 'ARCHIVE', 'RESTRICT', 'REVIEW'])
  action: RetentionAction;

  @IsOptional()
  @IsBoolean()
  legalHold?: boolean;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRetentionPolicyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  retentionPeriodDays?: number;

  @IsOptional()
  @IsEnum(['DELETE', 'ANONYMIZE', 'ARCHIVE', 'RESTRICT', 'REVIEW'])
  action?: RetentionAction;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

export class SetPrivacyRestrictionDto {
  @IsString()
  memberId: string;

  @IsEnum(['NONE', 'RESTRICTED', 'UNDER_REVIEW'])
  status: MemberPrivacyRestrictionStatus;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsArray()
  restrictedFeatures?: string[];
}

export class CreateProcessorDto {
  @IsString()
  name: string;

  @IsEnum([
    'AI_PROVIDER',
    'PAYMENT_PROVIDER',
    'COMMUNICATION_PROVIDER',
    'WEARABLE_PROVIDER',
    'ACCOUNTING_PROVIDER',
    'CLOUD_STORAGE',
  ])
  category: PrivacyProcessorCategory;

  @IsString()
  purpose: string;

  @IsArray()
  dataCategories: PrivacyDataCategory[];

  @IsOptional()
  @IsString()
  privacyPolicyReference?: string;

  @IsOptional()
  @IsString()
  dataRegion?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class ReviewPrivacyRequestDto {
  @IsOptional()
  @IsString()
  resolution?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
