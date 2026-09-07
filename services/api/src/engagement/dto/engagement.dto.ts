import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  EngagementEventType,
  EngagementSourceType,
  HabitCategory,
  HabitFrequency,
  HabitStatus,
  ChallengeType,
  ChallengeStatus,
  RewardCategory,
  RewardStatus,
} from '@fitcore/types';

// ==========================================
// ENGAGEMENT EVENTS DTOs
// ==========================================

export class CreateEngagementEventDto {
  @IsEnum(EngagementEventType)
  eventType: EngagementEventType;

  @IsEnum(EngagementSourceType)
  sourceType: EngagementSourceType;

  @IsString()
  @IsOptional()
  sourceId?: string;

  @IsString()
  @IsOptional()
  outletId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsDateString()
  @IsOptional()
  occurredAt?: string;
}

export class QueryEngagementHistoryDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsEnum(EngagementEventType)
  @IsOptional()
  eventType?: EngagementEventType;

  @IsEnum(EngagementSourceType)
  @IsOptional()
  sourceType?: EngagementSourceType;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}

// ==========================================
// HABITS DTOs
// ==========================================

export class CreateHabitDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(HabitCategory)
  category: HabitCategory;

  @IsEnum(HabitFrequency)
  @IsOptional()
  frequency?: HabitFrequency = HabitFrequency.DAILY;

  @IsNumber()
  @Min(0.1)
  target: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean = true;
}

export class UpdateHabitDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(HabitCategory)
  @IsOptional()
  category?: HabitCategory;

  @IsNumber()
  @IsOptional()
  @Min(0.1)
  target?: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class AssignMemberHabitDto {
  @IsString()
  @IsNotEmpty()
  habitId: string;

  @IsString()
  @IsOptional()
  memberId?: string; // If trainer assigning to member, otherwise self

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(0.1)
  target?: number;

  @IsEnum(HabitFrequency)
  @IsOptional()
  frequency?: HabitFrequency;
}

export class LogHabitCompletionDto {
  @IsDateString()
  @IsNotEmpty()
  date: string; // ISO date string (e.g. "2026-09-07")

  @IsNumber()
  @Min(0)
  value: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsBoolean()
  @IsOptional()
  completed?: boolean = true;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  source?: string = 'MANUAL';
}

// ==========================================
// CHALLENGES DTOs
// ==========================================

export class CreateChallengeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ChallengeType)
  challengeType: ChallengeType;

  @IsString()
  @IsNotEmpty()
  metric: string; // e.g. WORKOUT_COUNT, ATTENDANCE_COUNT, CLASS_COUNT, HABIT_STREAK

  @IsNumber()
  @Min(1)
  target: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  periodDays?: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsEnum(ChallengeStatus)
  @IsOptional()
  status?: ChallengeStatus = ChallengeStatus.PUBLISHED;

  @IsString()
  @IsOptional()
  outletId?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  participationLimit?: number;

  @IsBoolean()
  @IsOptional()
  leaderboardEnabled?: boolean = true;
}

export class UpdateChallengeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ChallengeStatus)
  @IsOptional()
  status?: ChallengeStatus;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  target?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  participationLimit?: number;

  @IsBoolean()
  @IsOptional()
  leaderboardEnabled?: boolean;
}

export class QueryChallengesDto {
  @IsEnum(ChallengeStatus)
  @IsOptional()
  status?: ChallengeStatus;

  @IsEnum(ChallengeType)
  @IsOptional()
  challengeType?: ChallengeType;

  @IsString()
  @IsOptional()
  outletId?: string;

  @IsBoolean()
  @IsOptional()
  joinedOnly?: boolean;
}

// ==========================================
// REWARDS & BADGES DTOs
// ==========================================

export class CreateRewardDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(RewardCategory)
  @IsOptional()
  category?: RewardCategory = RewardCategory.PERK;

  @IsNumber()
  @IsOptional()
  @Min(0)
  pointsRequired?: number = 0;

  @IsNumber()
  @IsOptional()
  @Min(0)
  inventory?: number;

  @IsString()
  @IsOptional()
  outletId?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  validDays?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean = true;
}

export class UpdateRewardDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(RewardCategory)
  @IsOptional()
  category?: RewardCategory;

  @IsNumber()
  @IsOptional()
  @Min(0)
  pointsRequired?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  inventory?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class RedeemRewardDto {
  @IsString()
  @IsOptional()
  redemptionNotes?: string;
}

export class CreateBadgeDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsOptional()
  iconUrl?: string;

  @IsObject()
  criteria: Record<string, any>;
}

// ==========================================
// ANALYTICS DTOs
// ==========================================

export class QueryAnalyticsDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  outletId?: string;

  @IsString()
  @IsOptional()
  period?: 'daily' | 'weekly' | 'monthly' | 'custom' = 'weekly';
}
