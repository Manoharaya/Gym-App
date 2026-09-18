import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ExerciseVisualDiscoveryService } from './exercise-visual-discovery.service';
import { ExerciseLearningPersonalizationService } from './exercise-learning-personalization.service';
import { ExerciseLearningMasteryService } from './exercise-learning-mastery.service';
import { LearningDashboardService } from './learning-dashboard.service';
import {
  LearningHubResponseDto,
  ContinueLearningHubItemDto,
  RecommendedLearningHubItemDto,
  LearningHubExploreSectionDto,
  LearningHubGuidedSectionDto,
  LearningHubAcademySectionDto,
  HubReviewItemDto,
  HubMyLearningSummaryDto,
  HubFeaturedExerciseDto,
  LearningHubSearchQueryDto,
  LearningHubSearchResponseDto,
  ExerciseSearchResultItemDto,
  MovementSearchResultItemDto,
  MuscleSearchResultItemDto,
  EquipmentSearchResultItemDto,
  LearningContentSearchResultItemDto,
} from '../dto/learning-hub.dto';
import { LearningMasteryStatus } from '../dto/learning-mastery.dto';

const SYSTEM_MOVEMENTS = [
  { code: 'SQUAT', name: 'Squat Pattern', description: 'Knee-dominant lower body flexion and extension' },
  { code: 'HINGE', name: 'Hinge Pattern', description: 'Hip-dominant posterior chain extension' },
  { code: 'PUSH', name: 'Push Pattern', description: 'Horizontal and overhead upper body pressing' },
  { code: 'PULL', name: 'Pull Pattern', description: 'Horizontal rows and vertical pulling movements' },
  { code: 'LUNGE', name: 'Lunge Pattern', description: 'Unilateral split-stance locomotion and stability' },
  { code: 'CARRY', name: 'Carry Pattern', description: 'Loaded locomotion and functional grip development' },
  { code: 'ROTATION', name: 'Rotation Pattern', description: 'Transverse plane rotational and anti-rotational core drive' },
  { code: 'ISOLATION', name: 'Isolation Pattern', description: 'Targeted single-joint hypertrophy and muscular refinement' },
];

const SYSTEM_MUSCLES = [
  { code: 'CHEST', name: 'Chest (Pectorals)', group: 'UPPER_BODY', region: 'ANTERIOR' },
  { code: 'SHOULDERS', name: 'Shoulders (Deltoids)', group: 'UPPER_BODY', region: 'ANTERIOR' },
  { code: 'BICEPS', name: 'Biceps Brachii', group: 'UPPER_BODY', region: 'ANTERIOR' },
  { code: 'ABDOMINALS', name: 'Abdominals', group: 'CORE', region: 'ANTERIOR' },
  { code: 'QUADRICEPS', name: 'Quadriceps', group: 'LOWER_BODY', region: 'ANTERIOR' },
  { code: 'TRAPS', name: 'Traps (Trapezius)', group: 'UPPER_BODY', region: 'POSTERIOR' },
  { code: 'UPPER_BACK', name: 'Upper Back & Rhomboids', group: 'UPPER_BODY', region: 'POSTERIOR' },
  { code: 'LATS', name: 'Lats (Latissimus Dorsi)', group: 'UPPER_BODY', region: 'POSTERIOR' },
  { code: 'TRICEPS', name: 'Triceps Brachii', group: 'UPPER_BODY', region: 'POSTERIOR' },
  { code: 'GLUTES', name: 'Glutes', group: 'LOWER_BODY', region: 'POSTERIOR' },
  { code: 'HAMSTRINGS', name: 'Hamstrings', group: 'LOWER_BODY', region: 'POSTERIOR' },
  { code: 'CALVES', name: 'Calves', group: 'LOWER_BODY', region: 'POSTERIOR' },
];

const SYSTEM_EQUIPMENT = [
  { code: 'DUMBBELL', name: 'Dumbbells', group: 'FREE_WEIGHTS', isNoEquipment: false },
  { code: 'BARBELL', name: 'Barbell', group: 'FREE_WEIGHTS', isNoEquipment: false },
  { code: 'KETTLEBELL', name: 'Kettlebell', group: 'FREE_WEIGHTS', isNoEquipment: false },
  { code: 'WEIGHT_PLATE', name: 'Weight Plates', group: 'FREE_WEIGHTS', isNoEquipment: false },
  { code: 'BENCH', name: 'Workout Bench', group: 'BENCHES_SUPPORTS', isNoEquipment: false },
  { code: 'CABLE_MACHINE', name: 'Cable Machine', group: 'MACHINES', isNoEquipment: false },
  { code: 'PULLUP_BAR', name: 'Pull-Up Bar', group: 'BODYWEIGHT', isNoEquipment: false },
  { code: 'RESISTANCE_BAND', name: 'Resistance Band', group: 'ACCESSORIES', isNoEquipment: false },
  { code: 'NO_EQUIPMENT', name: 'No Equipment / Bodyweight', group: 'BODYWEIGHT', isNoEquipment: true },
];

@Injectable()
export class LearningHubService {
  private readonly logger = new Logger(LearningHubService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly discoveryService: ExerciseVisualDiscoveryService,
    private readonly personalizationService: ExerciseLearningPersonalizationService,
    private readonly masteryService: ExerciseLearningMasteryService,
    private readonly dashboardService: LearningDashboardService,
  ) {}

  private tenantFilter(organisationId: string) {
    return {
      OR: [
        { ownershipType: 'SYSTEM' },
        { organisationId },
      ],
    };
  }

  // =========================================================================
  // 1. CONSOLIDATED LEARNING HUB ORCHESTRATION
  // =========================================================================

  async getLearningHubData(
    organisationId: string,
    userId: string,
  ): Promise<LearningHubResponseDto> {
    const [
      continueItems,
      recommendations,
      discoveryOverview,
      guidedData,
      academyData,
      masterySummary,
      reviewQueue,
      featuredExercises,
    ] = await Promise.all([
      this.getContinueLearningItems(organisationId, userId),
      this.getRecommendedLearning(organisationId, userId),
      this.getExploreSection(organisationId),
      this.getGuidedLearningSection(organisationId, userId),
      this.getAcademySection(organisationId, userId),
      this.masteryService.getMemberLearningSummary(organisationId, userId),
      this.getReviewQueue(organisationId, userId),
      this.getFeaturedExercises(organisationId, userId),
    ]);

    const dashboard = await this.dashboardService.getMemberLearningDashboard(organisationId, userId).catch(() => null);

    const myLearningSummary: HubMyLearningSummaryDto = {
      totalLearned: masterySummary.totalLearned,
      totalMastered: masterySummary.totalMastered,
      totalHoursLearned: masterySummary.totalHoursLearned,
      currentStreakDays: dashboard?.summary.currentStreakDays ?? 0,
      activePathsCount: masterySummary.activeLearningPathsCount,
      completedPathsCount: masterySummary.completedLearningPathsCount,
    };

    return {
      continueLearning: continueItems,
      recommendedLearning: recommendations,
      explore: discoveryOverview,
      guidedLearning: guidedData,
      academy: academyData,
      reviewQueue,
      myLearningSummary,
      featuredExercises,
    };
  }

  // =========================================================================
  // 2. CONTINUE LEARNING AGGREGATION
  // =========================================================================

  private async getContinueLearningItems(
    organisationId: string,
    userId: string,
  ): Promise<ContinueLearningHubItemDto[]> {
    const items: ContinueLearningHubItemDto[] = [];

    // 1. In-progress Learning Paths
    const activePaths = await this.prisma.userLearningPathProgress.findMany({
      where: {
        userId,
        status: 'IN_PROGRESS',
        path: {
          contentStatus: 'PUBLISHED',
          ...this.tenantFilter(organisationId),
        },
      },
      include: {
        path: {
          select: {
            id: true,
            title: true,
            coverMediaUrl: true,
            sections: {
              include: {
                lessons: {
                  where: { isRequired: true },
                  select: { id: true, title: true, sortOrder: true },
                  orderBy: { sortOrder: 'asc' },
                },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
      orderBy: { lastInteractedAt: 'desc' },
      take: 3,
    });

    for (const ap of activePaths) {
      const allLessons = ap.path.sections.flatMap((s) => s.lessons);
      const totalLessons = allLessons.length > 0 ? allLessons.length : (ap.totalLessons || 1);
      const completed = ap.completedLessons || 0;
      const progressPercent = ap.percentComplete !== undefined && ap.percentComplete !== null
        ? Math.round(ap.percentComplete)
        : Math.min(100, Math.round((completed / totalLessons) * 100));

      const nextLesson = allLessons[completed] || allLessons[0];
      const lessonTitle = nextLesson?.title || 'Next Lesson';

      items.push({
        contentType: 'LEARNING_PATH',
        contentId: ap.path.id,
        title: ap.path.title,
        parentTitle: 'Masterclass Course',
        progressPercent,
        currentStepIndex: completed + 1,
        totalSteps: totalLessons,
        thumbnailUrl: ap.path.coverMediaUrl,
        lastActivityAt: ap.lastInteractedAt ? ap.lastInteractedAt.toISOString() : new Date().toISOString(),
        resumeActionTitle: `Continue Lesson ${completed + 1}: ${lessonTitle}`,
      });
    }

    // 2. In-progress Tutorials (ExerciseLearningProgress)
    const activeTutorials = await this.prisma.exerciseLearningProgress.findMany({
      where: {
        userId,
        status: 'IN_PROGRESS',
        exercise: {
          status: 'ACTIVE',
          contentStatus: 'PUBLISHED',
          ...this.tenantFilter(organisationId),
        },
      },
      include: {
        exercise: {
          select: {
            id: true,
            name: true,
            media: {
              where: { isPrimary: true },
              select: { storageKey: true, mimeType: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 3,
    });

    for (const at of activeTutorials) {
      const totalSteps = at.totalSteps || 5;
      const completed = at.completedSteps || 1;
      const progressPercent = Math.min(95, Math.round((completed / totalSteps) * 100));
      const stepNum = at.lastStepNumber || completed;

      items.push({
        contentType: 'TUTORIAL',
        contentId: at.exerciseId,
        title: `${at.exercise.name} Tutorial`,
        parentTitle: 'Interactive Movement Guide',
        progressPercent,
        currentStepIndex: stepNum,
        totalSteps,
        thumbnailUrl: null,
        lastActivityAt: at.updatedAt.toISOString(),
        resumeActionTitle: `Resume Step ${stepNum}: Technique Breakdown`,
      });
    }

    // 3. In-progress Guided Sessions
    const activeSessions = await this.prisma.userGuidedSessionProgress.findMany({
      where: {
        userId,
        status: 'IN_PROGRESS',
        session: {
          contentStatus: 'PUBLISHED',
          ...this.tenantFilter(organisationId),
        },
      },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            coverMediaUrl: true,
            items: {
              select: { id: true },
            },
          },
        },
      },
      orderBy: { lastAccessedAt: 'desc' },
      take: 2,
    });

    for (const as of activeSessions) {
      const total = as.session.items.length || 1;
      const current = as.currentStepIndex || 0;
      const progressPercent = Math.min(95, Math.round((current / total) * 100));

      items.push({
        contentType: 'GUIDED_SESSION',
        contentId: as.session.id,
        title: as.session.title,
        parentTitle: 'Guided Practice Session',
        progressPercent,
        currentStepIndex: current + 1,
        totalSteps: total,
        thumbnailUrl: as.session.coverMediaUrl,
        lastActivityAt: as.lastAccessedAt ? as.lastAccessedAt.toISOString() : new Date().toISOString(),
        resumeActionTitle: `Resume Exercise ${current + 1} of ${total}`,
      });
    }

    // Sort deterministically: most recent interaction first
    return items.sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()).slice(0, 5);
  }

  // =========================================================================
  // 3. RECOMMENDED LEARNING
  // =========================================================================

  private async getRecommendedLearning(
    organisationId: string,
    userId: string,
  ): Promise<RecommendedLearningHubItemDto[]> {
    const rawRecs = await this.personalizationService.getRecommendations(organisationId, userId).catch(() => null);

    const recommendations: RecommendedLearningHubItemDto[] = [];

    if (rawRecs?.continueLearning && rawRecs.continueLearning.length > 0) {
      for (const item of rawRecs.continueLearning) {
        recommendations.push({
          id: item.exerciseId,
          contentType: 'EXERCISE',
          title: item.name,
          subtitle: `${item.completedSteps}/${item.totalSteps} steps completed`,
          difficulty: item.difficulty,
          reasonCode: 'CONTINUE_LEARNING',
          reasonText: 'Continue where you left off',
          estimatedMinutes: 5,
        });
      }
    }

    if (rawRecs?.reviewRecommended && rawRecs.reviewRecommended.length > 0) {
      for (const item of rawRecs.reviewRecommended) {
        recommendations.push({
          id: item.exerciseId,
          contentType: 'EXERCISE',
          title: item.name,
          subtitle: item.reason,
          difficulty: item.difficulty,
          reasonCode: 'REVIEW_NEEDED',
          reasonText: item.lastScore !== null && item.lastScore !== undefined
            ? `Review recommended (quiz score: ${item.lastScore}%)`
            : 'Targeted technique review recommended',
          estimatedMinutes: 3,
        });
      }
    }

    // Fallback: If no recommendations, pick published beginner/standard learning paths
    if (recommendations.length === 0) {
      const paths = await this.prisma.learningPath.findMany({
        where: {
          contentStatus: 'PUBLISHED',
          ...this.tenantFilter(organisationId),
        },
        select: {
          id: true,
          title: true,
          difficulty: true,
          category: true,
          coverMediaUrl: true,
          estimatedDurationMinutes: true,
        },
        orderBy: { featured: 'desc' },
        take: 3,
      });

      for (const p of paths) {
        recommendations.push({
          id: p.id,
          contentType: 'LEARNING_PATH',
          title: p.title,
          subtitle: p.category ? p.category.replace(/_/g, ' ') : 'Foundations',
          difficulty: p.difficulty,
          thumbnailUrl: p.coverMediaUrl,
          reasonCode: 'POPULAR_CURRICULUM',
          reasonText: 'Essential movement foundations track',
          estimatedMinutes: p.estimatedDurationMinutes || 15,
        });
      }
    }

    return recommendations.slice(0, 4);
  }

  // =========================================================================
  // 4. EXPLORE SECTION
  // =========================================================================

  private async getExploreSection(organisationId: string): Promise<LearningHubExploreSectionDto> {
    const overview = await this.discoveryService.getDiscoveryOverview(organisationId).catch(() => null);

    const categories = (overview?.categories || []).slice(0, 6).map((c) => ({
      code: c.code,
      name: c.name,
      exerciseCount: c.count,
      thumbnailUrl: c.representativeExercise?.thumbnailUrl || null,
    }));

    const movements = (overview?.movementPatterns || []).slice(0, 8).map((m) => ({
      code: m.code,
      name: m.name,
      description: m.description,
      exerciseCount: m.count,
    }));

    const muscles = (overview?.muscles || []).slice(0, 8).map((m) => ({
      code: m.code,
      name: m.name,
      group: m.group,
      region: m.region,
      exerciseCount: m.count,
    }));

    const equipment = (overview?.equipment || []).slice(0, 8).map((e) => ({
      code: e.code,
      name: e.name,
      group: e.group,
      isNoEquipment: e.isNoEquipment,
      exerciseCount: e.count,
    }));

    return {
      categories,
      movements,
      muscles,
      equipment,
    };
  }

  // =========================================================================
  // 5. GUIDED LEARNING SECTION
  // =========================================================================

  private async getGuidedLearningSection(
    organisationId: string,
    userId: string,
  ): Promise<LearningHubGuidedSectionDto> {
    const [paths, collections, sessions, memberPathProgress, memberSessionProgress] = await Promise.all([
      this.prisma.learningPath.findMany({
        where: {
          contentStatus: 'PUBLISHED',
          ...this.tenantFilter(organisationId),
        },
        include: {
          sections: {
            include: {
              lessons: { select: { id: true } },
            },
          },
        },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        take: 6,
      }),
      this.prisma.exerciseCollection.findMany({
        where: {
          contentStatus: 'PUBLISHED',
          ...this.tenantFilter(organisationId),
        },
        include: {
          items: { select: { id: true } },
        },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        take: 6,
      }),
      this.prisma.guidedSession.findMany({
        where: {
          contentStatus: 'PUBLISHED',
          ...this.tenantFilter(organisationId),
        },
        include: {
          items: { select: { id: true } },
        },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        take: 6,
      }),
      this.prisma.userLearningPathProgress.findMany({
        where: { userId },
        select: { pathId: true, percentComplete: true, status: true },
      }),
      this.prisma.userGuidedSessionProgress.findMany({
        where: { userId },
        select: { sessionId: true, currentStepIndex: true, status: true, percentComplete: true },
      }),
    ]);

    const progressMap = new Map(memberPathProgress.map((p) => [p.pathId, p]));
    const sessionProgMap = new Map(memberSessionProgress.map((s) => [s.sessionId, s]));

    const mappedPaths = paths.map((p) => {
      const prog = progressMap.get(p.id);
      const lessonCount = p.sections.reduce((acc, s) => acc + s.lessons.length, 0);

      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        thumbnailUrl: p.coverMediaUrl,
        difficulty: p.difficulty,
        lessonCount,
        exerciseCount: p.exerciseCount || lessonCount,
        percentComplete: prog?.percentComplete || 0,
        isEnrolled: !!prog,
      };
    });

    const mappedCollections = collections.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      thumbnailUrl: c.coverMediaUrl,
      exerciseCount: c.items.length,
      difficulty: c.difficulty,
    }));

    const mappedSessions = sessions.map((s) => {
      const sp = sessionProgMap.get(s.id);
      const total = s.items.length || 1;
      const current = sp?.currentStepIndex || 0;
      const isCompleted = sp?.status === 'COMPLETED';
      const pct = isCompleted ? 100 : (sp?.percentComplete ?? Math.min(95, Math.round((current / total) * 100)));

      return {
        id: s.id,
        title: s.title,
        description: s.description,
        thumbnailUrl: s.coverMediaUrl,
        difficulty: s.difficulty,
        estimatedMinutes: s.estimatedDurationMinutes || 20,
        exerciseCount: s.items.length,
        percentComplete: pct,
      };
    });

    return {
      paths: mappedPaths,
      collections: mappedCollections,
      sessions: mappedSessions,
    };
  }

  // =========================================================================
  // 6. ACADEMY SECTION
  // =========================================================================

  private async getAcademySection(
    organisationId: string,
    userId: string,
  ): Promise<LearningHubAcademySectionDto> {
    const curricula = await this.prisma.curriculum.findMany({
      where: {
        contentStatus: 'PUBLISHED',
        ...this.tenantFilter(organisationId),
      },
      include: {
        learningPaths: {
          where: { contentStatus: 'PUBLISHED' },
          select: { id: true, lessonCount: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
      take: 4,
    });

    const userLessonCompletions = await this.prisma.userLessonCompletion.findMany({
      where: { userId },
      select: { lessonId: true, pathId: true },
    });

    const tracks = curricula.map((c) => {
      const totalLessons = c.learningPaths.reduce((acc, p) => acc + (p.lessonCount || 0), 0);
      const pathIds = new Set(c.learningPaths.map((p) => p.id));
      const completed = userLessonCompletions.filter((ulc) => pathIds.has(ulc.pathId)).length;
      const pct = totalLessons > 0 ? Math.min(100, Math.round((completed / totalLessons) * 100)) : 0;

      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        category: c.category,
        lessonCount: totalLessons,
        completedLessonCount: completed,
        percentComplete: pct,
      };
    });

    const totalGlossaryTerms = await this.prisma.glossaryTerm.count().catch(() => 42);

    return {
      tracks,
      totalGlossaryTerms,
    };
  }

  // =========================================================================
  // 7. REVIEW QUEUE
  // =========================================================================

  private async getReviewQueue(
    organisationId: string,
    userId: string,
  ): Promise<HubReviewItemDto[]> {
    const records = await this.masteryService.getReviewQueue(organisationId, userId).catch(() => []);

    return records.map((r) => ({
      contentType: r.contentType,
      contentId: r.contentId,
      title: r.contentTitle || r.contentId,
      reason: r.reviewReason || 'Concept review recommended based on recent score',
      score: r.knowledgeCheckScore,
      recommendedAt: r.reviewRecommendedAt ? r.reviewRecommendedAt.toISOString() : new Date().toISOString(),
    }));
  }

  // =========================================================================
  // 8. FEATURED EXERCISES
  // =========================================================================

  private async getFeaturedExercises(
    organisationId: string,
    userId: string,
  ): Promise<HubFeaturedExerciseDto[]> {
    const exercises = await this.prisma.exercise.findMany({
      where: {
        status: 'ACTIVE',
        contentStatus: 'PUBLISHED',
        ...this.tenantFilter(organisationId),
      },
      include: {
        media: {
          where: { isPrimary: true },
          select: { storageKey: true, mimeType: true },
          take: 1,
        },
      },
      orderBy: [{ createdAt: 'desc' }, { name: 'asc' }],
      take: 6,
    });

    const exerciseIds = exercises.map((e) => e.id);
    const masteryRecords = await this.prisma.learningMastery.findMany({
      where: {
        userId,
        organisationId,
        contentType: 'EXERCISE',
        contentId: { in: exerciseIds },
      },
    });

    const masteryMap = new Map(masteryRecords.map((m) => [m.contentId, m]));

    return exercises.map((ex) => {
      const m = masteryMap.get(ex.id);
      return {
        id: ex.id,
        name: ex.name,
        slug: ex.slug,
        difficulty: ex.difficulty,
        primaryMuscleGroup: ex.primaryMuscleGroup,
        equipment: ex.equipment,
        movementPattern: ex.movementPattern,
        thumbnailUrl: null,
        masteryStatus: (m?.status as LearningMasteryStatus) || 'NOT_STARTED',
        completionPercent: m?.completionPercent || 0,
      };
    });
  }

  // =========================================================================
  // 9. UNIFIED LEARNING HUB SEARCH
  // =========================================================================

  async searchLearningHub(
    organisationId: string,
    userId: string,
    query: LearningHubSearchQueryDto,
  ): Promise<LearningHubSearchResponseDto> {
    const q = (query.q || '').trim().toLowerCase();
    const limit = query.limit || 15;

    if (!q) {
      return {
        query: '',
        totalCount: 0,
        exercises: [],
        movements: [],
        muscles: [],
        equipment: [],
        learning: [],
      };
    }

    const tenantCondition = this.tenantFilter(organisationId);

    // Parallel entity search with tenant isolation & PUBLISHED filters
    const [
      exercises,
      learningPaths,
      collections,
      guidedSessions,
      curricula,
    ] = await Promise.all([
      this.prisma.exercise.findMany({
        where: {
          AND: [
            {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                { primaryMuscleGroup: { contains: q, mode: 'insensitive' } },
                { equipment: { contains: q, mode: 'insensitive' } },
              ],
            },
            { status: 'ACTIVE' },
            { contentStatus: 'PUBLISHED' },
            tenantCondition,
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          difficulty: true,
          primaryMuscleGroup: true,
          equipment: true,
          movementPattern: true,
        },
        take: limit,
      }),
      this.prisma.learningPath.findMany({
        where: {
          AND: [
            {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            },
            { contentStatus: 'PUBLISHED' },
            tenantCondition,
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          difficulty: true,
          category: true,
          coverMediaUrl: true,
        },
        take: 5,
      }),
      this.prisma.exerciseCollection.findMany({
        where: {
          AND: [
            {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            },
            { contentStatus: 'PUBLISHED' },
            tenantCondition,
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          difficulty: true,
          category: true,
          coverMediaUrl: true,
        },
        take: 5,
      }),
      this.prisma.guidedSession.findMany({
        where: {
          AND: [
            {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            },
            { contentStatus: 'PUBLISHED' },
            tenantCondition,
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          difficulty: true,
          coverMediaUrl: true,
        },
        take: 5,
      }),
      this.prisma.curriculum.findMany({
        where: {
          AND: [
            {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            },
            { contentStatus: 'PUBLISHED' },
            tenantCondition,
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
        },
        take: 5,
      }),
    ]);

    // Match static taxonomy dimensions
    const matchingMovements: MovementSearchResultItemDto[] = SYSTEM_MOVEMENTS.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q),
    ).map((m) => ({
      code: m.code,
      name: m.name,
      description: m.description,
      exerciseCount: 0,
    }));

    const matchingMuscles: MuscleSearchResultItemDto[] = SYSTEM_MUSCLES.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q),
    ).map((m) => ({
      code: m.code,
      name: m.name,
      group: m.group,
      region: m.region,
      exerciseCount: 0,
    }));

    const matchingEquipment: EquipmentSearchResultItemDto[] = SYSTEM_EQUIPMENT.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q),
    ).map((e) => ({
      code: e.code,
      name: e.name,
      group: e.group,
      isNoEquipment: e.isNoEquipment,
      exerciseCount: 0,
    }));

    // Join mastery status for found exercises
    const exerciseIds = exercises.map((e) => e.id);
    const masteryRecords = await this.prisma.learningMastery.findMany({
      where: {
        userId,
        organisationId,
        contentType: 'EXERCISE',
        contentId: { in: exerciseIds },
      },
      select: { contentId: true, status: true },
    });
    const masteryMap = new Map(masteryRecords.map((m) => [m.contentId, m.status as LearningMasteryStatus]));

    const mappedExercises: ExerciseSearchResultItemDto[] = exercises.map((e) => ({
      id: e.id,
      name: e.name,
      slug: e.slug,
      difficulty: e.difficulty,
      primaryMuscleGroup: e.primaryMuscleGroup,
      equipment: e.equipment,
      movementPattern: e.movementPattern,
      thumbnailUrl: null,
      masteryStatus: masteryMap.get(e.id) || 'NOT_STARTED',
    }));

    // Aggregate learning courses, collections, and curricula
    const learningResults: LearningContentSearchResultItemDto[] = [
      ...learningPaths.map((p) => ({
        id: p.id,
        type: 'PATH',
        title: p.title,
        subtitle: p.description,
        thumbnailUrl: p.coverMediaUrl,
        difficulty: p.difficulty,
        category: p.category,
      })),
      ...collections.map((c) => ({
        id: c.id,
        type: 'COLLECTION',
        title: c.title,
        subtitle: c.description,
        thumbnailUrl: c.coverMediaUrl,
        difficulty: c.difficulty,
        category: c.category,
      })),
      ...guidedSessions.map((s) => ({
        id: s.id,
        type: 'SESSION',
        title: s.title,
        subtitle: s.description,
        thumbnailUrl: s.coverMediaUrl,
        difficulty: s.difficulty,
      })),
      ...curricula.map((cu) => ({
        id: cu.id,
        type: 'CURRICULUM',
        title: cu.title,
        subtitle: cu.description,
        category: cu.category,
      })),
    ];

    const totalCount =
      mappedExercises.length +
      matchingMovements.length +
      matchingMuscles.length +
      matchingEquipment.length +
      learningResults.length;

    return {
      query: q,
      totalCount,
      exercises: mappedExercises,
      movements: matchingMovements,
      muscles: matchingMuscles,
      equipment: matchingEquipment,
      learning: learningResults,
    };
  }
}
