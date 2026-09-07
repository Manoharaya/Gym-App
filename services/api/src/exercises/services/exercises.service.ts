import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { STORAGE_PROVIDER, StorageProvider } from '../../storage/storage.interface';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import {
  CreateExerciseDto,
  UpdateExerciseDto,
  ExerciseQueryDto,
  AttachExerciseMediaDto,
  PresignMediaUploadDto,
} from '../dto/exercise.dto';
import { randomUUID } from 'crypto';
import * as path from 'path';

@Injectable()
export class ExercisesService {
  private readonly logger = new Logger(ExercisesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(STORAGE_PROVIDER) private readonly storageProvider: StorageProvider,
  ) {}

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Search and filter exercises accessible to an organisation:
   * System exercises (accessible to all) + Custom exercises belonging to active organisation.
   */
  async findAll(organisationId: string, query: ExerciseQueryDto) {
    const {
      search,
      muscleGroup,
      movementPattern,
      equipmentType,
      difficulty,
      exerciseType,
      ownership,
      includeArchived,
      page = 1,
      limit = 20,
    } = query;

    const where: any = {};

    // Archive filter
    if (!includeArchived) {
      where.status = 'ACTIVE';
    }

    // Ownership filter & Tenant isolation
    if (ownership === 'SYSTEM') {
      where.ownershipType = 'SYSTEM';
      where.organisationId = null;
    } else if (ownership === 'ORGANISATION') {
      where.ownershipType = 'ORGANISATION';
      where.organisationId = organisationId;
    } else {
      where.OR = [
        { ownershipType: 'SYSTEM', organisationId: null },
        { ownershipType: 'ORGANISATION', organisationId },
      ];
    }

    // Taxonomy filters
    if (muscleGroup) {
      where.primaryMuscleGroup = muscleGroup;
    }

    if (movementPattern) {
      where.movementPattern = movementPattern;
    }

    if (equipmentType) {
      where.equipment = equipmentType;
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (exerciseType) {
      where.exerciseType = exerciseType;
    }

    // Text search on name or description
    if (search && search.trim().length > 0) {
      const term = search.trim();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const skip = (page - 1) * limit;
    const [total, exercises] = await Promise.all([
      this.prisma.exercise.count({ where }),
      this.prisma.exercise.findMany({
        where,
        include: {
          media: {
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          },
        },
        orderBy: [{ ownershipType: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
    ]);

    // Sign media URLs for private storage keys if needed
    const exercisesWithSignedUrls = await Promise.all(
      exercises.map(async (ex) => ({
        ...ex,
        media: await this.resolveMediaUrls(ex.media),
      }))
    );

    return {
      items: exercisesWithSignedUrls,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find single exercise by ID ensuring tenant access
   */
  async findById(organisationId: string, id: string) {
    const exercise = await this.prisma.exercise.findFirst({
      where: {
        id,
        OR: [
          { ownershipType: 'SYSTEM', organisationId: null },
          { ownershipType: 'ORGANISATION', organisationId },
        ],
      },
      include: {
        media: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
      },
    });

    if (!exercise) {
      throw new NotFoundException({
        code: 'EXERCISE_NOT_FOUND',
        message: `Exercise '${id}' not found or not accessible`,
      });
    }

    return {
      ...exercise,
      media: await this.resolveMediaUrls(exercise.media),
    };
  }

  /**
   * Create custom organisation exercise
   */
  async create(organisationId: string, dto: CreateExerciseDto, actor: AuthenticatedUser) {
    const baseSlug = this.slugify(dto.name);
    let slug = baseSlug;
    let counter = 1;

    // Ensure slug uniqueness within organisation
    while (
      await this.prisma.exercise.findFirst({
        where: { organisationId, slug },
      })
    ) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const instructionsStr = Array.isArray(dto.instructions)
      ? dto.instructions.join('\n')
      : (dto.instructions as any) || '';

    const exercise = await this.prisma.exercise.create({
      data: {
        organisationId,
        name: dto.name,
        slug,
        description: dto.description,
        ownershipType: 'ORGANISATION',
        difficulty: dto.difficulty,
        exerciseType: dto.exerciseType,
        movementPattern: dto.movementPattern,
        primaryMuscleGroup: dto.primaryMuscleGroup,
        secondaryMuscleGroups: (dto.secondaryMuscleGroups as any) || [],
        equipment: dto.equipmentType,
        instructions: instructionsStr,
        coachingCues: (dto.coachingCues as any) || [],
        safetyNotes: dto.safetyNotes,
        status: 'ACTIVE',
        createdByUserId: actor.id,
      },
      include: {
        media: true,
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'EXERCISE_CREATED',
      resource: 'exercises',
      resourceId: exercise.id,
      metadata: {
        exerciseName: exercise.name,
        difficulty: exercise.difficulty,
        primaryMuscleGroup: exercise.primaryMuscleGroup,
      },
    });

    return exercise;
  }

  /**
   * Update custom organisation exercise.
   * System exercises are strictly immutable for organisation tenants.
   */
  async update(organisationId: string, id: string, dto: UpdateExerciseDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.exercise.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'EXERCISE_NOT_FOUND',
        message: `Exercise '${id}' not found`,
      });
    }

    if (existing.ownershipType === 'SYSTEM' || !existing.organisationId) {
      throw new ForbiddenException({
        code: 'SYSTEM_EXERCISE_IMMUTABLE',
        message: 'System exercises cannot be modified by organisations',
      });
    }

    if (existing.organisationId !== organisationId) {
      throw new NotFoundException({
        code: 'EXERCISE_NOT_FOUND',
        message: `Exercise '${id}' not found in organisation`,
      });
    }

    const instructionsStr = dto.instructions
      ? Array.isArray(dto.instructions)
        ? dto.instructions.join('\n')
        : (dto.instructions as any)
      : existing.instructions;

    const updated = await this.prisma.exercise.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        difficulty: dto.difficulty ?? existing.difficulty,
        exerciseType: dto.exerciseType ?? existing.exerciseType,
        movementPattern: dto.movementPattern ?? existing.movementPattern,
        primaryMuscleGroup: dto.primaryMuscleGroup ?? existing.primaryMuscleGroup,
        secondaryMuscleGroups: dto.secondaryMuscleGroups ? (dto.secondaryMuscleGroups as any) : existing.secondaryMuscleGroups,
        equipment: dto.equipmentType ?? existing.equipment,
        instructions: instructionsStr,
        coachingCues: dto.coachingCues ? (dto.coachingCues as any) : existing.coachingCues,
        safetyNotes: dto.safetyNotes ?? existing.safetyNotes,
      },
      include: {
        media: true,
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'EXERCISE_UPDATED',
      resource: 'exercises',
      resourceId: updated.id,
      metadata: {
        updates: dto,
      },
    });

    return updated;
  }

  /**
   * Soft-archive an exercise.
   * System exercises cannot be archived.
   */
  async archive(organisationId: string, id: string, actor: AuthenticatedUser) {
    const existing = await this.prisma.exercise.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'EXERCISE_NOT_FOUND',
        message: `Exercise '${id}' not found`,
      });
    }

    if (existing.ownershipType === 'SYSTEM' || !existing.organisationId) {
      throw new ForbiddenException({
        code: 'SYSTEM_EXERCISE_IMMUTABLE',
        message: 'System exercises cannot be archived by organisations',
      });
    }

    if (existing.organisationId !== organisationId) {
      throw new NotFoundException({
        code: 'EXERCISE_NOT_FOUND',
        message: `Exercise '${id}' not found in organisation`,
      });
    }

    const archived = await this.prisma.exercise.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'EXERCISE_ARCHIVED',
      resource: 'exercises',
      resourceId: archived.id,
      metadata: {
        exerciseName: archived.name,
      },
    });

    return archived;
  }

  /**
   * Presign media upload
   */
  async presignMediaUpload(
    organisationId: string,
    exerciseId: string,
    dto: PresignMediaUploadDto,
  ) {
    const exercise = await this.findById(organisationId, exerciseId);
    if (exercise.ownershipType === 'SYSTEM') {
      throw new ForbiddenException({
        code: 'SYSTEM_EXERCISE_IMMUTABLE',
        message: 'Cannot attach custom media to system exercises',
      });
    }

    const ext = path.extname(dto.filename) || '.bin';
    const storageKey = `organisations/${organisationId}/exercises/${exerciseId}/${Date.now()}-${randomUUID()}${ext}`;

    const signed = await this.storageProvider.getUploadSignedUrl(storageKey, dto.mimeType, 3600);

    return {
      uploadUrl: signed.uploadUrl,
      storageKey,
      expiresAt: signed.expiresAt,
      publicUrl: `/uploads/${storageKey}`,
    };
  }

  /**
   * Attach media record to an exercise
   */
  async attachMedia(
    organisationId: string,
    exerciseId: string,
    dto: AttachExerciseMediaDto,
    actor: AuthenticatedUser,
  ) {
    const exercise = await this.findById(organisationId, exerciseId);
    if (exercise.ownershipType === 'SYSTEM') {
      throw new ForbiddenException({
        code: 'SYSTEM_EXERCISE_IMMUTABLE',
        message: 'Cannot attach media to system exercises',
      });
    }

    // If setting as primary, reset existing primary media
    if (dto.isPrimary) {
      await this.prisma.exerciseMedia.updateMany({
        where: { exerciseId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const media = await this.prisma.exerciseMedia.create({
      data: {
        exerciseId,
        mediaType: dto.mediaType,
        storageKey: dto.storageKey || dto.url,
        mimeType: 'image/jpeg',
        isPrimary: dto.isPrimary ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'EXERCISE_MEDIA_ATTACHED',
      resource: 'exercises',
      resourceId: exerciseId,
      metadata: {
        mediaId: media.id,
        mediaType: media.mediaType,
      },
    });

    return media;
  }

  private async resolveMediaUrls(mediaList: any[]) {
    return Promise.all(
      mediaList.map(async (m) => {
        let viewUrl = m.storageKey;
        if (m.storageKey) {
          try {
            viewUrl = await this.storageProvider.getDownloadSignedUrl(m.storageKey, 3600);
          } catch (err) {
            this.logger.warn(`Failed to sign download URL for ${m.storageKey}: ${err.message}`);
          }
        }
        return {
          ...m,
          url: viewUrl,
          resolvedUrl: viewUrl,
        };
      })
    );
  }
}
