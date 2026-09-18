import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import {
  CreateMovementExpectationDto,
  UpdateMovementExpectationDto,
  CreateMovementFeedbackRuleDto,
  UpdateMovementFeedbackRuleDto,
  VisualMovementCoachResponseDto,
  MovementExpectationItemDto,
  TechniqueChecklistItemDto,
  MovementCoachPhaseDto,
  WhatToFocusOnGroupDto,
} from '../dto/visual-movement-coach.dto';
import { ExpectedMovementState } from '../contracts/movement-coach-contracts';

@Injectable()
export class VisualMovementCoachService {
  private readonly logger = new Logger(VisualMovementCoachService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Helper: Check if actor is superadmin
   */
  private isSuperAdmin(actor?: AuthenticatedUser): boolean {
    if (!actor) return false;
    if ((actor as any).isSuperAdmin) return true;
    return (
      actor.roles?.some((r: any) => {
        const roleName = typeof r === 'string' ? r : r.role || r.name;
        return roleName === 'SUPERADMIN';
      }) ?? false
    );
  }

  /**
   * Helper: Check if actor is trainer, admin, or superadmin
   */
  private isTrainerOrAdmin(actor?: AuthenticatedUser): boolean {
    if (!actor) return false;
    if (this.isSuperAdmin(actor)) return true;
    return (
      actor.roles?.some((r: any) => {
        const roleName = typeof r === 'string' ? r : r.role || r.name;
        return (
          roleName === 'TRAINER' ||
          roleName === 'ADMIN' ||
          roleName === 'CLUB_MANAGER'
        );
      }) ?? false
    );
  }

  /**
   * Validate exercise access and return exercise record
   */
  private async validateExerciseAccess(
    organisationId: string,
    exerciseId: string,
    actor?: AuthenticatedUser,
    requireWriteAccess = false,
  ) {
    const isPrivileged = this.isTrainerOrAdmin(actor);
    const exercise = await this.prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        OR: [{ ownershipType: 'SYSTEM' }, { organisationId }],
        ...(isPrivileged ? {} : { contentStatus: 'PUBLISHED' }),
      },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found or not accessible`);
    }

    if (requireWriteAccess) {
      if (!isPrivileged) {
        throw new ForbiddenException('Trainer or Admin permissions required');
      }
      if (exercise.ownershipType === 'SYSTEM' && !this.isSuperAdmin(actor)) {
        throw new ForbiddenException('System exercises can only be modified by superadmins');
      }
      if (exercise.ownershipType === 'ORGANISATION' && exercise.organisationId !== organisationId) {
        throw new ForbiddenException('Cannot modify exercises belonging to another organisation');
      }
    }

    return exercise;
  }

  /**
   * GET /exercises/:id/movement-coach
   * Consolidated single-request read model for the Visual Movement Coach
   */
  async getMovementCoachData(
    organisationId: string,
    exerciseId: string,
    actor?: AuthenticatedUser,
  ): Promise<VisualMovementCoachResponseDto> {
    const isPrivileged = this.isTrainerOrAdmin(actor);

    // Fetch exercise with phases, media, expectations, mistakes, and safety guidelines
    const exercise = await this.prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        OR: [{ ownershipType: 'SYSTEM' }, { organisationId }],
        ...(isPrivileged ? {} : { contentStatus: 'PUBLISHED' }),
      },
      include: {
        media: {
          where: isPrivileged ? {} : { isPublished: true },
          orderBy: { sortOrder: 'asc' },
        },
        movementPhases: {
          where: isPrivileged ? {} : { status: 'PUBLISHED' },
          orderBy: { orderIndex: 'asc' },
          include: {
            media: true,
            commonMistakeRecords: true,
            safetyGuidelineRecords: true,
            movementExpectations: {
              where: isPrivileged ? {} : { status: 'PUBLISHED' },
              orderBy: { sortOrder: 'asc' },
              include: {
                visualCue: true,
                commonMistake: true,
              },
            },
          },
        },
        movementExpectations: {
          where: isPrivileged ? {} : { status: 'PUBLISHED' },
          orderBy: { sortOrder: 'asc' },
          include: {
            movementPhase: true,
            visualCue: true,
            commonMistake: true,
          },
        },
        commonMistakes: {
          orderBy: { sortOrder: 'asc' },
        },
        safetyGuidelines: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found or not accessible`);
    }

    // Fetch media annotations (visual cues)
    const mediaIds = exercise.media.map((m) => m.id);
    const mediaAnnotations =
      mediaIds.length > 0
        ? await this.prisma.exerciseMediaAnnotation.findMany({
            where: {
              mediaId: { in: mediaIds },
              ...(isPrivileged ? {} : { status: 'PUBLISHED' }),
            },
          })
        : [];

    // Map media annotations to phases
    const annotationsByPhaseId = new Map<string, typeof mediaAnnotations>();
    for (const ann of mediaAnnotations) {
      if (ann.phaseId) {
        const existing = annotationsByPhaseId.get(ann.phaseId) || [];
        existing.push(ann);
        annotationsByPhaseId.set(ann.phaseId, existing);
      }
    }

    // Map expectations
    const allExpectations: MovementExpectationItemDto[] = exercise.movementExpectations.map(
      (exp) => ({
        id: exp.id,
        exerciseId: exp.exerciseId,
        movementPhaseId: exp.movementPhaseId,
        phaseName: exp.movementPhase?.phaseName || null,
        title: exp.title,
        description: exp.description,
        expectationType: exp.expectationType as any,
        priority: exp.priority as any,
        bodyRegion: exp.bodyRegion as any,
        expectedState: exp.expectedState,
        expectedDirection: exp.expectedDirection,
        expectedPosition: exp.expectedPosition,
        expectedAlignment: exp.expectedAlignment,
        expectedRangeOfMotion: exp.expectedRangeOfMotion,
        expectedTempo: exp.expectedTempo,
        expectedBreathing: exp.expectedBreathing,
        visualCueId: exp.visualCueId,
        visualCue: exp.visualCue
          ? {
              id: exp.visualCue.id,
              type: exp.visualCue.type,
              label: exp.visualCue.label,
              description: exp.visualCue.description,
              x: exp.visualCue.x,
              y: exp.visualCue.y,
            }
          : null,
        safetyNote: exp.safetyNote,
        commonMistakeId: exp.commonMistakeId,
        commonMistake: exp.commonMistake
          ? {
              id: exp.commonMistake.id,
              mistake: exp.commonMistake.mistake,
              correction: exp.commonMistake.correction,
              severity: exp.commonMistake.severity,
            }
          : null,
        sortOrder: exp.sortOrder,
        status: exp.status,
      }),
    );

    // If no explicit expectations are authored, synthesize baseline educational expectations from exercise data
    const synthesizedExpectations =
      allExpectations.length > 0
        ? allExpectations
        : this.synthesizeDefaultExpectations(exercise);

    // Group into What To Focus On
    const whatToFocusOn: WhatToFocusOnGroupDto = {
      essential: synthesizedExpectations.filter((e) => e.priority === 'ESSENTIAL'),
      important: synthesizedExpectations.filter((e) => e.priority === 'IMPORTANT'),
      optional: synthesizedExpectations.filter((e) => e.priority === 'OPTIONAL'),
    };

    // Construct MovementCoachPhaseDto array
    const phases: MovementCoachPhaseDto[] = exercise.movementPhases.map((phase) => {
      const phaseExpectations = synthesizedExpectations.filter(
        (e) => e.movementPhaseId === phase.id,
      );
      const phaseVisualCues = (annotationsByPhaseId.get(phase.id) || []).map((ann) => ({
        id: ann.id,
        type: ann.type,
        label: ann.label,
        description: ann.description,
        category: ann.category,
        x: ann.x,
        y: ann.y,
        startTime: ann.startTime,
        endTime: ann.endTime,
      }));

      const phaseMistakes = phase.commonMistakeRecords.map((m) => ({
        id: m.id,
        mistake: m.mistake,
        consequence: m.consequence,
        correction: m.correction,
        severity: m.severity,
      }));

      const phaseSafety = phase.safetyGuidelineRecords.map((s) => ({
        id: s.id,
        category: s.category,
        title: s.title,
        description: s.description,
        severity: s.severity,
      }));

      return {
        id: phase.id,
        phaseName: phase.phaseName,
        phaseType: phase.phaseType,
        title: phase.title,
        description: phase.description,
        orderIndex: phase.orderIndex,
        cueText: phase.cueText,
        bodyPosition: phase.bodyPosition,
        bodyOrientation: phase.bodyOrientation,
        breathingPattern: phase.breathingPattern,
        breathingNotes: phase.breathingNotes,
        tempoSeconds: phase.tempoSeconds,
        holdDurationSeconds: phase.holdDurationSeconds,
        mediaUrl: phase.mediaUrl || (phase.media ? phase.media.url : null),
        videoStartTimeSeconds: phase.videoStartTimeSeconds,
        videoEndTimeSeconds: phase.videoEndTimeSeconds,
        expectations: phaseExpectations,
        visualCues: phaseVisualCues,
        mistakes: phaseMistakes,
        safetyGuidelines: phaseSafety,
      };
    });

    // Build technique checklist
    const techniqueChecklist = this.buildTechniqueChecklist(
      exercise,
      phases,
      synthesizedExpectations,
    );

    // Check user learning progress & mastery
    let learningStatus: VisualMovementCoachResponseDto['learningStatus'] = undefined;
    if (actor?.id) {
      const progress = await this.prisma.exerciseLearningProgress.findUnique({
        where: {
          userId_exerciseId: {
            userId: actor.id,
            exerciseId: exercise.id,
          },
        },
      });
      const mastery = await this.prisma.learningMastery.findFirst({
        where: {
          userId: actor.id,
          contentType: 'EXERCISE',
          contentId: exercise.id,
        },
      });

      if (progress || mastery) {
        learningStatus = {
          isCompleted: progress?.status === 'COMPLETED',
          completedAt: progress?.completedAt,
          masteryLevel: mastery?.status || 'EXPLORING',
        };
      }
    }

    // Primary media
    const heroMedia = exercise.media.find((m) => m.mediaType === 'VIDEO') || exercise.media[0];

    return {
      exercise: {
        id: exercise.id,
        name: exercise.name,
        slug: exercise.slug,
        difficulty: exercise.difficulty,
        exerciseType: exercise.exerciseType,
        movementPattern: exercise.movementPattern,
        primaryMuscleGroup: exercise.primaryMuscleGroup,
        equipment: exercise.equipment,
        bodyPosition: exercise.bodyPosition,
        tempo: exercise.tempo,
        rangeOfMotion: exercise.rangeOfMotion,
        breathingInstructions: exercise.breathingInstructions,
      },
      media: {
        heroMediaUrl: heroMedia?.url || null,
        thumbnailUrl: heroMedia?.thumbnailUrl || null,
        mediaType: heroMedia?.mediaType || null,
      },
      phases,
      whatToFocusOn,
      techniqueChecklist,
      safetyGuidance: exercise.safetyGuidelines.map((s) => ({
        id: s.id,
        category: s.category,
        title: s.title,
        description: s.description,
        severity: s.severity,
      })),
      commonMistakes: exercise.commonMistakes.map((m) => ({
        id: m.id,
        mistake: m.mistake,
        consequence: m.consequence,
        correction: m.correction,
        severity: m.severity,
        phaseName: null,
      })),
      learningStatus,
    };
  }

  /**
   * Synthesizes default expectations from core exercise metadata if no explicit ones exist
   */
  private synthesizeDefaultExpectations(exercise: any): MovementExpectationItemDto[] {
    const list: MovementExpectationItemDto[] = [];

    // 1. Setup & Starting Position (Essential)
    list.push({
      id: `synth-setup-${exercise.id}`,
      exerciseId: exercise.id,
      title: 'Stable Setup Position',
      description:
        exercise.setupInstructions ||
        `Establish a stable starting position with proper alignment for ${exercise.name}.`,
      expectationType: 'BODY_POSITION',
      priority: 'ESSENTIAL',
      bodyRegion: 'FULL_BODY',
      expectedState: exercise.bodyPosition || 'Controlled starting posture',
      sortOrder: 1,
      status: 'PUBLISHED',
    });

    // 2. Alignment & Core Stability (Essential)
    list.push({
      id: `synth-stability-${exercise.id}`,
      exerciseId: exercise.id,
      title: 'Spine & Core Neutrality',
      description: 'Maintain controlled spine alignment and active core engagement throughout the movement.',
      expectationType: 'SPINE_POSITION',
      priority: 'ESSENTIAL',
      bodyRegion: 'SPINE',
      expectedAlignment: 'Neutral spine, engaged core brace',
      sortOrder: 2,
      status: 'PUBLISHED',
    });

    // 3. Controlled Range of Motion (Important)
    list.push({
      id: `synth-rom-${exercise.id}`,
      exerciseId: exercise.id,
      title: 'Range of Motion Control',
      description:
        exercise.rangeOfMotion ||
        'Move through a full, pain-free range of motion without compensating at adjacent joints.',
      expectationType: 'RANGE_OF_MOTION',
      priority: 'IMPORTANT',
      bodyRegion: 'FULL_BODY',
      expectedRangeOfMotion: exercise.rangeOfMotion || 'Full active range',
      sortOrder: 3,
      status: 'PUBLISHED',
    });

    // 4. Breathing Coordination (Important)
    if (exercise.breathingInstructions) {
      list.push({
        id: `synth-breathing-${exercise.id}`,
        exerciseId: exercise.id,
        title: 'Synchronized Breathing',
        description: exercise.breathingInstructions,
        expectationType: 'BREATHING',
        priority: 'IMPORTANT',
        bodyRegion: 'CORE',
        expectedBreathing: exercise.breathingInstructions,
        sortOrder: 4,
        status: 'PUBLISHED',
      });
    }

    // 5. Cadence / Tempo (Optional)
    if (exercise.tempo) {
      list.push({
        id: `synth-tempo-${exercise.id}`,
        exerciseId: exercise.id,
        title: 'Execution Tempo',
        description: `Maintain deliberate movement pacing (Tempo: ${exercise.tempo}).`,
        expectationType: 'TEMPO',
        priority: 'OPTIONAL',
        bodyRegion: 'FULL_BODY',
        expectedTempo: exercise.tempo,
        sortOrder: 5,
        status: 'PUBLISHED',
      });
    }

    return list;
  }

  /**
   * Builds an interactive technique checklist
   */
  private buildTechniqueChecklist(
    exercise: any,
    phases: MovementCoachPhaseDto[],
    expectations: MovementExpectationItemDto[],
  ): TechniqueChecklistItemDto[] {
    const checklist: TechniqueChecklistItemDto[] = [];
    let order = 1;

    // Setup item
    checklist.push({
      id: `chk-setup-${exercise.id}`,
      title: 'Equipment & Starting Position Established',
      description: exercise.setupInstructions || `Position body and equipment correctly for ${exercise.name}.`,
      category: 'SETUP',
      priority: 'ESSENTIAL',
      isRequired: true,
      order: order++,
    });

    // Core alignment item
    checklist.push({
      id: `chk-alignment-${exercise.id}`,
      title: 'Spine Neutral & Core Braced',
      description: 'Engage core muscles to protect the spine and stabilize the torso.',
      category: 'ALIGNMENT',
      priority: 'ESSENTIAL',
      isRequired: true,
      order: order++,
    });

    // Add items from essential expectations
    for (const exp of expectations.filter((e) => e.priority === 'ESSENTIAL')) {
      if (!checklist.some((c) => c.title.toLowerCase() === exp.title.toLowerCase())) {
        checklist.push({
          id: `chk-exp-${exp.id}`,
          title: exp.title,
          description: exp.description,
          category: this.mapExpectationTypeToCategory(exp.expectationType),
          priority: exp.priority,
          phaseName: exp.phaseName || undefined,
          isRequired: true,
          order: order++,
        });
      }
    }

    // Add breathing item
    checklist.push({
      id: `chk-breathing-${exercise.id}`,
      title: 'Breathing Rhythm Understood',
      description: exercise.breathingInstructions || 'Exhale on exertion and inhale during recovery.',
      category: 'BREATHING',
      priority: 'IMPORTANT',
      isRequired: false,
      order: order++,
    });

    // Add tempo item
    checklist.push({
      id: `chk-tempo-${exercise.id}`,
      title: 'Tempo & Movement Cadence Understood',
      description: exercise.tempo
        ? `Adhere to target cadence (${exercise.tempo}).`
        : 'Maintain controlled descent and smooth concentric acceleration.',
      category: 'TEMPO',
      priority: 'OPTIONAL',
      isRequired: false,
      order: order++,
    });

    return checklist;
  }

  private mapExpectationTypeToCategory(
    type: string,
  ): 'SETUP' | 'ALIGNMENT' | 'EXECUTION' | 'BREATHING' | 'TEMPO' | 'SAFETY' {
    switch (type) {
      case 'BODY_POSITION':
      case 'FOOT_POSITION':
      case 'HAND_POSITION':
      case 'EQUIPMENT_POSITION':
        return 'SETUP';
      case 'ALIGNMENT':
      case 'POSTURE':
      case 'SPINE_POSITION':
      case 'JOINT_POSITION':
      case 'HEAD_POSITION':
        return 'ALIGNMENT';
      case 'BREATHING':
        return 'BREATHING';
      case 'TEMPO':
        return 'TEMPO';
      case 'SAFETY':
        return 'SAFETY';
      default:
        return 'EXECUTION';
    }
  }

  /**
   * Helper: Return Future Pose Engine Target Representation (ExpectedMovementState)
   */
  async getExpectedMovementState(
    organisationId: string,
    exerciseId: string,
    phaseId?: string,
  ): Promise<ExpectedMovementState> {
    const exercise = await this.prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        OR: [{ ownershipType: 'SYSTEM' }, { organisationId }],
      },
      include: {
        movementPhases: {
          orderBy: { orderIndex: 'asc' },
        },
        movementExpectations: {
          include: { visualCue: true },
        },
      },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found`);
    }

    const targetPhase = phaseId
      ? exercise.movementPhases.find((p) => p.id === phaseId)
      : exercise.movementPhases[0];

    const phaseExpectations = exercise.movementExpectations.filter(
      (e) => !phaseId || e.movementPhaseId === phaseId,
    );

    return {
      phaseId: targetPhase?.id,
      phaseName: targetPhase?.phaseName || 'FULL_MOVEMENT',
      bodyPosition: targetPhase?.bodyPosition || exercise.bodyPosition || undefined,
      bodyOrientation: targetPhase?.bodyOrientation || undefined,
      movementDirection: targetPhase?.phaseType || undefined,
      bodyRegions: Array.from(new Set(phaseExpectations.map((e) => e.bodyRegion))),
      alignmentExpectations: phaseExpectations.map((e) => ({
        bodyRegion: e.bodyRegion,
        expectedAngleDegrees: undefined,
        cueNote: e.expectedAlignment || e.description,
      })),
      rangeOfMotion: targetPhase?.rangeOfMotionNotes || exercise.rangeOfMotion || undefined,
      tempo: targetPhase?.tempoSeconds ? `${targetPhase.tempoSeconds}s` : exercise.tempo || undefined,
      breathing: targetPhase?.breathingPattern || exercise.breathingInstructions || undefined,
      stabilityRequirements: ['Neutral spine', 'Braced core'],
      visualCues: phaseExpectations
        .filter((e) => e.visualCue)
        .map((e) => ({
          id: e.visualCue!.id,
          label: e.visualCue!.label,
          type: e.visualCue!.type,
          x: e.visualCue!.x,
          y: e.visualCue!.y,
        })),
    };
  }

  // =========================================================================
  // Movement Expectation CRUD (Trainers / Admins)
  // =========================================================================

  async createExpectation(
    organisationId: string,
    exerciseId: string,
    dto: CreateMovementExpectationDto,
    actor: AuthenticatedUser,
  ) {
    await this.validateExerciseAccess(organisationId, exerciseId, actor, true);

    // If movementPhaseId is provided, verify it belongs to this exercise
    if (dto.movementPhaseId) {
      const phase = await this.prisma.exerciseMovementPhase.findFirst({
        where: { id: dto.movementPhaseId, exerciseId },
      });
      if (!phase) {
        throw new BadRequestException(
          `Movement phase '${dto.movementPhaseId}' does not belong to exercise '${exerciseId}'`,
        );
      }
    }

    // If visualCueId is provided, verify it exists
    if (dto.visualCueId) {
      const cue = await this.prisma.exerciseMediaAnnotation.findUnique({
        where: { id: dto.visualCueId },
      });
      if (!cue) {
        throw new BadRequestException(`Visual cue '${dto.visualCueId}' not found`);
      }
    }

    const created = await this.prisma.movementExpectation.create({
      data: {
        organisationId,
        exerciseId,
        movementPhaseId: dto.movementPhaseId,
        title: dto.title,
        description: dto.description,
        expectationType: dto.expectationType || 'POSTURE',
        priority: dto.priority || 'ESSENTIAL',
        bodyRegion: dto.bodyRegion || 'FULL_BODY',
        expectedState: dto.expectedState,
        expectedDirection: dto.expectedDirection,
        expectedPosition: dto.expectedPosition,
        expectedAlignment: dto.expectedAlignment,
        expectedRangeOfMotion: dto.expectedRangeOfMotion,
        expectedTempo: dto.expectedTempo,
        expectedBreathing: dto.expectedBreathing,
        visualCueId: dto.visualCueId,
        safetyNote: dto.safetyNote,
        commonMistakeId: dto.commonMistakeId,
        sortOrder: dto.sortOrder ?? 0,
        status: dto.status || 'PUBLISHED',
        createdByUserId: actor.id,
        updatedByUserId: actor.id,
      },
      include: {
        movementPhase: true,
        visualCue: true,
        commonMistake: true,
      },
    });

    await this.auditService.log({
      action: 'MOVEMENT_EXPECTATION_CREATED',
      resource: 'MovementExpectation',
      resourceId: created.id,
      userId: actor.id,
      organisationId,
      metadata: { exerciseId, title: dto.title },
    });

    return created;
  }

  async getExpectations(
    organisationId: string,
    exerciseId: string,
    phaseId?: string,
    actor?: AuthenticatedUser,
  ) {
    await this.validateExerciseAccess(organisationId, exerciseId, actor);
    const isPrivileged = this.isTrainerOrAdmin(actor);

    return this.prisma.movementExpectation.findMany({
      where: {
        exerciseId,
        ...(phaseId ? { movementPhaseId: phaseId } : {}),
        ...(isPrivileged ? {} : { status: 'PUBLISHED' }),
      },
      include: {
        movementPhase: true,
        visualCue: true,
        commonMistake: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateExpectation(
    organisationId: string,
    expectationId: string,
    dto: UpdateMovementExpectationDto,
    actor: AuthenticatedUser,
  ) {
    const expectation = await this.prisma.movementExpectation.findUnique({
      where: { id: expectationId },
    });

    if (!expectation) {
      throw new NotFoundException(`Movement expectation '${expectationId}' not found`);
    }

    await this.validateExerciseAccess(
      organisationId,
      expectation.exerciseId,
      actor,
      true,
    );

    if (dto.movementPhaseId) {
      const phase = await this.prisma.exerciseMovementPhase.findFirst({
        where: { id: dto.movementPhaseId, exerciseId: expectation.exerciseId },
      });
      if (!phase) {
        throw new BadRequestException(
          `Movement phase '${dto.movementPhaseId}' does not belong to this exercise`,
        );
      }
    }

    const updated = await this.prisma.movementExpectation.update({
      where: { id: expectationId },
      data: {
        ...dto,
        updatedByUserId: actor.id,
      },
      include: {
        movementPhase: true,
        visualCue: true,
        commonMistake: true,
      },
    });

    await this.auditService.log({
      action: 'MOVEMENT_EXPECTATION_UPDATED',
      resource: 'MovementExpectation',
      resourceId: updated.id,
      userId: actor.id,
      organisationId,
      metadata: { exerciseId: expectation.exerciseId, updates: dto },
    });

    return updated;
  }

  async deleteExpectation(
    organisationId: string,
    expectationId: string,
    actor: AuthenticatedUser,
  ) {
    const expectation = await this.prisma.movementExpectation.findUnique({
      where: { id: expectationId },
    });

    if (!expectation) {
      throw new NotFoundException(`Movement expectation '${expectationId}' not found`);
    }

    await this.validateExerciseAccess(
      organisationId,
      expectation.exerciseId,
      actor,
      true,
    );

    await this.prisma.movementExpectation.delete({
      where: { id: expectationId },
    });

    await this.auditService.log({
      action: 'MOVEMENT_EXPECTATION_DELETED',
      resource: 'MovementExpectation',
      resourceId: expectationId,
      userId: actor.id,
      organisationId,
      metadata: { exerciseId: expectation.exerciseId },
    });

    return { deleted: true, id: expectationId };
  }

  // =========================================================================
  // Movement Feedback Rule CRUD (Trainers / Admins)
  // =========================================================================

  async createFeedbackRule(
    organisationId: string,
    exerciseId: string,
    dto: CreateMovementFeedbackRuleDto,
    actor: AuthenticatedUser,
  ) {
    await this.validateExerciseAccess(organisationId, exerciseId, actor, true);

    if (dto.movementPhaseId) {
      const phase = await this.prisma.exerciseMovementPhase.findFirst({
        where: { id: dto.movementPhaseId, exerciseId },
      });
      if (!phase) {
        throw new BadRequestException(
          `Movement phase '${dto.movementPhaseId}' does not belong to exercise '${exerciseId}'`,
        );
      }
    }

    if (dto.expectationId) {
      const expectation = await this.prisma.movementExpectation.findFirst({
        where: { id: dto.expectationId, exerciseId },
      });
      if (!expectation) {
        throw new BadRequestException(
          `Expectation '${dto.expectationId}' does not belong to exercise '${exerciseId}'`,
        );
      }
    }

    const rule = await this.prisma.movementFeedbackRule.create({
      data: {
        organisationId,
        exerciseId,
        movementPhaseId: dto.movementPhaseId,
        expectationId: dto.expectationId,
        conditionType: dto.conditionType,
        conditionParameters: dto.conditionParameters,
        feedbackType: dto.feedbackType || 'GUIDANCE',
        feedbackMessage: dto.feedbackMessage,
        severity: dto.severity || 'MODERATE',
        priority: dto.priority || 'IMPORTANT',
        status: dto.status || 'PUBLISHED',
        createdByUserId: actor.id,
        updatedByUserId: actor.id,
      },
      include: {
        movementPhase: true,
        expectation: true,
      },
    });

    await this.auditService.log({
      action: 'MOVEMENT_FEEDBACK_RULE_CREATED',
      resource: 'MovementFeedbackRule',
      resourceId: rule.id,
      userId: actor.id,
      organisationId,
      metadata: { exerciseId, conditionType: dto.conditionType },
    });

    return rule;
  }

  async getFeedbackRules(
    organisationId: string,
    exerciseId: string,
    phaseId?: string,
    actor?: AuthenticatedUser,
  ) {
    await this.validateExerciseAccess(organisationId, exerciseId, actor);
    const isPrivileged = this.isTrainerOrAdmin(actor);

    return this.prisma.movementFeedbackRule.findMany({
      where: {
        exerciseId,
        ...(phaseId ? { movementPhaseId: phaseId } : {}),
        ...(isPrivileged ? {} : { status: 'PUBLISHED' }),
      },
      include: {
        movementPhase: true,
        expectation: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateFeedbackRule(
    organisationId: string,
    ruleId: string,
    dto: UpdateMovementFeedbackRuleDto,
    actor: AuthenticatedUser,
  ) {
    const rule = await this.prisma.movementFeedbackRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      throw new NotFoundException(`Movement feedback rule '${ruleId}' not found`);
    }

    await this.validateExerciseAccess(organisationId, rule.exerciseId, actor, true);

    const updated = await this.prisma.movementFeedbackRule.update({
      where: { id: ruleId },
      data: {
        ...dto,
        updatedByUserId: actor.id,
      },
      include: {
        movementPhase: true,
        expectation: true,
      },
    });

    await this.auditService.log({
      action: 'MOVEMENT_FEEDBACK_RULE_UPDATED',
      resource: 'MovementFeedbackRule',
      resourceId: updated.id,
      userId: actor.id,
      organisationId,
      metadata: { exerciseId: rule.exerciseId, updates: dto },
    });

    return updated;
  }

  async deleteFeedbackRule(
    organisationId: string,
    ruleId: string,
    actor: AuthenticatedUser,
  ) {
    const rule = await this.prisma.movementFeedbackRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      throw new NotFoundException(`Movement feedback rule '${ruleId}' not found`);
    }

    await this.validateExerciseAccess(organisationId, rule.exerciseId, actor, true);

    await this.prisma.movementFeedbackRule.delete({
      where: { id: ruleId },
    });

    await this.auditService.log({
      action: 'MOVEMENT_FEEDBACK_RULE_DELETED',
      resource: 'MovementFeedbackRule',
      resourceId: ruleId,
      userId: actor.id,
      organisationId,
      metadata: { exerciseId: rule.exerciseId },
    });

    return { deleted: true, id: ruleId };
  }

  /**
   * GET /exercises/:id/technique-checklist
   */
  async getTechniqueChecklist(
    organisationId: string,
    exerciseId: string,
    actor?: AuthenticatedUser,
  ): Promise<TechniqueChecklistItemDto[]> {
    const coachData = await this.getMovementCoachData(organisationId, exerciseId, actor);
    return coachData.techniqueChecklist;
  }
}
