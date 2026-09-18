import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { MovementLearningIntelligenceService } from '../src/exercises/services/movement-learning-intelligence.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';
import {
  LEARNING_GAP_TYPES,
  LEARNING_GAP_PRIORITIES,
} from '../src/exercises/dto/movement-learning-intelligence.dto';

describe('Day 83: Movement Learning Intelligence, Adaptive Practice & Gap Detection E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let intelligenceService: MovementLearningIntelligenceService;

  let orgA: any;
  let orgB: any;
  let userA: any;
  let userB: any;
  let actorMemberA: AuthenticatedUser;
  let actorTrainerA: AuthenticatedUser;
  let actorMemberB: AuthenticatedUser;

  let baseExercise: any;
  let advancedExercise: any;
  let basePhaseSetup: any;
  let basePhaseDescent: any;
  let basePhaseBottom: any;
  let advancedPhaseSetup: any;
  let testKnowledgeCheck: any;

  let initialWorkoutCount: number;
  let initialWorkoutExerciseCount: number;

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
    intelligenceService = app.get(MovementLearningIntelligenceService);

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

    actorTrainerA = {
      id: userA.id,
      email: userA.email,
      roles: [{ role: 'TRAINER', organisationId: orgA.id }],
    } as any;

    actorMemberB = {
      id: userB.id,
      email: userB.email,
      roles: [{ role: 'MEMBER', organisationId: orgB.id }],
    } as any;

    // Snapshot workout table counts to ensure Day 83 never mutates physical workout tables
    initialWorkoutCount = await prisma.workout.count();
    initialWorkoutExerciseCount = await prisma.workoutExercise.count();

    // 1. Create Base Exercise: Bodyweight Squat (Fundamentals)
    baseExercise = await prisma.exercise.create({
      data: {
        organisationId: orgA.id,
        ownershipType: 'ORGANISATION',
        name: 'Bodyweight Squat (Fundamentals Day 83)',
        slug: `bw-squat-day83-${Date.now()}`,
        difficulty: 'BEGINNER',
        exerciseType: 'STRENGTH',
        movementPattern: 'SQUAT',
        primaryMuscleGroup: 'QUADRICEPS',
        equipment: 'BODYWEIGHT',
        bodyPosition: 'STANDING',
        tempo: '2-0-1-0',
        rangeOfMotion: 'Thighs parallel to floor',
        breathingInstructions: 'Inhale descending, exhale ascending',
        setupInstructions: 'Feet shoulder-width apart, chest tall, core braced.',
        status: 'ACTIVE',
        contentStatus: 'PUBLISHED',
      },
    });

    // 2. Create Movement Phases for Base Exercise
    basePhaseSetup = await prisma.exerciseMovementPhase.create({
      data: {
        exerciseId: baseExercise.id,
        phaseName: 'SETUP',
        phaseType: 'SETUP',
        title: 'Squat Stance Setup',
        description: 'Stand tall with balanced weight across whole foot.',
        orderIndex: 0,
        cueText: 'Shoulders back, core braced, feet slightly turned out',
        status: 'PUBLISHED',
      },
    });

    basePhaseDescent = await prisma.exerciseMovementPhase.create({
      data: {
        exerciseId: baseExercise.id,
        phaseName: 'DESCENT',
        phaseType: 'ECCENTRIC',
        title: 'Eccentric Lowering',
        description: 'Hips and knees bend simultaneously.',
        orderIndex: 1,
        cueText: 'Knees track in line with toes, torso upright',
        status: 'PUBLISHED',
      },
    });

    basePhaseBottom = await prisma.exerciseMovementPhase.create({
      data: {
        exerciseId: baseExercise.id,
        phaseName: 'BOTTOM',
        phaseType: 'ISOMETRIC_HOLD',
        title: 'Bottom Position',
        description: 'Depth achieved with neutral spine.',
        orderIndex: 2,
        cueText: 'Maintain hip crease below knee without lumbar flexion',
        status: 'PUBLISHED',
      },
    });

    // Add expectation & mistake to bottom phase for Quick Refresh test
    await prisma.movementExpectation.create({
      data: {
        exerciseId: baseExercise.id,
        movementPhaseId: basePhaseBottom.id,
        title: 'Parallel Depth & Neutral Spine',
        description: 'Hips descend parallel without butt wink or knee cave.',
        expectationType: 'RANGE_OF_MOTION',
        priority: 'ESSENTIAL',
        expectedBreathing: 'Inhale held until bottom transition',
        expectedTempo: '2-0-1-0',
        status: 'PUBLISHED',
      },
    });

    await prisma.exerciseCommonMistake.create({
      data: {
        exerciseId: baseExercise.id,
        phaseId: basePhaseBottom.id,
        mistake: 'Knee valgus collapse inward at bottom',
        consequence: 'Reduces hip drive leverage',
        correction: 'Drive knees actively outward over mid-foot',
      },
    });

    // 3. Create Advanced Exercise: Barbell Back Squat (Progression from Base)
    advancedExercise = await prisma.exercise.create({
      data: {
        organisationId: orgA.id,
        ownershipType: 'ORGANISATION',
        name: 'Barbell Back Squat (Advanced Day 83)',
        slug: `bb-back-squat-day83-${Date.now()}`,
        difficulty: 'ADVANCED',
        exerciseType: 'STRENGTH',
        movementPattern: 'SQUAT',
        primaryMuscleGroup: 'QUADRICEPS',
        equipment: 'BARBELL',
        bodyPosition: 'STANDING',
        tempo: '3-1-1-0',
        status: 'ACTIVE',
        contentStatus: 'PUBLISHED',
      },
    });

    advancedPhaseSetup = await prisma.exerciseMovementPhase.create({
      data: {
        exerciseId: advancedExercise.id,
        phaseName: 'BARBELL_SETUP',
        phaseType: 'SETUP',
        title: 'Barbell Rack & Unrack',
        orderIndex: 0,
        status: 'PUBLISHED',
      },
    });

    // 4. Link Progression Relationship: Base Exercise -> Advanced Exercise
    await prisma.exerciseVariation.create({
      data: {
        baseExerciseId: baseExercise.id,
        targetExerciseId: advancedExercise.id,
        relationshipType: 'PROGRESSION',
        notes: 'Master bodyweight squat fundamentals before loading with barbell.',
      },
    });

    // 5. Create Knowledge Check for Base Exercise
    testKnowledgeCheck = await prisma.knowledgeCheck.create({
      data: {
        tenantId: orgA.id,
        exerciseId: baseExercise.id,
        title: 'Squat Fundamentals Knowledge Check',
        contentStatus: 'PUBLISHED',
      },
    });
  });

  afterAll(async () => {
    // Clean up created entities
    try {
      await prisma.learningGap.deleteMany({
        where: {
          OR: [
            { exerciseId: baseExercise.id },
            { exerciseId: advancedExercise.id },
            { userId: userA.id },
          ],
        },
      });
      await prisma.movementPracticeSession.deleteMany({
        where: {
          OR: [
            { exerciseId: baseExercise.id },
            { exerciseId: advancedExercise.id },
          ],
        },
      });
      await prisma.knowledgeAttempt.deleteMany({
        where: { checkId: testKnowledgeCheck.id },
      });
      await prisma.exerciseLearningProgress.deleteMany({
        where: {
          OR: [
            { exerciseId: baseExercise.id },
            { exerciseId: advancedExercise.id },
          ],
        },
      });
      await prisma.learningMastery.deleteMany({
        where: {
          OR: [
            { contentId: baseExercise.id },
            { contentId: advancedExercise.id },
          ],
        },
      });
      await prisma.exerciseVariation.deleteMany({
        where: { baseExerciseId: baseExercise.id },
      });
      await prisma.exerciseCommonMistake.deleteMany({
        where: { exerciseId: baseExercise.id },
      });
      await prisma.movementExpectation.deleteMany({
        where: { exerciseId: baseExercise.id },
      });
      await prisma.knowledgeCheck.deleteMany({
        where: { id: testKnowledgeCheck.id },
      });
      await prisma.exerciseMovementPhase.deleteMany({
        where: {
          OR: [
            { exerciseId: baseExercise.id },
            { exerciseId: advancedExercise.id },
          ],
        },
      });
      await prisma.exercise.deleteMany({
        where: {
          id: { in: [baseExercise.id, advancedExercise.id] },
        },
      });
    } catch (e) {
      // Ignored in cleanup
    }

    await app.close();
  });

  // =========================================================================
  // TEST SUITE 1: DETERMINISTIC GAP DETECTION & PRIORITIZATION
  // =========================================================================

  describe('1. Deterministic Gap Detection Engine', () => {
    it('detects INCOMPLETE gap when tutorial is in-progress', async () => {
      // Create in-progress tutorial record for user A
      await prisma.exerciseLearningProgress.upsert({
        where: {
          userId_exerciseId: {
            userId: userA.id,
            exerciseId: baseExercise.id,
          },
        },
        create: {
          userId: userA.id,
          exerciseId: baseExercise.id,
          status: 'IN_PROGRESS',
          completedSteps: 1,
          totalSteps: 3,
        },
        update: {
          status: 'IN_PROGRESS',
          completedSteps: 1,
          totalSteps: 3,
        },
      });

      const gaps = await intelligenceService.detectMemberGaps(orgA.id, userA.id, baseExercise.id);
      const incompleteGap = gaps.find((g) => g.gapType === LEARNING_GAP_TYPES.INCOMPLETE);

      expect(incompleteGap).toBeDefined();
      expect(incompleteGap?.priority).toBe(LEARNING_GAP_PRIORITIES.MEDIUM);
      expect(incompleteGap?.reason).toContain('Continue this exercise tutorial');
      expect(incompleteGap?.status).toBe('OPEN');
    });

    it('detects UNREVIEWED_PHASE gap for movement phases not yet completed', async () => {
      const gaps = await intelligenceService.getMemberGaps(orgA.id, userA.id, {
        exerciseId: baseExercise.id,
        gapType: LEARNING_GAP_TYPES.UNREVIEWED_PHASE,
      });

      expect(gaps.length).toBeGreaterThanOrEqual(1);
      const bottomGap = gaps.find((g) => g.movementPhaseId === basePhaseBottom.id);
      expect(bottomGap).toBeDefined();
      expect(bottomGap?.priority).toBe(LEARNING_GAP_PRIORITIES.MEDIUM);
      expect(bottomGap?.reason).toContain('because this movement phase has not been completed');
    });

    it('detects LOW_KNOWLEDGE_CHECK_RESULT gap when quiz score is below 75%', async () => {
      // Record a low knowledge attempt (50%)
      await prisma.knowledgeAttempt.create({
        data: {
          userId: userA.id,
          tenantId: orgA.id,
          checkId: testKnowledgeCheck.id,
          score: 50.0,
          status: 'COMPLETED',
        },
      });

      const gaps = await intelligenceService.detectMemberGaps(orgA.id, userA.id, baseExercise.id);
      const quizGap = gaps.find(
        (g) => g.gapType === LEARNING_GAP_TYPES.LOW_KNOWLEDGE_CHECK_RESULT,
      );

      expect(quizGap).toBeDefined();
      expect(quizGap?.priority).toBe(LEARNING_GAP_PRIORITIES.MEDIUM);
      expect(quizGap?.reason).toContain('last knowledge check score (50%) requires another review');
      expect(quizGap?.contextData?.score).toBe(50);
    });

    it('detects MISSED_PREREQUISITE gap with HIGH priority for advanced progression when base is incomplete', async () => {
      // User interacts with advanced exercise while base exercise is incomplete
      await prisma.exerciseLearningProgress.upsert({
        where: {
          userId_exerciseId: {
            userId: userA.id,
            exerciseId: advancedExercise.id,
          },
        },
        create: {
          userId: userA.id,
          exerciseId: advancedExercise.id,
          status: 'IN_PROGRESS',
          completedSteps: 1,
          totalSteps: 2,
        },
        update: {
          status: 'IN_PROGRESS',
          completedSteps: 1,
          totalSteps: 2,
        },
      });

      const gaps = await intelligenceService.detectMemberGaps(
        orgA.id,
        userA.id,
        advancedExercise.id,
      );
      const prereqGap = gaps.find((g) => g.gapType === LEARNING_GAP_TYPES.MISSED_PREREQUISITE);

      expect(prereqGap).toBeDefined();
      expect(prereqGap?.priority).toBe(LEARNING_GAP_PRIORITIES.HIGH);
      expect(prereqGap?.reason).toContain('movement fundamentals before progressing');
      expect(prereqGap?.contextData?.prerequisiteName).toBe(baseExercise.name);
    });

    it('returns gaps deterministically sorted by priority (HIGH -> MEDIUM -> LOW)', async () => {
      const allGaps = await intelligenceService.getMemberGaps(orgA.id, userA.id);

      const highIndex = allGaps.findIndex((g) => g.priority === 'HIGH');
      const mediumIndex = allGaps.findIndex((g) => g.priority === 'MEDIUM');

      if (highIndex !== -1 && mediumIndex !== -1) {
        expect(highIndex).toBeLessThan(mediumIndex);
      }
    });
  });

  // =========================================================================
  // TEST SUITE 2: GAP RESOLUTION FLOW
  // =========================================================================

  describe('2. Learning Gap Resolution Flow', () => {
    it('allows member to explicitly resolve an active gap', async () => {
      const openGaps = await intelligenceService.getMemberGaps(orgA.id, userA.id, {
        status: 'OPEN',
      });
      expect(openGaps.length).toBeGreaterThan(0);

      const targetGap = openGaps[0];
      const resolved = await intelligenceService.resolveGap(
        orgA.id,
        targetGap.id,
        {
          status: 'RESOLVED',
          resolutionReason: 'User completed targeted technique review',
        },
        actorMemberA,
      );

      expect(resolved.status).toBe('RESOLVED');
      expect(resolved.resolvedAt).toBeDefined();
    });

    it('auto-resolves gaps when prerequisite condition is satisfied', async () => {
      // Mark base exercise as completed
      await prisma.exerciseLearningProgress.update({
        where: {
          userId_exerciseId: {
            userId: userA.id,
            exerciseId: baseExercise.id,
          },
        },
        data: {
          status: 'COMPLETED',
          completedSteps: 3,
          totalSteps: 3,
          completedAt: new Date(),
        },
      });

      // Re-detect gaps for advanced exercise
      const updatedGaps = await intelligenceService.detectMemberGaps(
        orgA.id,
        userA.id,
        advancedExercise.id,
      );

      const prereqGap = updatedGaps.find(
        (g) => g.gapType === LEARNING_GAP_TYPES.MISSED_PREREQUISITE,
      );
      expect(prereqGap).toBeUndefined(); // Should be auto-resolved
    });
  });

  // =========================================================================
  // TEST SUITE 3: CONSOLIDATED DASHBOARD & READ MODEL
  // =========================================================================

  describe('3. Consolidated Movement Learning Dashboard', () => {
    it('returns aggregated read model with all 6 required sections', async () => {
      const dashboard = await intelligenceService.getMovementLearningDashboard(orgA.id, userA.id);

      expect(dashboard).toBeDefined();
      expect(Array.isArray(dashboard.continueLearning)).toBe(true);
      expect(Array.isArray(dashboard.needsReview)).toBe(true);
      expect(Array.isArray(dashboard.recommendedPractice)).toBe(true);
      expect(Array.isArray(dashboard.quickRefresh)).toBe(true);
      expect(Array.isArray(dashboard.recentlyLearned)).toBe(true);
      expect(dashboard.learningSummary).toBeDefined();
      expect(dashboard.learningSummary.totalExercisesLearned).toBeGreaterThanOrEqual(1);
    });

    it('provides transparent, non-diagnostic reasons on all recommended practice items', async () => {
      const dashboard = await intelligenceService.getMovementLearningDashboard(orgA.id, userA.id);

      dashboard.recommendedPractice.forEach((rec) => {
        expect(rec.reason).toBeDefined();
        // Never claim physical dysfunction or medical weakness
        expect(rec.reason.toLowerCase()).not.toContain('bad form');
        expect(rec.reason.toLowerCase()).not.toContain('weak');
        expect(rec.reason.toLowerCase()).not.toContain('unsafe');
      });
    });
  });

  // =========================================================================
  // TEST SUITE 4: ADAPTIVE TARGETED PRACTICE SESSION CREATION
  // =========================================================================

  describe('4. Adaptive Targeted Practice Session Creation', () => {
    it('creates a targeted rehearsal session focusing specifically on unreviewed phases', async () => {
      const result = await intelligenceService.createTargetedPracticeSession(
        orgA.id,
        userA.id,
        {
          exerciseId: baseExercise.id,
          focusPhaseIds: [basePhaseBottom.id],
          focusConcepts: ['SETUP', 'DEPTH', 'BREATHING'],
          includeKnowledgeCheck: true,
          sessionType: 'TARGETED_REVIEW',
        },
        actorMemberA,
      );

      expect(result.session).toBeDefined();
      expect(result.session.sessionType).toBe('TARGETED_REVIEW');
      expect(result.session.status).toBe('IN_PROGRESS');
      expect(result.targetedPhases.length).toBe(1);
      expect(result.targetedPhases[0].id).toBe(basePhaseBottom.id);
      expect(result.suggestedSequence).toContain('Review Setup & Posture');
      expect(result.suggestedSequence).toContain('Knowledge Check');
    });
  });

  // =========================================================================
  // TEST SUITE 5: QUICK REFRESH MODE (30–60s)
  // =========================================================================

  describe('5. Quick Refresh Mode', () => {
    it('returns compressed 30–60s technique refresher payload with cues and cadence', async () => {
      const refresh = await intelligenceService.getQuickRefresh(orgA.id, baseExercise.id);

      expect(refresh).toBeDefined();
      expect(refresh.exerciseId).toBe(baseExercise.id);
      expect(refresh.estimatedDurationSeconds).toBeLessThanOrEqual(60);
      expect(refresh.setup.keyNotes.length).toBeGreaterThan(0);
      expect(refresh.movementPhases.length).toBe(3);

      const bottomPhase = refresh.movementPhases.find((p) => p.id === basePhaseBottom.id);
      expect(bottomPhase?.focusCue).toBeDefined();
      expect(bottomPhase?.tempo).toBe('2-0-1-0');
      expect(bottomPhase?.keyMistakeToAvoid).toContain('valgus collapse');
      expect(refresh.cadenceSummary.breathingPattern).toBeDefined();
      expect(refresh.refresherChecklist.length).toBeGreaterThanOrEqual(3);
    });
  });

  // =========================================================================
  // TEST SUITE 6: EXERCISE-SPECIFIC LEARNING INTELLIGENCE
  // =========================================================================

  describe('6. Exercise-Specific Learning Intelligence', () => {
    it('returns exercise-level gap detection, phase checklist status, and recommended next action', async () => {
      const intel = await intelligenceService.getExerciseLearningIntelligence(
        orgA.id,
        baseExercise.id,
        userA.id,
      );

      expect(intel.exerciseId).toBe(baseExercise.id);
      expect(intel.phaseProgress.length).toBe(3);
      expect(intel.variations.progressions.length).toBeGreaterThanOrEqual(1);
      expect(intel.quickRefreshAvailable).toBe(true);
      expect(intel.recommendedNextAction).toBeDefined();
      expect(intel.recommendedNextAction.actionType).toBeDefined();
    });
  });

  // =========================================================================
  // TEST SUITE 7: TRAINER & ADMIN INSIGHTS (EDUCATIONAL ONLY)
  // =========================================================================

  describe('7. Trainer & Admin Learning Insights', () => {
    it('allows authorized trainer to inspect client educational learning progress', async () => {
      const trainerInsights = await intelligenceService.getTrainerMemberLearningInsights(
        orgA.id,
        userA.id,
        actorTrainerA,
      );

      expect(trainerInsights).toBeDefined();
      expect(trainerInsights.memberId).toBe(userA.id);
      expect(trainerInsights.totalExercisesLearned).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(trainerInsights.topReviewNeeds)).toBe(true);
    });

    it('rejects regular members from accessing another member trainer insights', async () => {
      await expect(
        intelligenceService.getTrainerMemberLearningInsights(
          orgA.id,
          userA.id,
          actorMemberB,
        ),
      ).rejects.toThrow();
    });

    it('provides admin aggregate learning quality and content drop-off metrics', async () => {
      const adminAnalytics = await intelligenceService.getAdminLearningQualityInsights(
        orgA.id,
        actorTrainerA,
      );

      expect(adminAnalytics).toBeDefined();
      expect(adminAnalytics.totalExercisesWithPhases).toBeGreaterThanOrEqual(1);
      expect(adminAnalytics.totalLearningGapsDetected).toBeGreaterThanOrEqual(1);
      expect(adminAnalytics.gapsByType).toBeDefined();
    });
  });

  // =========================================================================
  // TEST SUITE 8: SECURITY, TENANT ISOLATION & PHYSICAL WORKOUT ISOLATION
  // =========================================================================

  describe('8. Security, Tenant Isolation & Physical Workout Isolation', () => {
    it('prevents member B from modifying member A learning gap (IDOR protection)', async () => {
      const userAGaps = await intelligenceService.getMemberGaps(orgA.id, userA.id);
      if (userAGaps.length > 0) {
        await expect(
          intelligenceService.resolveGap(
            orgA.id,
            userAGaps[0].id,
            { status: 'RESOLVED' },
            actorMemberB,
          ),
        ).rejects.toThrow();
      }
    });

    it('strictly isolates movement learning intelligence from physical workout tables', async () => {
      const currentWorkoutCount = await prisma.workout.count();
      const currentWorkoutExerciseCount = await prisma.workoutExercise.count();

      expect(currentWorkoutCount).toBe(initialWorkoutCount);
      expect(currentWorkoutExerciseCount).toBe(initialWorkoutExerciseCount);
    });
  });
});
