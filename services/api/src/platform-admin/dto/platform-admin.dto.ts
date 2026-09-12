import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsArray,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  OrganisationLifecycleStatus,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportTicketCategory,
  SupportMessageVisibility,
  FeatureFlagStatus,
  FeatureFlagRolloutStrategy,
  FeatureFlagScope,
  IncidentSeverity,
  IncidentStatus,
  PlatformAdminScope,
  MaintenanceModeScope,
} from '@fitcore/types';

export class QueryOrganisationsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: OrganisationLifecycleStatus | string;

  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'createdAt' | 'status' | 'slug' = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class SuspendOrganisationDto {
  @IsNotEmpty()
  @IsString()
  reason!: string;

  @IsOptional()
  @IsBoolean()
  impactAcknowledged?: boolean = true;

  @IsOptional()
  @IsString()
  stepUpToken?: string;
}

export class ReactivateOrganisationDto {
  @IsNotEmpty()
  @IsString()
  reason!: string;
}

export class ArchiveOrganisationDto {
  @IsNotEmpty()
  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  stepUpToken?: string;
}

export class ActivateOrganisationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class QueryUsageDto {
  @IsOptional()
  @IsString()
  organisationId?: string;

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  metricKey?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  period?: 'day' | 'week' | 'month';
}

export class QueryAIUsageDto {
  @IsOptional()
  @IsString()
  organisationId?: string;

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  feature?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

export class CreateSupportTicketDto {
  @IsNotEmpty()
  @IsString()
  organisationId!: string;

  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  priority?: SupportTicketPriority = 'MEDIUM';

  @IsOptional()
  @IsString()
  category?: SupportTicketCategory = 'OTHER';

  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateSupportTicketDto {
  @IsOptional()
  @IsString()
  status?: SupportTicketStatus;

  @IsOptional()
  @IsString()
  priority?: SupportTicketPriority;

  @IsOptional()
  @IsString()
  assignedToUserId?: string | null;
}

export class CreateSupportMessageDto {
  @IsNotEmpty()
  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  visibility?: SupportMessageVisibility = 'ORGANISATION';

  @IsOptional()
  @IsArray()
  attachments?: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    storageKey: string;
  }[];
}

export class AssignSupportTicketDto {
  @IsNotEmpty()
  @IsString()
  assignedToUserId!: string;
}

export class CreateFeatureFlagDto {
  @IsNotEmpty()
  @IsString()
  key!: string;

  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  defaultValue?: boolean = false;

  @IsOptional()
  @IsString()
  rolloutStrategy?: FeatureFlagRolloutStrategy = 'ALL';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number = 0;

  @IsOptional()
  @IsBoolean()
  isSecurityCritical?: boolean = false;
}

export class UpdateFeatureFlagDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: FeatureFlagStatus;

  @IsOptional()
  @IsString()
  rolloutStrategy?: FeatureFlagRolloutStrategy;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;

  @IsOptional()
  @IsString()
  stepUpToken?: string;
}

export class CreateFeatureFlagAssignmentDto {
  @IsNotEmpty()
  @IsString()
  scope!: FeatureFlagScope;

  @IsOptional()
  @IsString()
  organisationId?: string;

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdatePlatformConfigDto {
  @IsNotEmpty()
  @IsString()
  category!: string;

  @IsNotEmpty()
  value!: any;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  stepUpToken?: string;
}

export class SetMaintenanceModeDto {
  @IsNotEmpty()
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  scope?: MaintenanceModeScope = 'PLATFORM';

  @IsOptional()
  @IsString()
  targetReferenceId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  stepUpToken?: string;
}

export class CreateIncidentDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  severity?: IncidentSeverity = 'MEDIUM';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  affectedServices?: string[] = [];

  @IsOptional()
  @IsString()
  linkedTicketId?: string;

  @IsOptional()
  @IsString()
  linkedProvider?: string;
}

export class UpdateIncidentDto {
  @IsNotEmpty()
  @IsString()
  status!: IncidentStatus;

  @IsNotEmpty()
  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  severity?: IncidentSeverity;
}

export class RequestSupportAccessDto {
  @IsNotEmpty()
  @IsString()
  organisationId!: string;

  @IsOptional()
  @IsString()
  ticketId?: string;

  @IsNotEmpty()
  @IsString()
  purpose!: string;

  @IsOptional()
  @IsString()
  scope?: PlatformAdminScope = 'ORGANISATION';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(240)
  durationMinutes?: number = 30;

  @IsOptional()
  @IsBoolean()
  isBreakGlass?: boolean = false;
}

export class ApproveSupportAccessDto {
  @IsOptional()
  @IsString()
  stepUpToken?: string;
}

export class RevokeSupportAccessDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateAnnouncementDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsNotEmpty()
  @IsString()
  content!: string;

  @IsNotEmpty()
  @IsString()
  category!: 'MAINTENANCE' | 'FEATURE_RELEASE' | 'INTEGRATION_OUTAGE' | 'IMPORTANT_NOTICE';

  @IsOptional()
  @IsString()
  targetAudience?: 'ALL' | 'ORGANISATIONS' | 'SELECTED_ORGANISATIONS' = 'ALL';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetOrgIds?: string[] = [];

  @IsOptional()
  @IsString()
  expiresAt?: string;
}
