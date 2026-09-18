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
  QueryGuidedSessionsDto,
  CreateGuidedSessionDto,
  UpdateGuidedSessionDto,
  CreateGuidedSessionSectionDto,
  UpdateGuidedSessionSectionDto,
  CreateGuidedSessionItemDto,
  UpdateGuidedSessionItemDto,
  ReorderGuidedSessionItemsDto,
  StartGuidedSessionDto,
  UpdateGuidedSessionProgressDto,
  CompleteGuidedSessionDto,
  PublishValidationResultDto,
  GuidedSessionItemType,
  GuidedSessionContentStatus,
} from '../dto/guided-session.dto';

@Injectable()
export class GuidedSessionService {
  private readonly logger = new Logger(GuidedSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // =========================================================================
  // HELPERS
  // =========================================================================

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private isSuperAdmin(user: AuthenticatedUser): boolean {
    return (
      (user as any).isSuperAdmin === true ||
      user.roles?.some((r) => r.role === 'SUPERADMIN')
    );
  }

  private isTrainerOrAdmin(user: AuthenticatedUser, organisationId: string): boolean {
    if (this.isSuperAdmin(user)) return true;
    return user.roles?.some(
      (r) =>
        ['ORGANISATION_OWNER', 'OUTLET_MANAGER', 'TRAINER', 'ENTERPRISE_ADMIN'].includes(
          r.role,
        ) && (r.organisationId === organisationId || !r.organisationId),
    );
  }

  private buildTenantFilter(organisationId: string, ownershipType?: string) {
    if (ownershipType === 'SYSTEM') {
      return { ownershipType: 'SYSTEM' as const };
    }
    if (ownershipType === 'ORGANISATION') {
      return { ownershipType: 'ORGANISATION' as const, organisationId };
    }
    return {
      OR: [{ ownershipType: 'SYSTEM' }, { organisationId }],
    };
  }

  private async assertSessionAccess(
    organisationId: string,
    sessionId: string,
    user?: AuthenticatedUser,
    requireWrite: boolean = false,
  ): Promise<any> {
    const session = await this.prisma.guidedSession.findUnique({
      where: { id: sessionId },
      include: {
        sections: { orderBy: { sortOrder: 'asc' } },
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            exercise: {
              include: {
                media: true,
                instruction: true,
                instructionSteps: true,
                movementPhases: true,
                commonMistakes: true,
                safetyGuidelines: true,
                equipmentRelations: true,
                muscleRelations: true,
              },
            },
            knowledgeCheck: {
              include: {
                questions: {
                  include: { answers: true },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Guided session with ID "${sessionId}" not found`);
    }

    // Tenancy check: System sessions or sessions belonging to current organisation
    if (session.ownershipType !== 'SYSTEM' && session.organisationId !== organisationId) {
      throw new NotFoundException(`Guided session with ID "${sessionId}" not found`);
    }

    if (requireWrite) {
      if (session.ownershipType === 'SYSTEM' && user && !this.isSuperAdmin(user)) {
        throw new ForbiddenException(
          'System-level guided sessions cannot be modified by organisation staff',
        );
      }
      if (user && !this.isTrainerOrAdmin(user, organisationId)) {
        throw new ForbiddenException('Trainer or Admin permissions required');
      }
    } else {
      // Read access: members can only see published sessions
      if (session.contentStatus !== 'PUBLISHED') {
        const canViewDraft = user && this.isTrainerOrAdmin(user, organisationId);
        if (!canViewDraft) {
          throw new NotFoundException(`Guided session with ID "${sessionId}" not found`);
        }
      }
    }

    return session;
  }

  // =========================================================================
  // 1. QUERY & READ SESSIONS (MEMBER & TRAINER)
  // =========================================================================

  async findSessions(
    organisationId: string,
    query: QueryGuidedSessionsDto,
    user?: AuthenticatedUser,
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const isStaff = user ? this.isTrainerOrAdmin(user, organisationId) : false;

    const whereClause: any = {
      AND: [this.buildTenantFilter(organisationId, query.ownershipType)],
    };

    // Members only see PUBLISHED; staff can filter by status
    if (query.contentStatus && isStaff) {
      whereClause.AND.push({ contentStatus: query.contentStatus.toUpperCase() });
    } else if (!isStaff) {
      whereClause.AND.push({ contentStatus: 'PUBLISHED' });
    }

    if (query.category) {
      whereClause.AND.push({ category: query.category.toUpperCase() });
    }
    if (query.difficulty) {
      whereClause.AND.push({ difficulty: query.difficulty.toUpperCase() });
    }
    if (query.primaryGoal) {
      whereClause.AND.push({ primaryGoal: query.primaryGoal.toUpperCase() });
    }
    if (query.featured !== undefined) {
      whereClause.AND.push({ featured: query.featured });
    }
    if (query.search) {
      const term = query.search.trim();
      whereClause.AND.push({
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
        ],
      });
    }

    const [items, total] = await Promise.all([
      this.prisma.guidedSession.findMany({
        where: whereClause,
        include: {
          sections: { select: { id: true, title: true, sortOrder: true } },
          items: {
            select: {
              id: true,
              itemType: true,
              title: true,
              durationSeconds: true,
              exerciseId: true,
            },
          },
          ...(user
            ? {
                userProgress: {
                  where: { userId: user.id },
                  select: {
                    status: true,
                    percentComplete: true,
                    currentStepIndex: true,
                    completedItemCount: true,
                    lastAccessedAt: true,
                  },
                },
              }
            : {}),
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.guidedSession.count({ where: whereClause }),
    ]);

    const formattedItems = items.map((item) => {
      const progress = item.userProgress?.[0] || null;
      return {
        id: item.id,
        title: item.title,
        slug: item.slug,
        description: item.description,
        coverMediaUrl: item.coverMediaUrl,
        category: item.category,
        difficulty: item.difficulty,
        primaryGoal: item.primaryGoal,
        estimatedDurationMinutes: item.estimatedDurationMinutes,
        contentStatus: item.contentStatus,
        ownershipType: item.ownershipType,
        featured: item.featured,
        sectionCount: item.sections.length,
        itemCount: item.items.length,
        exerciseCount: item.items.filter((i) => i.itemType === 'EXERCISE_TUTORIAL').length,
        userProgress: progress
          ? {
              status: progress.status,
              percentComplete: progress.percentComplete,
              currentStepIndex: progress.currentStepIndex,
              completedItemCount: progress.completedItemCount,
              lastAccessedAt: progress.lastAccessedAt,
            }
          : null,
      };
    });

    return {
      items: formattedItems,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSessionDetail(
    organisationId: string,
    sessionId: string,
    user?: AuthenticatedUser,
  ) {
    const session = await this.assertSessionAccess(organisationId, sessionId, user, false);

    // Fetch user progress if user is authenticated
    let userProgress: any = null;
    if (user) {
      userProgress = await this.prisma.userGuidedSessionProgress.findUnique({
        where: {
          userId_sessionId: {
            userId: user.id,
            sessionId: session.id,
          },
        },
        include: {
          itemCompletions: true,
        },
      });
    }

    // Aggregate equipment needed across all exercises in this session
    const equipmentSet = new Set<string>();
    const movementPatterns = new Set<string>();
    const primeMuscles = new Set<string>();

    session.items.forEach((item: any) => {
      if (item.exercise) {
        if (item.exercise.equipment && item.exercise.equipment !== 'BODYWEIGHT') {
          equipmentSet.add(item.exercise.equipment);
        }
        if (item.exercise.movementPattern) {
          movementPatterns.add(item.exercise.movementPattern);
        }
        if (item.exercise.primaryMuscleGroup) {
          primeMuscles.add(item.exercise.primaryMuscleGroup);
        }
      }
    });

    // Structure sections with items
    const sectionsWithItems = session.sections.map((section: any) => ({
      ...section,
      items: session.items.filter((item: any) => item.sectionId === section.id),
    }));

    // Add unsectioned items if any
    const unsectionedItems = session.items.filter((item: any) => !item.sectionId);

    // Compute structure breakdown
    const warmupMinutes = Math.ceil(
      session.items
        .filter((i: any) => i.itemType === 'WARMUP')
        .reduce((sum: number, i: any) => sum + (i.durationSeconds || 180), 0) / 60,
    );
    const tutorialMinutes = Math.ceil(
      session.items
        .filter((i: any) => i.itemType === 'EXERCISE_TUTORIAL')
        .reduce((sum: number, i: any) => sum + (i.durationSeconds || 300), 0) / 60,
    );
    const practiceMinutes = Math.ceil(
      session.items
        .filter((i: any) => i.itemType === 'PRACTICE')
        .reduce((sum: number, i: any) => sum + (i.durationSeconds || 120), 0) / 60,
    );
    const cooldownMinutes = Math.ceil(
      session.items
        .filter((i: any) => i.itemType === 'COOLDOWN' || i.itemType === 'SUMMARY')
        .reduce((sum: number, i: any) => sum + (i.durationSeconds || 120), 0) / 60,
    );

    return {
      session: {
        id: session.id,
        organisationId: session.organisationId,
        ownershipType: session.ownershipType,
        title: session.title,
        slug: session.slug,
        description: session.description,
        coverMediaUrl: session.coverMediaUrl,
        category: session.category,
        difficulty: session.difficulty,
        primaryGoal: session.primaryGoal,
        estimatedDurationMinutes: session.estimatedDurationMinutes,
        contentStatus: session.contentStatus,
        featured: session.featured,
        metadata: session.metadata,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
      equipmentNeededSummary: Array.from(equipmentSet),
      movementPatterns: Array.from(movementPatterns),
      primeMuscles: Array.from(primeMuscles),
      structureBreakdown: {
        warmupMinutes,
        tutorialMinutes,
        practiceMinutes,
        cooldownMinutes,
        totalItems: session.items.length,
      },
      sections: sectionsWithItems,
      unsectionedItems,
      items: session.items,
      userProgress: userProgress
        ? {
            id: userProgress.id,
            status: userProgress.status,
            currentStepIndex: userProgress.currentStepIndex,
            currentItemId: userProgress.currentItemId,
            completedItemCount: userProgress.completedItemCount,
            totalItemCount: session.items.length,
            percentComplete: userProgress.percentComplete,
            timeSpentSeconds: userProgress.timeSpentSeconds,
            practiceLog: userProgress.practiceLog,
            knowledgeCheckScores: userProgress.knowledgeCheckScores,
            startedAt: userProgress.startedAt,
            completedAt: userProgress.completedAt,
            lastAccessedAt: userProgress.lastAccessedAt,
            completedItemIds: userProgress.itemCompletions.map((c: any) => c.itemId),
          }
        : null,
    };
  }

  // =========================================================================
  // 2. PROGRESS LIFECYCLE (START, CHECKPOINT, COMPLETE, RESUME)
  // =========================================================================

  async getSessionProgress(
    organisationId: string,
    sessionId: string,
    userId: string,
  ) {
    await this.assertSessionAccess(organisationId, sessionId);

    const progress = await this.prisma.userGuidedSessionProgress.findUnique({
      where: {
        userId_sessionId: { userId, sessionId },
      },
      include: {
        itemCompletions: true,
      },
    });

    if (!progress) {
      return {
        status: 'NOT_STARTED',
        currentStepIndex: 0,
        currentItemId: null,
        completedItemCount: 0,
        percentComplete: 0,
        timeSpentSeconds: 0,
        completedItemIds: [],
      };
    }

    return {
      ...progress,
      completedItemIds: progress.itemCompletions.map((c) => c.itemId),
    };
  }

  async startSession(
    organisationId: string,
    sessionId: string,
    userId: string,
    dto: StartGuidedSessionDto,
  ) {
    const session = await this.assertSessionAccess(organisationId, sessionId);
    const totalItems = session.items.length;
    const firstItemId = session.items[0]?.id || null;

    let progress = await this.prisma.userGuidedSessionProgress.findUnique({
      where: { userId_sessionId: { userId, sessionId } },
    });

    if (!progress || dto.resetProgress) {
      if (progress && dto.resetProgress) {
        await this.prisma.userGuidedSessionItemCompletion.deleteMany({
          where: { progressId: progress.id },
        });
      }

      progress = await this.prisma.userGuidedSessionProgress.upsert({
        where: { userId_sessionId: { userId, sessionId } },
        create: {
          userId,
          sessionId,
          organisationId,
          status: 'IN_PROGRESS',
          currentStepIndex: 0,
          currentItemId: firstItemId,
          completedItemCount: 0,
          totalItemCount: totalItems,
          percentComplete: 0,
          timeSpentSeconds: 0,
          startedAt: new Date(),
          lastAccessedAt: new Date(),
        },
        update: {
          status: 'IN_PROGRESS',
          currentStepIndex: 0,
          currentItemId: firstItemId,
          completedItemCount: 0,
          totalItemCount: totalItems,
          percentComplete: 0,
          timeSpentSeconds: 0,
          startedAt: new Date(),
          lastAccessedAt: new Date(),
        },
      });
    } else {
      progress = await this.prisma.userGuidedSessionProgress.update({
        where: { id: progress.id },
        data: {
          lastAccessedAt: new Date(),
        },
      });
    }

    return progress;
  }

  async updateProgress(
    organisationId: string,
    sessionId: string,
    userId: string,
    dto: UpdateGuidedSessionProgressDto,
  ) {
    const session = await this.assertSessionAccess(organisationId, sessionId);
    const totalItems = Math.max(1, session.items.length);

    let progress = await this.prisma.userGuidedSessionProgress.findUnique({
      where: { userId_sessionId: { userId, sessionId } },
      include: { itemCompletions: true },
    });

    if (!progress) {
      progress = await this.prisma.userGuidedSessionProgress.create({
        data: {
          userId,
          sessionId,
          organisationId,
          status: 'IN_PROGRESS',
          currentStepIndex: dto.currentStepIndex ?? 0,
          currentItemId: dto.currentItemId ?? session.items[0]?.id,
          completedItemCount: 0,
          totalItemCount: totalItems,
          percentComplete: 0,
          timeSpentSeconds: dto.timeSpentSecondsIncrement || 0,
          startedAt: new Date(),
          lastAccessedAt: new Date(),
        },
        include: { itemCompletions: true },
      });
    }

    // If an item was completed in this step, record completion
    if (dto.completedItemId) {
      await this.prisma.userGuidedSessionItemCompletion.upsert({
        where: {
          userId_itemId: {
            userId,
            itemId: dto.completedItemId,
          },
        },
        create: {
          progressId: progress.id,
          userId,
          sessionId,
          itemId: dto.completedItemId,
          timeSpentSeconds: dto.timeSpentSecondsIncrement || 0,
          metadata: dto.itemCompletionData || {},
          completedAt: new Date(),
        },
        update: {
          metadata: dto.itemCompletionData || {},
          completedAt: new Date(),
          timeSpentSeconds: {
            increment: dto.timeSpentSecondsIncrement || 0,
          },
        },
      });
    }

    // Recalculate unique completed items
    const completions = await this.prisma.userGuidedSessionItemCompletion.findMany({
      where: { progressId: progress.id },
      select: { itemId: true },
    });
    const completedCount = completions.length;
    const percentComplete = Math.min(
      100,
      Math.round((completedCount / totalItems) * 100),
    );

    const updateData: any = {
      completedItemCount: completedCount,
      percentComplete,
      lastAccessedAt: new Date(),
      status: percentComplete >= 100 ? 'COMPLETED' : 'IN_PROGRESS',
    };

    if (dto.currentItemId !== undefined) {
      updateData.currentItemId = dto.currentItemId;
    }
    if (dto.currentStepIndex !== undefined) {
      updateData.currentStepIndex = dto.currentStepIndex;
    }
    if (dto.timeSpentSecondsIncrement) {
      updateData.timeSpentSeconds = {
        increment: dto.timeSpentSecondsIncrement,
      };
    }

    const updated = await this.prisma.userGuidedSessionProgress.update({
      where: { id: progress.id },
      data: updateData,
      include: { itemCompletions: true },
    });

    return {
      ...updated,
      completedItemIds: updated.itemCompletions.map((c) => c.itemId),
    };
  }

  async completeSession(
    organisationId: string,
    sessionId: string,
    userId: string,
    dto: CompleteGuidedSessionDto,
  ) {
    const session = await this.assertSessionAccess(organisationId, sessionId);
    const totalItems = session.items.length;

    let progress = await this.prisma.userGuidedSessionProgress.findUnique({
      where: { userId_sessionId: { userId, sessionId } },
    });

    if (!progress) {
      progress = await this.prisma.userGuidedSessionProgress.create({
        data: {
          userId,
          sessionId,
          organisationId,
          status: 'COMPLETED',
          currentStepIndex: totalItems - 1,
          currentItemId: session.items[totalItems - 1]?.id,
          completedItemCount: totalItems,
          totalItemCount: totalItems,
          percentComplete: 100,
          timeSpentSeconds: dto.totalTimeSpentSeconds || 600,
          startedAt: new Date(),
          completedAt: new Date(),
          lastAccessedAt: new Date(),
          practiceLog: dto.practiceFeedback || {},
        },
      });
    } else {
      progress = await this.prisma.userGuidedSessionProgress.update({
        where: { id: progress.id },
        data: {
          status: 'COMPLETED',
          completedItemCount: totalItems,
          percentComplete: 100,
          completedAt: new Date(),
          lastAccessedAt: new Date(),
          ...(dto.totalTimeSpentSeconds
            ? { timeSpentSeconds: dto.totalTimeSpentSeconds }
            : {}),
          ...(dto.practiceFeedback
            ? { practiceLog: dto.practiceFeedback }
            : {}),
        },
      });
    }

    // Sync exercise learning progress for exercises covered in this session
    for (const item of session.items) {
      if (item.exerciseId) {
        await this.prisma.exerciseLearningProgress.upsert({
          where: {
            userId_exerciseId: {
              userId,
              exerciseId: item.exerciseId,
            },
          },
          create: {
            userId,
            exerciseId: item.exerciseId,
            organisationId,
            status: 'COMPLETED',
            mediaViewed: true,
            instructionsViewed: true,
            phasesExplored: true,
            completedAt: new Date(),
            lastInteractedAt: new Date(),
          },
          update: {
            status: 'COMPLETED',
            mediaViewed: true,
            instructionsViewed: true,
            phasesExplored: true,
            lastInteractedAt: new Date(),
          },
        });
      }
    }

    return {
      sessionTitle: session.title,
      totalItems,
      exerciseTutorialsCompleted: session.items.filter(
        (i: any) => i.itemType === 'EXERCISE_TUTORIAL',
      ).length,
      practiceCompleted: session.items.filter((i: any) => i.itemType === 'PRACTICE').length,
      knowledgeChecksCompleted: session.items.filter(
        (i: any) => i.itemType === 'KNOWLEDGE_CHECK',
      ).length,
      timeSpentSeconds: progress.timeSpentSeconds,
      completedAt: progress.completedAt,
      percentComplete: 100,
    };
  }

  async getResumeSession(organisationId: string, userId: string) {
    const activeProgress = await this.prisma.userGuidedSessionProgress.findFirst({
      where: {
        userId,
        status: 'IN_PROGRESS',
        session: {
          OR: [{ ownershipType: 'SYSTEM' }, { organisationId }],
          contentStatus: 'PUBLISHED',
        },
      },
      include: {
        session: {
          include: {
            items: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
      orderBy: { lastAccessedAt: 'desc' },
    });

    if (!activeProgress) return null;

    const currentItem =
      activeProgress.session.items.find((i) => i.id === activeProgress.currentItemId) ||
      activeProgress.session.items[activeProgress.currentStepIndex] ||
      activeProgress.session.items[0];

    const nextItem =
      activeProgress.session.items[activeProgress.currentStepIndex + 1] || null;

    return {
      sessionId: activeProgress.sessionId,
      sessionTitle: activeProgress.session.title,
      coverMediaUrl: activeProgress.session.coverMediaUrl,
      difficulty: activeProgress.session.difficulty,
      currentStepIndex: activeProgress.currentStepIndex,
      totalItems: activeProgress.session.items.length,
      percentComplete: activeProgress.percentComplete,
      currentItem: currentItem
        ? {
            id: currentItem.id,
            title: currentItem.title,
            itemType: currentItem.itemType,
          }
        : null,
      nextItem: nextItem
        ? {
            id: nextItem.id,
            title: nextItem.title,
            itemType: nextItem.itemType,
          }
        : null,
      lastAccessedAt: activeProgress.lastAccessedAt,
    };
  }

  // =========================================================================
  // 3. TRAINER & ADMIN AUTHORING
  // =========================================================================

  async createSession(
    organisationId: string,
    user: AuthenticatedUser,
    dto: CreateGuidedSessionDto,
  ) {
    if (!this.isTrainerOrAdmin(user, organisationId)) {
      throw new ForbiddenException('Trainer or Admin permissions required to create sessions');
    }

    const ownershipType =
      dto.ownershipType === 'SYSTEM' && this.isSuperAdmin(user)
        ? 'SYSTEM'
        : 'ORGANISATION';

    const slug =
      dto.slug ||
      `${this.slugify(dto.title)}-${Date.now().toString(36)}`;

    const session = await this.prisma.guidedSession.create({
      data: {
        organisationId: ownershipType === 'SYSTEM' ? null : organisationId,
        ownershipType,
        createdById: user.id,
        title: dto.title,
        slug,
        description: dto.description,
        coverMediaUrl: dto.coverMediaUrl,
        category: dto.category?.toUpperCase(),
        difficulty: dto.difficulty?.toUpperCase() || 'BEGINNER',
        primaryGoal: dto.primaryGoal?.toUpperCase(),
        estimatedDurationMinutes: dto.estimatedDurationMinutes || 20,
        contentStatus: 'DRAFT',
        metadata: dto.metadata || {},
      },
    });

    await this.auditService.log({
      action: 'guided_session.created',
      resource: 'GuidedSession',
      resourceId: session.id,
      userId: user.id,
      organisationId,
      metadata: { title: session.title, ownershipType },
    });

    return session;
  }

  async updateSession(
    organisationId: string,
    sessionId: string,
    user: AuthenticatedUser,
    dto: UpdateGuidedSessionDto,
  ) {
    const existing = await this.assertSessionAccess(organisationId, sessionId, user, true);

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.coverMediaUrl !== undefined) updateData.coverMediaUrl = dto.coverMediaUrl;
    if (dto.category !== undefined) updateData.category = dto.category?.toUpperCase();
    if (dto.difficulty !== undefined) updateData.difficulty = dto.difficulty?.toUpperCase();
    if (dto.primaryGoal !== undefined) updateData.primaryGoal = dto.primaryGoal?.toUpperCase();
    if (dto.estimatedDurationMinutes !== undefined) {
      updateData.estimatedDurationMinutes = dto.estimatedDurationMinutes;
    }
    if (dto.contentStatus !== undefined) {
      updateData.contentStatus = dto.contentStatus.toUpperCase();
    }
    if (dto.featured !== undefined) updateData.featured = dto.featured;
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;
    if (dto.metadata !== undefined) updateData.metadata = dto.metadata;

    const updated = await this.prisma.guidedSession.update({
      where: { id: existing.id },
      data: updateData,
    });

    await this.auditService.log({
      action: 'guided_session.updated',
      resource: 'GuidedSession',
      resourceId: updated.id,
      userId: user.id,
      organisationId,
      metadata: { fields: Object.keys(updateData) },
    });

    return updated;
  }

  async addSection(
    organisationId: string,
    sessionId: string,
    user: AuthenticatedUser,
    dto: CreateGuidedSessionSectionDto,
  ) {
    await this.assertSessionAccess(organisationId, sessionId, user, true);

    return this.prisma.guidedSessionSection.create({
      data: {
        sessionId,
        title: dto.title,
        description: dto.description,
        sortOrder: dto.sortOrder || 0,
      },
    });
  }

  async updateSection(
    organisationId: string,
    sessionId: string,
    sectionId: string,
    user: AuthenticatedUser,
    dto: UpdateGuidedSessionSectionDto,
  ) {
    await this.assertSessionAccess(organisationId, sessionId, user, true);

    const section = await this.prisma.guidedSessionSection.findFirst({
      where: { id: sectionId, sessionId },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID "${sectionId}" not found in session`);
    }

    return this.prisma.guidedSessionSection.update({
      where: { id: sectionId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  async deleteSection(
    organisationId: string,
    sessionId: string,
    sectionId: string,
    user: AuthenticatedUser,
  ) {
    await this.assertSessionAccess(organisationId, sessionId, user, true);

    const section = await this.prisma.guidedSessionSection.findFirst({
      where: { id: sectionId, sessionId },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID "${sectionId}" not found in session`);
    }

    // Set sectionId to null on children items before deleting section
    await this.prisma.guidedSessionItem.updateMany({
      where: { sectionId },
      data: { sectionId: null },
    });

    return this.prisma.guidedSessionSection.delete({
      where: { id: sectionId },
    });
  }

  async addItem(
    organisationId: string,
    sessionId: string,
    user: AuthenticatedUser,
    dto: CreateGuidedSessionItemDto,
  ) {
    await this.assertSessionAccess(organisationId, sessionId, user, true);

    // Validate foreign keys if provided
    if (dto.exerciseId) {
      const exercise = await this.prisma.exercise.findFirst({
        where: {
          id: dto.exerciseId,
          OR: [{ ownershipType: 'SYSTEM' }, { organisationId }],
        },
      });
      if (!exercise) {
        throw new BadRequestException(
          `Referenced Exercise "${dto.exerciseId}" does not exist or is not accessible`,
        );
      }
    }

    if (dto.knowledgeCheckId) {
      const check = await this.prisma.knowledgeCheck.findFirst({
        where: {
          id: dto.knowledgeCheckId,
          OR: [{ tenantId: null }, { tenantId: organisationId }],
        },
      });
      if (!check) {
        throw new BadRequestException(
          `Referenced Knowledge Check "${dto.knowledgeCheckId}" does not exist or is not accessible`,
        );
      }
    }

    const item = await this.prisma.guidedSessionItem.create({
      data: {
        sessionId,
        sectionId: dto.sectionId || null,
        sortOrder: dto.sortOrder || 0,
        itemType: dto.itemType,
        title: dto.title,
        description: dto.description,
        durationSeconds: dto.durationSeconds,
        repetitionCount: dto.repetitionCount,
        exerciseId: dto.exerciseId || null,
        knowledgeCheckId: dto.knowledgeCheckId || null,
        config: dto.config || {},
        isRequired: dto.isRequired !== undefined ? dto.isRequired : true,
      },
      include: {
        exercise: true,
        knowledgeCheck: true,
      },
    });

    // Update item and exercise counts on session
    await this.syncSessionCounters(sessionId);

    return item;
  }

  async updateItem(
    organisationId: string,
    sessionId: string,
    itemId: string,
    user: AuthenticatedUser,
    dto: UpdateGuidedSessionItemDto,
  ) {
    await this.assertSessionAccess(organisationId, sessionId, user, true);

    const existing = await this.prisma.guidedSessionItem.findFirst({
      where: { id: itemId, sessionId },
    });

    if (!existing) {
      throw new NotFoundException(`Item with ID "${itemId}" not found in session`);
    }

    if (dto.exerciseId) {
      const exercise = await this.prisma.exercise.findFirst({
        where: {
          id: dto.exerciseId,
          OR: [{ ownershipType: 'SYSTEM' }, { organisationId }],
        },
      });
      if (!exercise) {
        throw new BadRequestException(
          `Referenced Exercise "${dto.exerciseId}" does not exist or is not accessible`,
        );
      }
    }

    if (dto.knowledgeCheckId) {
      const check = await this.prisma.knowledgeCheck.findFirst({
        where: {
          id: dto.knowledgeCheckId,
          OR: [{ tenantId: null }, { tenantId: organisationId }],
        },
      });
      if (!check) {
        throw new BadRequestException(
          `Referenced Knowledge Check "${dto.knowledgeCheckId}" does not exist or is not accessible`,
        );
      }
    }

    const updated = await this.prisma.guidedSessionItem.update({
      where: { id: itemId },
      data: {
        ...(dto.sectionId !== undefined ? { sectionId: dto.sectionId } : {}),
        ...(dto.itemType !== undefined ? { itemType: dto.itemType } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.durationSeconds !== undefined ? { durationSeconds: dto.durationSeconds } : {}),
        ...(dto.repetitionCount !== undefined ? { repetitionCount: dto.repetitionCount } : {}),
        ...(dto.exerciseId !== undefined ? { exerciseId: dto.exerciseId } : {}),
        ...(dto.knowledgeCheckId !== undefined ? { knowledgeCheckId: dto.knowledgeCheckId } : {}),
        ...(dto.config !== undefined ? { config: dto.config } : {}),
        ...(dto.isRequired !== undefined ? { isRequired: dto.isRequired } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
      include: {
        exercise: true,
        knowledgeCheck: true,
      },
    });

    await this.syncSessionCounters(sessionId);
    return updated;
  }

  async deleteItem(
    organisationId: string,
    sessionId: string,
    itemId: string,
    user: AuthenticatedUser,
  ) {
    await this.assertSessionAccess(organisationId, sessionId, user, true);

    const existing = await this.prisma.guidedSessionItem.findFirst({
      where: { id: itemId, sessionId },
    });

    if (!existing) {
      throw new NotFoundException(`Item with ID "${itemId}" not found in session`);
    }

    const deleted = await this.prisma.guidedSessionItem.delete({
      where: { id: itemId },
    });

    await this.syncSessionCounters(sessionId);
    return deleted;
  }

  async reorderItems(
    organisationId: string,
    sessionId: string,
    user: AuthenticatedUser,
    dto: ReorderGuidedSessionItemsDto,
  ) {
    await this.assertSessionAccess(organisationId, sessionId, user, true);

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.guidedSessionItem.update({
          where: { id: item.id },
          data: {
            sortOrder: item.sortOrder,
            ...(item.sectionId !== undefined ? { sectionId: item.sectionId } : {}),
          },
        }),
      ),
    );

    return this.prisma.guidedSessionItem.findMany({
      where: { sessionId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // =========================================================================
  // 4. PUBLISHING VALIDATION & PUBLISH
  // =========================================================================

  async validateSessionForPublishing(
    organisationId: string,
    sessionId: string,
  ): Promise<PublishValidationResultDto> {
    const session = await this.prisma.guidedSession.findUnique({
      where: { id: sessionId },
      include: {
        sections: true,
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            exercise: true,
            knowledgeCheck: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Guided session "${sessionId}" not found`);
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const equipmentSet = new Set<string>();

    // 1. Basic Metadata Checks
    if (!session.title || session.title.trim().length === 0) {
      errors.push('Session title is required');
    }
    if (!session.slug || session.slug.trim().length === 0) {
      errors.push('Session slug is required');
    }
    if (!session.description || session.description.trim().length < 10) {
      warnings.push('Session description is brief; adding educational goals is recommended');
    }

    // 2. Items & Sections Checks
    if (session.items.length === 0) {
      errors.push('Session must contain at least one learning item before publishing');
    }

    let tutorialCount = 0;
    let practiceCount = 0;
    let knowledgeCheckCount = 0;

    session.items.forEach((item, index) => {
      // Ordering validation
      if (item.sortOrder !== index && item.sortOrder === undefined) {
        warnings.push(`Item "${item.title}" does not have explicit sequential sortOrder`);
      }

      if (item.itemType === 'EXERCISE_TUTORIAL') {
        tutorialCount++;
        if (!item.exerciseId) {
          errors.push(
            `Item "${item.title}" is of type EXERCISE_TUTORIAL but missing exercise reference`,
          );
        } else if (!item.exercise) {
          errors.push(
            `Item "${item.title}" references non-existent exercise ID "${item.exerciseId}"`,
          );
        } else if (item.exercise.contentStatus !== 'PUBLISHED') {
          errors.push(
            `Item "${item.title}" references unpublished exercise "${item.exercise.name}" (status: ${item.exercise.contentStatus})`,
          );
        }
      }

      if (item.itemType === 'PRACTICE') {
        practiceCount++;
        if (!item.exerciseId) {
          warnings.push(
            `Practice item "${item.title}" does not have linked exercise; standalone practice will be used`,
          );
        }
      }

      if (item.itemType === 'KNOWLEDGE_CHECK') {
        knowledgeCheckCount++;
        if (!item.knowledgeCheckId) {
          errors.push(
            `Item "${item.title}" is of type KNOWLEDGE_CHECK but missing knowledge check reference`,
          );
        } else if (!item.knowledgeCheck) {
          errors.push(
            `Item "${item.title}" references non-existent knowledge check ID "${item.knowledgeCheckId}"`,
          );
        } else if (item.knowledgeCheck.contentStatus !== 'PUBLISHED') {
          errors.push(
            `Item "${item.title}" references unpublished knowledge check "${item.knowledgeCheck.title}"`,
          );
        }
      }

      if (item.exercise?.equipment && item.exercise.equipment !== 'BODYWEIGHT') {
        equipmentSet.add(item.exercise.equipment);
      }
    });

    if (tutorialCount === 0 && practiceCount === 0) {
      warnings.push(
        'Session has no exercise tutorials or practice items; it serves as informational only',
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalItems: session.items.length,
        exerciseTutorialCount: tutorialCount,
        practiceCount,
        knowledgeCheckCount,
        estimatedDurationMinutes: session.estimatedDurationMinutes,
        equipmentNeeded: Array.from(equipmentSet),
      },
    };
  }

  async publishSession(
    organisationId: string,
    sessionId: string,
    user: AuthenticatedUser,
  ) {
    await this.assertSessionAccess(organisationId, sessionId, user, true);

    const validation = await this.validateSessionForPublishing(organisationId, sessionId);
    if (!validation.isValid) {
      throw new BadRequestException({
        message: 'Cannot publish session with validation errors',
        errors: validation.errors,
      });
    }

    const published = await this.prisma.guidedSession.update({
      where: { id: sessionId },
      data: {
        contentStatus: 'PUBLISHED',
      },
    });

    await this.auditService.log({
      action: 'guided_session.published',
      resource: 'GuidedSession',
      resourceId: sessionId,
      userId: user.id,
      organisationId,
      metadata: { title: published.title },
    });

    return published;
  }

  async duplicateSession(
    organisationId: string,
    sessionId: string,
    user: AuthenticatedUser,
  ) {
    if (!this.isTrainerOrAdmin(user, organisationId)) {
      throw new ForbiddenException('Trainer or Admin permissions required');
    }

    const original = await this.assertSessionAccess(organisationId, sessionId, user, false);

    const newTitle = `${original.title} (Copy)`;
    const newSlug = `${this.slugify(newTitle)}-${Date.now().toString(36)}`;

    // Clone session with sections and items in a transaction
    return this.prisma.$transaction(async (tx) => {
      const clonedSession = await tx.guidedSession.create({
        data: {
          organisationId,
          ownershipType: 'ORGANISATION',
          createdById: user.id,
          title: newTitle,
          slug: newSlug,
          description: original.description,
          coverMediaUrl: original.coverMediaUrl,
          category: original.category,
          difficulty: original.difficulty,
          primaryGoal: original.primaryGoal,
          estimatedDurationMinutes: original.estimatedDurationMinutes,
          contentStatus: 'DRAFT',
          metadata: original.metadata || {},
        },
      });

      // Map old section IDs to new section IDs
      const sectionMap: Record<string, string> = {};
      for (const section of original.sections) {
        const clonedSection = await tx.guidedSessionSection.create({
          data: {
            sessionId: clonedSession.id,
            title: section.title,
            description: section.description,
            sortOrder: section.sortOrder,
          },
        });
        sectionMap[section.id] = clonedSection.id;
      }

      // Clone items
      for (const item of original.items) {
        await tx.guidedSessionItem.create({
          data: {
            sessionId: clonedSession.id,
            sectionId: item.sectionId ? sectionMap[item.sectionId] || null : null,
            sortOrder: item.sortOrder,
            itemType: item.itemType,
            title: item.title,
            description: item.description,
            durationSeconds: item.durationSeconds,
            repetitionCount: item.repetitionCount,
            exerciseId: item.exerciseId,
            knowledgeCheckId: item.knowledgeCheckId,
            config: (item.config as any) || {},
            isRequired: item.isRequired,
          },
        });
      }

      // Update counters
      const exerciseCount = original.items.filter(
        (i: any) => i.itemType === 'EXERCISE_TUTORIAL',
      ).length;
      return tx.guidedSession.update({
        where: { id: clonedSession.id },
        data: {
          exerciseCount,
          itemCount: original.items.length,
        },
      });
    });
  }

  private async syncSessionCounters(sessionId: string) {
    const items = await this.prisma.guidedSessionItem.findMany({
      where: { sessionId },
      select: { itemType: true },
    });
    const exerciseCount = items.filter((i) => i.itemType === 'EXERCISE_TUTORIAL').length;
    await this.prisma.guidedSession.update({
      where: { id: sessionId },
      data: {
        itemCount: items.length,
        exerciseCount,
      },
    });
  }
}
