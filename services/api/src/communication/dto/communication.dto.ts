import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  Min,
  Max,
  IsInt,
  IsBoolean,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum NotificationCategoryEnum {
  SYSTEM = 'SYSTEM',
  SECURITY = 'SECURITY',
  MEMBERSHIP = 'MEMBERSHIP',
  PAYMENT = 'PAYMENT',
  BOOKING = 'BOOKING',
  ATTENDANCE = 'ATTENDANCE',
  TRAINING = 'TRAINING',
  NUTRITION = 'NUTRITION',
  PROGRESS = 'PROGRESS',
  COMMUNICATION = 'COMMUNICATION',
  MARKETING = 'MARKETING',
  ADMIN = 'ADMIN',
}

export enum NotificationPriorityEnum {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum NotificationStatusEnum {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum NotificationChannelEnum {
  IN_APP = 'IN_APP',
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export enum PushPlatformEnum {
  IOS = 'IOS',
  ANDROID = 'ANDROID',
  WEB = 'WEB',
}

export enum TemplateStatusEnum {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum ScheduleStatusEnum {
  SCHEDULED = 'SCHEDULED',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export class QueryNotificationsDto {
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
  @IsEnum(NotificationCategoryEnum)
  category?: NotificationCategoryEnum;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unreadOnly?: boolean = false;

  @IsOptional()
  @IsEnum(NotificationPriorityEnum)
  priority?: NotificationPriorityEnum;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class MarkNotificationReadDto {
  @IsBoolean()
  read: boolean = true;
}

export class UpdateNotificationPreferencesDto {
  @IsEnum(NotificationCategoryEnum)
  category!: NotificationCategoryEnum;

  @IsEnum(NotificationChannelEnum)
  channel!: NotificationChannelEnum;

  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'quietHoursStart must be in 24-hour format HH:mm',
  })
  quietHoursStart?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'quietHoursEnd must be in 24-hour format HH:mm',
  })
  quietHoursEnd?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}

export class RegisterPushDeviceDto {
  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @IsEnum(PushPlatformEnum)
  platform!: PushPlatformEnum;

  @IsString()
  @IsNotEmpty()
  pushToken!: string;

  @IsOptional()
  @IsString()
  appVersion?: string;

  @IsOptional()
  @IsString()
  deviceName?: string;
}

export class CreateNotificationTemplateDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(NotificationChannelEnum)
  channel!: NotificationChannelEnum;

  @IsEnum(NotificationCategoryEnum)
  category!: NotificationCategoryEnum;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  @IsNotEmpty()
  body!: string;

  @IsArray()
  @IsString({ each: true })
  variables!: string[];
}

export class UpdateNotificationTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @IsOptional()
  @IsEnum(TemplateStatusEnum)
  status?: TemplateStatusEnum;
}

export class CreateNotificationScheduleDto {
  @IsString()
  @IsNotEmpty()
  recipientUserId!: string;

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsString()
  @IsNotEmpty()
  notificationType!: string;

  @IsDateString()
  scheduledFor!: string;

  @IsOptional()
  @IsString()
  timezone?: string = 'UTC';

  @IsNotEmpty()
  payload!: Record<string, any>;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
