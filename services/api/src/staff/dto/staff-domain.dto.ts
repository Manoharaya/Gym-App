import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
  IsInt,
  IsBoolean,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

// ------------------------------------------
// Staff Employment Statuses & Assignment
// ------------------------------------------

export const STAFF_STATUSES = [
  'INVITED',
  'ACTIVE',
  'ON_LEAVE',
  'SUSPENDED',
  'INACTIVE',
  'TERMINATED',
] as const;
export type StaffEmploymentStatusEnum = (typeof STAFF_STATUSES)[number];

export const STAFF_ASSIGNMENT_STATUSES = [
  'ACTIVE',
  'INACTIVE',
  'TEMPORARY',
  'SCHEDULED',
] as const;
export type StaffAssignmentStatusEnum = (typeof STAFF_ASSIGNMENT_STATUSES)[number];

export const TRAINER_ASSIGNMENT_TYPES = [
  'PRIMARY',
  'SECONDARY',
  'TEMPORARY',
  'GROUP_COACH',
] as const;
export type TrainerAssignmentTypeEnum = (typeof TRAINER_ASSIGNMENT_TYPES)[number];

export const TRAINER_ASSIGNMENT_STATUSES = [
  'ACTIVE',
  'INACTIVE',
  'TERMINATED',
  'REASSIGNED',
] as const;
export type TrainerAssignmentStatusEnum = (typeof TRAINER_ASSIGNMENT_STATUSES)[number];

export const CERTIFICATION_STATUSES = [
  'ACTIVE',
  'EXPIRING_SOON',
  'EXPIRED',
  'REVOKED',
] as const;
export type CertificationStatusEnum = (typeof CERTIFICATION_STATUSES)[number];

// ------------------------------------------
// Staff DTOs
// ------------------------------------------

export class CreateStaffDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsString()
  @IsNotEmpty()
  jobTitle: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  employeeReference?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  workEmail?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @IsOptional()
  @IsString()
  initialOutletId?: string;

  @IsOptional()
  @IsString()
  roleName?: string;
}

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  workEmail?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  @IsOptional()
  @IsString()
  employeeReference?: string;

  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @IsOptional()
  @IsDateString()
  terminationDate?: string;
}

export class StaffStatusTransitionDto {
  @IsEnum(STAFF_STATUSES, {
    message: `status must be one of: ${STAFF_STATUSES.join(', ')}`,
  })
  status: StaffEmploymentStatusEnum;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class InviteStaffDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  roleName: string;

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsString()
  @IsNotEmpty()
  jobTitle: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  employeeReference?: string;
}

export class AcceptStaffInvitationDto {
  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class StaffOutletAssignmentDto {
  @IsString()
  @IsNotEmpty()
  outletId: string;

  @IsOptional()
  @IsString()
  roleScope?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(STAFF_ASSIGNMENT_STATUSES)
  status?: StaffAssignmentStatusEnum;
}

// ------------------------------------------
// Trainer DTOs
// ------------------------------------------

export class CreateTrainerProfileDto {
  @IsString()
  @IsNotEmpty()
  staffProfileId: string;

  @IsString()
  @IsNotEmpty()
  professionalName: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  yearsExperience?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsString()
  coachingStyle?: string;

  @IsOptional()
  @IsString()
  trainingApproach?: string;

  @IsOptional()
  @IsString()
  consultationAvailability?: string;
}

export class UpdateTrainerProfileDto {
  @IsOptional()
  @IsString()
  professionalName?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  yearsExperience?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsString()
  coachingStyle?: string;

  @IsOptional()
  @IsString()
  trainingApproach?: string;

  @IsOptional()
  @IsString()
  consultationAvailability?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateCertificationDto {
  @IsString()
  @IsNotEmpty()
  certificationName: string;

  @IsString()
  @IsNotEmpty()
  issuingOrganisation: string;

  @IsOptional()
  @IsString()
  certificationNumber?: string;

  @IsDateString()
  issueDate: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  documentReference?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;

  @IsOptional()
  documentMetadata?: Record<string, any>;
}

export class UpdateCertificationDto {
  @IsOptional()
  @IsString()
  certificationName?: string;

  @IsOptional()
  @IsString()
  issuingOrganisation?: string;

  @IsOptional()
  @IsString()
  certificationNumber?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  documentReference?: string;

  @IsOptional()
  @IsEnum(CERTIFICATION_STATUSES)
  status?: CertificationStatusEnum;
}

// ------------------------------------------
// Client Assignment DTOs
// ------------------------------------------

export class AssignClientDto {
  @IsString()
  @IsNotEmpty()
  memberProfileId: string;

  @IsOptional()
  @IsEnum(TRAINER_ASSIGNMENT_TYPES)
  assignmentType?: TrainerAssignmentTypeEnum;

  @IsOptional()
  @IsString()
  outletId?: string;

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

export class ReassignClientDto {
  @IsString()
  @IsNotEmpty()
  newTrainerId: string;

  @IsOptional()
  @IsEnum(TRAINER_ASSIGNMENT_TYPES)
  assignmentType?: TrainerAssignmentTypeEnum;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  transferNotes?: string;
}

// ------------------------------------------
// Query DTOs
// ------------------------------------------

export class QueryStaffDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  roleName?: string;

  @IsOptional()
  @IsEnum(STAFF_STATUSES)
  status?: StaffEmploymentStatusEnum;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isTrainer?: boolean;
}

export class QueryTrainersDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
