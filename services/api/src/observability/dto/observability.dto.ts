import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
} from 'class-validator';

export enum AlertSeverityEnum {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AlertConditionEnum {
  GT = 'GT',
  LT = 'LT',
  EQ = 'EQ',
  GTE = 'GTE',
  LTE = 'LTE',
}

export enum IncidentSeverityEnum {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum IncidentStatusEnum {
  OPEN = 'OPEN',
  INVESTIGATING = 'INVESTIGATING',
  MITIGATED = 'MITIGATED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export class CreateAlertRuleDto {
  @IsString()
  @IsNotEmpty()
  ruleKey: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  service: string;

  @IsString()
  @IsNotEmpty()
  metricKey: string;

  @IsEnum(AlertConditionEnum)
  condition: AlertConditionEnum;

  @IsNumber()
  threshold: number;

  @IsEnum(AlertSeverityEnum)
  @IsOptional()
  severity?: AlertSeverityEnum;

  @IsNumber()
  @Min(10)
  @IsOptional()
  windowSeconds?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  cooldownMinutes?: number;
}

export class CreateIncidentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(IncidentSeverityEnum)
  @IsOptional()
  severity?: IncidentSeverityEnum;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  affectedServices?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  linkedAlertIds?: string[];
}

export class UpdateIncidentDto {
  @IsEnum(IncidentStatusEnum)
  @IsOptional()
  status?: IncidentStatusEnum;

  @IsString()
  @IsOptional()
  mitigationNotes?: string;

  @IsString()
  @IsOptional()
  eventMessage?: string;
}

export class RecordDeploymentDto {
  @IsString()
  @IsNotEmpty()
  version: string;

  @IsString()
  @IsOptional()
  commitSha?: string;

  @IsString()
  @IsOptional()
  environment?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
