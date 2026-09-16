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
  UpsertExerciseInstructionDto,
  CreateExerciseInstructionStepDto,
  UpdateExerciseInstructionStepDto,
  ReorderInstructionStepsDto,
  AttachStepMediaDto,
} from '../dto/exercise-instructions.dto';

@Injectable()
export class ExerciseInstructionsService {
  private readonly logger = new Logger(ExerciseInstructionsService.name);

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
   * Ensure the actor is authorized to modify the target exercise and its instructions
   */
  private ensureCanModifyExercise(exercise: any, organisationId: string, actor: AuthenticatedUser) {
    if (exercise.ownershipType === 'SYSTEM' && !this.isSuperAdmin(actor)) {
      throw new ForbiddenException({
        code: 'SYSTEM_EXERCISE_IMMUTABLE',
        message: 'System exercises and their instructions are immutable to tenant staff',
      });
    }

    if (exercise.organisationId && exercise.organisationId !== organisationId) {
      throw new ForbiddenException({
        code: 'CROSS_TENANT_ACCESS_DENIED',
        message: 'Cannot modify instructions for an exercise belonging to another organisation',
      });
    }
  }

  /**
   * Helper to enrich media associated with steps with signed URLs
   */
  private async enrichStepMedia(step: any): Promise<any> {
    if (!step) return step;
    if (!step.media) return step;

    let signedUrl = step.media.url;
    let signedThumbnailUrl = step.media.thumbnailUrl;

    if (step.media.storageKey) {
      try {
        signedUrl = await this.storageService.getDownloadPresignedUrl(step.media.storageKey);
      } catch (err) {
        this.logger.warn(`Could not generate signed URL for media ${step.media.id}: ${(err as Error).message}`);
      }
    }

    return {
      ...step,
      mediaUrl: step.mediaUrl || signedUrl || step.media.url,
      media: {
        ...step.media,
        signedUrl: signedUrl || step.media.url,
        thumbnailUrl: signedThumbnailUrl || signedUrl || step.media.url,
      },
    };
  }

  /**
   * Helper to ensure an ExerciseInstruction parent entity exists for an exercise
   */
  private async ensureInstructionEntity(exercise: any, actor: AuthenticatedUser): Promise<any> {
    const existing = await this.prisma.exerciseInstruction.findUnique({
      where: { exerciseId: exercise.id },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.exerciseInstruction.create({
      data: {
        exerciseId: exercise.id,
        organisationId: exercise.organisationId,
        title: `${exercise.name} Step-by-Step Guide`,
        overview: exercise.description || null,
        preparationGuide: exercise.setupInstructions || null,
        startingPosition: exercise.bodyPosition || null,
        executionSummary: exercise.executionInstructions || null,
        breathingSummary: exercise.breathingInstructions || null,
        safetySummary: exercise.safetyNotes || null,
        status: 'DRAFT',
        version: 1,
        createdByUserId: actor.id,
      },
    });
  }

  /**
   * Get exercise instruction sequence with all ordered steps and enriched media
   */
  async getInstruction(organisationId: string, exerciseId: string, actor?: AuthenticatedUser) {
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

    let instruction = await this.prisma.exerciseInstruction.findUnique({
      where: { exerciseId },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
          include: { media: true },
        },
      },
    });

    // Backward compatibility: If no ExerciseInstruction master record exists yet,
    // look for standalone ExerciseInstructionStep records created previously
    if (!instruction) {
      const standaloneSteps = await this.prisma.exerciseInstructionStep.findMany({
        where: { exerciseId },
        orderBy: { stepNumber: 'asc' },
        include: { media: true },
      });

      const enrichedSteps = await Promise.all(
        standaloneSteps.map((step) => this.enrichStepMedia(step)),
      );

      return {
        id: `inst-${exercise.id}`,
        exerciseId: exercise.id,
        organisationId: exercise.organisationId,
        title: `${exercise.name} Guide`,
        overview: exercise.description || null,
        preparationGuide: exercise.setupInstructions || null,
        startingPosition: exercise.bodyPosition || null,
        executionSummary: exercise.executionInstructions || null,
        breathingSummary: exercise.breathingInstructions || null,
        completionSummary: null,
        safetySummary: exercise.safetyNotes || null,
        status: 'PUBLISHED',
        version: 1,
        createdAt: exercise.createdAt,
        updatedAt: exercise.updatedAt,
        steps: enrichedSteps,
      };
    }

    // Enrich steps with signed URLs
    const enrichedSteps = await Promise.all(
      instruction.steps.map((step) => this.enrichStepMedia(step)),
    );

    return {
      ...instruction,
      steps: enrichedSteps,
    };
  }

  /**
   * Upsert master instruction guide overview & metadata
   */
  async upsertInstruction(
    organisationId: string,
    exerciseId: string,
    dto: UpsertExerciseInstructionDto,
    actor: AuthenticatedUser,
  ) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found`);
    }

    this.ensureCanModifyExercise(exercise, organisationId, actor);

    const instruction = await this.prisma.exerciseInstruction.upsert({
      where: { exerciseId },
      update: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.overview !== undefined && { overview: dto.overview }),
        ...(dto.preparationGuide !== undefined && { preparationGuide: dto.preparationGuide }),
        ...(dto.startingPosition !== undefined && { startingPosition: dto.startingPosition }),
        ...(dto.executionSummary !== undefined && { executionSummary: dto.executionSummary }),
        ...(dto.breathingSummary !== undefined && { breathingSummary: dto.breathingSummary }),
        ...(dto.completionSummary !== undefined && { completionSummary: dto.completionSummary }),
        ...(dto.safetySummary !== undefined && { safetySummary: dto.safetySummary }),
        ...(dto.status !== undefined && { status: dto.status }),
        updatedByUserId: actor.id,
        version: { increment: 1 },
      },
      create: {
        exerciseId,
        organisationId: exercise.organisationId || organisationId,
        title: dto.title || `${exercise.name} Step-by-Step Guide`,
        overview: dto.overview || exercise.description,
        preparationGuide: dto.preparationGuide || exercise.setupInstructions,
        startingPosition: dto.startingPosition || exercise.bodyPosition,
        executionSummary: dto.executionSummary || exercise.executionInstructions,
        breathingSummary: dto.breathingSummary || exercise.breathingInstructions,
        completionSummary: dto.completionSummary,
        safetySummary: dto.safetySummary || exercise.safetyNotes,
        status: dto.status || 'DRAFT',
        version: 1,
        createdByUserId: actor.id,
      },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
          include: { media: true },
        },
      },
    });

    await this.auditService.log({
      userId: actor.id,
      action: 'EXERCISE_INSTRUCTION_UPSERTED',
      resource: 'EXERCISE_INSTRUCTION',
      resourceId: instruction.id,
      organisationId,
      metadata: { exerciseId, version: instruction.version },
    });

    const enrichedSteps = await Promise.all(
      instruction.steps.map((step) => this.enrichStepMedia(step)),
    );

    return {
      ...instruction,
      steps: enrichedSteps,
    };
  }

  /**
   * Create an individual instruction step with movement phase, cues, and optional media binding
   */
  async createStep(
    organisationId: string,
    exerciseId: string,
    dto: CreateExerciseInstructionStepDto,
    actor: AuthenticatedUser,
  ) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found`);
    }

    this.ensureCanModifyExercise(exercise, organisationId, actor);

    // Validate video timestamp offsets if provided
    if (
      dto.videoStartTimeSeconds !== undefined &&
      dto.videoEndTimeSeconds !== undefined &&
      dto.videoStartTimeSeconds > dto.videoEndTimeSeconds
    ) {
      throw new BadRequestException('videoStartTimeSeconds cannot be greater than videoEndTimeSeconds');
    }

    // Ensure parent instruction exists
    const instruction = await this.ensureInstructionEntity(exercise, actor);

    // If mediaId provided, verify media exists and is attached to this exercise
    let mediaUrl = dto.mediaUrl;
    if (dto.mediaId) {
      const media = await this.prisma.exerciseMedia.findFirst({
        where: {
          id: dto.mediaId,
          exerciseId,
        },
      });

      if (!media) {
        throw new BadRequestException(`Media asset '${dto.mediaId}' does not belong to exercise '${exerciseId}'`);
      }
      mediaUrl = mediaUrl || (media.url ?? undefined);
    }

    // If stepNumber conflicts with existing steps, shift subsequent steps up
    const existingAtStep = await this.prisma.exerciseInstructionStep.findFirst({
      where: { exerciseId, stepNumber: dto.stepNumber },
    });

    if (existingAtStep) {
      await this.prisma.exerciseInstructionStep.updateMany({
        where: { exerciseId, stepNumber: { gte: dto.stepNumber } },
        data: { stepNumber: { increment: 1 } },
      });
    }

    const step = await this.prisma.exerciseInstructionStep.create({
      data: {
        exerciseId,
        instructionId: instruction.id,
        stepNumber: dto.stepNumber,
        stepType: dto.stepType || 'EXECUTION',
        phase: dto.phase,
        title: dto.title,
        description: dto.description,
        detailedInstruction: dto.detailedInstruction,
        coachingCue: dto.coachingCue,
        movementPhase: dto.movementPhase,
        bodyPosition: dto.bodyPosition,
        breathing: dto.breathing,
        tempo: dto.tempo,
        durationSeconds: dto.durationSeconds,
        holdDurationSeconds: dto.holdDurationSeconds,
        repetitions: dto.repetitions,
        visualCue: dto.visualCue,
        visualCueCategory: dto.visualCueCategory,
        trainerTip: dto.trainerTip,
        safetyNote: dto.safetyNote,
        mediaId: dto.mediaId,
        mediaUrl,
        videoStartTimeSeconds: dto.videoStartTimeSeconds,
        videoEndTimeSeconds: dto.videoEndTimeSeconds,
        status: 'DRAFT',
      },
      include: { media: true },
    });

    await this.auditService.log({
      userId: actor.id,
      action: 'EXERCISE_INSTRUCTION_STEP_CREATED',
      resource: 'EXERCISE_INSTRUCTION_STEP',
      resourceId: step.id,
      organisationId,
      metadata: { exerciseId, stepNumber: step.stepNumber },
    });

    return this.enrichStepMedia(step);
  }

  /**
   * Update an existing instruction step
   */
  async updateStep(
    organisationId: string,
    stepId: string,
    dto: UpdateExerciseInstructionStepDto,
    actor: AuthenticatedUser,
  ) {
    const step = await this.prisma.exerciseInstructionStep.findUnique({
      where: { id: stepId },
      include: { exercise: true, media: true },
    });

    if (!step) {
      throw new NotFoundException(`Instruction step '${stepId}' not found`);
    }

    this.ensureCanModifyExercise(step.exercise, organisationId, actor);

    const effectiveStart = dto.videoStartTimeSeconds !== undefined ? dto.videoStartTimeSeconds : step.videoStartTimeSeconds;
    const effectiveEnd = dto.videoEndTimeSeconds !== undefined ? dto.videoEndTimeSeconds : step.videoEndTimeSeconds;

    if (effectiveStart != null && effectiveEnd != null && effectiveStart > effectiveEnd) {
      throw new BadRequestException('videoStartTimeSeconds cannot be greater than videoEndTimeSeconds');
    }

    let mediaUrl: string | null | undefined = dto.mediaUrl !== undefined ? dto.mediaUrl : step.mediaUrl;
    if (dto.mediaId && dto.mediaId !== step.mediaId) {
      const media = await this.prisma.exerciseMedia.findFirst({
        where: {
          id: dto.mediaId,
          exerciseId: step.exerciseId,
        },
      });

      if (!media) {
        throw new BadRequestException(`Media asset '${dto.mediaId}' does not belong to exercise '${step.exerciseId}'`);
      }
      mediaUrl = mediaUrl || media.url || null;
    }

    const updated = await this.prisma.exerciseInstructionStep.update({
      where: { id: stepId },
      data: {
        ...(dto.stepNumber !== undefined && { stepNumber: dto.stepNumber }),
        ...(dto.stepType !== undefined && { stepType: dto.stepType }),
        ...(dto.phase !== undefined && { phase: dto.phase }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.detailedInstruction !== undefined && { detailedInstruction: dto.detailedInstruction }),
        ...(dto.coachingCue !== undefined && { coachingCue: dto.coachingCue }),
        ...(dto.movementPhase !== undefined && { movementPhase: dto.movementPhase }),
        ...(dto.bodyPosition !== undefined && { bodyPosition: dto.bodyPosition }),
        ...(dto.breathing !== undefined && { breathing: dto.breathing }),
        ...(dto.tempo !== undefined && { tempo: dto.tempo }),
        ...(dto.durationSeconds !== undefined && { durationSeconds: dto.durationSeconds }),
        ...(dto.holdDurationSeconds !== undefined && { holdDurationSeconds: dto.holdDurationSeconds }),
        ...(dto.repetitions !== undefined && { repetitions: dto.repetitions }),
        ...(dto.visualCue !== undefined && { visualCue: dto.visualCue }),
        ...(dto.visualCueCategory !== undefined && { visualCueCategory: dto.visualCueCategory }),
        ...(dto.trainerTip !== undefined && { trainerTip: dto.trainerTip }),
        ...(dto.safetyNote !== undefined && { safetyNote: dto.safetyNote }),
        ...(dto.mediaId !== undefined && { mediaId: dto.mediaId }),
        ...(mediaUrl !== undefined && { mediaUrl }),
        ...(dto.videoStartTimeSeconds !== undefined && { videoStartTimeSeconds: dto.videoStartTimeSeconds }),
        ...(dto.videoEndTimeSeconds !== undefined && { videoEndTimeSeconds: dto.videoEndTimeSeconds }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: { media: true },
    });

    await this.auditService.log({
      userId: actor.id,
      action: 'EXERCISE_INSTRUCTION_STEP_UPDATED',
      resource: 'EXERCISE_INSTRUCTION_STEP',
      resourceId: updated.id,
      organisationId,
      metadata: { exerciseId: step.exerciseId, stepNumber: updated.stepNumber },
    });

    return this.enrichStepMedia(updated);
  }

  /**
   * Delete an instruction step and re-index subsequent steps to keep sequences contiguous
   */
  async deleteStep(organisationId: string, stepId: string, actor: AuthenticatedUser) {
    const step = await this.prisma.exerciseInstructionStep.findUnique({
      where: { id: stepId },
      include: { exercise: true },
    });

    if (!step) {
      throw new NotFoundException(`Instruction step '${stepId}' not found`);
    }

    this.ensureCanModifyExercise(step.exercise, organisationId, actor);

    await this.prisma.$transaction(async (tx) => {
      await tx.exerciseInstructionStep.delete({
        where: { id: stepId },
      });

      // Renumber subsequent steps
      const subsequentSteps = await tx.exerciseInstructionStep.findMany({
        where: {
          exerciseId: step.exerciseId,
          stepNumber: { gt: step.stepNumber },
        },
        orderBy: { stepNumber: 'asc' },
      });

      for (const s of subsequentSteps) {
        await tx.exerciseInstructionStep.update({
          where: { id: s.id },
          data: { stepNumber: s.stepNumber - 1 },
        });
      }
    });

    await this.auditService.log({
      userId: actor.id,
      action: 'EXERCISE_INSTRUCTION_STEP_DELETED',
      resource: 'EXERCISE_INSTRUCTION_STEP',
      resourceId: stepId,
      organisationId,
      metadata: { exerciseId: step.exerciseId, removedStepNumber: step.stepNumber },
    });

    return { success: true, deletedStepId: stepId };
  }

  /**
   * Reorder steps atomically via transactional sequence assignment
   */
  async reorderSteps(
    organisationId: string,
    exerciseId: string,
    dto: ReorderInstructionStepsDto,
    actor: AuthenticatedUser,
  ) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found`);
    }

    this.ensureCanModifyExercise(exercise, organisationId, actor);

    const existingSteps = await this.prisma.exerciseInstructionStep.findMany({
      where: { exerciseId },
    });

    const stepMap = new Map(existingSteps.map((s) => [s.id, s]));

    for (const stepId of dto.stepIds) {
      if (!stepMap.has(stepId)) {
        throw new BadRequestException(`Step '${stepId}' does not belong to exercise '${exerciseId}'`);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // Temporary negative step numbers to avoid unique constraint collisions if any
      for (let i = 0; i < dto.stepIds.length; i++) {
        const stepId = dto.stepIds[i];
        await tx.exerciseInstructionStep.update({
          where: { id: stepId },
          data: { stepNumber: -(i + 1) },
        });
      }

      for (let i = 0; i < dto.stepIds.length; i++) {
        const stepId = dto.stepIds[i];
        await tx.exerciseInstructionStep.update({
          where: { id: stepId },
          data: { stepNumber: i + 1 },
        });
      }
    });

    const reorderedSteps = await this.prisma.exerciseInstructionStep.findMany({
      where: { exerciseId },
      orderBy: { stepNumber: 'asc' },
      include: { media: true },
    });

    return Promise.all(reorderedSteps.map((s) => this.enrichStepMedia(s)));
  }

  /**
   * Attach media directly to an instruction step with optional video offset clips
   */
  async attachStepMedia(
    organisationId: string,
    stepId: string,
    dto: AttachStepMediaDto,
    actor: AuthenticatedUser,
  ) {
    const step = await this.prisma.exerciseInstructionStep.findUnique({
      where: { id: stepId },
      include: { exercise: true },
    });

    if (!step) {
      throw new NotFoundException(`Instruction step '${stepId}' not found`);
    }

    this.ensureCanModifyExercise(step.exercise, organisationId, actor);

    const media = await this.prisma.exerciseMedia.findFirst({
      where: {
        id: dto.mediaId,
        exerciseId: step.exerciseId,
      },
    });

    if (!media) {
      throw new BadRequestException(`Media asset '${dto.mediaId}' does not belong to exercise '${step.exerciseId}'`);
    }

    if (
      dto.videoStartTimeSeconds !== undefined &&
      dto.videoEndTimeSeconds !== undefined &&
      dto.videoStartTimeSeconds > dto.videoEndTimeSeconds
    ) {
      throw new BadRequestException('videoStartTimeSeconds cannot be greater than videoEndTimeSeconds');
    }

    const updated = await this.prisma.exerciseInstructionStep.update({
      where: { id: stepId },
      data: {
        mediaId: media.id,
        mediaUrl: media.url,
        videoStartTimeSeconds: dto.videoStartTimeSeconds,
        videoEndTimeSeconds: dto.videoEndTimeSeconds,
      },
      include: { media: true },
    });

    return this.enrichStepMedia(updated);
  }

  /**
   * Publish instruction sequence and make all steps live
   */
  async publishInstruction(organisationId: string, exerciseId: string, actor: AuthenticatedUser) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found`);
    }

    this.ensureCanModifyExercise(exercise, organisationId, actor);

    const instruction = await this.prisma.exerciseInstruction.findUnique({
      where: { exerciseId },
      include: { steps: true },
    });

    const standaloneSteps = await this.prisma.exerciseInstructionStep.findMany({
      where: { exerciseId },
    });

    const totalSteps = instruction ? instruction.steps.length : standaloneSteps.length;
    if (totalSteps === 0) {
      throw new BadRequestException('Cannot publish instruction sequence without at least one step');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.exerciseInstruction.upsert({
        where: { exerciseId },
        update: { status: 'PUBLISHED', updatedByUserId: actor.id },
        create: {
          exerciseId,
          organisationId: exercise.organisationId || organisationId,
          title: `${exercise.name} Instructions`,
          status: 'PUBLISHED',
          version: 1,
          createdByUserId: actor.id,
        },
      });

      await tx.exerciseInstructionStep.updateMany({
        where: { exerciseId },
        data: { status: 'PUBLISHED' },
      });
    });

    return this.getInstruction(organisationId, exerciseId, actor);
  }
}
