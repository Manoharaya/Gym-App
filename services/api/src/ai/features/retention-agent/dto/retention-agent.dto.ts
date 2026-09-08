import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CommunicationChannel,
  RetentionRiskLevel,
  RetentionPriorityLevel,
  RetentionOutreachStatus,
  RetentionInterventionType,
  RetentionObservedOutcome,
} from '@fitcore/types';

export class AnalyzeRetentionAgentMemberDto {
  @ApiPropertyOptional({ description: 'Specific query or focus prompt from staff' })
  @IsOptional()
  @IsString()
  promptQuery?: string;

  @ApiPropertyOptional({ description: 'Force refresh analysis' })
  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;
}

export class CreateRetentionOutreachDto {
  @ApiProperty({ description: 'Member Profile ID' })
  @IsString()
  memberId: string;

  @ApiPropertyOptional({ description: 'Target outlet ID' })
  @IsOptional()
  @IsString()
  outletId?: string;

  @ApiProperty({ description: 'Intervention type' })
  @IsString()
  interventionType: RetentionInterventionType;

  @ApiProperty({ description: 'Target communication channel' })
  @IsString()
  selectedChannel: CommunicationChannel;

  @ApiProperty({ description: 'Message draft text' })
  @IsString()
  messageDraft: string;

  @ApiPropertyOptional({ description: 'Scheduled delivery time (ISO format)' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Assigned staff user ID' })
  @IsOptional()
  @IsString()
  assignedStaffId?: string;
}

export class ApproveRetentionOutreachDto {
  @ApiPropertyOptional({ description: 'Human staff edited message' })
  @IsOptional()
  @IsString()
  editedMessage?: string;

  @ApiPropertyOptional({ description: 'Selected channel override' })
  @IsOptional()
  @IsString()
  selectedChannel?: CommunicationChannel;

  @ApiPropertyOptional({ description: 'Scheduled time' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Staff internal notes' })
  @IsOptional()
  @IsString()
  staffNotes?: string;
}

export class RejectRetentionOutreachDto {
  @ApiProperty({ description: 'Staff rejection rationale' })
  @IsString()
  reason: string;
}

export class RescheduleRetentionOutreachDto {
  @ApiProperty({ description: 'New scheduled delivery time' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ description: 'Reschedule reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SubmitRetentionOutreachFeedbackDto {
  @ApiProperty({ description: 'Feedback rating' })
  @IsEnum(['HELPFUL', 'NOT_HELPFUL', 'INCORRECT', 'NOT_RELEVANT'])
  rating: 'HELPFUL' | 'NOT_HELPFUL' | 'INCORRECT' | 'NOT_RELEVANT';

  @ApiPropertyOptional({ description: 'Staff feedback comment' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class RecordRetentionOutcomeDto {
  @ApiProperty({ description: 'Retention outreach ID' })
  @IsString()
  outreachId: string;

  @ApiProperty({ description: 'Observed outcome' })
  @IsString()
  outcome: RetentionObservedOutcome;

  @ApiPropertyOptional({ description: 'Outcome context explanation' })
  @IsOptional()
  @IsString()
  outcomeReason?: string;
}

export class RetentionAgentQueueQueryDto {
  @ApiPropertyOptional({ description: 'Filter by outlet ID' })
  @IsOptional()
  @IsString()
  outletId?: string;

  @ApiPropertyOptional({ description: 'Filter by assigned staff user ID' })
  @IsOptional()
  @IsString()
  assignedStaffId?: string;

  @ApiPropertyOptional({ description: 'Filter by risk level' })
  @IsOptional()
  @IsString()
  riskLevel?: RetentionRiskLevel;

  @ApiPropertyOptional({ description: 'Filter by priority' })
  @IsOptional()
  @IsString()
  priority?: RetentionPriorityLevel;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: RetentionOutreachStatus;

  @ApiPropertyOptional({ description: 'Filter by channel' })
  @IsOptional()
  @IsString()
  channel?: CommunicationChannel;

  @ApiPropertyOptional({ description: 'Search term by name or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Max items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Pagination offset', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
