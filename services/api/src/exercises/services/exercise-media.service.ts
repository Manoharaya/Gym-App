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
  CreateMediaAnnotationDto,
  UpdateMediaAnnotationDto,
  QueryMediaAnnotationsDto,
  MediaViewsGroupDto,
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

    if (query.viewAngle) {
      where.viewAngle = query.viewAngle;
    }

    if (query.phaseId) {
      where.phaseId = query.phaseId;
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
        viewAngle: dto.viewAngle,
        phaseId: dto.phaseId,
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
        viewAngle: dto.viewAngle !== undefined ? dto.viewAngle : existing.viewAngle,
        phaseId: dto.phaseId !== undefined ? dto.phaseId : existing.phaseId,
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
        viewAngle: dto.viewAngle,
        phaseId: dto.phaseId,
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

  /**
   * Get exercise media grouped by view angle with deterministic fallback
   */
  async getExerciseMediaViews(
    organisationId: string,
    exerciseId: string,
    actor?: AuthenticatedUser,
  ): Promise<MediaViewsGroupDto> {
    const mediaList = await this.getExerciseMedia(organisationId, exerciseId, {}, actor);

    const views: Record<string, any[]> = {};
    for (const m of mediaList) {
      const angle = m.viewAngle || (m.isPrimary ? 'SIDE' : 'FRONT');
      if (!views[angle]) {
        views[angle] = [];
      }
      views[angle].push(m);
    }

    const availableAngles = Object.keys(views);

    // Deterministic selection strategy:
    // 1. Primary configured angle
    // 2. Primary demonstration
    // 3. Side
    // 4. Front
    // 5. First available angle
    let defaultAngle = 'SIDE';
    const primaryMedia = mediaList.find((m) => m.isPrimary);
    if (primaryMedia?.viewAngle && views[primaryMedia.viewAngle]?.length) {
      defaultAngle = primaryMedia.viewAngle;
    } else if (views['SIDE']?.length) {
      defaultAngle = 'SIDE';
    } else if (views['FRONT']?.length) {
      defaultAngle = 'FRONT';
    } else if (availableAngles.length > 0) {
      defaultAngle = availableAngles[0]!;
    }

    return {
      defaultAngle,
      availableAngles,
      views,
      totalMedia: mediaList.length,
    };
  }

  /**
   * Get exercise media grouped by movement phases
   */
  async getExerciseMediaPhases(
    organisationId: string,
    exerciseId: string,
    actor?: AuthenticatedUser,
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

    const phases = await this.prisma.exerciseMovementPhase.findMany({
      where: { exerciseId },
      orderBy: { orderIndex: 'asc' },
    });

    const allMedia = await this.getExerciseMedia(organisationId, exerciseId, {}, actor);

    return phases.map((phase) => {
      // Find media directly linked via phaseId or phase.mediaId
      const phaseMedia = allMedia.filter(
        (m) => m.phaseId === phase.id || m.id === phase.mediaId,
      );

      const angleViews: Record<string, any[]> = {};
      for (const m of phaseMedia) {
        const angle = m.viewAngle || 'SIDE';
        if (!angleViews[angle]) {
          angleViews[angle] = [];
        }
        angleViews[angle].push(m);
      }

      return {
        phaseId: phase.id,
        phaseName: phase.phaseName,
        phaseType: phase.phaseType,
        title: phase.title,
        description: phase.description,
        orderIndex: phase.orderIndex,
        tempoSeconds: phase.tempoSeconds,
        videoStartTimeSeconds: phase.videoStartTimeSeconds,
        videoEndTimeSeconds: phase.videoEndTimeSeconds,
        media: phaseMedia,
        views: angleViews,
        availableAngles: Object.keys(angleViews),
      };
    });
  }

  /**
   * Get authored visual cue annotations for a media asset
   */
  async getMediaAnnotations(
    organisationId: string,
    mediaId: string,
    query: QueryMediaAnnotationsDto = {},
    actor?: AuthenticatedUser,
  ) {
    const media = await this.prisma.exerciseMedia.findUnique({
      where: { id: mediaId },
      include: { exercise: true },
    });

    if (!media) {
      throw new NotFoundException(`Exercise media '${mediaId}' not found`);
    }

    const isPrivileged = actor ? this.isPrivilegedActor(actor) : false;

    const where: any = { mediaId };

    if (query.phaseId) {
      where.phaseId = query.phaseId;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (!isPrivileged) {
      where.status = 'PUBLISHED';
    } else if (query.status) {
      where.status = query.status;
    }

    return this.prisma.exerciseMediaAnnotation.findMany({
      where,
      orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Create an authored visual cue annotation on a media asset
   */
  async createMediaAnnotation(
    organisationId: string,
    mediaId: string,
    dto: CreateMediaAnnotationDto,
    actor: AuthenticatedUser,
  ) {
    const media = await this.prisma.exerciseMedia.findUnique({
      where: { id: mediaId },
      include: { exercise: true },
    });

    if (!media) {
      throw new NotFoundException(`Exercise media '${mediaId}' not found`);
    }

    this.ensureCanModifyExercise(media.exercise, organisationId);

    // Validate coordinates
    if (dto.x < 0 || dto.x > 1 || dto.y < 0 || dto.y > 1) {
      throw new BadRequestException('Normalized coordinates x and y must be between 0.0 and 1.0');
    }

    if (dto.width != null && (dto.width < 0 || dto.width > 1)) {
      throw new BadRequestException('Normalized width must be between 0.0 and 1.0');
    }

    if (dto.height != null && (dto.height < 0 || dto.height > 1)) {
      throw new BadRequestException('Normalized height must be between 0.0 and 1.0');
    }

    // Validate timestamps
    if (dto.startTime != null && dto.endTime != null && dto.startTime > dto.endTime) {
      throw new BadRequestException('Annotation startTime must not be greater than endTime');
    }

    const created = await this.prisma.exerciseMediaAnnotation.create({
      data: {
        mediaId,
        organisationId,
        phaseId: dto.phaseId,
        type: dto.type,
        label: dto.label,
        description: dto.description,
        category: dto.category ?? 'ALIGNMENT',
        x: dto.x,
        y: dto.y,
        width: dto.width,
        height: dto.height,
        startTime: dto.startTime,
        endTime: dto.endTime,
        status: dto.status ?? 'PUBLISHED',
        createdByUserId: actor.id,
        updatedByUserId: actor.id,
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'MEDIA_ANNOTATION_CREATED',
      resource: 'exercise_media_annotation',
      resourceId: created.id,
      metadata: {
        mediaId,
        label: created.label,
        type: created.type,
        category: created.category,
      },
    });

    return created;
  }

  /**
   * Update an existing visual cue annotation
   */
  async updateMediaAnnotation(
    organisationId: string,
    mediaId: string,
    annotationId: string,
    dto: UpdateMediaAnnotationDto,
    actor: AuthenticatedUser,
  ) {
    const annotation = await this.prisma.exerciseMediaAnnotation.findUnique({
      where: { id: annotationId },
      include: { media: { include: { exercise: true } } },
    });

    if (!annotation || annotation.mediaId !== mediaId) {
      throw new NotFoundException(`Annotation '${annotationId}' not found on media '${mediaId}'`);
    }

    this.ensureCanModifyExercise(annotation.media.exercise, organisationId);

    if (dto.x != null && (dto.x < 0 || dto.x > 1)) {
      throw new BadRequestException('Normalized coordinate x must be between 0.0 and 1.0');
    }

    if (dto.y != null && (dto.y < 0 || dto.y > 1)) {
      throw new BadRequestException('Normalized coordinate y must be between 0.0 and 1.0');
    }

    const nextStart = dto.startTime !== undefined ? dto.startTime : annotation.startTime;
    const nextEnd = dto.endTime !== undefined ? dto.endTime : annotation.endTime;
    if (nextStart != null && nextEnd != null && nextStart > nextEnd) {
      throw new BadRequestException('Annotation startTime must not be greater than endTime');
    }

    const updated = await this.prisma.exerciseMediaAnnotation.update({
      where: { id: annotationId },
      data: {
        type: dto.type,
        label: dto.label,
        description: dto.description,
        category: dto.category,
        x: dto.x,
        y: dto.y,
        width: dto.width,
        height: dto.height,
        startTime: dto.startTime,
        endTime: dto.endTime,
        phaseId: dto.phaseId,
        status: dto.status,
        updatedByUserId: actor.id,
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'MEDIA_ANNOTATION_UPDATED',
      resource: 'exercise_media_annotation',
      resourceId: updated.id,
      metadata: {
        mediaId,
        annotationId,
      },
    });

    return updated;
  }

  /**
   * Delete an authored visual cue annotation
   */
  async deleteMediaAnnotation(
    organisationId: string,
    mediaId: string,
    annotationId: string,
    actor: AuthenticatedUser,
  ) {
    const annotation = await this.prisma.exerciseMediaAnnotation.findUnique({
      where: { id: annotationId },
      include: { media: { include: { exercise: true } } },
    });

    if (!annotation || annotation.mediaId !== mediaId) {
      throw new NotFoundException(`Annotation '${annotationId}' not found on media '${mediaId}'`);
    }

    this.ensureCanModifyExercise(annotation.media.exercise, organisationId);

    await this.prisma.exerciseMediaAnnotation.delete({
      where: { id: annotationId },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'MEDIA_ANNOTATION_DELETED',
      resource: 'exercise_media_annotation',
      resourceId: annotationId,
      metadata: { mediaId },
    });

    return { success: true, deletedId: annotationId };
  }
}
