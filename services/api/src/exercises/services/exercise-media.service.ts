import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { ExerciseMediaValidatorService } from './exercise-media-validator.service';
import { ExerciseMediaStorageService } from './exercise-media-storage.service';
import {
  ExerciseMediaQueryDto,
  PresignExerciseMediaUploadDto,
  CreateExerciseMediaDto,
  UpdateExerciseMediaDto,
  DirectUploadMediaMetadataDto,
  UploadedMediaFile,
} from '../dto/exercise-media.dto';

@Injectable()
export class ExerciseMediaService {
  private readonly logger = new Logger(ExerciseMediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly validator: ExerciseMediaValidatorService,
    private readonly storageService: ExerciseMediaStorageService,
  ) {}

  /**
   * Helper to determine if the actor has privileged staff/trainer/admin roles
   */
  private isPrivilegedActor(actor: AuthenticatedUser): boolean {
    if (!actor || !actor.roles) return false;
    const privilegedRoles = [
      'SUPERADMIN',
      'ADMIN',
      'GYM_ADMIN',
      'ORGANISATION_OWNER',
      'OWNER',
      'TRAINER',
      'STAFF',
    ];
    return actor.roles.some((r: any) => {
      const roleName = typeof r === 'string' ? r : (r.role || r.name);
      return privilegedRoles.includes(roleName);
    });
  }

  /**
   * Ensure the actor is authorized to modify the target exercise
   */
  private ensureCanModifyExercise(exercise: any, organisationId: string) {
    if (exercise.ownershipType === 'SYSTEM') {
      throw new ForbiddenException({
        code: 'SYSTEM_EXERCISE_IMMUTABLE',
        message: 'System exercises and their media assets are immutable to tenants',
      });
    }

    if (exercise.organisationId && exercise.organisationId !== organisationId) {
      throw new ForbiddenException({
        code: 'CROSS_TENANT_ACCESS_DENIED',
        message: 'Cannot modify exercise belonging to another organisation',
      });
    }
  }

  /**
   * Enriches media entity with pre-signed access URL
   */
  private async enrichWithSignedUrl(media: any): Promise<any> {
    if (!media) return media;
    let signedUrl = media.url;
    let signedThumbnailUrl = media.thumbnailUrl;

    if (media.storageKey) {
      try {
        signedUrl = await this.storageService.getDownloadPresignedUrl(media.storageKey);
      } catch (err) {
        this.logger.warn(`Could not generate signed URL for key ${media.storageKey}: ${(err as Error).message}`);
      }
    }

    return {
      ...media,
      signedUrl: signedUrl || media.url,
      thumbnailUrl: signedThumbnailUrl || signedUrl || media.url,
    };
  }

  /**
   * List media gallery for an exercise with tenant isolation and role-aware filtering
   */
  async getExerciseMedia(
    organisationId: string,
    exerciseId: string,
    query: ExerciseMediaQueryDto = {},
    actor?: AuthenticatedUser,
  ) {
    const exercise = await this.prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        OR: [
          { ownershipType: 'SYSTEM' },
          { organisationId },
        ],
      },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found or not accessible`);
    }

    const isPrivileged = actor ? this.isPrivilegedActor(actor) : false;

    const where: any = {
      exerciseId,
    };

    if (query.mediaType) {
      where.mediaType = query.mediaType;
    }

    if (query.purpose) {
      where.purpose = query.purpose;
    }

    if (query.isPrimary !== undefined) {
      where.isPrimary = query.isPrimary;
    }

    // Role-aware visibility: non-privileged members only see published and READY media
    if (!isPrivileged) {
      where.isPublished = true;
      where.status = 'READY';
    } else {
      if (query.status) {
        where.status = query.status;
      }
      if (query.isPublished !== undefined) {
        where.isPublished = query.isPublished;
      }
    }

    const mediaList = await this.prisma.exerciseMedia.findMany({
      where,
      orderBy: [
        { isPrimary: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return Promise.all(mediaList.map((m) => this.enrichWithSignedUrl(m)));
  }

  /**
   * Get single media record by ID
   */
  async getMediaById(
    organisationId: string,
    mediaId: string,
    actor?: AuthenticatedUser,
  ) {
    const media = await this.prisma.exerciseMedia.findUnique({
      where: { id: mediaId },
      include: {
        exercise: true,
      },
    });

    if (!media) {
      throw new NotFoundException(`Exercise media '${mediaId}' not found`);
    }

    // Tenant boundary check
    if (media.exercise.ownershipType !== 'SYSTEM' && media.exercise.organisationId !== organisationId) {
      throw new ForbiddenException({
        code: 'CROSS_TENANT_ACCESS_DENIED',
        message: 'Media asset belongs to another organisation',
      });
    }

    const isPrivileged = actor ? this.isPrivilegedActor(actor) : false;
    if (!isPrivileged && (!media.isPublished || media.status !== 'READY')) {
      throw new NotFoundException(`Exercise media '${mediaId}' is not published`);
    }

    return this.enrichWithSignedUrl(media);
  }

  /**
   * Pre-sign media upload
   */
  async presignUpload(
    organisationId: string,
    exerciseId: string,
    dto: PresignExerciseMediaUploadDto,
    actor: AuthenticatedUser,
  ) {
    const exercise = await this.prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        OR: [{ ownershipType: 'SYSTEM' }, { organisationId }],
      },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found`);
    }

    this.ensureCanModifyExercise(exercise, organisationId);

    // Validate metadata and extension
    const validated = this.validator.validateMediaMetadata({
      filename: dto.filename,
      mimeType: dto.mimeType,
      mediaType: dto.mediaType,
      fileSize: dto.fileSize,
    });

    const storageKey = this.storageService.generateStorageKey({
      organisationId,
      exerciseId,
      mediaType: dto.mediaType,
      extension: validated.extension,
    });

    const presigned = await this.storageService.getUploadPresignedUrl({
      storageKey,
      mimeType: validated.cleanMimeType,
    });

    return {
      uploadUrl: presigned.uploadUrl,
      storageKey,
      expiresAt: presigned.expiresAt,
      mimeType: validated.cleanMimeType,
      extension: validated.extension,
      headers: presigned.headers,
      publicUrl: `/uploads/${storageKey}`,
    };
  }

  /**
   * Create media record in database and manage primary status
   */
  async createMediaRecord(
    organisationId: string,
    exerciseId: string,
    dto: CreateExerciseMediaDto,
    actor: AuthenticatedUser,
  ) {
    const exercise = await this.prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        OR: [{ ownershipType: 'SYSTEM' }, { organisationId }],
      },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found`);
    }

    this.ensureCanModifyExercise(exercise, organisationId);

    const purpose = dto.purpose ?? 'PRIMARY_DEMONSTRATION';

    // If marked as primary, reset existing primary media for that exercise & purpose
    if (dto.isPrimary) {
      await this.prisma.exerciseMedia.updateMany({
        where: {
          exerciseId,
          purpose,
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
    }

    const created = await this.prisma.exerciseMedia.create({
      data: {
        exerciseId,
        organisationId,
        mediaType: dto.mediaType,
        purpose,
        storageKey: dto.storageKey,
        mimeType: dto.mimeType,
        fileExtension: dto.fileExtension,
        fileSize: dto.fileSize ?? 0,
        durationSeconds: dto.durationSeconds,
        frameRate: dto.frameRate,
        sortOrder: dto.sortOrder ?? 0,
        isPrimary: dto.isPrimary ?? false,
        title: dto.title,
        description: dto.description,
        altText: dto.altText,
        url: dto.url ?? `/uploads/${dto.storageKey}`,
        thumbnailUrl: dto.thumbnailUrl,
        width: dto.width,
        height: dto.height,
        format3d: dto.format3d,
        modelLod: dto.modelLod,
        status: dto.status ?? 'READY',
        isPublished: dto.isPublished ?? true,
        createdByUserId: actor.id,
        updatedByUserId: actor.id,
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'EXERCISE_MEDIA_CREATED',
      resource: 'exercise_media',
      resourceId: created.id,
      metadata: {
        exerciseId,
        mediaType: created.mediaType,
        purpose: created.purpose,
        isPrimary: created.isPrimary,
        storageKey: created.storageKey,
      },
    });

    return this.enrichWithSignedUrl(created);
  }

  /**
   * Update media metadata, sortOrder, altText, or primary flag
   */
  async updateMedia(
    organisationId: string,
    mediaId: string,
    dto: UpdateExerciseMediaDto,
    actor: AuthenticatedUser,
  ) {
    const existing = await this.prisma.exerciseMedia.findUnique({
      where: { id: mediaId },
      include: { exercise: true },
    });

    if (!existing) {
      throw new NotFoundException(`Exercise media '${mediaId}' not found`);
    }

    this.ensureCanModifyExercise(existing.exercise, organisationId);

    const targetPurpose = dto.purpose ?? existing.purpose;

    // Manage primary asset uniqueness if toggled on
    if (dto.isPrimary) {
      await this.prisma.exerciseMedia.updateMany({
        where: {
          exerciseId: existing.exerciseId,
          purpose: targetPurpose,
          isPrimary: true,
          id: { not: mediaId },
        },
        data: { isPrimary: false },
      });
    }

    const updated = await this.prisma.exerciseMedia.update({
      where: { id: mediaId },
      data: {
        purpose: dto.purpose,
        sortOrder: dto.sortOrder,
        isPrimary: dto.isPrimary,
        title: dto.title,
        description: dto.description,
        altText: dto.altText,
        thumbnailUrl: dto.thumbnailUrl,
        status: dto.status,
        isPublished: dto.isPublished,
        updatedByUserId: actor.id,
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'EXERCISE_MEDIA_UPDATED',
      resource: 'exercise_media',
      resourceId: updated.id,
      metadata: {
        exerciseId: existing.exerciseId,
        changes: dto,
      },
    });

    return this.enrichWithSignedUrl(updated);
  }

  /**
   * Delete media record and remove corresponding storage file safely
   */
  async deleteMedia(
    organisationId: string,
    mediaId: string,
    actor: AuthenticatedUser,
  ) {
    const existing = await this.prisma.exerciseMedia.findUnique({
      where: { id: mediaId },
      include: { exercise: true },
    });

    if (!existing) {
      throw new NotFoundException(`Exercise media '${mediaId}' not found`);
    }

    this.ensureCanModifyExercise(existing.exercise, organisationId);

    // Delete record from database
    await this.prisma.exerciseMedia.delete({
      where: { id: mediaId },
    });

    // Coordinated storage cleanup
    if (existing.storageKey) {
      await this.storageService.deleteStorageFile(existing.storageKey);
    }

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'EXERCISE_MEDIA_DELETED',
      resource: 'exercise_media',
      resourceId: mediaId,
      metadata: {
        exerciseId: existing.exerciseId,
        storageKey: existing.storageKey,
      },
    });

    return {
      success: true,
      deletedId: mediaId,
      exerciseId: existing.exerciseId,
    };
  }

  /**
   * Transition media to published
   */
  async publishMedia(
    organisationId: string,
    mediaId: string,
    actor: AuthenticatedUser,
  ) {
    return this.updateMedia(
      organisationId,
      mediaId,
      { isPublished: true, status: 'READY' },
      actor,
    );
  }

  /**
   * Transition media to archived
   */
  async archiveMedia(
    organisationId: string,
    mediaId: string,
    actor: AuthenticatedUser,
  ) {
    return this.updateMedia(
      organisationId,
      mediaId,
      { isPublished: false, status: 'ARCHIVED' },
      actor,
    );
  }

  /**
   * Direct server-side multipart buffer upload (e.g. for development or direct upload tests)
   */
  async uploadDirectBuffer(
    organisationId: string,
    exerciseId: string,
    file: UploadedMediaFile,
    dto: DirectUploadMediaMetadataDto,
    actor: AuthenticatedUser,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file buffer uploaded');
    }

    const exercise = await this.prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        OR: [{ ownershipType: 'SYSTEM' }, { organisationId }],
      },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found`);
    }

    this.ensureCanModifyExercise(exercise, organisationId);

    // Validate metadata and extension
    const validated = this.validator.validateMediaMetadata({
      filename: file.originalname,
      mimeType: file.mimetype,
      mediaType: dto.mediaType,
      fileSize: file.size,
    });

    // Inspect magic bytes
    this.validator.verifyMagicBytes(file.buffer, validated.cleanMimeType, validated.extension);

    // Generate storage key
    const storageKey = this.storageService.generateStorageKey({
      organisationId,
      exerciseId,
      mediaType: dto.mediaType,
      extension: validated.extension,
    });

    // Save buffer to storage
    await this.storageService.saveBuffer(storageKey, file.buffer, validated.cleanMimeType);

    // Manage primary uniqueness
    const purpose = dto.purpose ?? 'PRIMARY_DEMONSTRATION';
    if (dto.isPrimary) {
      await this.prisma.exerciseMedia.updateMany({
        where: {
          exerciseId,
          purpose,
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
    }

    // Create database record
    const created = await this.prisma.exerciseMedia.create({
      data: {
        exerciseId,
        organisationId,
        mediaType: dto.mediaType,
        purpose,
        storageKey,
        mimeType: validated.cleanMimeType,
        fileExtension: validated.extension,
        fileSize: file.size,
        sortOrder: dto.sortOrder ?? 0,
        isPrimary: dto.isPrimary ?? false,
        title: dto.title || file.originalname,
        description: dto.description,
        altText: dto.altText,
        url: `/uploads/${storageKey}`,
        format3d: dto.format3d,
        modelLod: dto.modelLod,
        status: 'READY',
        isPublished: true,
        createdByUserId: actor.id,
        updatedByUserId: actor.id,
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'EXERCISE_MEDIA_UPLOADED',
      resource: 'exercise_media',
      resourceId: created.id,
      metadata: {
        exerciseId,
        storageKey,
        fileSize: file.size,
      },
    });

    return this.enrichWithSignedUrl(created);
  }
}
