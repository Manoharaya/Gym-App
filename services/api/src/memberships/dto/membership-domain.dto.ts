import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EntitlementInputDto {
  @ApiProperty({ example: 'GYM_ACCESS' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: 'Unlimited Gym Access' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Full access to weights and cardio floor' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: null })
  @IsNumber()
  @IsOptional()
  value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateMembershipPlanDto {
  @ApiProperty({ example: 'Second Wind Premium' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'All-inclusive multi-outlet access' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'SW-PREM-M' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ example: 'ACTIVE', enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'] })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ example: 'STANDARD', enum: ['STANDARD', 'TRIAL', 'INTRODUCTORY', 'CORPORATE', 'STUDENT', 'FAMILY', 'CUSTOM'] })
  @IsString()
  @IsOptional()
  membershipType?: string;

  @ApiPropertyOptional({ example: 'RECURRING', enum: ['ONE_TIME', 'RECURRING'] })
  @IsString()
  @IsOptional()
  billingType?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  durationValue: number;

  @ApiProperty({ example: 'MONTH', enum: ['DAY', 'WEEK', 'MONTH', 'YEAR'] })
  @IsString()
  @IsNotEmpty()
  durationUnit: string;

  @ApiProperty({ example: 119.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 'AUD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: null })
  @IsNumber()
  @IsOptional()
  trialDuration?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ example: ['outlet_id_1', 'outlet_id_2'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  outletIds?: string[];

  @ApiPropertyOptional({ type: [EntitlementInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntitlementInputDto)
  @IsOptional()
  entitlements?: EntitlementInputDto[];
}

export class UpdateMembershipPlanDto {
  @ApiPropertyOptional({ example: 'Second Wind Premium' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'] })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  outletIds?: string[];

  @ApiPropertyOptional({ type: [EntitlementInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntitlementInputDto)
  @IsOptional()
  entitlements?: EntitlementInputDto[];
}

export class AssignMembershipDto {
  @ApiProperty({ example: 'clx...' })
  @IsString()
  @IsNotEmpty()
  memberProfileId: string;

  @ApiProperty({ example: 'clx...' })
  @IsString()
  @IsNotEmpty()
  membershipPlanId: string;

  @ApiPropertyOptional({ example: '2026-09-07T00:00:00.000Z' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: 'ALL_ORGANISATION_OUTLETS', enum: ['SINGLE_OUTLET', 'MULTI_OUTLET', 'ALL_ORGANISATION_OUTLETS'] })
  @IsString()
  @IsOptional()
  accessScope?: string;

  @ApiPropertyOptional({ example: 'clx...' })
  @IsString()
  @IsOptional()
  originOutletId?: string;

  @ApiPropertyOptional({ example: ['outlet_id_1'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  outletIds?: string[];

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean;
}

export class UpdateMembershipDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsString()
  @IsOptional()
  endDate?: string;
}

export class LifecycleActionDto {
  @ApiPropertyOptional({ example: 'Member requested temporary medical suspension' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ example: '2026-10-07T00:00:00.000Z' })
  @IsString()
  @IsOptional()
  newEndDate?: string;
}

export class CheckAccessDto {
  @ApiProperty({ example: 'clx...' })
  @IsString()
  @IsNotEmpty()
  memberProfileId: string;

  @ApiProperty({ example: 'clx...' })
  @IsString()
  @IsNotEmpty()
  outletId: string;

  @ApiPropertyOptional({ example: 'GYM_ACCESS' })
  @IsString()
  @IsOptional()
  entitlementType?: string;
}

export class MembershipQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  memberProfileId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  outletId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;
}
