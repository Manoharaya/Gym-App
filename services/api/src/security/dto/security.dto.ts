import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { StepUpAction } from '@fitcore/types';

export class EnrollMfaDto {
  @IsString()
  @IsOptional()
  label?: string;
}

export class VerifyMfaDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsBoolean()
  @IsOptional()
  isRecoveryCode?: boolean;

  @IsString()
  @IsOptional()
  challengeToken?: string;
}

export class DisableMfaDto {
  @IsString()
  @IsNotEmpty()
  stepUpToken: string;
}

export class RegenerateRecoveryCodesDto {
  @IsString()
  @IsNotEmpty()
  stepUpToken: string;
}

export class UpdateDeviceDto {
  @IsString()
  @IsNotEmpty()
  deviceName: string;
}

export class CreateIpPolicyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: 'ALLOWLIST' | 'DENYLIST';

  @IsString()
  @IsOptional()
  scopeType?: 'ORGANISATION' | 'BRAND' | 'OUTLET';

  @IsString()
  @IsOptional()
  scopeId?: string;

  @IsArray()
  @IsNotEmpty()
  targetSurfaces: string[];

  @IsArray()
  @IsNotEmpty()
  rules: Array<{ ipOrCidr: string; description?: string }>;

  @IsBoolean()
  @IsOptional()
  isHardCeiling?: boolean;
}

export class UpdateIpPolicyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE';

  @IsArray()
  @IsOptional()
  targetSurfaces?: string[];

  @IsArray()
  @IsOptional()
  rules?: Array<{ ipOrCidr: string; description?: string }>;
}

export class RequestStepUpChallengeDto {
  @IsString()
  @IsNotEmpty()
  action: StepUpAction;
}

export class VerifyStepUpChallengeDto {
  @IsString()
  @IsNotEmpty()
  challengeToken: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  mfaCode?: string;
}

export class AcknowledgeAlertDto {
  @IsString()
  @IsOptional()
  assignedTo?: string;
}

export class ResolveAlertDto {
  @IsString()
  @IsOptional()
  resolutionNotes?: string;
}

export class UpdateSecurityPolicyDto {
  @IsNotEmpty()
  value: any;

  @IsString()
  @IsOptional()
  stepUpToken?: string;
}

export class SecurityQueryDto {
  @IsString()
  @IsOptional()
  eventType?: string;

  @IsString()
  @IsOptional()
  severity?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}
