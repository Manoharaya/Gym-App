import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { VisualMovementCoachService } from './visual-movement-coach.service';
import { ExerciseLearningMasteryService } from './exercise-learning-mastery.service';
import {
  StartMovementPracticeSessionDto,
  UpdateMovementPracticeSessionDto,
  RecordPhasePracticeDto,
  RecordPhaseReviewDto,
  CompleteMovementPracticeSessionDto,
  MovementPracticeSessionResponseDto,
  GuidedMovementPracticePayloadDto,
  PhasePracticeRecord,
} from '../dto/movement-practice.dto';

@Injectable()
export class MovementPracticeService {
  private readonly logger = new Logger(MovementPracticeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly coachService: VisualMovementCoachService,
    private readonly masteryService: ExerciseLearningMasteryService,
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
   * Helper: Check if actor is trainer or admin
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
   * Validate session ownership and return session record
   */
  private async validateSessionAccess(
    organisationId: string,
    sessionId: string,
    actor: AuthenticatedUser,
  ) {
    const session = await this.prisma.movementPracticeSession.findUnique({
      where: { id: sessionId },
      include: {
        exercise: true,
        currentPhase: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`Movement practice session '${sessionId}' not found`);
    }

    // Check tenant isolation
    if (session.organisationId !== organisationId) {
      throw new ForbiddenException('Cannot access practice session belonging to another organisation');
    }

    // Check member ownership (only owner or trainer/admin can access)
    if (session.userId !== actor.id && !this.isTrainerOrAdmin(actor)) {
      throw new ForbiddenException('Cannot access another member practice session');
    }

    return session;
  }

  /**
   * Formats a MovementPracticeSession into its response DTO
   */
  private formatSessionResponse(session: any): MovementPracticeSessionResponseDto {
    return {
      id: session.id,
      userId: session.userId,
      organisationId: session.organisationId,
      exerciseId: session.exerciseId,
      tutorialId: session.tutorialId,
      sessionType: session.sessionType as any,
      status: session.status as any,
      currentStep: session.currentStep as any,
      currentPhaseId: session.currentPhaseId,
      currentPhaseIndex: session.currentPhaseIndex,
      totalSteps: session.totalSteps,
      progressPercent: session.progressPercent,
      completedPhases: (session.completedPhases as string[]) || [],
      checklistState: (session.checklistState as Record<string, boolean>) || {},
      phasePracticeData: (session.phasePracticeData as PhasePracticeRecord[]) || [],
      selfReflection: session.selfReflection as any,
      knowledgeCheckScore: session.knowledgeCheckScore,
      knowledgeCheckCompleted: session.knowledgeCheckCompleted,
      startedAt: session.startedAt,
      lastActiveAt: session.lastActiveAt,
      completedAt: session.completedAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  // =========================================================================
  // 1. GUIDED PRACTICE READ MODEL
  // =========================================================================

  /**
   * GET /exercises/:id/guided-practice
   * Aggregates exercise, coach phases, expectations, checklist, equipment, and knowledge check
   */
  async getGuidedPracticeData(
    organisationId: string,
    exerciseId: string,
    actor?: AuthenticatedUser,
  ): Promise<GuidedMovementPracticePayloadDto> {
    // 1. Retrieve the complete Visual Movement Coach foundation payload
    const coachData = await this.coachService.getMovementCoachData(
      organisationId,
      exerciseId,
      actor,
    );

    // 2. Retrieve exercise with equipment relations and instructions
    const exercise = await this.prisma.exercise.findFirstOrThrow({
      where: { id: exerciseId },
      include: {
        equipmentRelations: true,
      },
    });

    // 3. Format equipment required
    const equipmentRequired = ((exercise as any).equipmentRelations || []).map((rel: any) => ({
      id: rel.id,
      name: rel.equipmentName,
      category: rel.equipmentCategory,
      isRequired: !rel.isOptional,
    }));

    // 4. Retrieve knowledge check questions for this exercise if authored (strip answer keys)
    const knowledgeCheck = await this.prisma.knowledgeCheck.findFirst({
      where: {
        exerciseId,
        contentStatus: 'PUBLISHED',
      },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            answers: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    const formattedKnowledgeCheck = knowledgeCheck
      ? {
          id: knowledgeCheck.id,
          title: knowledgeCheck.title,
          description: knowledgeCheck.description,
          questions: ((knowledgeCheck as any).questions || []).map((q: any) => {
            const rawAnswers = (q.answers as any[]) || [];
            return {
              id: q.id,
              question: q.questionText || q.question,
              questionType: q.questionType,
              options: rawAnswers.map((opt: any) => ({
                id: opt.id || String(opt.label || opt.text),
                text: opt.answerText || opt.text || opt.label || String(opt),
              })),
              explanation: q.explanation,
            };
          }),
        }
      : null;

    // 5. Check if user has an active or recent practice session
    let activeSession: MovementPracticeSessionResponseDto | null = null;
    if (actor?.id) {
      const existingSession = await this.prisma.movementPracticeSession.findFirst({
        where: {
          userId: actor.id,
          exerciseId,
          organisationId,
        },
        orderBy: { lastActiveAt: 'desc' },
      });

      if (existingSession) {
        activeSession = this.formatSessionResponse(existingSession);
      }
    }

    // 6. Formulate completion feedback if activeSession is completed
    let completionFeedback: GuidedMovementPracticePayloadDto['completionFeedback'] = null;
    if (activeSession && activeSession.status === 'COMPLETED') {
      completionFeedback = {
        reviewedPhasesCount: activeSession.completedPhases.length,
        totalPhasesCount: coachData.phases.length,
        checklistCompletedCount: Object.values(activeSession.checklistState).filter(Boolean).length,
        totalChecklistCount: coachData.techniqueChecklist.length,
        knowledgeCheckScore: activeSession.knowledgeCheckScore,
        summaryMessage:
          'Movement learning and structured rehearsal complete. Solid technique comprehension established.',
        suggestedReviewTopics: activeSession.selfReflection?.selectedTopics || [
          'Starting Setup',
          'Breathing Rhythm',
        ],
        recommendedNextExercise: null,
      };
    }

    return {
      exercise: {
        id: exercise.id,
        name: exercise.name,
        slug: exercise.slug,
        description: exercise.description,
        difficulty: exercise.difficulty,
        exerciseType: exercise.exerciseType,
        movementPattern: exercise.movementPattern,
        primaryMuscleGroup: exercise.primaryMuscleGroup,
        secondaryMuscleGroups: (exercise.secondaryMuscleGroups as string[]) || null,
        equipment: exercise.equipment,
        bodyPosition: exercise.bodyPosition,
        tempo: exercise.tempo,
        rangeOfMotion: exercise.rangeOfMotion,
        breathingInstructions: exercise.breathingInstructions,
        setupInstructions: exercise.setupInstructions,
        executionInstructions: exercise.executionInstructions,
        estimatedLearningMinutes: Math.max(3, coachData.phases.length * 2),
      },
      media: coachData.media,
      phases: coachData.phases,
      techniqueChecklist: coachData.techniqueChecklist,
      equipmentRequired,
      safetyGuidelines: coachData.safetyGuidance,
      knowledgeCheck: formattedKnowledgeCheck,
      activeSession,
      completionFeedback,
    };
  }

  // =========================================================================
  // 2. PRACTICE SESSION STATE MACHINE & LIFECYCLE
  // =========================================================================

  /**
   * POST /movement-practice-sessions
   * Starts a new practice session or resumes existing active session
   */
  async startOrResumeSession(
    organisationId: string,
    exerciseId: string,
    dto: StartMovementPracticeSessionDto,
    actor: AuthenticatedUser,
  ): Promise<MovementPracticeSessionResponseDto> {
    // Verify exercise exists
    const exercise = await this.prisma.exercise.findFirstOrThrow({
      where: {
        id: exerciseId,
        OR: [{ ownershipType: 'SYSTEM' }, { organisationId }],
      },
      include: {
        movementPhases: {
          where: { status: 'PUBLISHED' },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    const totalPhases = exercise.movementPhases.length;
    const firstPhase = exercise.movementPhases[0];

    // Check for existing uncompleted session
    const existing = await this.prisma.movementPracticeSession.findFirst({
      where: {
        userId: actor.id,
        exerciseId,
        organisationId,
        status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'PAUSED'] },
      },
      orderBy: { lastActiveAt: 'desc' },
    });

    if (existing) {
      const resumed = await this.prisma.movementPracticeSession.update({
        where: { id: existing.id },
        data: {
          status: 'IN_PROGRESS',
          lastActiveAt: new Date(),
        },
      });

      await this.auditService.log({
        action: 'MOVEMENT_PRACTICE_SESSION_RESUMED',
        resource: 'MovementPracticeSession',
        resourceId: resumed.id,
        userId: actor.id,
        organisationId,
        metadata: { exerciseId, step: resumed.currentStep },
      });

      return this.formatSessionResponse(resumed);
    }

    // Create new session
    const created = await this.prisma.movementPracticeSession.create({
      data: {
        userId: actor.id,
        organisationId,
        exerciseId,
        sessionType: dto.sessionType || 'GUIDED_PRACTICE',
        status: 'IN_PROGRESS',
        currentStep: 'INTRO',
        currentPhaseId: firstPhase?.id || null,
        currentPhaseIndex: 0,
        totalSteps: totalPhases,
        progressPercent: 0.0,
        completedPhases: [],
        checklistState: {},
        phasePracticeData: [],
        startedAt: new Date(),
        lastActiveAt: new Date(),
      },
    });

    await this.auditService.log({
      action: 'MOVEMENT_PRACTICE_SESSION_STARTED',
      resource: 'MovementPracticeSession',
      resourceId: created.id,
      userId: actor.id,
      organisationId,
      metadata: { exerciseId, sessionType: created.sessionType },
    });

    return this.formatSessionResponse(created);
  }

  /**
   * GET /movement-practice-sessions/:id
   */
  async getSession(
    organisationId: string,
    sessionId: string,
    actor: AuthenticatedUser,
  ): Promise<MovementPracticeSessionResponseDto> {
    const session = await this.validateSessionAccess(organisationId, sessionId, actor);
    return this.formatSessionResponse(session);
  }

  /**
   * PATCH /movement-practice-sessions/:id
   * Updates state machine step, phase pointer, or checklist state
   */
  async updateSession(
    organisationId: string,
    sessionId: string,
    dto: UpdateMovementPracticeSessionDto,
    actor: AuthenticatedUser,
  ): Promise<MovementPracticeSessionResponseDto> {
    const session = await this.validateSessionAccess(organisationId, sessionId, actor);

    const dataToUpdate: any = {
      lastActiveAt: new Date(),
    };

    if (dto.currentStep) {
      dataToUpdate.currentStep = dto.currentStep;
    }
    if (dto.currentPhaseId !== undefined) {
      dataToUpdate.currentPhaseId = dto.currentPhaseId;
    }
    if (dto.currentPhaseIndex !== undefined) {
      dataToUpdate.currentPhaseIndex = dto.currentPhaseIndex;
    }
    if (dto.checklistState !== undefined) {
      const mergedChecklist = {
        ...((session.checklistState as Record<string, boolean>) || {}),
        ...dto.checklistState,
      };
      dataToUpdate.checklistState = mergedChecklist;
    }
    if (dto.status) {
      dataToUpdate.status = dto.status;
    }

    const updated = await this.prisma.movementPracticeSession.update({
      where: { id: sessionId },
      data: dataToUpdate,
    });

    return this.formatSessionResponse(updated);
  }

  /**
   * POST /movement-practice-sessions/:id/phases/:phaseId/practice
   * Records a phase practice execution (reps, duration)
   */
  async recordPhasePractice(
    organisationId: string,
    sessionId: string,
    dto: RecordPhasePracticeDto,
    actor: AuthenticatedUser,
  ): Promise<MovementPracticeSessionResponseDto> {
    const session = await this.validateSessionAccess(organisationId, sessionId, actor);

    const existingPractices = (session.phasePracticeData as unknown as PhasePracticeRecord[]) || [];
    const newRecord: PhasePracticeRecord = {
      phaseId: dto.phaseId,
      reps: dto.reps,
      durationSeconds: dto.durationSeconds,
      completedAt: new Date().toISOString(),
    };

    const updatedPractices = [...existingPractices, newRecord];

    const updated = await this.prisma.movementPracticeSession.update({
      where: { id: sessionId },
      data: {
        phasePracticeData: updatedPractices as unknown as Prisma.InputJsonValue,
        currentPhaseId: dto.phaseId,
        currentStep: 'PHASE_PRACTICE',
        lastActiveAt: new Date(),
      },
    });

    return this.formatSessionResponse(updated);
  }

  /**
   * POST /movement-practice-sessions/:id/phases/:phaseId/review
   * Marks a phase as reviewed and updates completion progress
   */
  async recordPhaseReview(
    organisationId: string,
    sessionId: string,
    dto: RecordPhaseReviewDto,
    actor: AuthenticatedUser,
  ): Promise<MovementPracticeSessionResponseDto> {
    const session = await this.validateSessionAccess(organisationId, sessionId, actor);

    const completedPhasesSet = new Set<string>((session.completedPhases as string[]) || []);
    completedPhasesSet.add(dto.phaseId);
    const updatedCompletedPhases = Array.from(completedPhasesSet);

    // Calculate progress percentage
    const totalSteps = session.totalSteps || 1;
    const progressPercent = Math.min(
      100,
      Math.round((updatedCompletedPhases.length / totalSteps) * 100),
    );

    const updated = await this.prisma.movementPracticeSession.update({
      where: { id: sessionId },
      data: {
        completedPhases: updatedCompletedPhases,
        progressPercent,
        currentStep: 'PHASE_REVIEW',
        lastActiveAt: new Date(),
      },
    });

    return this.formatSessionResponse(updated);
  }

  /**
   * POST /movement-practice-sessions/:id/complete
   * Finalizes the practice session, synchronizes with ExerciseLearningProgress and LearningMastery
   */
  async completeSession(
    organisationId: string,
    sessionId: string,
    dto: CompleteMovementPracticeSessionDto,
    actor: AuthenticatedUser,
  ): Promise<MovementPracticeSessionResponseDto> {
    const session = await this.validateSessionAccess(organisationId, sessionId, actor);

    const completedAt = new Date();
    const updated = await this.prisma.movementPracticeSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        currentStep: 'COMPLETED',
        completedAt,
        progressPercent: 100.0,
        selfReflection: {
          selectedTopics: dto.selfReflectionTopics || [],
          notes: dto.notes,
        },
        knowledgeCheckScore: dto.knowledgeCheckScore ?? session.knowledgeCheckScore,
        knowledgeCheckCompleted: true,
        lastActiveAt: completedAt,
      },
    });

    // 1. Synchronize with ExerciseLearningProgress
    await this.prisma.exerciseLearningProgress.upsert({
      where: {
        userId_exerciseId: {
          userId: actor.id,
          exerciseId: session.exerciseId,
        },
      },
      create: {
        userId: actor.id,
        exerciseId: session.exerciseId,
        organisationId,
        status: 'COMPLETED',
        completedSteps: session.totalSteps,
        totalSteps: session.totalSteps,
        mediaViewed: true,
        instructionsViewed: true,
        phasesExplored: true,
        completedAt,
        lastInteractedAt: completedAt,
        tutorialProgress: {
          practiceCompleted: true,
          practiceCompletedAt: completedAt.toISOString(),
          knowledgeCheckCompleted: true,
          knowledgeCheckScore: dto.knowledgeCheckScore,
        },
      },
      update: {
        status: 'COMPLETED',
        completedSteps: session.totalSteps,
        phasesExplored: true,
        completedAt,
        lastInteractedAt: completedAt,
        tutorialProgress: {
          practiceCompleted: true,
          practiceCompletedAt: completedAt.toISOString(),
          knowledgeCheckCompleted: true,
          knowledgeCheckScore: dto.knowledgeCheckScore,
        },
      },
    });

    // 2. Synchronize with LearningMastery & Learning Activity Event
    try {
      await this.masteryService.recordLearningEvent(organisationId, actor.id, {
        eventType: 'practice_completed',
        contentType: 'EXERCISE',
        contentId: session.exerciseId,
        sectionId: 'PRACTICE',
        sessionId,
        metadata: {
          score: dto.knowledgeCheckScore,
          completedPhasesCount: (session.completedPhases as string[])?.length || 0,
          selfReflectionTopics: dto.selfReflectionTopics,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to record learning event for practice session: ${err}`);
    }

    await this.auditService.log({
      action: 'MOVEMENT_PRACTICE_SESSION_COMPLETED',
      resource: 'MovementPracticeSession',
      resourceId: sessionId,
      userId: actor.id,
      organisationId,
      metadata: {
        exerciseId: session.exerciseId,
        score: dto.knowledgeCheckScore,
      },
    });

    return this.formatSessionResponse(updated);
  }

  /**
   * GET /movement-practice-sessions/active
   * Retrieves the currently active movement practice session for the member
   */
  async getActiveSession(
    organisationId: string,
    actor: AuthenticatedUser,
  ): Promise<MovementPracticeSessionResponseDto | null> {
    const session = await this.prisma.movementPracticeSession.findFirst({
      where: {
        userId: actor.id,
        organisationId,
        status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'PAUSED'] },
      },
      orderBy: { lastActiveAt: 'desc' },
    });

    return session ? this.formatSessionResponse(session) : null;
  }
}
