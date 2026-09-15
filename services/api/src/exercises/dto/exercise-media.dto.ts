import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsIn,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const MEDIA_TYPES = [
  'IMAGE',
  'VIDEO',
  'ANIMATION',
  'MODEL_3D',
  'GIF',
  'THUMBNAIL',
  'ILLUSTRATION',
  'AUDIO',
  'CAPTION',
  'TRANSCRIPT',
] as const;

export const MEDIA_PURPOSES = [
  'PRIMARY_DEMONSTRATION',
  'SECONDARY_DEMONSTRATION',
  'THUMBNAIL',
  'STEP_IMAGE',
  'STEP_VIDEO',
  'MOVEMENT_PHASE',
  'COMMON_MISTAKE',
  'SAFETY',
  'EQUIPMENT',
  'ANATOMY',
  'INSTRUCTION',
  'PREVIEW',
  '3D_MODEL',
  'AUDIO_GUIDANCE',
  'CAPTION',
] as const;

export const MEDIA_STATUSES = [
  'UPLOADING',
  'PROCESSING',
  'READY',
  'FAILED',
  'ARCHIVED',
] as const;

export class ExerciseMediaQueryDto {
  @ApiPropertyOptional({ enum: MEDIA_TYPES })
  @IsOptional()
  @IsIn(MEDIA_TYPES)
  mediaType?: string;

  @ApiPropertyOptional({ enum: MEDIA_PURPOSES })
  @IsOptional()
  @IsIn(MEDIA_PURPOSES)
  purpose?: string;

  @ApiPropertyOptional({ enum: MEDIA_STATUSES })
  @IsOptional()
  @IsIn(MEDIA_STATUSES)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPublished?: boolean;
}

export class PresignExerciseMediaUploadDto {
  @ApiProperty({ example: 'barbell_bench_press_setup.mp4' })
  @IsString()
  @MaxLength(255)
  filename: string;

  @ApiProperty({ example: 'video/mp4' })
  @IsString()
  mimeType: string;

  @ApiProperty({ enum: MEDIA_TYPES, example: 'VIDEO' })
  @IsIn(MEDIA_TYPES)
  mediaType: string;

  @ApiPropertyOptional({ enum: MEDIA_PURPOSES, default: 'PRIMARY_DEMONSTRATION' })
  @IsOptional()
  @IsIn(MEDIA_PURPOSES)
  purpose?: string;

  @ApiPropertyOptional({ example: 10485760 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  fileSize?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ example: 'Barbell bench press setup view from side' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  altText?: string;

  @ApiPropertyOptional({ example: 'Setup Angle Demonstration' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CreateExerciseMediaDto {
  @ApiProperty({ enum: MEDIA_TYPES, example: 'VIDEO' })
  @IsIn(MEDIA_TYPES)
  mediaType: string;

  @ApiPropertyOptional({ enum: MEDIA_PURPOSES, default: 'PRIMARY_DEMONSTRATION' })
  @IsOptional()
  @IsIn(MEDIA_PURPOSES)
  purpose?: string = 'PRIMARY_DEMONSTRATION';

  @ApiProperty({ example: 'fitbeat/tenants/org_123/exercises/ex_456/videos/12345.mp4' })
  @IsString()
  storageKey: string;

  @ApiProperty({ example: 'video/mp4' })
  @IsString()
  mimeType: string;

  @ApiPropertyOptional({ example: 'mp4' })
  @IsOptional()
  @IsString()
  fileExtension?: string;

  @ApiPropertyOptional({ example: 15420000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  durationSeconds?: number;

  @ApiPropertyOptional({ example: 60.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  frameRate?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ example: 'Front Camera Demonstration' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Athlete executing full barbell back squat depth' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  altText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 1920 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ example: 1080 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ example: 'GLB' })
  @IsOptional()
  @IsString()
  format3d?: string;

  @ApiPropertyOptional({ example: 'HIGH' })
  @IsOptional()
  @IsString()
  modelLod?: string;

  @ApiPropertyOptional({ enum: MEDIA_STATUSES, default: 'READY' })
  @IsOptional()
  @IsIn(MEDIA_STATUSES)
  status?: string = 'READY';

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean = true;
}

export class UpdateExerciseMediaDto {
  @ApiPropertyOptional({ enum: MEDIA_PURPOSES })
  @IsOptional()
  @IsIn(MEDIA_PURPOSES)
  purpose?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  altText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ enum: MEDIA_STATUSES })
  @IsOptional()
  @IsIn(MEDIA_STATUSES)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class DirectUploadMediaMetadataDto {
  @ApiProperty({ enum: MEDIA_TYPES })
  @IsIn(MEDIA_TYPES)
  mediaType: string;

  @ApiPropertyOptional({ enum: MEDIA_PURPOSES, default: 'PRIMARY_DEMONSTRATION' })
  @IsOptional()
  @IsIn(MEDIA_PURPOSES)
  purpose?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  altText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  format3d?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelLod?: string;
}

export interface UploadedMediaFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

