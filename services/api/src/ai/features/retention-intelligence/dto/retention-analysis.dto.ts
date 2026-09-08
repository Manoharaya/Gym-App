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
  RetentionRiskLevel,
  RetentionInterventionType,
  RetentionFollowUpTaskStatus,
  RetentionInterventionPriority,
} from '@fitcore/types';

export class AnalyzeRetentionDto {
  @ApiProperty({ description: 'Member Profile ID to analyze' })
  @IsString()
  memberId: string;

  @ApiPropertyOptional({ description: 'Optional context or specific focus query from staff' })
  @IsOptional()
  @IsString()
  promptQuery?: string;

  @ApiPropertyOptional({ description: 'Whether to bypass cache and recalculate' })
  @IsOptional()
  @IsBoolean()
  forceRecalculate?: boolean;
}

export class RetentionRiskQueryDto {
  @ApiProperty({ description: 'Member Profile ID' })
  @IsString()
  memberId: string;

  @ApiPropertyOptional({ description: 'Force recalculation' })
  @IsOptional()
  @IsBoolean()
  refresh?: boolean;
}

export class RetentionFactorsQueryDto {
  @ApiProperty({ description: 'Member Profile ID' })
  @IsString()
  memberId: string;
}

export class RetentionQueueQueryDto {
  @ApiPropertyOptional({ description: 'Filter by specific outlet ID' })
  @IsOptional()
  @IsString()
  outletId?: string;

  @ApiPropertyOptional({
    description: 'Filter by risk level',
    enum: ['INSUFFICIENT_DATA', 'LOW', 'MODERATE', 'ELEVATED', 'HIGH'],
  })
  @IsOptional()
  @IsEnum(['INSUFFICIENT_DATA', 'LOW', 'MODERATE', 'ELEVATED', 'HIGH'])
  riskLevel?: RetentionRiskLevel;

  @ApiPropertyOptional({ description: 'Filter by assigned trainer ID' })
  @IsOptional()
  @IsString()
  trainerId?: string;

  @ApiPropertyOptional({ description: 'Search member by name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page limit', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Page offset', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

export class RetentionSummaryQueryDto {
  @ApiPropertyOptional({ description: 'Filter summary by outlet ID' })
  @IsOptional()
  @IsString()
  outletId?: string;

  @ApiPropertyOptional({ description: 'Summary timeframe', default: '28d' })
  @IsOptional()
  @IsString()
  timeframe?: string = '28d';
}

export class CreateFollowUpTaskDto {
  @ApiProperty({ description: 'Target Member Profile ID' })
  @IsString()
  memberId: string;

  @ApiPropertyOptional({ description: 'Outlet ID associated with task' })
  @IsOptional()
  @IsString()
  outletId?: string;

  @ApiProperty({
    description: 'Intervention taxonomy type',
    enum: [
      'TRAINER_CHECK_IN',
      'GOAL_REVIEW',
      'TRAINING_RESTART',
      'CLASS_RECOMMENDATION',
      'PERSONAL_TRAINING_FOLLOW_UP',
      'RECOVERY_SUPPORT',
      'APP_ENGAGEMENT',
      'NUTRITION_ENGAGEMENT',
      'MEMBERSHIP_CONVERSATION',
      'GENERAL_SUPPORT',
      'NO_ACTION',
      'INSUFFICIENT_DATA',
    ],
  })
  @IsEnum([
    'TRAINER_CHECK_IN',
    'GOAL_REVIEW',
    'TRAINING_RESTART',
    'CLASS_RECOMMENDATION',
    'PERSONAL_TRAINING_FOLLOW_UP',
    'RECOVERY_SUPPORT',
    'APP_ENGAGEMENT',
    'NUTRITION_ENGAGEMENT',
    'MEMBERSHIP_CONVERSATION',
    'GENERAL_SUPPORT',
    'NO_ACTION',
    'INSUFFICIENT_DATA',
  ])
  interventionType: RetentionInterventionType;

  @ApiPropertyOptional({
    description: 'Task priority',
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'MEDIUM',
  })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  priority?: RetentionInterventionPriority = 'MEDIUM';

  @ApiPropertyOptional({ description: 'Staff user ID assigned to execute follow-up' })
  @IsOptional()
  @IsString()
  assignedStaffId?: string;

  @ApiPropertyOptional({ description: 'Title or short summary for task' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Internal staff notes or action plan' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Due date/time for follow-up' })
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional({ description: 'Task origin', default: 'AI_RECOMMENDATION' })
  @IsOptional()
  @IsString()
  source?: string = 'AI_RECOMMENDATION';
}

export class UpdateFollowUpTaskDto {
  @ApiPropertyOptional({
    description: 'Task status update',
    enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED', 'EXPIRED'],
  })
  @IsOptional()
  @IsEnum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED', 'EXPIRED'])
  status?: RetentionFollowUpTaskStatus;

  @ApiPropertyOptional({ description: 'Reassign to staff user ID' })
  @IsOptional()
  @IsString()
  assignedStaffId?: string;

  @ApiPropertyOptional({ description: 'Updated staff notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Reason for dismissal if dismissed' })
  @IsOptional()
  @IsString()
  dismissalReason?: string;
}
