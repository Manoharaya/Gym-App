import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  LearningDashboardResponseDto,
  LearningDashboardSummaryDto,
  ResumePositionDto,
  LearningActivityItemDto,
  RecentlyLearnedExerciseDto,
  RecommendedLearningPathDto,
  ActivePathOverviewDto,
  QueryLearningHistoryDto,
  ExerciseLearningMasteryStatusDto,
} from '../dto/learning-dashboard.dto';

@Injectable()
export class LearningDashboardService {
  private readonly logger = new Logger(LearningDashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // UTILITY / TENANT HELPERS
  // =========================================================================

  private buildTenantFilter(organisationId: string) {
    return {
      OR: [
        { ownershipType: 'SYSTEM' },
        { organisationId },
      ],
    };
  }

  // =========================================================================
  // STREAK CALCULATION (Deterministic & Timezone-Safe)
  // =========================================================================

  private calculateDailyStreak(dates: Date[]): number {
    if (!dates || dates.length === 0) return 0;

    // Convert dates to YYYY-MM-DD set (UTC date strings for consistency)
    const uniqueDays = new Set<string>();
    for (const d of dates) {
      if (d instanceof Date && !isNaN(d.getTime())) {
        uniqueDays.add(d.toISOString().slice(0, 10));
      }
    }

    if (uniqueDays.size === 0) return 0;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterday = new Date(now.getTime() - 86400000);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    // If neither today nor yesterday has activity, the streak is broken
    let currentCheckDate: Date;
    if (uniqueDays.has(todayStr)) {
      currentCheckDate = now;
    } else if (uniqueDays.has(yesterdayStr)) {
      currentCheckDate = yesterday;
    } else {
      return 0;
    }

    let streak = 0;
    let checkTime = currentCheckDate.getTime();

    while (true) {
      const dayKey = new Date(checkTime).toISOString().slice(0, 10);
      if (uniqueDays.has(dayKey)) {
        streak++;
        checkTime -= 86400000; // Step back one day
      } else {
        break;
      }
    }

    return streak;
  }

  // =========================================================================
  // RESUME INTELLIGENCE (getResumeLearningPosition)
  // =========================================================================

  async getResumeLearningPosition(
    organisationId: string,
    userId: string,
  ): Promise<ResumePositionDto | null> {
    // 1. Fetch most recently interacted active path
    const activeProgress = await this.prisma.userLearningPathProgress.findFirst({
      where: {
        userId,
        status: 'IN_PROGRESS',
        path: {
          contentStatus: 'PUBLISHED',
          ...this.buildTenantFilter(organisationId),
        },
      },
      orderBy: { lastInteractedAt: 'desc' },
      include: {
        path: {
          include: {
            lessons: {
              orderBy: { sortOrder: 'asc' },
              include: { section: true },
            },
          },
        },
      },
    });

    if (!activeProgress || !activeProgress.path || activeProgress.path.lessons.length === 0) {
      return null;
    }

    const { path } = activeProgress;
    const lessons = path.lessons;

    // 2. Fetch completed lesson IDs for this path
    const completions = await this.prisma.userLessonCompletion.findMany({
      where: { userId, pathId: path.id },
      select: { lessonId: true },
    });
    const completedSet = new Set(completions.map((c) => c.lessonId));

    // 3. Find the first uncompleted lesson in sequential sort order
    let targetLesson = lessons.find((l) => !completedSet.has(l.id));

    // If all lessons completed (or fallback), pick the current pointer or first lesson
    if (!targetLesson) {
      targetLesson = lessons.find((l) => l.id === activeProgress.currentLessonId) || lessons[0];
    }

    const lessonIdx = lessons.findIndex((l) => l.id === targetLesson!.id);
    const lessonNumber = lessonIdx >= 0 ? lessonIdx + 1 : 1;

    return {
      pathId: path.id,
      pathTitle: path.title,
      pathCoverUrl: path.coverMediaUrl,
      category: path.category,
      difficulty: path.difficulty,
      sectionId: targetLesson.sectionId,
      sectionTitle: targetLesson.section?.title || null,
      lessonId: targetLesson.id,
      lessonTitle: targetLesson.title,
      lessonNumber,
      totalLessons: lessons.length,
      percentComplete: activeProgress.percentComplete,
      estimatedMinutes: targetLesson.estimatedMinutes || 5,
    };
  }

  // =========================================================================
  // MEMBER LEARNING DASHBOARD (Aggregated Summary & Views)
  // =========================================================================

  async getMemberLearningDashboard(
    organisationId: string,
    userId: string,
  ): Promise<LearningDashboardResponseDto> {
    const tenantFilter = this.buildTenantFilter(organisationId);

    // 1. Parallel fetch of all member learning progress records
    const [
      allPathProgress,
      lessonCompletions,
      exerciseProgress,
      collectionProgress,
      memberPreferences,
    ] = await Promise.all([
      this.prisma.userLearningPathProgress.findMany({
        where: {
          userId,
          path: tenantFilter,
        },
        include: {
          path: {
            select: {
              id: true,
              title: true,
              coverMediaUrl: true,
              category: true,
              difficulty: true,
              lessonCount: true,
            },
          },
        },
        orderBy: { lastInteractedAt: 'desc' },
      }),
      this.prisma.userLessonCompletion.findMany({
        where: {
          userId,
          path: tenantFilter,
        },
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
              exerciseId: true,
              estimatedMinutes: true,
            },
          },
          path: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.exerciseLearningProgress.findMany({
        where: { userId },
        include: {
          exercise: {
            select: {
              id: true,
              name: true,
              primaryMuscleGroup: true,
              equipment: true,
              difficulty: true,
              media: {
                take: 1,
                select: { url: true, thumbnailUrl: true },
              },
            },
          },
        },
        orderBy: { lastInteractedAt: 'desc' },
      }),
      this.prisma.userCollectionProgress.findMany({
        where: { userId },
        include: {
          collection: {
            select: { id: true, title: true, exerciseCount: true },
          },
        },
        orderBy: { lastInteractedAt: 'desc' },
      }),
      this.prisma.memberExercisePreference.findUnique({
        where: { userId },
      }),
    ]);

    // 2. Summary calculations
    const pathsStarted = allPathProgress.filter(
      (p) => p.status === 'IN_PROGRESS' || p.status === 'COMPLETED' || p.completedLessons > 0,
    ).length;

    const pathsCompleted = allPathProgress.filter((p) => p.status === 'COMPLETED').length;
    const lessonsCompletedCount = lessonCompletions.length;

    // Distinct exercises learned (from completed exercise progress + completed lessons linking exercises)
    const learnedExerciseIds = new Set<string>();
    exerciseProgress
      .filter((e) => e.status === 'COMPLETED')
      .forEach((e) => learnedExerciseIds.add(e.exerciseId));
    lessonCompletions.forEach((c) => {
      if (c.lesson?.exerciseId) learnedExerciseIds.add(c.lesson.exerciseId);
    });

    const exercisesLearnedCount = learnedExerciseIds.size;
    const collectionsExploredCount = collectionProgress.length;

    // Calculate reliable learning time (sum of unique completed lesson estimatedMinutes)
    const lessonMinutesSum = lessonCompletions.reduce((acc, c) => {
      return acc + (c.lesson?.estimatedMinutes || 5);
    }, 0);

    // Calculate streak from all verified completion dates
    const activityDates: Date[] = [
      ...lessonCompletions.map((c) => c.completedAt),
      ...exerciseProgress.filter((e) => e.status === 'COMPLETED' && e.completedAt).map((e) => e.completedAt!),
      ...allPathProgress.filter((p) => p.completedAt).map((p) => p.completedAt!),
    ];
    const currentStreakDays = this.calculateDailyStreak(activityDates);

    // Last activity timestamp
    let lastActivityAt: string | null = null;
    const allTimestamps = [
      ...lessonCompletions.map((c) => c.completedAt.getTime()),
      ...allPathProgress.map((p) => p.lastInteractedAt.getTime()),
      ...exerciseProgress.map((e) => e.lastInteractedAt.getTime()),
    ];
    if (allTimestamps.length > 0) {
      lastActivityAt = new Date(Math.max(...allTimestamps)).toISOString();
    }

    const summary: LearningDashboardSummaryDto = {
      pathsStarted,
      pathsCompleted,
      lessonsCompleted: lessonsCompletedCount,
      exercisesLearned: exercisesLearnedCount,
      collectionsExplored: collectionsExploredCount,
      learningTimeMinutes: lessonMinutesSum,
      currentStreakDays,
      lastActivityAt,
    };

    // 3. Resume Position
    const continueLearning = await this.getResumeLearningPosition(organisationId, userId);

    // 4. Active Paths
    const activePathsList = allPathProgress.filter((p) => p.status === 'IN_PROGRESS');
    const activePaths: ActivePathOverviewDto[] = activePathsList.map((p) => ({
      pathId: p.path.id,
      title: p.path.title,
      coverMediaUrl: p.path.coverMediaUrl,
      category: p.path.category,
      difficulty: p.path.difficulty,
      completedLessons: p.completedLessons,
      totalLessons: p.totalLessons || p.path.lessonCount,
      percentComplete: p.percentComplete,
      currentLessonId: p.currentLessonId,
      currentLessonTitle: undefined,
      lastInteractedAt: p.lastInteractedAt.toISOString(),
    }));

    // 5. Recent Activity Timeline
    const timelineItems: LearningActivityItemDto[] = [];

    // Map lesson completions
    lessonCompletions.slice(0, 10).forEach((c) => {
      timelineItems.push({
        id: `comp-lesson-${c.id}`,
        type: 'LESSON_COMPLETED',
        title: `Completed "${c.lesson.title}"`,
        subtitle: c.path.title,
        timestamp: c.completedAt.toISOString(),
      });
    });

    // Map path milestones
    allPathProgress.forEach((p) => {
      if (p.status === 'COMPLETED' && p.completedAt) {
        timelineItems.push({
          id: `comp-path-${p.id}`,
          type: 'PATH_COMPLETED',
          title: `Mastered "${p.path.title}"`,
          subtitle: `${p.completedLessons} of ${p.totalLessons} lessons finished`,
          timestamp: p.completedAt.toISOString(),
        });
      } else if (p.createdAt) {
        timelineItems.push({
          id: `start-path-${p.id}`,
          type: 'PATH_STARTED',
          title: `Started "${p.path.title}"`,
          subtitle: `${p.totalLessons || p.path.lessonCount} lessons masterclass`,
          timestamp: p.createdAt.toISOString(),
        });
      }
    });

    // Map exercise learned events
    exerciseProgress
      .filter((e) => e.status === 'COMPLETED' && e.completedAt)
      .slice(0, 5)
      .forEach((e: any) => {
        if (e.exercise) {
          timelineItems.push({
            id: `comp-ex-${e.id}`,
            type: 'EXERCISE_LEARNED',
            title: `Learned ${e.exercise.name}`,
            subtitle: `${e.exercise.primaryMuscleGroup} • ${e.exercise.difficulty}`,
            timestamp: e.completedAt!.toISOString(),
          });
        }
      });

    // Sort combined timeline by timestamp descending, limit to top 15
    timelineItems.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    const recentActivity = timelineItems.slice(0, 12);

    // 6. Recently Learned Exercises
    // Fetch unique exercises from completed progress
    const recentExerciseItems: RecentlyLearnedExerciseDto[] = [];
    const seenExIds = new Set<string>();

    for (const ep of exerciseProgress.filter((e) => e.status === 'COMPLETED')) {
      const exObj = (ep as any).exercise;
      if (!seenExIds.has(ep.exerciseId) && exObj) {
        seenExIds.add(ep.exerciseId);
        const thumb = exObj.media?.[0]?.thumbnailUrl || exObj.media?.[0]?.url || null;
        recentExerciseItems.push({
          exerciseId: exObj.id,
          name: exObj.name,
          primaryMuscleGroup: exObj.primaryMuscleGroup,
          equipment: exObj.equipment,
          difficulty: exObj.difficulty,
          thumbnailUrl: thumb,
          learnedAt: (ep.completedAt || ep.lastInteractedAt).toISOString(),
          masteryState: 'LEARNED',
        });
      }
    }

    // Also check completed lessons that taught exercises
    const lessonExercisesToFetch: { exerciseId: string; learnedAt: string }[] = [];
    for (const c of lessonCompletions) {
      if (c.lesson?.exerciseId && !seenExIds.has(c.lesson.exerciseId)) {
        seenExIds.add(c.lesson.exerciseId);
        lessonExercisesToFetch.push({
          exerciseId: c.lesson.exerciseId,
          learnedAt: c.completedAt.toISOString(),
        });
      }
    }

    if (lessonExercisesToFetch.length > 0) {
      const extraExercises = await this.prisma.exercise.findMany({
        where: {
          id: { in: lessonExercisesToFetch.map((x) => x.exerciseId) },
        },
        select: {
          id: true,
          name: true,
          primaryMuscleGroup: true,
          equipment: true,
          difficulty: true,
          media: {
            take: 1,
            select: { url: true, thumbnailUrl: true },
          },
        },
      });

      extraExercises.forEach((ex: any) => {
        const match = lessonExercisesToFetch.find((x) => x.exerciseId === ex.id);
        const thumb = ex.media?.[0]?.thumbnailUrl || ex.media?.[0]?.url || null;
        recentExerciseItems.push({
          exerciseId: ex.id,
          name: ex.name,
          primaryMuscleGroup: ex.primaryMuscleGroup,
          equipment: ex.equipment,
          difficulty: ex.difficulty,
          thumbnailUrl: thumb,
          learnedAt: match ? match.learnedAt : new Date().toISOString(),
          masteryState: 'LEARNED',
        });
      });
    }

    recentExerciseItems.sort(
      (a, b) => new Date(b.learnedAt).getTime() - new Date(a.learnedAt).getTime(),
    );
    const recentExercises = recentExerciseItems.slice(0, 6);

    // 7. Deterministic Recommendations ("Next to Learn")
    const recommendations = await this.computeDeterministicRecommendations(
      organisationId,
      userId,
      allPathProgress,
      memberPreferences,
    );

    // 8. Categories with real counts
    const categoriesAgg = await this.prisma.learningPath.groupBy({
      by: ['category'],
      where: {
        contentStatus: 'PUBLISHED',
        ...tenantFilter,
        category: { not: null },
      },
      _count: { id: true },
    });

    const categoryLabels: Record<string, string> = {
      FUNDAMENTALS: 'Fundamentals',
      SKILL_MASTERY: 'Skill Mastery',
      MOBILITY: 'Mobility & Joints',
      POSTURE: 'Posture & Alignment',
      HYPERTROPHY: 'Hypertrophy Cues',
      REHAB: 'Injury Prevention',
    };

    const categories = categoriesAgg.map((c) => ({
      key: c.category || 'GENERAL',
      label: categoryLabels[c.category || ''] || c.category || 'General',
      count: c._count.id,
    }));

    return {
      summary,
      continueLearning,
      activePaths,
      recentActivity,
      recentExercises,
      recommendations,
      categories,
    };
  }

  // =========================================================================
  // DETERMINISTIC RECOMMENDATION LOGIC (Zero LLMs / Explainable Heuristics)
  // =========================================================================

  private async computeDeterministicRecommendations(
    organisationId: string,
    userId: string,
    allPathProgress: any[],
    memberPreferences: any,
  ): Promise<RecommendedLearningPathDto[]> {
    const tenantFilter = this.buildTenantFilter(organisationId);
    const completedPathIds = new Set(
      allPathProgress.filter((p) => p.status === 'COMPLETED').map((p) => p.pathId),
    );
    const inProgressPathIds = new Set(
      allPathProgress.filter((p) => p.status === 'IN_PROGRESS').map((p) => p.pathId),
    );

    const candidates = await this.prisma.learningPath.findMany({
      where: {
        contentStatus: 'PUBLISHED',
        ...tenantFilter,
        id: {
          notIn: Array.from(new Set([...completedPathIds, ...inProgressPathIds])),
        },
      },
      take: 20,
      orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
    });

    if (candidates.length === 0) return [];

    const scoredRecommendations: RecommendedLearningPathDto[] = [];

    // Rule 1: Match member fitness goal
    const primaryGoal = memberPreferences?.fitnessGoals?.[0]?.toUpperCase();
    const availableEquip = memberPreferences?.availableEquipment || [];
    const preferredDiff = memberPreferences?.preferredDifficulty?.toUpperCase() || 'BEGINNER';

    for (const path of candidates) {
      let reason = 'Essential curriculum for your library';

      if (primaryGoal && path.primaryGoal === primaryGoal) {
        reason = `Directly aligned with your ${primaryGoal.replace(/_/g, ' ').toLowerCase()} goal`;
      } else if (path.difficulty === preferredDiff) {
        reason = `Matches your ${preferredDiff.toLowerCase()} experience level`;
      } else if (path.category === 'FUNDAMENTALS') {
        reason = 'Foundation movements every member should master';
      } else if (path.category === 'MOBILITY') {
        reason = 'Great for joint health and movement preparation';
      } else if (path.featured) {
        reason = 'Coaching staff recommended masterclass';
      }

      scoredRecommendations.push({
        pathId: path.id,
        title: path.title,
        coverMediaUrl: path.coverMediaUrl,
        category: path.category,
        difficulty: path.difficulty,
        lessonCount: path.lessonCount,
        estimatedMinutes: path.estimatedDurationMinutes,
        reason,
      });

      if (scoredRecommendations.length >= 4) break;
    }

    return scoredRecommendations;
  }

  // =========================================================================
  // LEARNING PROGRESS OVERVIEW (In-Depth View)
  // =========================================================================

  async getLearningProgressOverview(organisationId: string, userId: string) {
    const tenantFilter = this.buildTenantFilter(organisationId);

    const [activePaths, completedPaths, collections] = await Promise.all([
      this.prisma.userLearningPathProgress.findMany({
        where: {
          userId,
          status: 'IN_PROGRESS',
          path: tenantFilter,
        },
        include: {
          path: {
            select: {
              id: true,
              title: true,
              description: true,
              coverMediaUrl: true,
              category: true,
              difficulty: true,
              lessonCount: true,
              exerciseCount: true,
              estimatedDurationMinutes: true,
            },
          },
        },
        orderBy: { lastInteractedAt: 'desc' },
      }),
      this.prisma.userLearningPathProgress.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          path: tenantFilter,
        },
        include: {
          path: {
            select: {
              id: true,
              title: true,
              description: true,
              coverMediaUrl: true,
              category: true,
              difficulty: true,
              lessonCount: true,
              exerciseCount: true,
              estimatedDurationMinutes: true,
            },
          },
        },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.userCollectionProgress.findMany({
        where: { userId },
        include: {
          collection: {
            select: {
              id: true,
              title: true,
              description: true,
              category: true,
              difficulty: true,
              exerciseCount: true,
            },
          },
        },
        orderBy: { lastInteractedAt: 'desc' },
      }),
    ]);

    return {
      activePaths: activePaths.map((p) => ({
        id: p.path.id,
        title: p.path.title,
        description: p.path.description,
        coverMediaUrl: p.path.coverMediaUrl,
        category: p.path.category,
        difficulty: p.path.difficulty,
        completedLessons: p.completedLessons,
        totalLessons: p.totalLessons || p.path.lessonCount,
        percentComplete: p.percentComplete,
        estimatedMinutes: p.path.estimatedDurationMinutes,
        lastInteractedAt: p.lastInteractedAt.toISOString(),
      })),
      completedPaths: completedPaths.map((p) => ({
        id: p.path.id,
        title: p.path.title,
        description: p.path.description,
        coverMediaUrl: p.path.coverMediaUrl,
        category: p.path.category,
        difficulty: p.path.difficulty,
        completedLessons: p.completedLessons,
        totalLessons: p.totalLessons || p.path.lessonCount,
        completedAt: p.completedAt ? p.completedAt.toISOString() : null,
      })),
      exploredCollections: collections.map((c) => ({
        id: c.collection.id,
        title: c.collection.title,
        description: c.collection.description,
        category: c.collection.category,
        difficulty: c.collection.difficulty,
        exerciseCount: c.collection.exerciseCount,
        status: c.status,
        lastInteractedAt: c.lastInteractedAt.toISOString(),
      })),
    };
  }

  // =========================================================================
  // LEARNING HISTORY (Paginated Completion Events)
  // =========================================================================

  async getLearningHistory(
    organisationId: string,
    userId: string,
    query: QueryLearningHistoryDto,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const tenantFilter = this.buildTenantFilter(organisationId);

    const [completions, totalCount] = await Promise.all([
      this.prisma.userLessonCompletion.findMany({
        where: {
          userId,
          path: tenantFilter,
        },
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
              estimatedMinutes: true,
              lessonType: true,
              exercise: {
                select: { id: true, name: true },
              },
            },
          },
          path: {
            select: {
              id: true,
              title: true,
              category: true,
              difficulty: true,
            },
          },
        },
        orderBy: { completedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.userLessonCompletion.count({
        where: {
          userId,
          path: tenantFilter,
        },
      }),
    ]);

    const items = completions.map((c) => ({
      id: c.id,
      lessonId: c.lesson.id,
      lessonTitle: c.lesson.title,
      lessonType: c.lesson.lessonType,
      estimatedMinutes: c.lesson.estimatedMinutes,
      pathId: c.path.id,
      pathTitle: c.path.title,
      pathCategory: c.path.category,
      exerciseId: c.lesson.exercise?.id || null,
      exerciseName: c.lesson.exercise?.name || null,
      completedAt: c.completedAt.toISOString(),
    }));

    return {
      items,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  // =========================================================================
  // EXERCISE LEARNING MASTERY STATUS
  // =========================================================================

  async getExerciseLearningMastery(
    organisationId: string,
    userId: string,
    exerciseId: string,
  ): Promise<ExerciseLearningMasteryStatusDto> {
    const [exerciseProgress, completedLesson, teachingLesson] = await Promise.all([
      this.prisma.exerciseLearningProgress.findUnique({
        where: { userId_exerciseId: { userId, exerciseId } },
      }),
      this.prisma.userLessonCompletion.findFirst({
        where: {
          userId,
          lesson: { exerciseId },
        },
        include: {
          lesson: true,
          path: true,
        },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.learningPathLesson.findFirst({
        where: {
          exerciseId,
          path: {
            contentStatus: 'PUBLISHED',
            ...this.buildTenantFilter(organisationId),
          },
        },
        include: {
          path: {
            include: {
              lessons: { orderBy: { sortOrder: 'asc' } },
              userProgress: {
                where: { userId },
                select: { percentComplete: true },
              },
            },
          },
        },
      }),
    ]);

    // Determine educational mastery status
    let status: ExerciseLearningMasteryStatusDto['status'] = 'DISCOVERED';
    let learnedAt: string | null = null;
    let lastInteractedAt: string | null = null;
    let instructionsCompleted = false;
    let phasesExplored = false;
    let mediaViewed = false;

    if (exerciseProgress) {
      instructionsCompleted = exerciseProgress.instructionsViewed;
      phasesExplored = exerciseProgress.phasesExplored;
      mediaViewed = exerciseProgress.mediaViewed;
      lastInteractedAt = exerciseProgress.lastInteractedAt.toISOString();

      if (exerciseProgress.status === 'COMPLETED') {
        status = 'LEARNED';
        learnedAt = (exerciseProgress.completedAt || exerciseProgress.lastInteractedAt).toISOString();
      } else if (
        exerciseProgress.status === 'IN_PROGRESS' ||
        exerciseProgress.completedSteps > 0 ||
        instructionsCompleted ||
        phasesExplored
      ) {
        status = 'IN_PROGRESS';
      } else {
        status = 'VIEWED';
      }
    }

    if (completedLesson) {
      status = 'LEARNED';
      learnedAt = completedLesson.completedAt.toISOString();
    }

    // Check if review recommended (learned > 14 days ago)
    if (status === 'LEARNED' && learnedAt) {
      const learnedTime = new Date(learnedAt).getTime();
      const fourteenDaysAgo = Date.now() - 14 * 86400000;
      if (learnedTime < fourteenDaysAgo) {
        status = 'REVIEW_RECOMMENDED';
      }
    }

    // Related learning path if part of masterclass
    let relatedLearningPath: ExerciseLearningMasteryStatusDto['relatedLearningPath'] = null;
    if (teachingLesson && teachingLesson.path) {
      const pathLessons = teachingLesson.path.lessons;
      const lessonIdx = pathLessons.findIndex((l) => l.id === teachingLesson.id);
      const userProg = teachingLesson.path.userProgress?.[0];

      relatedLearningPath = {
        pathId: teachingLesson.path.id,
        pathTitle: teachingLesson.path.title,
        lessonId: teachingLesson.id,
        lessonTitle: teachingLesson.title,
        lessonNumber: lessonIdx >= 0 ? lessonIdx + 1 : 1,
        totalLessons: pathLessons.length,
        percentComplete: userProg?.percentComplete || 0,
      };
    }

    return {
      exerciseId,
      status,
      learnedAt,
      lastInteractedAt,
      instructionsCompleted,
      phasesExplored,
      mediaViewed,
      relatedLearningPath,
    };
  }

  // =========================================================================
  // TRACK COLLECTION INTERACTION
  // =========================================================================

  async trackCollectionInteraction(
    organisationId: string,
    userId: string,
    collectionId: string,
  ) {
    return this.prisma.userCollectionProgress.upsert({
      where: {
        userId_collectionId: { userId, collectionId },
      },
      update: {
        lastInteractedAt: new Date(),
      },
      create: {
        userId,
        collectionId,
        organisationId,
        status: 'IN_PROGRESS',
        lastInteractedAt: new Date(),
      },
    });
  }
}
