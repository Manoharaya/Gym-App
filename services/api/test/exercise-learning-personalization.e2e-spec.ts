import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ExerciseLearningPersonalizationService } from '../src/exercises/services/exercise-learning-personalization.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Day 78: Exercise Tutorial Personalization & Adaptive Learning E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let personalizationService: ExerciseLearningPersonalizationService;

  let orgA: any;
  let orgB: any;
  let userA: any;
  let userB: any;
  let actorMemberA: AuthenticatedUser;
  let actorMemberB: AuthenticatedUser;

  let testExerciseAdvanced: any;
  let testExerciseBeginner: any;
  let testPhase1: any;
  let testPhase2: any;

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
    personalizationService = app.get(ExerciseLearningPersonalizationService);

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

    // Clean up test preferences
    await prisma.learningPersonalizationProfile.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });

    // Create Advanced Exercise in Org A
    testExerciseAdvanced = await prisma.exercise.create({
      data: {
        organisationId: orgA.id,
        ownershipType: 'ORGANISATION',
        name: 'Barbell Overhead Squat (Personalization Test)',
        slug: `barbell-overhead-squat-test-${Date.now()}`,
        difficulty: 'ADVANCED',
        exerciseType: 'BARBELL',
        movementPattern: 'SQUAT',
        primaryMuscleGroup: 'QUADS',
        equipment: 'BARBELL',
        contentStatus: 'PUBLISHED',
      },
    });

    // Create movement phases for the exercise
    testPhase1 = await prisma.exerciseMovementPhase.create({
      data: {
        exerciseId: testExerciseAdvanced.id,
        phaseName: 'Eccentric Descent',
        phaseType: 'ECCENTRIC',
        orderIndex: 0,
        cueText: 'Keep bar centered over midfoot while descending',
        status: 'PUBLISHED',
      },
    });

    testPhase2 = await prisma.exerciseMovementPhase.create({
      data: {
        exerciseId: testExerciseAdvanced.id,
        phaseName: 'Bottom Turnaround Depth',
        phaseType: 'TURNAROUND',
        orderIndex: 1,
        cueText: 'Preserve shoulder active external rotation in deep squat',
        status: 'PUBLISHED',
      },
    });

    // Create common mistakes
    await prisma.exerciseCommonMistake.create({
      data: {
        exerciseId: testExerciseAdvanced.id,
        mistake: 'Shoulder Internal Collapse',
        correction: 'Drive armpits forward and pull bar apart',
        severity: 'MODERATE',
        sortOrder: 0,
      },
    });

    // Create Beginner Exercise in Org A
    testExerciseBeginner = await prisma.exercise.create({
      data: {
        organisationId: orgA.id,
        ownershipType: 'ORGANISATION',
        name: 'Bodyweight Box Squat (Personalization Test)',
        slug: `bodyweight-box-squat-test-${Date.now()}`,
        difficulty: 'BEGINNER',
        exerciseType: 'BODYWEIGHT',
        movementPattern: 'SQUAT',
        primaryMuscleGroup: 'QUADS',
        equipment: 'BODYWEIGHT',
        contentStatus: 'PUBLISHED',
      },
    });
  });

  afterAll(async () => {
    // Cleanup created records
    await prisma.exerciseLearningProgress.deleteMany({
      where: { exerciseId: { in: [testExerciseAdvanced.id, testExerciseBeginner.id] } },
    });
    await prisma.learningPersonalizationProfile.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
    await prisma.exerciseCommonMistake.deleteMany({
      where: { exerciseId: testExerciseAdvanced.id },
    });
    await prisma.exerciseMovementPhase.deleteMany({
      where: { exerciseId: testExerciseAdvanced.id },
    });
    await prisma.exercise.deleteMany({
      where: { id: { in: [testExerciseAdvanced.id, testExerciseBeginner.id] } },
    });
    await app.close();
  });

  // =========================================================================
  // 1. LEARNING PREFERENCES LIFECYCLE
  // =========================================================================

  describe('1. Learning Preferences Lifecycle', () => {
    it('should return default preferences when no profile is saved', async () => {
      const prefs = await personalizationService.getPreferences(orgA.id, userA.id);

      expect(prefs).toBeDefined();
      expect(prefs.userId).toBe(userA.id);
      expect(prefs.preferredLearningDepth).toBe('STANDARD');
      expect(prefs.preferredTutorialMode).toBe('PERSONALIZED');
      expect(prefs.preferredViewAngle).toBe('SIDE');
      expect(prefs.playbackSpeed).toBe(1.0);
    });

    it('should update and persist member learning preferences', async () => {
      const updated = await personalizationService.updatePreferences(orgA.id, userA.id, {
        preferredLearningDepth: 'DETAILED',
        preferredTutorialMode: 'MOVEMENT_BREAKDOWN',
        preferredViewAngle: 'FRONT',
        playbackSpeed: 1.25,
        practicePreference: 'BOTH',
      });

      expect(updated.preferredLearningDepth).toBe('DETAILED');
      expect(updated.preferredTutorialMode).toBe('MOVEMENT_BREAKDOWN');
      expect(updated.preferredViewAngle).toBe('FRONT');
      expect(updated.playbackSpeed).toBe(1.25);
      expect(updated.practicePreference).toBe('BOTH');

      // Verify persistence
      const persisted = await personalizationService.getPreferences(orgA.id, userA.id);
      expect(persisted.preferredLearningDepth).toBe('DETAILED');
      expect(persisted.preferredTutorialMode).toBe('MOVEMENT_BREAKDOWN');
    });

    it('should reset preferences to default settings', async () => {
      const reset = await personalizationService.resetPreferences(orgA.id, userA.id);

      expect(reset.preferredLearningDepth).toBe('STANDARD');
      expect(reset.preferredTutorialMode).toBe('PERSONALIZED');
      expect(reset.playbackSpeed).toBe(1.0);
    });
  });

  // =========================================================================
  // 2. DETERMINISTIC PERSONALIZATION RULE ENGINE
  // =========================================================================

  describe('2. Deterministic Personalization Rule Engine', () => {
    it('should recommend BASIC depth and STEP_BY_STEP mode for beginner on advanced exercise', async () => {
      // Set user discovery preference as BEGINNER
      await prisma.memberExercisePreference.upsert({
        where: { userId: userA.id },
        create: {
          userId: userA.id,
          organisationId: orgA.id,
          preferredDifficulty: 'BEGINNER',
        },
        update: {
          preferredDifficulty: 'BEGINNER',
        },
      });

      // Clear any prior progress on advanced exercise
      await prisma.exerciseLearningProgress.deleteMany({
        where: { userId: userA.id, exerciseId: testExerciseAdvanced.id },
      });

      const plan = await personalizationService.buildPersonalizedTutorialPlan(
        orgA.id,
        testExerciseAdvanced.id,
        userA.id,
        actorMemberA,
      );

      expect(plan).toBeDefined();
      expect(plan.learningDepth).toBe('BASIC');
      expect(plan.recommendedMode).toBe('STEP_BY_STEP');
      expect(plan.playbackSpeed).toBe(0.75); // Educational pacing for beginner on advanced movement
      expect(plan.instructionDepth).toBe('ESSENTIAL');
      expect(plan.orderedSections).toContain('STARTING_POSITION');
      expect(plan.orderedSections).toContain('BREATHING');
      expect(plan.personalizationReason).toContain('Basic depth to build foundational movement awareness');
    });

    it('should recommend ADVANCED depth and checklist mode for user who mastered tutorial', async () => {
      // Create completed learning progress with 90% score
      await prisma.exerciseLearningProgress.upsert({
        where: { userId_exerciseId: { userId: userA.id, exerciseId: testExerciseAdvanced.id } },
        create: {
          userId: userA.id,
          exerciseId: testExerciseAdvanced.id,
          organisationId: orgA.id,
          status: 'COMPLETED',
          completedSteps: 5,
          totalSteps: 5,
          completedAt: new Date(),
          tutorialProgress: {
            knowledgeCheckCompleted: true,
            knowledgeCheckScore: 90,
            practiceCompleted: true,
          },
        },
        update: {
          status: 'COMPLETED',
          completedAt: new Date(),
          tutorialProgress: {
            knowledgeCheckCompleted: true,
            knowledgeCheckScore: 90,
            practiceCompleted: true,
          },
        },
      });

      const plan = await personalizationService.buildPersonalizedTutorialPlan(
        orgA.id,
        testExerciseAdvanced.id,
        userA.id,
        actorMemberA,
      );

      expect(plan.learningDepth).toBe('ADVANCED');
      expect(plan.recommendedMode).toBe('TECHNIQUE_CHECKLIST');
      expect(plan.instructionDepth).toBe('ADVANCED_BIOMECHANICAL');
      expect(plan.orderedSections[0]).toBe('MULTI_ANGLE');
      expect(plan.orderedSections).toContain('TECHNIQUE_COMPARISON');
      expect(plan.orderedSections).toContain('PROGRESSIONS');
      expect(plan.personalizationReason).toContain('90% knowledge check mastery');
    });

    it('should recommend DETAILED depth and targeted review for learner with < 70% knowledge check', async () => {
      // Update learning progress with 60% score
      await prisma.exerciseLearningProgress.update({
        where: { userId_exerciseId: { userId: userA.id, exerciseId: testExerciseAdvanced.id } },
        data: {
          status: 'COMPLETED',
          tutorialProgress: {
            knowledgeCheckCompleted: true,
            knowledgeCheckScore: 60,
            practiceCompleted: true,
          },
        },
      });

      const plan = await personalizationService.buildPersonalizedTutorialPlan(
        orgA.id,
        testExerciseAdvanced.id,
        userA.id,
        actorMemberA,
      );

      expect(plan.learningDepth).toBe('DETAILED');
      expect(plan.recommendedMode).toBe('MOVEMENT_BREAKDOWN');
      expect(plan.targetedReviewRecommended).toBe(true);
      expect(plan.recommendedReviewPhases.length).toBeGreaterThan(0);
      expect(plan.personalizationReason).toContain('Detailed review mode');
    });

    it('should honor explicit user preference override over dynamic recommendation', async () => {
      // User explicitly sets ADVANCED depth
      await personalizationService.updatePreferences(orgA.id, userA.id, {
        preferredLearningDepth: 'ADVANCED',
        preferredTutorialMode: 'QUICK_LEARN',
      });

      const plan = await personalizationService.buildPersonalizedTutorialPlan(
        orgA.id,
        testExerciseBeginner.id,
        userA.id,
        actorMemberA,
      );

      expect(plan.learningDepth).toBe('ADVANCED');
      expect(plan.recommendedMode).toBe('QUICK_LEARN');
      expect(plan.personalizationReason).toContain('explicitly chosen ADVANCED learning depth');

      // Reset for subsequent tests
      await personalizationService.resetPreferences(orgA.id, userA.id);
    });
  });

  // =========================================================================
  // 3. TARGETED REVIEW & RECOMMENDATIONS
  // =========================================================================

  describe('3. Targeted Review & Recommendations', () => {
    it('should return targeted review checkpoints with phases and mistake cues', async () => {
      const review = await personalizationService.getTargetedReview(
        orgA.id,
        testExerciseAdvanced.id,
        userA.id,
      );

      expect(review).toBeDefined();
      expect(review.exerciseId).toBe(testExerciseAdvanced.id);
      expect(review.suggestedPhases.length).toBe(2);
      expect(review.commonMistakesToAvoid.length).toBe(1);
      expect(review.commonMistakesToAvoid[0].name).toBe('Shoulder Internal Collapse');
      expect(review.reviewPrompt).toContain('Targeted Review Mode');
    });

    it('should return learning recommendations categorized by continue, review, and mastered', async () => {
      const recs = await personalizationService.getRecommendations(orgA.id, userA.id);

      expect(recs).toBeDefined();
      expect(Array.isArray(recs.continueLearning)).toBe(true);
      expect(Array.isArray(recs.reviewRecommended)).toBe(true);
      expect(Array.isArray(recs.recentlyMastered)).toBe(true);

      // User has 60% on testExerciseAdvanced -> should be in reviewRecommended
      const needsReview = recs.reviewRecommended.find(
        (r) => r.exerciseId === testExerciseAdvanced.id,
      );
      expect(needsReview).toBeDefined();
      expect(needsReview?.lastScore).toBe(60);
    });
  });

  // =========================================================================
  // 4. FULL PERSONALIZED TUTORIAL PAYLOAD
  // =========================================================================

  describe('4. Full Personalized Tutorial Payload Integration', () => {
    it('should assemble tutorial data, personalized plan, and learning context together', async () => {
      const result = await personalizationService.getPersonalizedTutorial(
        orgA.id,
        testExerciseAdvanced.id,
        actorMemberA,
      );

      expect(result).toBeDefined();
      expect(result.tutorial).toBeDefined();
      expect(result.tutorial.exercise.id).toBe(testExerciseAdvanced.id);
      expect(result.plan).toBeDefined();
      expect(result.learningContext).toBeDefined();
      expect(result.learningContext.hasCompletedTutorial).toBe(true);
      expect(result.learningContext.knowledgeCheckScore).toBe(60);
    });
  });
});
