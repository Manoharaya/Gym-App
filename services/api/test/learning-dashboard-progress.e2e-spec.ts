import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ForbiddenException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ExercisesService } from '../src/exercises/services/exercises.service';
import { ExerciseCollectionsLearningPathsService } from '../src/exercises/services/exercise-collections-learning-paths.service';
import { LearningDashboardService } from '../src/exercises/services/learning-dashboard.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Day 71: Member Learning Dashboard & Progress Intelligence E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let exercisesService: ExercisesService;
  let collectionsPathsService: ExerciseCollectionsLearningPathsService;
  let dashboardService: LearningDashboardService;

  let orgA: any;
  let orgB: any;
  let memberUserA: any;
  let actorMemberOrgA: AuthenticatedUser;
  let actorOwnerOrgB: AuthenticatedUser;

  let exSquat: any;
  let exDeadlift: any;
  let exLunge: any;

  let testPath: any;
  let lesson1: any;
  let lesson2: any;
  let lesson3: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
    prisma = app.get(PrismaService);
    exercisesService = app.get(ExercisesService);
    collectionsPathsService = app.get(ExerciseCollectionsLearningPathsService);
    dashboardService = app.get(LearningDashboardService);

    orgA = await prisma.organisation.findFirstOrThrow({ where: { slug: 'second-wind' } });
    orgB = await prisma.organisation.findFirstOrThrow({ where: { slug: 'apex-strength' } });

    memberUserA = (await prisma.user.findFirst({
      where: { email: 'member@secondwind.com.au' },
    })) || (await prisma.user.findFirstOrThrow({
      where: { email: 'owner@secondwind.com.au' },
    }));

    actorMemberOrgA = {
      id: memberUserA.id,
      email: memberUserA.email,
      firstName: memberUserA.firstName,
      lastName: memberUserA.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'MEMBER', organisationId: orgA.id }],
      permissions: [{ resource: 'exercises', action: 'read', scope: 'ORGANISATION' }],
    };

    const ownerUserB = await prisma.user.findFirstOrThrow({ where: { email: 'owner@apexstrength.com.au' } });
    actorOwnerOrgB = {
      id: ownerUserB.id,
      email: ownerUserB.email,
      firstName: ownerUserB.firstName,
      lastName: ownerUserB.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'ORGANISATION_OWNER', organisationId: orgB.id }],
      permissions: [{ resource: '*', action: 'MANAGE', scope: 'ORGANISATION' }],
    };

    const stamp = Date.now();

    // 1. Setup exercises
    exSquat = await exercisesService.create(
      orgA.id,
      {
        name: `Day 71 Barbell Squat ${stamp}`,
        difficulty: 'BEGINNER',
        exerciseType: 'STRENGTH',
        movementPattern: 'SQUAT',
        primaryMuscleGroup: 'QUADRICEPS',
        equipmentType: 'BARBELL',
        description: 'Foundational compound squat for lower body strength and mechanics',
      },
      actorMemberOrgA,
    );

    exDeadlift = await exercisesService.create(
      orgA.id,
      {
        name: `Day 71 Conventional Deadlift ${stamp}`,
        difficulty: 'INTERMEDIATE',
        exerciseType: 'STRENGTH',
        movementPattern: 'HINGE',
        primaryMuscleGroup: 'BACK',
        equipmentType: 'BARBELL',
        description: 'Posterior chain compound lift',
      },
      actorMemberOrgA,
    );

    exLunge = await exercisesService.create(
      orgA.id,
      {
        name: `Day 71 Walking Lunge ${stamp}`,
        difficulty: 'BEGINNER',
        exerciseType: 'STRENGTH',
        movementPattern: 'LUNGE',
        primaryMuscleGroup: 'QUADRICEPS',
        equipmentType: 'DUMBBELL',
        description: 'Unilateral leg strength drill',
      },
      actorMemberOrgA,
    );

    // 2. Setup a multi-lesson learning path
    testPath = await collectionsPathsService.createLearningPath(
      orgA.id,
      actorMemberOrgA.id,
      {
        title: `Day 71 Lower Body Mastery ${stamp}`,
        description: 'Complete guide to squatting, hinging, and lunging',
        category: 'FUNDAMENTALS',
        difficulty: 'BEGINNER',
        primaryGoal: 'TECHNIQUE',
        estimatedDurationMinutes: 25,
        featured: true,
        sections: [
          {
            title: 'Foundations of the Squat',
            sortOrder: 0,
            lessons: [
              {
                title: 'Stance, Arch & Hip Break',
                estimatedMinutes: 8,
                lessonType: 'EXERCISE_LESSON',
                exerciseId: exSquat.id,
                isRequired: true,
                sortOrder: 0,
              },
              {
                title: 'Descent Depth & Knee Tracking',
                estimatedMinutes: 7,
                lessonType: 'MOVEMENT_LESSON',
                exerciseId: exSquat.id,
                isRequired: true,
                sortOrder: 1,
              },
            ],
          },
          {
            title: 'Hinge and Lunge Progression',
            sortOrder: 1,
            lessons: [
              {
                title: 'Hip Hinge Mechanics',
                estimatedMinutes: 10,
                lessonType: 'EXERCISE_LESSON',
                exerciseId: exDeadlift.id,
                isRequired: true,
                sortOrder: 2,
              },
            ],
          },
        ],
      },
    );

    const pathDetail = await collectionsPathsService.findLearningPathById(
      orgA.id,
      actorMemberOrgA.id,
      testPath.id,
    );
    lesson1 = pathDetail.lessons[0];
    lesson2 = pathDetail.lessons[1];
    lesson3 = pathDetail.lessons[2];
  });

  afterAll(async () => {
    // Cleanup created learning data
    if (testPath) {
      await prisma.userLessonCompletion.deleteMany({ where: { pathId: testPath.id } }).catch(() => {});
      await prisma.userLearningPathProgress.deleteMany({ where: { pathId: testPath.id } }).catch(() => {});
      await prisma.learningPathLesson.deleteMany({ where: { pathId: testPath.id } }).catch(() => {});
      await prisma.learningPathSection.deleteMany({ where: { pathId: testPath.id } }).catch(() => {});
      await prisma.learningPath.delete({ where: { id: testPath.id } }).catch(() => {});
    }

    if (exSquat) await prisma.exercise.delete({ where: { id: exSquat.id } }).catch(() => {});
    if (exDeadlift) await prisma.exercise.delete({ where: { id: exDeadlift.id } }).catch(() => {});
    if (exLunge) await prisma.exercise.delete({ where: { id: exLunge.id } }).catch(() => {});

    await app.close();
  });

  // =========================================================================
  // 1. DASHBOARD AGGREGATION & REAL STATISTICS
  // =========================================================================

  describe('1. Member Learning Dashboard Aggregation', () => {
    it('should aggregate real platform statistics and initial NOT_STARTED status', async () => {
      const dashboard = await dashboardService.getMemberLearningDashboard(
        orgA.id,
        actorMemberOrgA.id,
      );

      expect(dashboard).toBeDefined();
      expect(dashboard.summary).toBeDefined();
      expect(typeof dashboard.summary.pathsStarted).toBe('number');
      expect(typeof dashboard.summary.pathsCompleted).toBe('number');
      expect(typeof dashboard.summary.lessonsCompleted).toBe('number');
      expect(typeof dashboard.summary.exercisesLearned).toBe('number');
      expect(typeof dashboard.summary.learningTimeMinutes).toBe('number');
      expect(typeof dashboard.summary.currentStreakDays).toBe('number');
      expect(Array.isArray(dashboard.recentActivity)).toBe(true);
      expect(Array.isArray(dashboard.recommendations)).toBe(true);
      expect(Array.isArray(dashboard.categories)).toBe(true);
    });

    it('should track collection interaction without altering workout logs', async () => {
      const stamp = Date.now();
      const col = await collectionsPathsService.createCollection(
        orgA.id,
        actorMemberOrgA.id,
        {
          title: `Day 71 Warmup Pack ${stamp}`,
          difficulty: 'BEGINNER',
          category: 'ESSENTIALS',
        },
      );

      await dashboardService.trackCollectionInteraction(orgA.id, actorMemberOrgA.id, col.id);

      const dashboard = await dashboardService.getMemberLearningDashboard(
        orgA.id,
        actorMemberOrgA.id,
      );

      expect(dashboard.summary.collectionsExplored).toBeGreaterThanOrEqual(1);

      // Cleanup collection
      await prisma.userCollectionProgress.deleteMany({ where: { collectionId: col.id } }).catch(() => {});
      await prisma.exerciseCollection.delete({ where: { id: col.id } }).catch(() => {});
    });
  });

  // =========================================================================
  // 2. RESUME INTELLIGENCE (getResumeLearningPosition)
  // =========================================================================

  describe('2. Resume Intelligence & Progression', () => {
    it('should accurately advance resume pointer to next uncompleted lesson upon completing lesson 1', async () => {
      // Complete lesson 1
      await collectionsPathsService.completeLesson(
        orgA.id,
        actorMemberOrgA.id,
        testPath.id,
        lesson1.id,
      );

      // Check resume position via service
      const resume = await dashboardService.getResumeLearningPosition(
        orgA.id,
        actorMemberOrgA.id,
      );

      expect(resume).toBeDefined();
      expect(resume).not.toBeNull();
      expect(resume!.pathId).toBe(testPath.id);
      expect(resume!.lessonId).toBe(lesson2.id); // Must advance to lesson 2!
      expect(resume!.lessonNumber).toBe(2);
      expect(resume!.totalLessons).toBe(3);
      expect(resume!.percentComplete).toBe(33);
      expect(resume!.lessonTitle).toBe(lesson2.title);
    });

    it('should reflect active learning path in dashboard continueLearning card', async () => {
      const dashboard = await dashboardService.getMemberLearningDashboard(
        orgA.id,
        actorMemberOrgA.id,
      );

      expect(dashboard.continueLearning).toBeDefined();
      expect(dashboard.continueLearning!.pathId).toBe(testPath.id);
      expect(dashboard.continueLearning!.lessonId).toBe(lesson2.id);
      expect(dashboard.summary.lessonsCompleted).toBeGreaterThanOrEqual(1);
      expect(dashboard.summary.learningTimeMinutes).toBeGreaterThanOrEqual(8); // lesson 1 was 8 mins
      expect(dashboard.summary.currentStreakDays).toBeGreaterThanOrEqual(1);
    });

    it('should exclude completed path from active resume once all lessons are finished', async () => {
      // Complete lesson 2 and lesson 3
      await collectionsPathsService.completeLesson(
        orgA.id,
        actorMemberOrgA.id,
        testPath.id,
        lesson2.id,
      );
      await collectionsPathsService.completeLesson(
        orgA.id,
        actorMemberOrgA.id,
        testPath.id,
        lesson3.id,
      );

      // Path is now 100% completed
      const resume = await dashboardService.getResumeLearningPosition(
        orgA.id,
        actorMemberOrgA.id,
      );

      // The completed testPath must never be returned as resume point
      if (resume) {
        expect(resume.pathId).not.toBe(testPath.id);
      }

      const dashboard = await dashboardService.getMemberLearningDashboard(
        orgA.id,
        actorMemberOrgA.id,
      );
      expect(dashboard.summary.pathsCompleted).toBeGreaterThanOrEqual(1);
      expect(dashboard.activePaths.find((p) => p.pathId === testPath.id)).toBeUndefined();
    });
  });

  // =========================================================================
  // 3. DETERMINISTIC RECOMMENDATIONS ("NEXT TO LEARN")
  // =========================================================================

  describe('3. Deterministic Recommendations', () => {
    it('should exclude completed paths from recommended list and provide explainable reasons', async () => {
      const dashboard = await dashboardService.getMemberLearningDashboard(
        orgA.id,
        actorMemberOrgA.id,
      );

      // Completed testPath must NOT be recommended
      const recommendedIds = dashboard.recommendations.map((r) => r.pathId);
      expect(recommendedIds).not.toContain(testPath.id);

      // Verify every recommendation has a clear reason
      dashboard.recommendations.forEach((rec) => {
        expect(rec.reason).toBeDefined();
        expect(rec.reason.length).toBeGreaterThan(0);
        expect(rec.title).toBeDefined();
        expect(rec.difficulty).toBeDefined();
      });
    });
  });

  // =========================================================================
  // 4. ACTIVITY TIMELINE & RECENTLY LEARNED EXERCISES
  // =========================================================================

  describe('4. Activity Timeline & Recently Learned Exercises', () => {
    it('should record chronological learning milestones and recently learned exercises', async () => {
      const dashboard = await dashboardService.getMemberLearningDashboard(
        orgA.id,
        actorMemberOrgA.id,
      );

      expect(dashboard.recentActivity.length).toBeGreaterThanOrEqual(1);

      // First item should be the most recent event
      const mostRecent = dashboard.recentActivity[0];
      expect(mostRecent.timestamp).toBeDefined();
      expect(['LESSON_COMPLETED', 'PATH_COMPLETED', 'EXERCISE_LEARNED', 'PATH_STARTED']).toContain(
        mostRecent.type,
      );

      // Check recently learned exercises includes exSquat or exDeadlift
      expect(dashboard.recentExercises.length).toBeGreaterThanOrEqual(1);
      const learnedIds = dashboard.recentExercises.map((e) => e.exerciseId);
      expect(learnedIds.includes(exSquat.id) || learnedIds.includes(exDeadlift.id)).toBe(true);
    });
  });

  // =========================================================================
  // 5. IN-DEPTH PROGRESS OVERVIEW & HISTORY
  // =========================================================================

  describe('5. Progress Overview & Paginated History', () => {
    it('should retrieve detailed progress overview with active and completed sections', async () => {
      const overview = await dashboardService.getLearningProgressOverview(
        orgA.id,
        actorMemberOrgA.id,
      );

      expect(overview).toBeDefined();
      expect(Array.isArray(overview.activePaths)).toBe(true);
      expect(Array.isArray(overview.completedPaths)).toBe(true);
      expect(Array.isArray(overview.exploredCollections)).toBe(true);

      const foundCompleted = overview.completedPaths.find((p) => p.id === testPath.id);
      expect(foundCompleted).toBeDefined();
      expect(foundCompleted!.completedLessons).toBe(3);
    });

    it('should paginate learning completion history correctly', async () => {
      const history = await dashboardService.getLearningHistory(
        orgA.id,
        actorMemberOrgA.id,
        { page: 1, limit: 10 },
      );

      expect(history.items).toBeDefined();
      expect(history.items.length).toBeGreaterThanOrEqual(1);
      expect(history.pagination).toBeDefined();
      expect(history.pagination.page).toBe(1);
      expect(history.pagination.totalCount).toBeGreaterThanOrEqual(1);

      // Verify item fields
      const item = history.items[0];
      expect(item.lessonTitle).toBeDefined();
      expect(item.pathTitle).toBeDefined();
      expect(item.completedAt).toBeDefined();
    });
  });

  // =========================================================================
  // 6. EXERCISE LEARNING MASTERY INTEGRATION
  // =========================================================================

  describe('6. Exercise Detail Learning Mastery Status', () => {
    it('should report LEARNED status for exercise taught in completed lesson', async () => {
      const mastery = await dashboardService.getExerciseLearningMastery(
        orgA.id,
        actorMemberOrgA.id,
        exSquat.id,
      );

      expect(mastery).toBeDefined();
      expect(mastery.exerciseId).toBe(exSquat.id);
      expect(mastery.status).toBe('LEARNED');
      expect(mastery.learnedAt).not.toBeNull();
    });

    it('should report DISCOVERED status for an untaught/unvisited exercise', async () => {
      const mastery = await dashboardService.getExerciseLearningMastery(
        orgA.id,
        actorMemberOrgA.id,
        exLunge.id,
      );

      expect(mastery).toBeDefined();
      expect(mastery.exerciseId).toBe(exLunge.id);
      expect(mastery.status).toBe('DISCOVERED');
      expect(mastery.learnedAt).toBeNull();
    });
  });

  // =========================================================================
  // 7. MULTI-TENANT ISOLATION & IDOR PROTECTION
  // =========================================================================

  describe('7. Multi-Tenant Isolation & IDOR Protection', () => {
    it('should not leak Org A member learning dashboard or history to Org B user', async () => {
      const orgBDashboard = await dashboardService.getMemberLearningDashboard(
        orgB.id,
        actorOwnerOrgB.id,
      );

      // Org B user should have 0 completed paths for Org A's path
      const orgBCompletedIds = orgBDashboard.recentActivity
        .filter((a) => a.type === 'PATH_COMPLETED')
        .map((a) => a.title);

      expect(orgBCompletedIds).not.toContain(`Mastered "${testPath.title}"`);

      // Org B user querying Org A member's history should get empty or filtered items
      const orgBHistory = await dashboardService.getLearningHistory(
        orgB.id,
        actorOwnerOrgB.id,
        { page: 1, limit: 10 },
      );
      const lessonIds = orgBHistory.items.map((i) => i.lessonId);
      expect(lessonIds).not.toContain(lesson1.id);
    });
  });

  // =========================================================================
  // 8. DECOUPLING FROM WORKOUT EXECUTION
  // =========================================================================

  describe('8. Decoupling from Workout Execution', () => {
    it('should strictly ensure lesson completions never touched workout session records', async () => {
      // Find workout sessions for orgA
      const workoutSessions = await prisma.workout.findMany({
        where: {
          organisationId: orgA.id,
        },
      });

      // No workouts should have been generated or modified by learning paths
      workoutSessions.forEach((w) => {
        expect(w.notes || '').not.toContain(testPath.id);
        expect(w.title || '').not.toContain(testPath.title);
      });
    });
  });
});
