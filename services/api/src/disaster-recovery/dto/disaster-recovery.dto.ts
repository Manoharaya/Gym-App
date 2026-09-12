import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

export enum BackupTypeEnum {
  FULL = 'FULL',
  INCREMENTAL_WAL = 'INCREMENTAL_WAL',
  SNAPSHOT = 'SNAPSHOT',
}

export enum BackupStorageTierEnum {
  PRIMARY = 'PRIMARY',
  REPLICATED_COLD = 'REPLICATED_COLD',
}

export enum DrSeverityEnum {
  SEV0_CRITICAL = 'SEV0_CRITICAL',
  SEV1_HIGH = 'SEV1_HIGH',
  SEV2_MODERATE = 'SEV2_MODERATE',
}

export enum DrIncidentStatusEnum {
  DECLARED = 'DECLARED',
  ASSESSING = 'ASSESSING',
  RECOVERING = 'RECOVERING',
  VALIDATING = 'VALIDATING',
  MITIGATED = 'MITIGATED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export class TriggerBackupDto {
  @IsEnum(BackupTypeEnum)
  @IsOptional()
  backupType?: BackupTypeEnum = BackupTypeEnum.FULL;

  @IsEnum(BackupStorageTierEnum)
  @IsOptional()
  storageTier?: BackupStorageTierEnum = BackupStorageTierEnum.PRIMARY;

  @IsInt()
  @Min(1)
  @Max(3650)
  @IsOptional()
  retentionDays?: number = 30;

  @IsBoolean()
  @IsOptional()
  isImmutable?: boolean = false;

  @IsString()
  @IsOptional()
  encryptionKeyId?: string = 'kms-key-fitcore-primary';

  @IsOptional()
  metadata?: Record<string, any>;
}

export class VerifyBackupDto {
  @IsString()
  @IsNotEmpty()
  backupRecordId!: string;

  @IsOptional()
  simulateCorruption?: boolean = false;
}

export class RunRestoreTestDto {
  @IsString()
  @IsNotEmpty()
  backupRecordId!: string;

  @IsString()
  @IsOptional()
  targetEnvironment?: string = 'DR_SANDBOX';
}

export class DeclareDrIncidentDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsEnum(DrSeverityEnum)
  severity!: DrSeverityEnum;

  @IsString()
  @IsNotEmpty()
  summary!: string;

  @IsInt()
  @IsOptional()
  targetRtoMinutes?: number = 60;

  @IsInt()
  @IsOptional()
  targetRpoMinutes?: number = 15;

  @IsString()
  @IsOptional()
  leadResponder?: string;
}

export class UpdateDrIncidentDto {
  @IsEnum(DrIncidentStatusEnum)
  status!: DrIncidentStatusEnum;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsInt()
  @IsOptional()
  observedRtoMinutes?: number;

  @IsInt()
  @IsOptional()
  observedRpoMinutes?: number;
}

export class ReconcilePaymentsDto {
  @IsString()
  @IsOptional()
  organisationId?: string;

  @IsInt()
  @IsOptional()
  lookbackHours?: number = 24;
}

export class EvaluateDegradedModeDto {
  @IsString()
  @IsNotEmpty()
  subsystem!: 'AI' | 'ACCESS' | 'COMMUNICATION' | 'ACCOUNTING' | 'WEARABLES';
}
