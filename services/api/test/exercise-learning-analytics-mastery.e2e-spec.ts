import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ExerciseLearningMasteryService } from '../src/exercises/services/exercise-learning-mastery.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Day 79: Exercise Learning Analytics & Member Mastery Intelligence E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let masteryService: ExerciseLearningMasteryService;

  let orgA: any;
  let orgB: any;
  let userA: any;
  let userB: any;
  let actorMemberA: AuthenticatedUser;
  let actorMemberB: AuthenticatedUser;

  let testExerciseA: any;
  let testExerciseB: any;

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

    // Clean up test events and mastery records
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
        name: 'Barbell Front Squat (Mastery Test)',
        slug: `barbell-front-squat-mastery-${Date.now()}`,
        difficulty: 'INTERMEDIATE',
        exerciseType: 'BARBELL',
        movementPattern: 'SQUAT',
        primaryMuscleGroup: 'QUADS',
        equipment: 'BARBELL',
        contentStatus: 'PUBLISHED',
      },
    });

    testExerciseB = await prisma.exercise.create({
      data: {
        organisationId: orgB.id,
        ownershipType: 'ORGANISATION',
        name: 'Romanian Deadlift (Org B Mastery Test)',
        slug: `rdl-mastery-test-${Date.now()}`,
        difficulty: 'INTERMEDIATE',
        exerciseType: 'BARBELL',
        movementPattern: 'HINGE',
        primaryMuscleGroup: 'HAMSTRINGS',
        equipment: 'BARBELL',
        contentStatus: 'PUBLISHED',
      },
    });
  });

  afterAll(async () => {
    await prisma.learningActivityEvent.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    }).catch(() => null);
    await prisma.learningMastery.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    }).catch(() => null);
    if (testExerciseA) {
      await prisma.exercise.delete({ where: { id: testExerciseA.id } }).catch(() => null);
    }
    if (testExerciseB) {
      await prisma.exercise.delete({ where: { id: testExerciseB.id } }).catch(() => null);
    }
    await app.close();
  });

  describe('1. Learning Telemetry & Deterministic Mastery Transitions', () => {
    it('should transition from NOT_STARTED to EXPLORING upon starting learning', async () => {
      const result = await masteryService.recordLearningEvent(orgA.id, userA.id, {
        eventType: 'exercise_learning_started',
        contentType: 'EXERCISE',
        contentId: testExerciseA.id,
        sectionId: 'INTRODUCTION',
      });

      expect(result.eventId).toBeDefined();
      expect(result.mastery.status).toBe('EXPLORING');
      expect(result.mastery.sectionsCompleted).toContain('INTRODUCTION');
    });

    it('should transition to LEARNING upon viewing movement phases', async () => {
      const result = await masteryService.recordLearningEvent(orgA.id, userA.id, {
        eventType: 'movement_phase_viewed',
        contentType: 'EXERCISE',
        contentId: testExerciseA.id,
        sectionId: 'MOVEMENT_PHASES',
      });

      expect(result.mastery.status).toBe('LEARNING');
      expect(result.mastery.sectionsCompleted).toContain('MOVEMENT_PHASES');
    });

    it('should transition to PRACTICING when interactive practice begins', async () => {
      const result = await masteryService.recordLearningEvent(orgA.id, userA.id, {
        eventType: 'practice_started',
        contentType: 'EXERCISE',
        contentId: testExerciseA.id,
      });

      expect(result.mastery.status).toBe('PRACTICING');
    });

    it('should transition to PROGRESSING when practice is completed', async () => {
      const result = await masteryService.recordLearningEvent(orgA.id, userA.id, {
        eventType: 'practice_completed',
        contentType: 'EXERCISE',
        contentId: testExerciseA.id,
        sectionId: 'PRACTICE',
      });

      expect(result.mastery.status).toBe('PROGRESSING');
      expect(result.mastery.sectionsCompleted).toContain('PRACTICE');
    });

    it('should transition to COMPLETED upon tutorial completion if no quiz taken', async () => {
      const result = await masteryService.recordLearningEvent(orgA.id, userA.id, {
        eventType: 'tutorial_completed',
        contentType: 'EXERCISE',
        contentId: testExerciseA.id,
      });

      expect(result.mastery.status).toBe('COMPLETED');
      expect(result.mastery.firstCompletedAt).toBeDefined();
    });
  });

  describe('2. Knowledge Check Score Integration & Review Triggers', () => {
    it('should transition to REVIEW state when knowledge check score is below 70%', async () => {
      const result = await masteryService.recordLearningEvent(orgA.id, userA.id, {
        eventType: 'knowledge_check_completed',
        contentType: 'EXERCISE',
        contentId: testExerciseA.id,
        sectionId: 'KNOWLEDGE_CHECK',
        metadata: {
          score: 60,
          reason: 'Missed breathing brace and thoracic extension questions.',
        },
      });

      expect(result.mastery.status).toBe('REVIEW');
      expect(result.mastery.knowledgeCheckScore).toBe(60);
      expect(result.mastery.reviewRecommendedAt).toBeDefined();
      expect(result.mastery.reviewReason).toContain('breathing brace');
    });

    it('should transition to MASTERED state when knowledge check score reaches 80% or above', async () => {
      const result = await masteryService.recordLearningEvent(orgA.id, userA.id, {
        eventType: 'knowledge_check_completed',
        contentType: 'EXERCISE',
        contentId: testExerciseA.id,
        sectionId: 'KNOWLEDGE_CHECK',
        metadata: {
          score: 95,
        },
      });

      expect(result.mastery.status).toBe('MASTERED');
      expect(result.mastery.knowledgeCheckScore).toBe(95);
      expect(result.mastery.masteredAt).toBeDefined();
      expect(result.mastery.reviewRecommendedAt).toBeNull();
      expect(result.mastery.completionPercent).toBe(100);
    });
  });

  describe('3. Member Learning Summary & Review Queue', () => {
    it('should return unified learning summary with mastered count and continue queue', async () => {
      const summary = await masteryService.getMemberLearningSummary(orgA.id, userA.id);

      expect(summary).toBeDefined();
      expect(summary.totalMastered).toBeGreaterThanOrEqual(1);
      expect(summary.totalHoursLearned).toBeGreaterThan(0);
      expect(Array.isArray(summary.recentlyLearned)).toBe(true);
      expect(summary.recentlyLearned.some((r) => r.contentId === testExerciseA.id)).toBe(true);
    });

    it('should populate review queue when items require review', async () => {
      // Mark an item for review in Org A
      await masteryService.recordLearningEvent(orgA.id, userA.id, {
        eventType: 'knowledge_check_completed',
        contentType: 'EXERCISE',
        contentId: testExerciseA.id,
        metadata: {
          score: 50,
          reason: 'Needs repetition on wrist mobility & elbow elevation.',
        },
      });

      const queue = await masteryService.getReviewQueue(orgA.id, userA.id);
      expect(queue.length).toBeGreaterThanOrEqual(1);
      const item = queue.find((q) => q.contentId === testExerciseA.id);
      expect(item).toBeDefined();
      expect(item?.reviewReason).toContain('wrist mobility');
    });
  });

  describe('4. Content Performance & Drop-off Funnel Analytics', () => {
    it('should calculate actual drop-off funnel and completion rates from real events', async () => {
      const analytics = await masteryService.getContentAnalytics(orgA.id, 'EXERCISE', testExerciseA.id);

      expect(analytics).toBeDefined();
      expect(analytics.contentId).toBe(testExerciseA.id);
      expect(analytics.totalStarts).toBeGreaterThanOrEqual(1);
      expect(analytics.uniqueLearnersCount).toBeGreaterThanOrEqual(1);
      expect(analytics.dropoffFunnel.length).toBe(6);

      const startStage = analytics.dropoffFunnel.find((s) => s.stage === 'Tutorial Started');
      expect(startStage?.percentage).toBe(100.0);

      const introStage = analytics.dropoffFunnel.find((s) => s.stage === 'Introduction & Setup');
      expect(introStage?.count).toBeGreaterThanOrEqual(1);
    });

    it('should aggregate tenant-wide platform learning metrics for admin', async () => {
      const platformStats = await masteryService.getPlatformLearningAnalytics(orgA.id);

      expect(platformStats).toBeDefined();
      expect(platformStats.totalEventsLogged).toBeGreaterThanOrEqual(1);
      expect(platformStats.topLearnedExercises.length).toBeGreaterThanOrEqual(1);
      expect(platformStats.highDropoffStages.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('5. Security, IDOR Protection & Tenant Isolation', () => {
    it('should isolate learning mastery records between distinct tenants', async () => {
      // User B in Org B interacts with testExerciseB
      await masteryService.recordLearningEvent(orgB.id, userB.id, {
        eventType: 'exercise_learning_started',
        contentType: 'EXERCISE',
        contentId: testExerciseB.id,
      });

      // User A querying mastery list in Org A should not see testExerciseB
      const listA = await masteryService.getMemberMasteryList(orgA.id, userA.id, {});
      const hasExerciseB = listA.items.some((i) => i.contentId === testExerciseB.id);
      expect(hasExerciseB).toBe(false);
    });

    it('should reject trainer request for member from a different tenant', async () => {
      // Trainer in Org A tries to access User B (belongs to Org B)
      await expect(
        masteryService.getTrainerMemberMastery(orgA.id, userA.id, userB.id),
      ).rejects.toThrow();
    });
  });
});
