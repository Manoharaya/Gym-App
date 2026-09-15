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
  CreateInstructionStepDto,
  CreateMovementPhaseDto,
  CreateCommonMistakeDto,
  CreateSafetyGuidelineDto,
  CreateExerciseVariationDto,
  CreateEquipmentRelationDto,
} from '../dto/exercise.dto';
import type { ExerciseContentStatus } from '@fitcore/types';
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
      contentStatus,
      hasVideo,
      hasAnimation,
      hasModel3d,
      includeArchived,
      page = 1,
      limit = 20,
    } = query;

    const where: any = {};

    // Archive filter
    if (!includeArchived) {
      where.status = 'ACTIVE';
    }

    // Content Status filter
    if (contentStatus) {
      where.contentStatus = contentStatus;
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

    // Visual Media filters
    const mediaConditions: any[] = [];
    if (hasVideo) {
      mediaConditions.push({ mediaType: 'VIDEO' });
    }
    if (hasAnimation) {
      mediaConditions.push({ mediaType: 'ANIMATION' });
    }
    if (hasModel3d) {
      mediaConditions.push({ mediaType: 'MODEL_3D' });
    }
    if (mediaConditions.length > 0) {
      where.media = {
        some: {
          OR: mediaConditions,
        },
      };
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
   * Find comprehensive visual content for an exercise:
   * Media, instruction steps, movement phases, common mistakes, safety guidelines, variations, and equipment.
   */
  async findVisualContent(organisationId: string, id: string) {
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
        instructionSteps: {
          orderBy: { stepNumber: 'asc' },
        },
        movementPhases: {
          orderBy: { orderIndex: 'asc' },
        },
        commonMistakes: {
          orderBy: { sortOrder: 'asc' },
        },
        safetyGuidelines: {
          orderBy: { createdAt: 'asc' },
        },
        variationsFrom: {
          include: {
            targetExercise: {
              select: {
                id: true,
                name: true,
                slug: true,
                difficulty: true,
                primaryMuscleGroup: true,
                media: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        },
        variationsTo: {
          include: {
            baseExercise: {
              select: {
                id: true,
                name: true,
                slug: true,
                difficulty: true,
                primaryMuscleGroup: true,
                media: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        },
        equipmentRelations: {
          orderBy: { createdAt: 'asc' },
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
   * Get instruction steps and movement phases only
   */
  async getInstructionSteps(organisationId: string, id: string) {
    await this.findById(organisationId, id);

    const [steps, phases] = await Promise.all([
      this.prisma.exerciseInstructionStep.findMany({
        where: { exerciseId: id },
        orderBy: { stepNumber: 'asc' },
      }),
      this.prisma.exerciseMovementPhase.findMany({
        where: { exerciseId: id },
        orderBy: { orderIndex: 'asc' },
      }),
    ]);

    return {
      exerciseId: id,
      instructionSteps: steps,
      movementPhases: phases,
    };
  }

  /**
   * Get media collection for exercise
   */
  async getMedia(organisationId: string, id: string) {
    await this.findById(organisationId, id);

    const mediaList = await this.prisma.exerciseMedia.findMany({
      where: { exerciseId: id },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
    });

    return this.resolveMediaUrls(mediaList);
  }

  /**
   * Get variations and equipment relationships
   */
  async getRelationships(organisationId: string, id: string) {
    await this.findById(organisationId, id);

    const [variationsFrom, variationsTo, equipment] = await Promise.all([
      this.prisma.exerciseVariation.findMany({
        where: { baseExerciseId: id },
        include: {
          targetExercise: {
            select: {
              id: true,
              name: true,
              slug: true,
              difficulty: true,
              primaryMuscleGroup: true,
              media: { where: { isPrimary: true }, take: 1 },
            },
          },
        },
      }),
      this.prisma.exerciseVariation.findMany({
        where: { targetExerciseId: id },
        include: {
          baseExercise: {
            select: {
              id: true,
              name: true,
              slug: true,
              difficulty: true,
              primaryMuscleGroup: true,
              media: { where: { isPrimary: true }, take: 1 },
            },
          },
        },
      }),
      this.prisma.exerciseEquipmentRelation.findMany({
        where: { exerciseId: id },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      exerciseId: id,
      variations: variationsFrom,
      referencedAsVariationIn: variationsTo,
      equipment,
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
        contentStatus: dto.contentStatus ?? 'PUBLISHED',
        breathingInstructions: dto.breathingInstructions,
        tempo: dto.tempo,
        rangeOfMotion: dto.rangeOfMotion,
        stabilizerMuscles: dto.stabilizerMuscles ? (dto.stabilizerMuscles as any) : undefined,
        educationalTips: dto.educationalTips ? (dto.educationalTips as any) : undefined,
        movementPatternMetadata: dto.movementPatternMetadata ? (dto.movementPatternMetadata as any) : undefined,
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

    this.ensureCanModify(existing, organisationId);

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
        contentStatus: dto.contentStatus ?? existing.contentStatus,
        breathingInstructions: dto.breathingInstructions ?? existing.breathingInstructions,
        tempo: dto.tempo ?? existing.tempo,
        rangeOfMotion: dto.rangeOfMotion ?? existing.rangeOfMotion,
        stabilizerMuscles: dto.stabilizerMuscles ? (dto.stabilizerMuscles as any) : existing.stabilizerMuscles,
        educationalTips: dto.educationalTips ? (dto.educationalTips as any) : existing.educationalTips,
        movementPatternMetadata: dto.movementPatternMetadata ? (dto.movementPatternMetadata as any) : existing.movementPatternMetadata,
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
   * Add step-by-step instruction step to exercise
   */
  async addInstructionStep(
    organisationId: string,
    exerciseId: string,
    dto: CreateInstructionStepDto,
    actor: AuthenticatedUser,
  ) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found`);
    }
    this.ensureCanModify(exercise, organisationId);

    const step = await this.prisma.exerciseInstructionStep.create({
      data: {
        exerciseId,
        stepNumber: dto.stepNumber,
        phase: dto.phase,
        title: dto.title,
        description: dto.description,
        coachingCue: dto.coachingCue,
        mediaUrl: dto.mediaUrl,
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'EXERCISE_INSTRUCTION_ADDED',
      resource: 'exercises',
      resourceId: exerciseId,
      metadata: { stepId: step.id, stepNumber: step.stepNumber },
    });

    return step;
  }

  /**
   * Add movement phase to exercise
   */
  async addMovementPhase(
    organisationId: string,
    exerciseId: string,
    dto: CreateMovementPhaseDto,
    actor: AuthenticatedUser,
  ) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found`);
    }
    this.ensureCanModify(exercise, organisationId);

    const phase = await this.prisma.exerciseMovementPhase.create({
      data: {
        exerciseId,
        phaseName: dto.phaseName,
        orderIndex: dto.orderIndex,
        cueText: dto.cueText,
        timestampMs: dto.timestampMs,
        keyCheckpoints: dto.keyCheckpoints ? (dto.keyCheckpoints as any) : undefined,
        mediaUrl: dto.mediaUrl,
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'EXERCISE_PHASE_ADDED',
      resource: 'exercises',
      resourceId: exerciseId,
      metadata: { phaseId: phase.id, phaseName: phase.phaseName },
    });

    return phase;
  }

  /**
   * Add common mistake to exercise
   */
  async addCommonMistake(
    organisationId: string,
    exerciseId: string,
    dto: CreateCommonMistakeDto,
    actor: AuthenticatedUser,
  ) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found`);
    }
    this.ensureCanModify(exercise, organisationId);

    const mistake = await this.prisma.exerciseCommonMistake.create({
      data: {
        exerciseId,
        mistake: dto.mistake,
        consequence: dto.consequence,
        correction: dto.correction,
        severity: dto.severity ?? 'MODERATE',
        mediaUrl: dto.mediaUrl,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'EXERCISE_MISTAKE_ADDED',
      resource: 'exercises',
      resourceId: exerciseId,
      metadata: { mistakeId: mistake.id, severity: mistake.severity },
    });

    return mistake;
  }

  /**
   * Add safety guideline to exercise
   */
  async addSafetyGuideline(
    organisationId: string,
    exerciseId: string,
    dto: CreateSafetyGuidelineDto,
    actor: AuthenticatedUser,
  ) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found`);
    }
    this.ensureCanModify(exercise, organisationId);

    const guideline = await this.prisma.exerciseSafetyGuideline.create({
      data: {
        exerciseId,
        category: dto.category ?? 'GENERAL_PRECAUTION',
        title: dto.title,
        description: dto.description,
        severity: dto.severity ?? 'STANDARD',
        reviewedBy: dto.reviewedBy,
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'EXERCISE_SAFETY_ADDED',
      resource: 'exercises',
      resourceId: exerciseId,
      metadata: { guidelineId: guideline.id, severity: guideline.severity },
    });

    return guideline;
  }

  /**
   * Add exercise variation relationship
   */
  async addVariation(
    organisationId: string,
    exerciseId: string,
    dto: CreateExerciseVariationDto,
    actor: AuthenticatedUser,
  ) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found`);
    }
    this.ensureCanModify(exercise, organisationId);

    const target = await this.prisma.exercise.findUnique({ where: { id: dto.targetExerciseId } });
    if (!target) {
      throw new NotFoundException(`Target exercise '${dto.targetExerciseId}' not found`);
    }

    const variation = await this.prisma.exerciseVariation.upsert({
      where: {
        baseExerciseId_targetExerciseId_relationshipType: {
          baseExerciseId: exerciseId,
          targetExerciseId: dto.targetExerciseId,
          relationshipType: dto.relationshipType,
        },
      },
      update: {
        notes: dto.notes,
      },
      create: {
        baseExerciseId: exerciseId,
        targetExerciseId: dto.targetExerciseId,
        relationshipType: dto.relationshipType,
        notes: dto.notes,
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'EXERCISE_VARIATION_ADDED',
      resource: 'exercises',
      resourceId: exerciseId,
      metadata: { targetExerciseId: dto.targetExerciseId, type: dto.relationshipType },
    });

    return variation;
  }

  /**
   * Add equipment relation
   */
  async addEquipmentRelation(
    organisationId: string,
    exerciseId: string,
    dto: CreateEquipmentRelationDto,
    actor: AuthenticatedUser,
  ) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found`);
    }
    this.ensureCanModify(exercise, organisationId);

    const relation = await this.prisma.exerciseEquipmentRelation.create({
      data: {
        exerciseId,
        equipmentName: dto.equipmentName,
        isOptional: dto.isOptional ?? false,
        notes: dto.notes,
      },
    });

    return relation;
  }

  /**
   * Update content publishing status
   */
  async updateContentStatus(
    organisationId: string,
    exerciseId: string,
    status: ExerciseContentStatus,
    actor: AuthenticatedUser,
  ) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found`);
    }
    this.ensureCanModify(exercise, organisationId);

    const updated = await this.prisma.exercise.update({
      where: { id: exerciseId },
      data: { contentStatus: status },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'EXERCISE_STATUS_UPDATED',
      resource: 'exercises',
      resourceId: exerciseId,
      metadata: { previousStatus: exercise.contentStatus, newStatus: status },
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

    this.ensureCanModify(existing, organisationId);

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
        mimeType: dto.mediaType === 'VIDEO' ? 'video/mp4' : 'image/jpeg',
        url: dto.url,
        thumbnailUrl: dto.thumbnailUrl,
        title: dto.title,
        description: dto.description,
        width: dto.width,
        height: dto.height,
        format3d: dto.format3d,
        modelLod: dto.modelLod,
        isPublished: dto.isPublished ?? true,
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

  private ensureCanModify(exercise: any, organisationId: string) {
    if (exercise.ownershipType === 'SYSTEM' || !exercise.organisationId) {
      throw new ForbiddenException({
        code: 'SYSTEM_EXERCISE_IMMUTABLE',
        message: 'System exercises cannot be modified by organisations',
      });
    }

    if (exercise.organisationId !== organisationId) {
      throw new NotFoundException({
        code: 'EXERCISE_NOT_FOUND',
        message: `Exercise '${exercise.id}' not found in organisation`,
      });
    }
  }

  private async resolveMediaUrls(mediaList: any[]) {
    return Promise.all(
      mediaList.map(async (m) => {
        let viewUrl = m.url || m.storageKey;
        if (m.storageKey && !m.storageKey.startsWith('http')) {
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
