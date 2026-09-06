import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
  IsInt,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

// ------------------------------------------
// Member & Profile DTOs
// ------------------------------------------

export class CreateMemberDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  preferredName?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  emergencyContactRelationship?: string;
}

export class UpdateMemberProfileDto {
  @IsOptional()
  @IsString()
  preferredName?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  emergencyContactRelationship?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}

export class StaffUpdateMemberDto {
  @IsOptional()
  @IsEnum(['INVITED', 'ONBOARDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE', 'ARCHIVED'])
  status?: string;

  @IsOptional()
  @IsEnum(['NOT_STARTED', 'IN_PROGRESS', 'REQUIRES_ACTION', 'READY_FOR_REVIEW', 'COMPLETED'])
  onboardingStatus?: string;

  @IsOptional()
  @IsString()
  preferredName?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;
}

export class MemberFilterDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  onboardingStatus?: string;

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

// ------------------------------------------
// Onboarding DTOs
// ------------------------------------------

export class UpdateOnboardingStepDto {
  @IsEnum([
    'PROFILE',
    'PARQ',
    'HEALTH_SCREENING',
    'INJURIES',
    'CONSENTS',
    'DOCUMENTS',
    'SIGNATURE',
    'REVIEW',
    'COMPLETE',
  ])
  step: string;
}

// ------------------------------------------
// PAR-Q DTOs
// ------------------------------------------

export class ParqAnswerDto {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsNotEmpty()
  answer: Record<string, unknown>; // e.g. { "value": true } or { "value": false }

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SaveParqDraftDto {
  @IsString()
  @IsNotEmpty()
  questionnaireId: string;

  @ValidateNested({ each: true })
  @Type(() => ParqAnswerDto)
  responses: ParqAnswerDto[];
}

export class SubmitParqDto {
  @IsString()
  @IsNotEmpty()
  questionnaireId: string;

  @ValidateNested({ each: true })
  @Type(() => ParqAnswerDto)
  responses: ParqAnswerDto[];
}

// ------------------------------------------
// Consent DTOs
// ------------------------------------------

export class RecordConsentDto {
  @IsString()
  @IsNotEmpty()
  consentTypeId: string;

  @IsString()
  @IsNotEmpty()
  consentVersionId: string;

  @IsEnum(['CONSENTED', 'DECLINED'])
  status: 'CONSENTED' | 'DECLINED';
}

// ------------------------------------------
// Injury DTOs
// ------------------------------------------

export class CreateInjuryDto {
  @IsString()
  @IsNotEmpty()
  bodyArea: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'RECOVERING', 'RESOLVED'])
  status?: 'ACTIVE' | 'RECOVERING' | 'RESOLVED';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInjuryDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'RECOVERING', 'RESOLVED'])
  status?: 'ACTIVE' | 'RECOVERING' | 'RESOLVED';

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ------------------------------------------
// Signature DTOs
// ------------------------------------------

export class CreateSignatureDto {
  @IsString()
  @IsNotEmpty()
  documentType: string;

  @IsString()
  @IsNotEmpty()
  documentVersion: string;

  @IsOptional()
  @IsString()
  signatureMethod?: string;

  @IsString()
  @IsNotEmpty()
  signerName: string;
}

// ------------------------------------------
// Document DTOs
// ------------------------------------------

export class RequestDocumentUploadDto {
  @IsEnum(['MEDICAL_CLEARANCE', 'CONSENT_DOCUMENT', 'IDENTITY_DOCUMENT', 'OTHER'])
  documentType: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsInt()
  @Min(1)
  @Max(15728640) // 15MB
  size: number;
}

export class RegisterDocumentDto {
  @IsEnum(['MEDICAL_CLEARANCE', 'CONSENT_DOCUMENT', 'IDENTITY_DOCUMENT', 'OTHER'])
  documentType: string;

  @IsString()
  @IsNotEmpty()
  storageKey: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsInt()
  @Min(1)
  size: number;
}
