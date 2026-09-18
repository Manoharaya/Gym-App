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
import { VisualMovementCoachService } from './visual-movement-coach.service';
import { ExerciseLearningMasteryService } from './exercise-learning-mastery.service';
import { MovementPracticeService } from './movement-practice.service';
import {
  LEARNING_GAP_TYPES,
  LEARNING_GAP_PRIORITIES,
  LEARNING_GAP_STATUSES,
  PRACTICE_RECOMMENDATION_TYPES,
  LearningGapItemDto,
  QueryLearningGapsDto,
  ResolveLearningGapDto,
  CreateTargetedReviewSessionDto,
  QuickRefreshResponseDto,
  MovementLearningDashboardResponseDto,
  ExerciseLearningIntelligenceResponseDto,
  TrainerMemberLearningInsightsDto,
  AdminLearningQualityInsightsDto,
  RecommendedPracticeItemDto,
} from '../dto/movement-learning-intelligence.dto';

@Injectable()
export class MovementLearningIntelligenceService {
  private readonly logger = new Logger(MovementLearningIntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly coachService: VisualMovementCoachService,
    private readonly masteryService: ExerciseLearningMasteryService,
    private readonly practiceService: MovementPracticeService,
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
          roleName === 'CLUB_MANAGER' ||
          roleName === 'ORGANISATION_OWNER'
        );
      }) ?? false
    );
  }

  /**
   * Helper: Format LearningGap database record to DTO
   */
  private formatGapItem(gap: any): LearningGapItemDto {
    const phaseName =
      gap.movementPhase?.phaseName ||
      gap.movementPhase?.title ||
      gap.contextData?.phaseName ||
      undefined;

    return {
      id: gap.id,
      organisationId: gap.organisationId,
      userId: gap.userId,
      contentType: gap.contentType,
      contentId: gap.contentId,
      exerciseId: gap.exerciseId || null,
      exerciseName: gap.exercise?.name || undefined,
      movementPhaseId: gap.movementPhaseId || null,
      phaseName,
      gapType: gap.gapType,
      priority: gap.priority as 'HIGH' | 'MEDIUM' | 'LOW',
      reason: gap.reason,
      status: gap.status as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED',
      contextData: gap.contextData as Record<string, any> | null,
      detectedAt: gap.detectedAt,
      lastReviewedAt: gap.lastReviewedAt,
      resolvedAt: gap.resolvedAt,
      createdAt: gap.createdAt,
      updatedAt: gap.updatedAt,
    };
  }

  // =========================================================================
  // 1. DETERMINISTIC LEARNING GAP DETECTION & RESOLUTION
  // =========================================================================

  /**
   * Scans actual member learning data and synchronizes deterministic LearningGap records
   */
  async detectMemberGaps(
    organisationId: string,
    userId: string,
    targetExerciseId?: string,
  ): Promise<LearningGapItemDto[]> {
    const detectedGaps: Array<{
      contentType: string;
      contentId: string;
      exerciseId?: string;
      movementPhaseId?: string;
      gapType: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      reason: string;
      contextData?: Record<string, any>;
    }> = [];

    // 1. Load user learning data to evaluate gaps and prerequisites
    const [progressRecords, sessions, masteryRecords, knowledgeAttempts] =
      await Promise.all([
        this.prisma.exerciseLearningProgress.findMany({
          where: { userId },
          include: { exercise: true },
        }),
        this.prisma.movementPracticeSession.findMany({
          where: { userId },
          include: { exercise: true },
          orderBy: { lastActiveAt: 'desc' },
        }),
        this.prisma.learningMastery.findMany({
          where: {
            userId,
            contentType: 'EXERCISE',
          },
        }),
        this.prisma.knowledgeAttempt.findMany({
          where: { userId },
          include: { knowledgeCheck: true },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    // Distinct set of exercise IDs to inspect
    const exerciseIds = new Set<string>();
    if (targetExerciseId) {
      exerciseIds.add(targetExerciseId);
    } else {
      progressRecords.forEach((p) => exerciseIds.add(p.exerciseId));
      sessions.forEach((s) => exerciseIds.add(s.exerciseId));
      masteryRecords.forEach((m) => exerciseIds.add(m.contentId));
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const exerciseId of exerciseIds) {
      const exercise = await this.prisma.exercise.findFirst({
        where: { id: exerciseId },
        include: {
          movementPhases: {
            where: { status: 'PUBLISHED' },
            orderBy: { orderIndex: 'asc' },
          },
          variationsTo: {
            where: { relationshipType: 'PROGRESSION' },
            include: { baseExercise: true },
          },
        },
      });

      if (!exercise) continue;

      const userProgress = progressRecords.find((p) => p.exerciseId === exerciseId);
      const exerciseSessions = sessions.filter((s) => s.exerciseId === exerciseId);
      const userMastery = masteryRecords.find((m) => m.contentId === exerciseId);
      const latestSession = exerciseSessions[0];

      const progressPercent = userProgress
        ? userProgress.totalSteps > 0
          ? (userProgress.completedSteps / userProgress.totalSteps) * 100
          : 0
        : userMastery?.completionPercent || 0;

      // A. GAP TYPE: INCOMPLETE
      // Tutorial started (completedSteps > 0 or progress > 0) but not finished (< 100) or status IN_PROGRESS
      if (
        (userProgress &&
          userProgress.completedSteps > 0 &&
          userProgress.status !== 'COMPLETED' &&
          progressPercent < 100) ||
        (userMastery &&
          userMastery.status === 'LEARNING' &&
          userMastery.completionPercent < 100)
      ) {
        detectedGaps.push({
          contentType: 'EXERCISE',
          contentId: exercise.id,
          exerciseId: exercise.id,
          gapType: LEARNING_GAP_TYPES.INCOMPLETE,
          priority: LEARNING_GAP_PRIORITIES.MEDIUM,
          reason: `Continue this exercise tutorial for ${exercise.name} because you started it previously.`,
          contextData: {
            progressPercent,
          },
        });
      }

      // B. GAP TYPE: ABANDONED
      // Guided practice session started > 24 hours ago and left incomplete
      if (
        latestSession &&
        latestSession.status !== 'COMPLETED' &&
        latestSession.status !== 'ABANDONED' &&
        latestSession.startedAt &&
        new Date(latestSession.startedAt) < oneDayAgo
      ) {
        detectedGaps.push({
          contentType: 'EXERCISE',
          contentId: exercise.id,
          exerciseId: exercise.id,
          gapType: LEARNING_GAP_TYPES.ABANDONED,
          priority: LEARNING_GAP_PRIORITIES.MEDIUM,
          reason: `Continue guided practice session for ${exercise.name} that was paused previously.`,
          contextData: {
            sessionId: latestSession.id,
            startedAt: latestSession.startedAt,
            lastStep: latestSession.currentStep,
          },
        });
      }

      // C. GAP TYPE: UNREVIEWED_PHASE
      // Published phases that have not yet been practiced in any completed or active practice session
      const completedPhaseIds = new Set<string>();
      exerciseSessions.forEach((sess) => {
        const completed = (sess.completedPhases as string[]) || [];
        completed.forEach((id) => completedPhaseIds.add(id));
      });

      for (const phase of exercise.movementPhases) {
        if (!completedPhaseIds.has(phase.id)) {
          const pName = phase.phaseName || phase.title || 'Movement Phase';
          detectedGaps.push({
            contentType: 'MOVEMENT_PHASE',
            contentId: phase.id,
            exerciseId: exercise.id,
            movementPhaseId: phase.id,
            gapType: LEARNING_GAP_TYPES.UNREVIEWED_PHASE,
            priority: LEARNING_GAP_PRIORITIES.MEDIUM,
            reason: `Review ${pName} because this movement phase has not been completed.`,
            contextData: {
              phaseName: pName,
              orderIndex: phase.orderIndex,
              phaseType: phase.phaseType,
            },
          });
        }
      }

      // D. GAP TYPE: LOW_KNOWLEDGE_CHECK_RESULT
      // Knowledge check attempts for this exercise where score < 75%
      const relevantAttempts = knowledgeAttempts.filter(
        (a) => a.knowledgeCheck?.exerciseId === exercise.id,
      );
      if (relevantAttempts.length > 0) {
        const latestAttempt = relevantAttempts[0];
        if (latestAttempt.score !== null && latestAttempt.score < 75) {
          detectedGaps.push({
            contentType: 'KNOWLEDGE_CHECK',
            contentId: latestAttempt.checkId,
            exerciseId: exercise.id,
            gapType: LEARNING_GAP_TYPES.LOW_KNOWLEDGE_CHECK_RESULT,
            priority: LEARNING_GAP_PRIORITIES.MEDIUM,
            reason: `Review this topic because your last knowledge check score (${Math.round(
              latestAttempt.score,
            )}%) requires another review.`,
            contextData: {
              score: latestAttempt.score,
              attemptId: latestAttempt.id,
              knowledgeCheckId: latestAttempt.checkId,
            },
          });
        }
      }

      // E. GAP TYPE: MISSED_PREREQUISITE
      // If this exercise is a progression from a base exercise, check if base exercise is completed
      for (const variation of exercise.variationsTo) {
        const baseExercise = variation.baseExercise;
        if (baseExercise) {
          const baseProgress = progressRecords.find((p) => p.exerciseId === baseExercise.id);
          const baseMastery = masteryRecords.find((m) => m.contentId === baseExercise.id);
          const isBaseCompleted =
            (baseProgress && baseProgress.status === 'COMPLETED') ||
            (baseMastery &&
              (baseMastery.status === 'COMPLETED' || baseMastery.status === 'MASTERED'));

          if (!isBaseCompleted) {
            detectedGaps.push({
              contentType: 'PREREQUISITE',
              contentId: baseExercise.id,
              exerciseId: exercise.id,
              gapType: LEARNING_GAP_TYPES.MISSED_PREREQUISITE,
              priority: LEARNING_GAP_PRIORITIES.HIGH,
              reason: `Review ${baseExercise.name} movement fundamentals before progressing to ${exercise.name}.`,
              contextData: {
                prerequisiteExerciseId: baseExercise.id,
                prerequisiteName: baseExercise.name,
              },
            });
          }
        }
      }

      // F. GAP TYPE: REPEATED_REVIEW
      // If a member has practiced or reviewed a phase >= 3 times across sessions
      const phaseCountMap: Record<string, number> = {};
      exerciseSessions.forEach((sess) => {
        const practiceData = (sess.phasePracticeData as any[]) || [];
        practiceData.forEach((pd) => {
          if (pd.phaseId) {
            phaseCountMap[pd.phaseId] = (phaseCountMap[pd.phaseId] || 0) + 1;
          }
        });
      });

      for (const phase of exercise.movementPhases) {
        const reviewCount = phaseCountMap[phase.id] || 0;
        if (reviewCount >= 3) {
          const pName = phase.phaseName || phase.title || 'Movement Phase';
          detectedGaps.push({
            contentType: 'MOVEMENT_PHASE',
            contentId: phase.id,
            exerciseId: exercise.id,
            movementPhaseId: phase.id,
            gapType: LEARNING_GAP_TYPES.REPEATED_REVIEW,
            priority: LEARNING_GAP_PRIORITIES.LOW,
            reason: `Targeted review recommended for ${pName} based on repeated phase focus.`,
            contextData: {
              phaseName: pName,
              timesReviewed: reviewCount,
            },
          });
        }
      }

      // G. GAP TYPE: STALE_LEARNING
      // Exercise completed > 30 days ago with no practice in last 30 days
      const isCompleted =
        (userProgress && userProgress.status === 'COMPLETED') ||
        (userMastery &&
          (userMastery.status === 'COMPLETED' || userMastery.status === 'MASTERED'));

      if (isCompleted) {
        const lastPracticeTime = latestSession?.completedAt || userProgress?.lastInteractedAt;
        if (lastPracticeTime && new Date(lastPracticeTime) < thirtyDaysAgo) {
          detectedGaps.push({
            contentType: 'EXERCISE',
            contentId: exercise.id,
            exerciseId: exercise.id,
            gapType: LEARNING_GAP_TYPES.STALE_LEARNING,
            priority: LEARNING_GAP_PRIORITIES.LOW,
            reason: `Refresh recommended for ${exercise.name} technique fundamentals.`,
            contextData: {
              lastPracticedAt: lastPracticeTime,
            },
          });
        }
      }
    }

    // 2. Synchronize detected gaps with database (upsert active, resolve inactive)
    const activeGaps: LearningGapItemDto[] = [];

    for (const gap of detectedGaps) {
      // Find existing OPEN or IN_PROGRESS gap with matching keys
      const existing = await this.prisma.learningGap.findFirst({
        where: {
          organisationId,
          userId,
          exerciseId: gap.exerciseId,
          movementPhaseId: gap.movementPhaseId || null,
          gapType: gap.gapType,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      });

      if (existing) {
        const updated = await this.prisma.learningGap.update({
          where: { id: existing.id },
          data: {
            priority: gap.priority,
            reason: gap.reason,
            contextData: gap.contextData || existing.contextData || undefined,
            lastReviewedAt: new Date(),
          },
          include: {
            exercise: true,
            movementPhase: true,
          },
        });
        activeGaps.push(this.formatGapItem(updated));
      } else {
        const created = await this.prisma.learningGap.create({
          data: {
            organisationId,
            userId,
            contentType: gap.contentType,
            contentId: gap.contentId,
            exerciseId: gap.exerciseId || null,
            movementPhaseId: gap.movementPhaseId || null,
            gapType: gap.gapType,
            priority: gap.priority,
            reason: gap.reason,
            status: 'OPEN',
            contextData: gap.contextData || {},
            detectedAt: new Date(),
          },
          include: {
            exercise: true,
            movementPhase: true,
          },
        });

        await this.auditService.log({
          action: 'LEARNING_GAP_DETECTED',
          resource: 'LearningGap',
          resourceId: created.id,
          userId,
          organisationId,
          metadata: {
            exerciseId: gap.exerciseId,
            gapType: gap.gapType,
            priority: gap.priority,
          },
        });

        activeGaps.push(this.formatGapItem(created));
      }
    }

    // 3. Auto-resolve OPEN gaps that were NOT detected in this evaluation
    const detectedKeySet = new Set(
      detectedGaps.map((g) => `${g.exerciseId || ''}_${g.movementPhaseId || ''}_${g.gapType}`),
    );

    const openGapsInDb = await this.prisma.learningGap.findMany({
      where: {
        organisationId,
        userId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        ...(targetExerciseId ? { exerciseId: targetExerciseId } : {}),
      },
    });

    for (const openGap of openGapsInDb) {
      const key = `${openGap.exerciseId || ''}_${openGap.movementPhaseId || ''}_${openGap.gapType}`;
      if (!detectedKeySet.has(key)) {
        await this.prisma.learningGap.update({
          where: { id: openGap.id },
          data: {
            status: 'RESOLVED',
            resolvedAt: new Date(),
          },
        });

        await this.auditService.log({
          action: 'LEARNING_GAP_RESOLVED',
          resource: 'LearningGap',
          resourceId: openGap.id,
          userId,
          organisationId,
          metadata: {
            gapType: openGap.gapType,
            resolution: 'AUTO_RESOLVED_BY_PROGRESS',
          },
        });
      }
    }

    // 4. Update member's LearningPersonalizationProfile movement aggregates
    await this.updateMemberMovementProfile(organisationId, userId);

    return activeGaps;
  }

  /**
   * Helper: Update member LearningPersonalizationProfile with real movement learning aggregates
   */
  private async updateMemberMovementProfile(
    organisationId: string,
    userId: string,
  ): Promise<void> {
    try {
      const [learnedExercises, completedPractices, allSessions] = await Promise.all([
        this.prisma.exerciseLearningProgress.count({
          where: { userId },
        }),
        this.prisma.movementPracticeSession.count({
          where: { userId, status: 'COMPLETED' },
        }),
        this.prisma.movementPracticeSession.findMany({
          where: { userId },
          select: { completedPhases: true },
        }),
      ]);

      const uniquePhases = new Set<string>();
      allSessions.forEach((s) => {
        const phases = (s.completedPhases as string[]) || [];
        phases.forEach((p) => uniquePhases.add(p));
      });

      await this.prisma.learningPersonalizationProfile.upsert({
        where: { userId },
        create: {
          userId,
          organisationId,
          totalExercisesLearned: learnedExercises,
          totalPhasesCompleted: uniquePhases.size,
          totalPracticesCompleted: completedPractices,
          lastMovementLearningActivity: new Date(),
        },
        update: {
          totalExercisesLearned: learnedExercises,
          totalPhasesCompleted: uniquePhases.size,
          totalPracticesCompleted: completedPractices,
          lastMovementLearningActivity: new Date(),
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to update learning personalization profile: ${err}`);
    }
  }

  // =========================================================================
  // 2. QUERY & RESOLVE LEARNING GAPS
  // =========================================================================

  /**
   * GET /movement-learning/gaps
   * Retrieves member gaps with deterministic priority sorting
   */
  async getMemberGaps(
    organisationId: string,
    userId: string,
    query?: QueryLearningGapsDto,
  ): Promise<LearningGapItemDto[]> {
    const where: any = {
      organisationId,
      userId,
    };

    if (query?.status) {
      where.status = query.status;
    } else {
      where.status = { in: ['OPEN', 'IN_PROGRESS'] };
    }

    if (query?.priority) {
      where.priority = query.priority;
    }
    if (query?.exerciseId) {
      where.exerciseId = query.exerciseId;
    }
    if (query?.gapType) {
      where.gapType = query.gapType;
    }

    const gaps = await this.prisma.learningGap.findMany({
      where,
      include: {
        exercise: true,
        movementPhase: true,
      },
      orderBy: [{ detectedAt: 'desc' }],
      take: query?.limit || 50,
    });

    const items = gaps.map((g) => this.formatGapItem(g));

    // Sort deterministically: HIGH -> MEDIUM -> LOW
    const priorityWeight: Record<string, number> = {
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    return items.sort(
      (a, b) => (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0),
    );
  }

  /**
   * POST /movement-learning/gaps/:id/resolve
   * Explicitly marks a gap resolved or dismissed
   */
  async resolveGap(
    organisationId: string,
    gapId: string,
    dto: ResolveLearningGapDto,
    actor: AuthenticatedUser,
  ): Promise<LearningGapItemDto> {
    const gap = await this.prisma.learningGap.findUnique({
      where: { id: gapId },
      include: { exercise: true, movementPhase: true },
    });

    if (!gap) {
      throw new NotFoundException(`Learning gap '${gapId}' not found`);
    }

    if (gap.organisationId !== organisationId) {
      throw new ForbiddenException('Cannot access learning gap from another organisation');
    }

    if (gap.userId !== actor.id && !this.isTrainerOrAdmin(actor)) {
      throw new ForbiddenException('Cannot modify another member learning gap');
    }

    const updated = await this.prisma.learningGap.update({
      where: { id: gapId },
      data: {
        status: dto.status,
        resolvedAt: dto.status === 'RESOLVED' ? new Date() : null,
        lastReviewedAt: new Date(),
        contextData: {
          ...((gap.contextData as Record<string, any>) || {}),
          resolutionReason: dto.resolutionReason || 'Manual resolution',
          resolvedByUserId: actor.id,
        },
      },
      include: { exercise: true, movementPhase: true },
    });

    await this.auditService.log({
      action: dto.status === 'RESOLVED' ? 'LEARNING_GAP_RESOLVED' : 'LEARNING_GAP_DISMISSED',
      resource: 'LearningGap',
      resourceId: gapId,
      userId: actor.id,
      organisationId,
      metadata: { reason: dto.resolutionReason },
    });

    return this.formatGapItem(updated);
  }

  // =========================================================================
  // 3. CONSOLIDATED MOVEMENT LEARNING DASHBOARD READ MODEL
  // =========================================================================

  /**
   * GET /movement-learning/me
   * Provides single high-performance aggregation for mobile & web learning hubs
   */
  async getMovementLearningDashboard(
    organisationId: string,
    userId: string,
  ): Promise<MovementLearningDashboardResponseDto> {
    // 1. Run deterministic gap sync
    await this.detectMemberGaps(organisationId, userId);

    // 2. Fetch active gaps ordered by priority
    const gaps = await this.getMemberGaps(organisationId, userId, { status: 'OPEN' });

    // 3. Continue Learning: in-progress tutorials & practice sessions
    const [inProgressTutorials, inProgressSessions] = await Promise.all([
      this.prisma.exerciseLearningProgress.findMany({
        where: {
          userId,
          status: 'IN_PROGRESS',
        },
        include: { exercise: true },
        orderBy: { lastInteractedAt: 'desc' },
        take: 3,
      }),
      this.prisma.movementPracticeSession.findMany({
        where: {
          userId,
          status: 'IN_PROGRESS',
        },
        include: { exercise: true },
        orderBy: { lastActiveAt: 'desc' },
        take: 3,
      }),
    ]);

    const continueLearning: MovementLearningDashboardResponseDto['continueLearning'] = [];

    for (const t of inProgressTutorials) {
      if (t.exercise) {
        const percent =
          t.totalSteps > 0 ? Math.round((t.completedSteps / t.totalSteps) * 100) : 0;
        continueLearning.push({
          type: 'TUTORIAL',
          id: t.id,
          exerciseId: t.exerciseId,
          exerciseName: t.exercise.name,
          progressPercent: percent,
          currentStep: `Step ${t.completedSteps}/${t.totalSteps}`,
          lastActiveAt: t.lastInteractedAt,
          reason: `Continue exercise tutorial (${percent}% complete)`,
        });
      }
    }

    for (const s of inProgressSessions) {
      if (s.exercise) {
        continueLearning.push({
          type: 'PRACTICE_SESSION',
          id: s.id,
          exerciseId: s.exerciseId,
          exerciseName: s.exercise.name,
          progressPercent: s.progressPercent,
          currentStep: s.currentStep,
          lastActiveAt: s.lastActiveAt,
          reason: `Resume guided practice session`,
        });
      }
    }

    // 4. Recommended Practice from deterministic priority rules
    const recommendedPractice: RecommendedPracticeItemDto[] = [];

    // Prioritize high-priority gaps first (prerequisites)
    const highGaps = gaps.filter((g) => g.priority === 'HIGH');
    for (const g of highGaps) {
      if (g.exerciseId && g.exerciseName) {
        recommendedPractice.push({
          recommendationType: PRACTICE_RECOMMENDATION_TYPES.REVIEW_MOVEMENT_MECHANICS,
          exerciseId: g.exerciseId,
          exerciseName: g.exerciseName,
          priority: 'HIGH',
          reason: g.reason,
          actionTitle: `Learn Prerequisite Fundamentals`,
        });
      }
    }

    // Medium priority gaps (unreviewed phases, incomplete, low quiz scores)
    const mediumGaps = gaps.filter((g) => g.priority === 'MEDIUM');
    for (const g of mediumGaps) {
      if (g.exerciseId && g.exerciseName) {
        if (g.gapType === LEARNING_GAP_TYPES.UNREVIEWED_PHASE && g.movementPhaseId) {
          recommendedPractice.push({
            recommendationType: PRACTICE_RECOMMENDATION_TYPES.REVIEW_PHASE,
            exerciseId: g.exerciseId,
            exerciseName: g.exerciseName,
            phaseId: g.movementPhaseId,
            phaseName: g.phaseName,
            priority: 'MEDIUM',
            reason: g.reason,
            actionTitle: `Review ${g.phaseName || 'Phase'}`,
          });
        } else if (g.gapType === LEARNING_GAP_TYPES.LOW_KNOWLEDGE_CHECK_RESULT) {
          recommendedPractice.push({
            recommendationType: PRACTICE_RECOMMENDATION_TYPES.RETAKE_KNOWLEDGE_CHECK,
            exerciseId: g.exerciseId,
            exerciseName: g.exerciseName,
            priority: 'MEDIUM',
            reason: g.reason,
            actionTitle: `Retake Knowledge Check`,
          });
        } else {
          recommendedPractice.push({
            recommendationType: PRACTICE_RECOMMENDATION_TYPES.REVIEW_EXERCISE,
            exerciseId: g.exerciseId,
            exerciseName: g.exerciseName,
            priority: 'MEDIUM',
            reason: g.reason,
            actionTitle: `Practice ${g.exerciseName}`,
          });
        }
      }
    }

    // 5. Quick Refresh: Completed exercises or stale learning
    const quickRefresh: MovementLearningDashboardResponseDto['quickRefresh'] = [];
    const completedExercises = await this.prisma.exerciseLearningProgress.findMany({
      where: {
        userId,
        status: 'COMPLETED',
      },
      include: { exercise: true },
      orderBy: { completedAt: 'desc' },
      take: 5,
    });

    for (const item of completedExercises) {
      if (item.exercise) {
        quickRefresh.push({
          exerciseId: item.exerciseId,
          exerciseName: item.exercise.name,
          estimatedDurationSeconds: 45,
          reason: `Quick 30–60s refresher on technique fundamentals`,
        });
      }
    }

    // 6. Recently Learned
    const recentlyLearned: MovementLearningDashboardResponseDto['recentlyLearned'] = [];
    for (const item of completedExercises.slice(0, 4)) {
      if (item.exercise && item.completedAt) {
        recentlyLearned.push({
          exerciseId: item.exerciseId,
          exerciseName: item.exercise.name,
          status: 'COMPLETED',
          completedAt: item.completedAt,
        });
      }
    }

    // 7. Summary metrics
    const profile = await this.prisma.learningPersonalizationProfile.findUnique({
      where: { userId },
    });

    const masteryCount = await this.prisma.learningMastery.count({
      where: { userId, status: { in: ['COMPLETED', 'MASTERED'] } },
    });

    return {
      continueLearning,
      needsReview: gaps,
      recommendedPractice: recommendedPractice.slice(0, 6),
      quickRefresh: quickRefresh.slice(0, 4),
      recentlyLearned,
      learningSummary: {
        totalExercisesLearned: profile?.totalExercisesLearned || 0,
        totalPhasesCompleted: profile?.totalPhasesCompleted || 0,
        totalPracticesCompleted: profile?.totalPracticesCompleted || 0,
        activeGapsCount: gaps.length,
        highPriorityGapsCount: highGaps.length,
        masteryCount,
      },
    };
  }

  // =========================================================================
  // 4. EXERCISE-SPECIFIC LEARNING INTELLIGENCE
  // =========================================================================

  /**
   * GET /exercises/:id/learning-intelligence
   * Surfaces exercise-specific gaps, phase completion checklist, and next recommended action
   */
  async getExerciseLearningIntelligence(
    organisationId: string,
    exerciseId: string,
    userId?: string,
  ): Promise<ExerciseLearningIntelligenceResponseDto> {
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
        variationsFrom: {
          include: { targetExercise: true },
        },
        variationsTo: {
          include: { baseExercise: true },
        },
      },
    });

    let activeGaps: LearningGapItemDto[] = [];
    if (userId) {
      await this.detectMemberGaps(organisationId, userId, exerciseId);
      activeGaps = await this.getMemberGaps(organisationId, userId, {
        exerciseId,
        status: 'OPEN',
      });
    }

    // Phase progress
    const sessions = userId
      ? await this.prisma.movementPracticeSession.findMany({
          where: { userId, exerciseId, organisationId },
        })
      : [];

    const practicedPhaseCounts: Record<string, number> = {};
    sessions.forEach((s) => {
      const data = (s.phasePracticeData as any[]) || [];
      data.forEach((pd) => {
        if (pd.phaseId) {
          practicedPhaseCounts[pd.phaseId] = (practicedPhaseCounts[pd.phaseId] || 0) + 1;
        }
      });
      const completed = (s.completedPhases as string[]) || [];
      completed.forEach((id) => {
        if (!practicedPhaseCounts[id]) {
          practicedPhaseCounts[id] = 1;
        }
      });
    });

    const phaseProgress = exercise.movementPhases.map((phase) => {
      const phaseGaps = activeGaps.filter((g) => g.movementPhaseId === phase.id);
      const practiceCount = practicedPhaseCounts[phase.id] || 0;
      const pName = phase.phaseName || phase.title || 'Movement Phase';
      return {
        phaseId: phase.id,
        name: pName,
        orderIndex: phase.orderIndex,
        phaseType: phase.phaseType,
        isPracticed: practiceCount > 0,
        practiceCount,
        hasGaps: phaseGaps.length > 0,
        gapReasons: phaseGaps.map((g) => g.reason),
      };
    });

    // Prerequisites
    const prerequisites = exercise.variationsTo
      .filter((v) => v.relationshipType === 'PROGRESSION')
      .map((v) => ({
        prerequisiteExerciseId: v.baseExerciseId,
        prerequisiteExerciseName: v.baseExercise.name,
        isCompleted: false,
        status: 'REQUIRED',
      }));

    // Variations
    const variations = {
      progressions: exercise.variationsFrom
        .filter((v) => v.relationshipType === 'PROGRESSION')
        .map((v) => ({ id: v.targetExerciseId, name: v.targetExercise.name })),
      regressions: exercise.variationsFrom
        .filter((v) => v.relationshipType === 'REGRESSION')
        .map((v) => ({ id: v.targetExerciseId, name: v.targetExercise.name })),
      alternatives: exercise.variationsFrom
        .filter((v) => v.relationshipType === 'ALTERNATIVE' || v.relationshipType === 'VARIATION')
        .map((v) => ({ id: v.targetExerciseId, name: v.targetExercise.name })),
    };

    // Recommended Next Action
    const topGap = activeGaps[0];
    let recommendedNextAction: {
      actionType: string;
      title: string;
      reason: string;
      phaseId?: string;
    } = {
      actionType: 'START_TUTORIAL',
      title: 'Start Exercise Tutorial',
      reason: 'Begin structured technique education for this exercise.',
      phaseId: exercise.movementPhases[0]?.id || undefined,
    };

    if (topGap) {
      if (topGap.gapType === LEARNING_GAP_TYPES.UNREVIEWED_PHASE && topGap.movementPhaseId) {
        recommendedNextAction = {
          actionType: 'REVIEW_PHASE',
          title: `Practice ${topGap.phaseName || 'Next Phase'}`,
          reason: topGap.reason,
          phaseId: topGap.movementPhaseId,
        };
      } else if (topGap.gapType === LEARNING_GAP_TYPES.LOW_KNOWLEDGE_CHECK_RESULT) {
        recommendedNextAction = {
          actionType: 'RETAKE_KNOWLEDGE_CHECK',
          title: 'Retake Knowledge Check',
          reason: topGap.reason,
          phaseId: undefined,
        };
      } else {
        recommendedNextAction = {
          actionType: 'TARGETED_PRACTICE',
          title: 'Targeted Movement Practice',
          reason: topGap.reason,
          phaseId: topGap.movementPhaseId || undefined,
        };
      }
    }

    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      activeGaps,
      phaseProgress,
      prerequisites,
      variations,
      quickRefreshAvailable: exercise.movementPhases.length > 0,
      recommendedNextAction,
    };
  }

  // =========================================================================
  // 5. ADAPTIVE TARGETED PRACTICE SESSION GENERATION
  // =========================================================================

  /**
   * POST /movement-practice/targeted-session
   * Builds an adaptive practice session focused directly on learning gaps
   */
  async createTargetedPracticeSession(
    organisationId: string,
    userId: string,
    dto: CreateTargetedReviewSessionDto,
    actor: AuthenticatedUser,
  ) {
    if (userId !== actor.id && !this.isTrainerOrAdmin(actor)) {
      throw new ForbiddenException('Cannot create practice session for another member');
    }

    const exercise = await this.prisma.exercise.findFirstOrThrow({
      where: {
        id: dto.exerciseId,
        OR: [{ ownershipType: 'SYSTEM' }, { organisationId }],
      },
      include: {
        movementPhases: {
          where: { status: 'PUBLISHED' },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    // Determine targeted phases: from focusPhaseIds, or from gapIds
    let targetedPhases = exercise.movementPhases;
    if (dto.focusPhaseIds && dto.focusPhaseIds.length > 0) {
      const idSet = new Set(dto.focusPhaseIds);
      targetedPhases = exercise.movementPhases.filter((p) => idSet.has(p.id));
    } else if (dto.gapIds && dto.gapIds.length > 0) {
      const gaps = await this.prisma.learningGap.findMany({
        where: { id: { in: dto.gapIds } },
      });
      const phaseIdsFromGaps = new Set(
        gaps.map((g) => g.movementPhaseId).filter((id): id is string => Boolean(id)),
      );
      if (phaseIdsFromGaps.size > 0) {
        targetedPhases = exercise.movementPhases.filter((p) => phaseIdsFromGaps.has(p.id));
      }
    }

    const firstPhase = targetedPhases[0] || exercise.movementPhases[0];

    // Create session in MovementPracticeSession table
    const session = await this.prisma.movementPracticeSession.create({
      data: {
        userId,
        organisationId,
        exerciseId: dto.exerciseId,
        sessionType: dto.sessionType || 'TARGETED_REVIEW',
        status: 'IN_PROGRESS',
        currentStep: 'INTRO',
        currentPhaseId: firstPhase?.id || null,
        currentPhaseIndex: 0,
        totalSteps: targetedPhases.length,
        progressPercent: 0.0,
        completedPhases: [],
        checklistState: {},
        phasePracticeData: [],
        selfReflection: {
          isTargetedReview: true,
          targetedPhaseIds: targetedPhases.map((p) => p.id),
          focusConcepts: dto.focusConcepts || ['SETUP', 'TECHNIQUE', 'BREATHING'],
          linkedGapIds: dto.gapIds || [],
        },
        startedAt: new Date(),
        lastActiveAt: new Date(),
      },
    });

    // Mark linked gaps IN_PROGRESS
    if (dto.gapIds && dto.gapIds.length > 0) {
      await this.prisma.learningGap.updateMany({
        where: { id: { in: dto.gapIds } },
        data: {
          status: 'IN_PROGRESS',
          lastReviewedAt: new Date(),
        },
      });
    }

    await this.auditService.log({
      action: 'ADAPTIVE_PRACTICE_STARTED',
      resource: 'MovementPracticeSession',
      resourceId: session.id,
      userId,
      organisationId,
      metadata: {
        exerciseId: dto.exerciseId,
        targetedPhasesCount: targetedPhases.length,
        gapIds: dto.gapIds,
      },
    });

    return {
      session: {
        id: session.id,
        exerciseId: session.exerciseId,
        sessionType: session.sessionType,
        status: session.status,
        currentStep: session.currentStep,
        currentPhaseId: session.currentPhaseId,
        totalSteps: session.totalSteps,
        progressPercent: session.progressPercent,
      },
      targetedPhases: targetedPhases.map((p) => ({
        id: p.id,
        name: p.phaseName || p.title || 'Movement Phase',
        orderIndex: p.orderIndex,
        phaseType: p.phaseType,
      })),
      suggestedSequence: [
        'Review Setup & Posture',
        ...targetedPhases.map((p) => `Practice ${p.phaseName || p.title || 'Phase'}`),
        'Review Breathing Rhythm & Cadence',
        ...(dto.includeKnowledgeCheck !== false ? ['Knowledge Check'] : []),
        'Summary & Feedback',
      ],
    };
  }

  // =========================================================================
  // 6. QUICK REFRESH MODE (30–60s)
  // =========================================================================

  /**
   * GET /movement-learning/quick-refresh/:exerciseId
   * Lightweight rapid refresher payload: setup, ordered phase cues, breathing cadence
   */
  async getQuickRefresh(
    organisationId: string,
    exerciseId: string,
  ): Promise<QuickRefreshResponseDto> {
    const exercise = await this.prisma.exercise.findFirstOrThrow({
      where: {
        id: exerciseId,
        OR: [{ ownershipType: 'SYSTEM' }, { organisationId }],
      },
      include: {
        movementPhases: {
          where: { status: 'PUBLISHED' },
          orderBy: { orderIndex: 'asc' },
          include: {
            movementExpectations: {
              where: { status: 'PUBLISHED' },
              orderBy: { sortOrder: 'asc' },
            },
            commonMistakeRecords: true,
          },
        },
        equipmentRelations: true,
      },
    });

    // 1. Setup notes & equipment
    const keyNotes: string[] = [];
    if (exercise.setupInstructions) {
      keyNotes.push(exercise.setupInstructions);
    }
    if (exercise.bodyPosition) {
      keyNotes.push(`Starting body position: ${exercise.bodyPosition}`);
    }

    const equipment = exercise.equipmentRelations.map((e) => e.equipmentName);

    // 2. Phases with essential cues
    const movementPhases = exercise.movementPhases.map((phase) => {
      const topExpectation = phase.movementExpectations[0];
      const mistake = phase.commonMistakeRecords[0];
      const pName = phase.phaseName || phase.title || 'Movement Phase';

      return {
        id: phase.id,
        orderIndex: phase.orderIndex,
        name: pName,
        phaseType: phase.phaseType,
        focusCue:
          topExpectation?.description ||
          phase.cueText ||
          `Maintain controlled alignment during ${pName}.`,
        breathing:
          topExpectation?.expectedBreathing ||
          exercise.breathingInstructions ||
          'Inhale on lowering, exhale on drive.',
        tempo: topExpectation?.expectedTempo || exercise.tempo || '2-0-1-0',
        keyMistakeToAvoid: mistake?.mistake || mistake?.consequence || undefined,
      };
    });

    // 3. Cadence & checklist
    const cadenceSummary = {
      tempo: exercise.tempo || '2-0-1-0 (Controlled eccentric, explosive concentric)',
      breathingPattern:
        exercise.breathingInstructions || 'Inhale during deceleration, exhale through exertion.',
    };

    const refresherChecklist = [
      'Stable baseline foot/hand position established',
      'Neutral spine and braced core maintained',
      'Controlled movement speed matching tempo',
      'Full range of motion achieved without compensation',
      'Rhythmic breathing aligned with movement direction',
    ];

    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      estimatedDurationSeconds: 45,
      setup: {
        keyNotes,
        equipment,
      },
      movementPhases,
      cadenceSummary,
      refresherChecklist,
    };
  }

  // =========================================================================
  // 7. TRAINER & ADMIN VIEWS
  // =========================================================================

  /**
   * GET /movement-learning/trainer/member/:memberId
   * Trainer read-only view of client learning gaps and progress (strictly educational)
   */
  async getTrainerMemberLearningInsights(
    organisationId: string,
    memberId: string,
    actor: AuthenticatedUser,
  ): Promise<TrainerMemberLearningInsightsDto> {
    if (!this.isTrainerOrAdmin(actor)) {
      throw new ForbiddenException('Only authorized trainers or admins can view member learning');
    }

    const member = await this.prisma.user.findFirstOrThrow({
      where: { id: memberId },
    });

    const [learnedExercises, completedTutorials, completedPractices, attempts, gaps, recentSessions] =
      await Promise.all([
        this.prisma.exerciseLearningProgress.count({
          where: { userId: memberId },
        }),
        this.prisma.exerciseLearningProgress.count({
          where: { userId: memberId, status: 'COMPLETED' },
        }),
        this.prisma.movementPracticeSession.count({
          where: { userId: memberId, status: 'COMPLETED' },
        }),
        this.prisma.knowledgeAttempt.findMany({
          where: { userId: memberId },
        }),
        this.prisma.learningGap.findMany({
          where: { userId: memberId, status: 'OPEN' },
          include: { exercise: true, movementPhase: true },
          take: 5,
        }),
        this.prisma.movementPracticeSession.findMany({
          where: { userId: memberId },
          include: { exercise: true },
          orderBy: { completedAt: 'desc' },
          take: 5,
        }),
      ]);

    const validScores = attempts.map((a) => a.score).filter((s): s is number => s !== null);
    const knowledgeCheckAverage =
      validScores.length > 0
        ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
        : null;

    const recentActivity = recentSessions.map((s) => ({
      type: 'PRACTICE_SESSION',
      exerciseName: s.exercise?.name || 'Exercise Practice',
      completedAt: s.completedAt || s.lastActiveAt,
    }));

    return {
      memberId: member.id,
      memberName: `${member.firstName} ${member.lastName}`,
      totalExercisesLearned: learnedExercises,
      totalTutorialsCompleted: completedTutorials,
      totalGuidedPractices: completedPractices,
      knowledgeCheckAverage,
      activeGapsCount: gaps.length,
      recentActivity,
      topReviewNeeds: gaps.map((g) => this.formatGapItem(g)),
    };
  }

  /**
   * GET /movement-learning/admin/analytics
   * Admin analytics on learning content quality and phase drop-off
   */
  async getAdminLearningQualityInsights(
    organisationId: string,
    actor: AuthenticatedUser,
  ): Promise<AdminLearningQualityInsightsDto> {
    if (!this.isTrainerOrAdmin(actor)) {
      throw new ForbiddenException('Admin authorization required for analytics');
    }

    const [exercisesWithPhases, allGaps, allSessions] = await Promise.all([
      this.prisma.exercise.count({
        where: {
          movementPhases: { some: {} },
        },
      }),
      this.prisma.learningGap.findMany({
        where: { organisationId },
      }),
      this.prisma.movementPracticeSession.findMany({
        where: { organisationId },
        include: { exercise: true },
      }),
    ]);

    const gapsByType: Record<string, number> = {};
    allGaps.forEach((g) => {
      gapsByType[g.gapType] = (gapsByType[g.gapType] || 0) + 1;
    });

    // Phase dropoff highlights
    const phaseDropoffHighlights: AdminLearningQualityInsightsDto['phaseDropoffHighlights'] = [];
    const phaseStats: Record<
      string,
      { exerciseId: string; exerciseName: string; phaseName: string; starts: number; completions: number }
    > = {};

    allSessions.forEach((sess) => {
      const practiceData = (sess.phasePracticeData as any[]) || [];
      practiceData.forEach((pd) => {
        if (pd.phaseId) {
          if (!phaseStats[pd.phaseId]) {
            phaseStats[pd.phaseId] = {
              exerciseId: sess.exerciseId,
              exerciseName: sess.exercise?.name || 'Exercise',
              phaseName: pd.phaseName || 'Phase',
              starts: 0,
              completions: 0,
            };
          }
          phaseStats[pd.phaseId].starts += 1;
          if (pd.completedAt) {
            phaseStats[pd.phaseId].completions += 1;
          }
        }
      });
    });

    Object.entries(phaseStats).forEach(([phaseId, stat]) => {
      if (stat.starts >= 3) {
        const dropoff = Math.round(((stat.starts - stat.completions) / stat.starts) * 100);
        if (dropoff >= 30) {
          phaseDropoffHighlights.push({
            exerciseId: stat.exerciseId,
            exerciseName: stat.exerciseName,
            phaseId,
            phaseName: stat.phaseName,
            startCount: stat.starts,
            completionCount: stat.completions,
            dropoffRatePercent: dropoff,
            flag: 'Potential educational content drop-off',
          });
        }
      }
    });

    return {
      totalExercisesWithPhases: exercisesWithPhases,
      totalLearningGapsDetected: allGaps.length,
      gapsByType,
      phaseDropoffHighlights,
    };
  }
}
