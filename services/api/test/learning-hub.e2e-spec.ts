import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { LearningHubService } from '../src/exercises/services/learning-hub.service';
import { ExerciseLearningMasteryService } from '../src/exercises/services/exercise-learning-mastery.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Day 80: Visual Fitness Learning Hub, Content Discovery & Unified Search E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let hubService: LearningHubService;
  let masteryService: ExerciseLearningMasteryService;

  let orgA: any;
  let orgB: any;
  let userA: any;
  let userB: any;
  let actorMemberA: AuthenticatedUser;
  let actorMemberB: AuthenticatedUser;

  let testExerciseA: any;
  let testExerciseB: any;
  let testDraftExercise: any;
  let testLearningPath: any;

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
    hubService = app.get(LearningHubService);
    masteryService = app.get(ExerciseLearningMasteryService);

    orgA = await prisma.organisation.findFirstOrThrow({ where: { slug: 'second-wind' } });
    orgB = await prisma.organisation.findFirstOrThrow({ where: { slug: 'apex-strength' } });

    userA =
      (await prisma.user.findFirst({ where: { email: 'owner@secondwind.com.au' } })) ||
      (await prisma.user.findFirstOrThrow({ where: { email: 'member@secondwind.com.au' } }));

    userB =
      (await prisma.user.findFirst({ where: { email: 'owner@apexstrength.com.au' } })) ||
      (await prisma.user.findFirstOrThrow({ where: { email: 'member@apexstrength.com.au' } }));

    actorMemberA = {
      id: userA.id,
      email: userA.email,
      roles: [{ role: 'MEMBER', organisationId: orgA.id }],
    } as any;

    actorMemberB = {
      id: userB.id,
      email: userB.email,
      roles: [{ role: 'MEMBER', organisationId: orgB.id }],
    } as any;

    // Clean up past test progress
    await prisma.userLearningPathProgress.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
    await prisma.exerciseLearningProgress.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
    await prisma.learningActivityEvent.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
    await prisma.learningMastery.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });

    // Create Test Exercises
    testExerciseA = await prisma.exercise.create({
      data: {
        organisationId: orgA.id,
        ownershipType: 'ORGANISATION',
        name: 'Barbell Back Squat (Hub Test A)',
        slug: `barbell-back-squat-hub-a-${Date.now()}`,
        difficulty: 'INTERMEDIATE',
        exerciseType: 'STRENGTH',
        primaryMuscleGroup: 'QUADRICEPS',
        secondaryMuscleGroups: ['GLUTES', 'HAMSTRINGS'],
        equipment: 'BARBELL',
        movementPattern: 'SQUAT',
        status: 'ACTIVE',
        contentStatus: 'PUBLISHED',
      },
    });

    testExerciseB = await prisma.exercise.create({
      data: {
        organisationId: orgB.id,
        ownershipType: 'ORGANISATION',
        name: 'Secret Apex Hinge (Hub Test B)',
        slug: `secret-apex-hinge-${Date.now()}`,
        difficulty: 'ADVANCED',
        exerciseType: 'STRENGTH',
        primaryMuscleGroup: 'HAMSTRINGS',
        equipment: 'BARBELL',
        movementPattern: 'HINGE',
        status: 'ACTIVE',
        contentStatus: 'PUBLISHED',
      },
    });

    testDraftExercise = await prisma.exercise.create({
      data: {
        organisationId: orgA.id,
        ownershipType: 'ORGANISATION',
        name: 'Unpublished Draft Squat',
        slug: `unpublished-draft-squat-${Date.now()}`,
        difficulty: 'BEGINNER',
        exerciseType: 'STRENGTH',
        primaryMuscleGroup: 'QUADRICEPS',
        equipment: 'DUMBBELL',
        movementPattern: 'SQUAT',
        status: 'ACTIVE',
        contentStatus: 'DRAFT',
      },
    });

    // Create Test Learning Path
    testLearningPath = await prisma.learningPath.create({
      data: {
        organisationId: orgA.id,
        ownershipType: 'ORGANISATION',
        title: 'Squat Mastery Masterclass (Hub Test)',
        slug: `squat-mastery-masterclass-${Date.now()}`,
        difficulty: 'INTERMEDIATE',
        category: 'STRENGTH',
        contentStatus: 'PUBLISHED',
        featured: true,
        estimatedDurationMinutes: 45,
        exerciseCount: 4,
      },
    });
  });

  afterAll(async () => {
    await prisma.userLearningPathProgress.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
    await prisma.exerciseLearningProgress.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
    await prisma.learningActivityEvent.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
    await prisma.learningMastery.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
    if (testLearningPath) {
      await prisma.learningPath.delete({ where: { id: testLearningPath.id } }).catch(() => {});
    }
    if (testExerciseA) {
      await prisma.exercise.delete({ where: { id: testExerciseA.id } }).catch(() => {});
    }
    if (testExerciseB) {
      await prisma.exercise.delete({ where: { id: testExerciseB.id } }).catch(() => {});
    }
    if (testDraftExercise) {
      await prisma.exercise.delete({ where: { id: testDraftExercise.id } }).catch(() => {});
    }
    await app.close();
  });

  // =========================================================================
  // 1. CONSOLIDATED LEARNING HUB DATA ORCHESTRATION
  // =========================================================================

  describe('1. Consolidated Learning Hub Data Orchestration', () => {
    it('should aggregate all 8 key educational sections in a single read model', async () => {
      const hubData = await hubService.getLearningHubData(orgA.id, userA.id);

      expect(hubData).toBeDefined();
      expect(Array.isArray(hubData.continueLearning)).toBe(true);
      expect(Array.isArray(hubData.recommendedLearning)).toBe(true);
      expect(hubData.explore).toBeDefined();
      expect(Array.isArray(hubData.explore.categories)).toBe(true);
      expect(Array.isArray(hubData.explore.movements)).toBe(true);
      expect(Array.isArray(hubData.explore.muscles)).toBe(true);
      expect(Array.isArray(hubData.explore.equipment)).toBe(true);
      expect(hubData.guidedLearning).toBeDefined();
      expect(Array.isArray(hubData.guidedLearning.paths)).toBe(true);
      expect(Array.isArray(hubData.guidedLearning.collections)).toBe(true);
      expect(Array.isArray(hubData.guidedLearning.sessions)).toBe(true);
      expect(hubData.academy).toBeDefined();
      expect(Array.isArray(hubData.academy.tracks)).toBe(true);
      expect(Array.isArray(hubData.reviewQueue)).toBe(true);
      expect(hubData.myLearningSummary).toBeDefined();
      expect(typeof hubData.myLearningSummary.totalLearned).toBe('number');
      expect(typeof hubData.myLearningSummary.totalMastered).toBe('number');
      expect(Array.isArray(hubData.featuredExercises)).toBe(true);
    });

    it('should provide rich explore dimensions with movement patterns and muscles', async () => {
      const hubData = await hubService.getLearningHubData(orgA.id, userA.id);

      // Verify movements
      expect(hubData.explore.movements.length).toBeGreaterThan(0);
      const squatMovement = hubData.explore.movements.find((m) => m.code === 'SQUAT');
      expect(squatMovement).toBeDefined();
      expect(squatMovement?.name).toContain('Squat');

      // Verify muscles
      expect(hubData.explore.muscles.length).toBeGreaterThan(0);
      const quadMuscle = hubData.explore.muscles.find((m) => m.code === 'QUADRICEPS');
      expect(quadMuscle).toBeDefined();
      expect(quadMuscle?.region).toBe('ANTERIOR');

      // Verify equipment
      const barbellEquip = hubData.explore.equipment.find((e) => e.code === 'BARBELL');
      expect(barbellEquip).toBeDefined();
      expect(barbellEquip?.group).toBe('FREE_WEIGHTS');
    });
  });

  // =========================================================================
  // 2. CONTINUE LEARNING PIPELINE & DETERMINISTIC RESUME
  // =========================================================================

  describe('2. Continue Learning Pipeline & Deterministic Resume', () => {
    it('should accurately aggregate active in-progress paths and tutorials', async () => {
      // 1. Enroll userA in testLearningPath with progress
      await prisma.userLearningPathProgress.create({
        data: {
          userId: userA.id,
          pathId: testLearningPath.id,
          status: 'IN_PROGRESS',
          completedLessons: 2,
          totalLessons: 4,
          percentComplete: 50,
          lastInteractedAt: new Date(),
        },
      });

      // 2. Add in-progress tutorial for testExerciseA
      await prisma.exerciseLearningProgress.create({
        data: {
          userId: userA.id,
          exerciseId: testExerciseA.id,
          status: 'IN_PROGRESS',
          completedSteps: 3,
          totalSteps: 5,
          lastStepNumber: 3,
          phasesExplored: true,
          updatedAt: new Date(Date.now() + 1000), // Slightly newer
        },
      });

      const hubData = await hubService.getLearningHubData(orgA.id, userA.id);

      expect(hubData.continueLearning.length).toBeGreaterThanOrEqual(2);

      // Verify tutorial item
      const tutorialItem = hubData.continueLearning.find((i) => i.contentType === 'TUTORIAL');
      expect(tutorialItem).toBeDefined();
      expect(tutorialItem?.title).toContain('Barbell Back Squat');
      expect(tutorialItem?.progressPercent).toBe(60); // 3 of 5
      expect(tutorialItem?.resumeActionTitle).toContain('Resume Step 3');

      // Verify learning path item
      const pathItem = hubData.continueLearning.find((i) => i.contentType === 'LEARNING_PATH');
      expect(pathItem).toBeDefined();
      expect(pathItem?.title).toBe(testLearningPath.title);
      expect(pathItem?.progressPercent).toBe(50);
      expect(pathItem?.resumeActionTitle).toContain('Continue Lesson');
    });
  });

  // =========================================================================
  // 3. REVIEW QUEUE & KNOWLEDGE CHECK INTEGRATION
  // =========================================================================

  describe('3. Review Queue & Targeted Review Integration', () => {
    it('should include exercises that scored below 70% in the review queue with transparent reasons', async () => {
      // Simulate low quiz score via masteryService
      await masteryService.recordLearningEvent(orgA.id, userA.id, {
        eventType: 'KNOWLEDGE_CHECK_FAILED',
        contentType: 'EXERCISE',
        contentId: testExerciseA.id,
        metadata: { score: 62 },
      });

      const hubData = await hubService.getLearningHubData(orgA.id, userA.id);

      expect(hubData.reviewQueue.length).toBeGreaterThan(0);
      const reviewItem = hubData.reviewQueue.find((r) => r.contentId === testExerciseA.id);
      expect(reviewItem).toBeDefined();
      expect(reviewItem?.score).toBe(62);
      expect(reviewItem?.reason).toContain('62%');
    });
  });

  // =========================================================================
  // 4. UNIFIED LEARNING SEARCH
  // =========================================================================

  describe('4. Unified Learning Search Engine', () => {
    it('should return cross-categorical grouped results when searching for exercise and movement terms', async () => {
      const searchRes = await hubService.searchLearningHub(orgA.id, userA.id, {
        q: 'squat',
        limit: 10,
      });

      expect(searchRes).toBeDefined();
      expect(searchRes.query).toBe('squat');
      expect(searchRes.totalCount).toBeGreaterThan(0);

      // Should find testExerciseA
      const foundExercise = searchRes.exercises.find((e) => e.id === testExerciseA.id);
      expect(foundExercise).toBeDefined();
      expect(foundExercise?.primaryMuscleGroup).toBe('QUADRICEPS');

      // Should match Squat Pattern in movements
      const foundMovement = searchRes.movements.find((m) => m.code === 'SQUAT');
      expect(foundMovement).toBeDefined();

      // Should find testLearningPath
      const foundPath = searchRes.learning.find((l) => l.id === testLearningPath.id);
      expect(foundPath).toBeDefined();
      expect(foundPath?.type).toBe('PATH');
    });

    it('should return empty result set for empty query string', async () => {
      const searchRes = await hubService.searchLearningHub(orgA.id, userA.id, {
        q: '',
      });

      expect(searchRes.totalCount).toBe(0);
      expect(searchRes.exercises).toHaveLength(0);
      expect(searchRes.movements).toHaveLength(0);
      expect(searchRes.learning).toHaveLength(0);
    });

    it('should strictly exclude UNPUBLISHED (DRAFT) exercises from search results', async () => {
      const searchRes = await hubService.searchLearningHub(orgA.id, userA.id, {
        q: 'unpublished draft',
      });

      const draftFound = searchRes.exercises.find((e) => e.id === testDraftExercise.id);
      expect(draftFound).toBeUndefined();
    });
  });

  // =========================================================================
  // 5. SECURITY, TENANT ISOLATION & IDOR PROTECTION
  // =========================================================================

  describe('5. Security, Tenant Isolation & IDOR Protection', () => {
    it('should NOT leak Tenant B custom content to Tenant A member in Learning Hub', async () => {
      const hubDataA = await hubService.getLearningHubData(orgA.id, userA.id);

      // Verify Tenant B's secret exercise is NOT in featured exercises of Tenant A
      const leakedEx = hubDataA.featuredExercises.find((e) => e.id === testExerciseB.id);
      expect(leakedEx).toBeUndefined();
    });

    it('should NOT leak Tenant B custom content in unified search results for Tenant A member', async () => {
      const searchResA = await hubService.searchLearningHub(orgA.id, userA.id, {
        q: 'Secret Apex Hinge',
      });

      const leakedSearchEx = searchResA.exercises.find((e) => e.id === testExerciseB.id);
      expect(leakedSearchEx).toBeUndefined();
      expect(searchResA.totalCount).toBe(0);
    });

    it('should correctly surface Tenant B custom content when searched by Tenant B member', async () => {
      const searchResB = await hubService.searchLearningHub(orgB.id, userB.id, {
        q: 'Secret Apex Hinge',
      });

      const foundExB = searchResB.exercises.find((e) => e.id === testExerciseB.id);
      expect(foundExB).toBeDefined();
      expect(foundExB?.id).toBe(testExerciseB.id);
    });
  });
});
