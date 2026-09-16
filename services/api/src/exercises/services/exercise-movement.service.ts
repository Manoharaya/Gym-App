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
import { ExerciseMediaStorageService } from './exercise-media-storage.service';
import {
  CreateMovementPhaseDto,
  UpdateMovementPhaseDto,
  ReorderMovementPhasesDto,
  AttachPhaseMediaDto,
  LinkPhaseInstructionStepsDto,
  UpdateExerciseMovementStructureDto,
} from '../dto/exercise-movement.dto';

@Injectable()
export class ExerciseMovementService {
  private readonly logger = new Logger(ExerciseMovementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly storageService: ExerciseMediaStorageService,
  ) {}

  /**
   * Helper to determine if actor is superadmin
   */
  private isSuperAdmin(actor: AuthenticatedUser): boolean {
    if (!actor) return false;
    if ((actor as any).isSuperAdmin) return true;
    return actor.roles?.some((r: any) => {
      const roleName = typeof r === 'string' ? r : (r.role || r.name);
      return roleName === 'SUPERADMIN';
    }) ?? false;
  }

  /**
   * Ensure actor has read access to an exercise
   */
  private async getExerciseForRead(exerciseId: string, organisationId: string) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found`);
    }

    if (
      exercise.organisationId &&
      exercise.organisationId !== organisationId &&
      exercise.ownershipType !== 'SYSTEM'
    ) {
      throw new ForbiddenException({
        code: 'CROSS_TENANT_ACCESS_DENIED',
        message: 'Cannot access movement data for an exercise belonging to another organisation',
      });
    }

    return exercise;
  }

  /**
   * Ensure actor is authorized to modify the target exercise and movement phases
   */
  private ensureCanModifyExercise(exercise: any, organisationId: string, actor: AuthenticatedUser) {
    if (exercise.ownershipType === 'SYSTEM' && !this.isSuperAdmin(actor)) {
      throw new ForbiddenException({
        code: 'SYSTEM_EXERCISE_IMMUTABLE',
        message: 'System exercises and movement data are immutable to tenant staff',
      });
    }

    if (exercise.organisationId && exercise.organisationId !== organisationId) {
      throw new ForbiddenException({
        code: 'CROSS_TENANT_ACCESS_DENIED',
        message: 'Cannot modify movement data for an exercise belonging to another organisation',
      });
    }
  }

  /**
   * Enrich movement phase media with signed download URL
   */
  private async enrichPhaseMedia(phase: any): Promise<any> {
    if (!phase) return phase;

    let signedUrl = phase.mediaUrl;
    let enrichedMedia = phase.media;

    if (phase.media) {
      signedUrl = phase.media.url;
      if (phase.media.storageKey) {
        try {
          const presigned = await this.storageService.getDownloadPresignedUrl(phase.media.storageKey);
          signedUrl = presigned || signedUrl;
        } catch (err) {
          this.logger.warn(`Could not generate presigned URL for phase media ${phase.media.id}: ${(err as Error).message}`);
        }
      }
      enrichedMedia = {
        ...phase.media,
        signedUrl,
      };
    }

    return {
      ...phase,
      mediaUrl: signedUrl || phase.mediaUrl,
      media: enrichedMedia,
    };
  }

  /**
   * Compile machine-readable movement intelligence for AI coaches and form analyzers
   */
  private compileAiIntelligence(exercise: any, phases: any[]) {
    return {
      exerciseId: exercise.id,
      slug: exercise.slug,
      primaryPattern: exercise.movementPattern,
      secondaryPatterns: exercise.secondaryMovementPatterns || [],
      repetitionType: exercise.repetitionType || 'REPETITION',
      tempoStructure: exercise.tempoStructure || null,
      totalPhases: phases.length,
      movementLifecycle: phases.map((p) => ({
        phaseId: p.id,
        phaseName: p.phaseName,
        phaseType: p.phaseType || 'ECCENTRIC',
        orderIndex: p.orderIndex,
        bodyPosition: p.bodyPosition || null,
        bodyOrientation: p.bodyOrientation || null,
        rangeOfMotionType: p.rangeOfMotionType || null,
        breathingPattern: p.breathingPattern || null,
        tempoSeconds: p.tempoSeconds ?? null,
        holdDurationSeconds: p.holdDurationSeconds ?? null,
        jointAlignments: p.jointAlignments || [],
        keyCheckpoints: p.keyCheckpoints || [],
        mistakeCheckpoints: (p.commonMistakes || []).map((m: any) => m.mistake),
        hasSubSecondVideoLoop: Boolean(p.videoStartTimeSeconds !== null && p.videoEndTimeSeconds !== null),
      })),
    };
  }

  /**
   * Get full movement structure and phases for an exercise
   */
  async getMovementStructure(organisationId: string, exerciseId: string, actor: AuthenticatedUser) {
    const exercise = await this.getExerciseForRead(exerciseId, organisationId);

    const phases = await this.prisma.exerciseMovementPhase.findMany({
      where: { exerciseId: exercise.id },
      orderBy: { orderIndex: 'asc' },
      include: {
        media: true,
        instructionSteps: {
          orderBy: { stepNumber: 'asc' },
        },
        commonMistakeRecords: {
          orderBy: { sortOrder: 'asc' },
        },
        safetyGuidelineRecords: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const enrichedPhases = await Promise.all(phases.map((p) => this.enrichPhaseMedia(p)));

    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      ownershipType: exercise.ownershipType,
      movementPattern: exercise.movementPattern,
      secondaryMovementPatterns: exercise.secondaryMovementPatterns || [],
      repetitionType: exercise.repetitionType || 'REPETITION',
      tempoStructure: exercise.tempoStructure || null,
      phasesCount: enrichedPhases.length,
      phases: enrichedPhases,
      aiMovementIntelligence: this.compileAiIntelligence(exercise, enrichedPhases),
    };
  }

  /**
   * Get only movement phases for an exercise
   */
  async getPhases(organisationId: string, exerciseId: string, actor: AuthenticatedUser) {
    await this.getExerciseForRead(exerciseId, organisationId);

    const phases = await this.prisma.exerciseMovementPhase.findMany({
      where: { exerciseId },
      orderBy: { orderIndex: 'asc' },
      include: {
        media: true,
        instructionSteps: {
          orderBy: { stepNumber: 'asc' },
        },
      },
    });

    return Promise.all(phases.map((p) => this.enrichPhaseMedia(p)));
  }

  /**
   * Get specific movement phase by ID
   */
  async getPhaseById(organisationId: string, exerciseId: string, phaseId: string, actor: AuthenticatedUser) {
    await this.getExerciseForRead(exerciseId, organisationId);

    const phase = await this.prisma.exerciseMovementPhase.findFirst({
      where: {
        id: phaseId,
        exerciseId,
      },
      include: {
        media: true,
        instructionSteps: {
          orderBy: { stepNumber: 'asc' },
        },
        commonMistakeRecords: true,
        safetyGuidelineRecords: true,
      },
    });

    if (!phase) {
      throw new NotFoundException(`Movement phase '${phaseId}' not found for exercise '${exerciseId}'`);
    }

    return this.enrichPhaseMedia(phase);
  }

  /**
   * Create a new movement phase
   */
  async createPhase(
    organisationId: string,
    exerciseId: string,
    dto: CreateMovementPhaseDto,
    actor: AuthenticatedUser,
  ) {
    const exercise = await this.getExerciseForRead(exerciseId, organisationId);
    this.ensureCanModifyExercise(exercise, organisationId, actor);

    // If mediaId is provided, verify it belongs to this exercise
    if (dto.mediaId) {
      const media = await this.prisma.exerciseMedia.findFirst({
        where: { id: dto.mediaId, exerciseId: exercise.id },
      });
      if (!media) {
        throw new BadRequestException(`Media '${dto.mediaId}' not found for exercise '${exercise.id}'`);
      }
    }

    // Determine orderIndex if not specified
    let orderIndex = dto.orderIndex;
    if (orderIndex === undefined || orderIndex === null) {
      const highest = await this.prisma.exerciseMovementPhase.findFirst({
        where: { exerciseId: exercise.id },
        orderBy: { orderIndex: 'desc' },
      });
      orderIndex = highest ? highest.orderIndex + 1 : 0;
    }

    const phase = await this.prisma.exerciseMovementPhase.create({
      data: {
        exerciseId: exercise.id,
        phaseName: dto.phaseName,
        phaseType: dto.phaseType || 'ECCENTRIC',
        title: dto.title || null,
        description: dto.description || null,
        orderIndex,
        cueText: dto.cueText || null,
        timestampMs: dto.timestampMs || null,
        keyCheckpoints: dto.keyCheckpoints || [],
        bodyPosition: dto.bodyPosition || null,
        bodyOrientation: dto.bodyOrientation || null,
        jointAlignments: dto.jointAlignments as any || null,
        rangeOfMotionType: dto.rangeOfMotionType || null,
        rangeOfMotionNotes: dto.rangeOfMotionNotes || null,
        breathingPattern: dto.breathingPattern || null,
        breathingNotes: dto.breathingNotes || null,
        tempoSeconds: dto.tempoSeconds ?? null,
        holdDurationSeconds: dto.holdDurationSeconds ?? null,
        visualCues: dto.visualCues as any || null,
        commonMistakes: dto.commonMistakes as any || null,
        safetyNotes: dto.safetyNotes || null,
        mediaId: dto.mediaId || null,
        mediaUrl: dto.mediaUrl || null,
        videoStartTimeSeconds: dto.videoStartTimeSeconds ?? null,
        videoEndTimeSeconds: dto.videoEndTimeSeconds ?? null,
        status: dto.status || 'PUBLISHED',
      },
      include: {
        media: true,
        instructionSteps: true,
      },
    });

    await this.auditService.log({
      action: 'EXERCISE_MOVEMENT_PHASE_CREATED',
      resource: 'EXERCISE_MOVEMENT_PHASE',
      resourceId: phase.id,
      organisationId: exercise.organisationId || organisationId,
      userId: actor.id,
      metadata: {
        exerciseId: exercise.id,
        phaseName: phase.phaseName,
        phaseType: phase.phaseType,
        orderIndex: phase.orderIndex,
      },
    });

    return this.enrichPhaseMedia(phase);
  }

  /**
   * Update an existing movement phase
   */
  async updatePhase(
    organisationId: string,
    exerciseId: string,
    phaseId: string,
    dto: UpdateMovementPhaseDto,
    actor: AuthenticatedUser,
  ) {
    const exercise = await this.getExerciseForRead(exerciseId, organisationId);
    this.ensureCanModifyExercise(exercise, organisationId, actor);

    const existingPhase = await this.prisma.exerciseMovementPhase.findFirst({
      where: { id: phaseId, exerciseId: exercise.id },
    });

    if (!existingPhase) {
      throw new NotFoundException(`Movement phase '${phaseId}' not found for exercise '${exercise.id}'`);
    }

    if (dto.mediaId) {
      const media = await this.prisma.exerciseMedia.findFirst({
        where: { id: dto.mediaId, exerciseId: exercise.id },
      });
      if (!media) {
        throw new BadRequestException(`Media '${dto.mediaId}' not found for exercise '${exercise.id}'`);
      }
    }

    const updated = await this.prisma.exerciseMovementPhase.update({
      where: { id: phaseId },
      data: {
        ...(dto.phaseName !== undefined && { phaseName: dto.phaseName }),
        ...(dto.phaseType !== undefined && { phaseType: dto.phaseType }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.orderIndex !== undefined && { orderIndex: dto.orderIndex }),
        ...(dto.cueText !== undefined && { cueText: dto.cueText }),
        ...(dto.timestampMs !== undefined && { timestampMs: dto.timestampMs }),
        ...(dto.keyCheckpoints !== undefined && { keyCheckpoints: dto.keyCheckpoints }),
        ...(dto.bodyPosition !== undefined && { bodyPosition: dto.bodyPosition }),
        ...(dto.bodyOrientation !== undefined && { bodyOrientation: dto.bodyOrientation }),
        ...(dto.jointAlignments !== undefined && { jointAlignments: dto.jointAlignments as any }),
        ...(dto.rangeOfMotionType !== undefined && { rangeOfMotionType: dto.rangeOfMotionType }),
        ...(dto.rangeOfMotionNotes !== undefined && { rangeOfMotionNotes: dto.rangeOfMotionNotes }),
        ...(dto.breathingPattern !== undefined && { breathingPattern: dto.breathingPattern }),
        ...(dto.breathingNotes !== undefined && { breathingNotes: dto.breathingNotes }),
        ...(dto.tempoSeconds !== undefined && { tempoSeconds: dto.tempoSeconds }),
        ...(dto.holdDurationSeconds !== undefined && { holdDurationSeconds: dto.holdDurationSeconds }),
        ...(dto.visualCues !== undefined && { visualCues: dto.visualCues as any }),
        ...(dto.commonMistakes !== undefined && { commonMistakes: dto.commonMistakes as any }),
        ...(dto.safetyNotes !== undefined && { safetyNotes: dto.safetyNotes }),
        ...(dto.mediaId !== undefined && { mediaId: dto.mediaId }),
        ...(dto.mediaUrl !== undefined && { mediaUrl: dto.mediaUrl }),
        ...(dto.videoStartTimeSeconds !== undefined && { videoStartTimeSeconds: dto.videoStartTimeSeconds }),
        ...(dto.videoEndTimeSeconds !== undefined && { videoEndTimeSeconds: dto.videoEndTimeSeconds }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: {
        media: true,
        instructionSteps: true,
      },
    });

    await this.auditService.log({
      action: 'EXERCISE_MOVEMENT_PHASE_UPDATED',
      resource: 'EXERCISE_MOVEMENT_PHASE',
      resourceId: updated.id,
      organisationId: exercise.organisationId || organisationId,
      userId: actor.id,
      metadata: {
        exerciseId: exercise.id,
        phaseName: updated.phaseName,
        changes: Object.keys(dto),
      },
    });

    return this.enrichPhaseMedia(updated);
  }

  /**
   * Delete a movement phase
   */
  async deletePhase(
    organisationId: string,
    exerciseId: string,
    phaseId: string,
    actor: AuthenticatedUser,
  ) {
    const exercise = await this.getExerciseForRead(exerciseId, organisationId);
    this.ensureCanModifyExercise(exercise, organisationId, actor);

    const existingPhase = await this.prisma.exerciseMovementPhase.findFirst({
      where: { id: phaseId, exerciseId: exercise.id },
    });

    if (!existingPhase) {
      throw new NotFoundException(`Movement phase '${phaseId}' not found for exercise '${exercise.id}'`);
    }

    // Unlink any instruction steps referencing this phase
    await this.prisma.exerciseInstructionStep.updateMany({
      where: { phaseId },
      data: { phaseId: null },
    });

    // Unlink any common mistakes referencing this phase
    await this.prisma.exerciseCommonMistake.updateMany({
      where: { phaseId },
      data: { phaseId: null },
    });

    // Unlink any safety guidelines referencing this phase
    await this.prisma.exerciseSafetyGuideline.updateMany({
      where: { phaseId },
      data: { phaseId: null },
    });

    await this.prisma.exerciseMovementPhase.delete({
      where: { id: phaseId },
    });

    await this.auditService.log({
      action: 'EXERCISE_MOVEMENT_PHASE_DELETED',
      resource: 'EXERCISE_MOVEMENT_PHASE',
      resourceId: phaseId,
      organisationId: exercise.organisationId || organisationId,
      userId: actor.id,
      metadata: {
        exerciseId: exercise.id,
        phaseName: existingPhase.phaseName,
      },
    });

    return { success: true, deletedPhaseId: phaseId };
  }

  /**
   * Reorder movement phases
   */
  async reorderPhases(
    organisationId: string,
    exerciseId: string,
    dto: ReorderMovementPhasesDto,
    actor: AuthenticatedUser,
  ) {
    const exercise = await this.getExerciseForRead(exerciseId, organisationId);
    this.ensureCanModifyExercise(exercise, organisationId, actor);

    const existingPhases = await this.prisma.exerciseMovementPhase.findMany({
      where: { exerciseId: exercise.id },
      select: { id: true },
    });

    const existingIds = new Set(existingPhases.map((p) => p.id));
    for (const id of dto.phaseIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(`Movement phase '${id}' does not belong to exercise '${exercise.id}'`);
      }
    }

    // Run order index updates transactionally
    await this.prisma.$transaction(
      dto.phaseIds.map((id, index) =>
        this.prisma.exerciseMovementPhase.update({
          where: { id },
          data: { orderIndex: index },
        }),
      ),
    );

    await this.auditService.log({
      action: 'EXERCISE_MOVEMENT_PHASE_REORDERED',
      resource: 'EXERCISE',
      resourceId: exercise.id,
      organisationId: exercise.organisationId || organisationId,
      userId: actor.id,
      metadata: {
        exerciseId: exercise.id,
        reorderedIds: dto.phaseIds,
      },
    });

    return this.getPhases(organisationId, exercise.id, actor);
  }

  /**
   * Attach media to a movement phase with sub-second loop boundaries
   */
  async attachPhaseMedia(
    organisationId: string,
    exerciseId: string,
    phaseId: string,
    dto: AttachPhaseMediaDto,
    actor: AuthenticatedUser,
  ) {
    const exercise = await this.getExerciseForRead(exerciseId, organisationId);
    this.ensureCanModifyExercise(exercise, organisationId, actor);

    const phase = await this.prisma.exerciseMovementPhase.findFirst({
      where: { id: phaseId, exerciseId: exercise.id },
    });

    if (!phase) {
      throw new NotFoundException(`Movement phase '${phaseId}' not found for exercise '${exercise.id}'`);
    }

    const media = await this.prisma.exerciseMedia.findFirst({
      where: { id: dto.mediaId, exerciseId: exercise.id },
    });

    if (!media) {
      throw new NotFoundException(`Exercise media '${dto.mediaId}' not found for exercise '${exercise.id}'`);
    }

    const updated = await this.prisma.exerciseMovementPhase.update({
      where: { id: phaseId },
      data: {
        mediaId: media.id,
        videoStartTimeSeconds: dto.startTimeSeconds ?? null,
        videoEndTimeSeconds: dto.endTimeSeconds ?? null,
      },
      include: {
        media: true,
      },
    });

    await this.auditService.log({
      action: 'EXERCISE_MOVEMENT_PHASE_MEDIA_ATTACHED',
      resource: 'EXERCISE_MOVEMENT_PHASE',
      resourceId: phaseId,
      organisationId: exercise.organisationId || organisationId,
      userId: actor.id,
      metadata: {
        exerciseId: exercise.id,
        mediaId: media.id,
        startTimeSeconds: dto.startTimeSeconds,
        endTimeSeconds: dto.endTimeSeconds,
      },
    });

    return this.enrichPhaseMedia(updated);
  }

  /**
   * Link instruction steps to a movement phase
   */
  async linkPhaseSteps(
    organisationId: string,
    exerciseId: string,
    phaseId: string,
    dto: LinkPhaseInstructionStepsDto,
    actor: AuthenticatedUser,
  ) {
    const exercise = await this.getExerciseForRead(exerciseId, organisationId);
    this.ensureCanModifyExercise(exercise, organisationId, actor);

    const phase = await this.prisma.exerciseMovementPhase.findFirst({
      where: { id: phaseId, exerciseId: exercise.id },
    });

    if (!phase) {
      throw new NotFoundException(`Movement phase '${phaseId}' not found for exercise '${exercise.id}'`);
    }

    // Verify all steps belong to this exercise
    const steps = await this.prisma.exerciseInstructionStep.findMany({
      where: {
        id: { in: dto.stepIds },
        exerciseId: exercise.id,
      },
      select: { id: true },
    });

    if (steps.length !== dto.stepIds.length) {
      throw new BadRequestException('One or more step IDs do not belong to this exercise');
    }

    // Update steps
    await this.prisma.exerciseInstructionStep.updateMany({
      where: { id: { in: dto.stepIds } },
      data: { phaseId: phase.id },
    });

    await this.auditService.log({
      action: 'EXERCISE_MOVEMENT_PHASE_STEPS_LINKED',
      resource: 'EXERCISE_MOVEMENT_PHASE',
      resourceId: phaseId,
      organisationId: exercise.organisationId || organisationId,
      userId: actor.id,
      metadata: {
        exerciseId: exercise.id,
        stepIds: dto.stepIds,
      },
    });

    return this.getPhaseById(organisationId, exercise.id, phaseId, actor);
  }

  /**
   * Update top-level exercise movement structure (secondary patterns, repetition type, tempo structure)
   */
  async updateExerciseMovementStructure(
    organisationId: string,
    exerciseId: string,
    dto: UpdateExerciseMovementStructureDto,
    actor: AuthenticatedUser,
  ) {
    const exercise = await this.getExerciseForRead(exerciseId, organisationId);
    this.ensureCanModifyExercise(exercise, organisationId, actor);

    await this.prisma.exercise.update({
      where: { id: exercise.id },
      data: {
        ...(dto.secondaryMovementPatterns !== undefined && {
          secondaryMovementPatterns: dto.secondaryMovementPatterns,
        }),
        ...(dto.repetitionType !== undefined && {
          repetitionType: dto.repetitionType,
        }),
        ...(dto.tempoStructure !== undefined && {
          tempoStructure: dto.tempoStructure as any,
        }),
      },
    });

    await this.auditService.log({
      action: 'EXERCISE_MOVEMENT_STRUCTURE_UPDATED',
      resource: 'EXERCISE',
      resourceId: exercise.id,
      organisationId: exercise.organisationId || organisationId,
      userId: actor.id,
      metadata: {
        exerciseId: exercise.id,
        changes: Object.keys(dto),
      },
    });

    return this.getMovementStructure(organisationId, exercise.id, actor);
  }

  /**
   * Publish all movement phases for an exercise
   */
  async publishMovementStructure(organisationId: string, exerciseId: string, actor: AuthenticatedUser) {
    const exercise = await this.getExerciseForRead(exerciseId, organisationId);
    this.ensureCanModifyExercise(exercise, organisationId, actor);

    await this.prisma.exerciseMovementPhase.updateMany({
      where: { exerciseId: exercise.id },
      data: { status: 'PUBLISHED' },
    });

    await this.auditService.log({
      action: 'EXERCISE_MOVEMENT_STRUCTURE_PUBLISHED',
      resource: 'EXERCISE',
      resourceId: exercise.id,
      organisationId: exercise.organisationId || organisationId,
      userId: actor.id,
      metadata: { exerciseId: exercise.id },
    });

    return this.getMovementStructure(organisationId, exercise.id, actor);
  }
}
