import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { MovementPracticeService } from '../src/exercises/services/movement-practice.service';
import { VisualMovementCoachService } from '../src/exercises/services/visual-movement-coach.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Day 82: Visual Movement Coach — Guided Practice Sessions & Movement Feedback Experience E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let practiceService: MovementPracticeService;
  let coachService: VisualMovementCoachService;

  let orgA: any;
  let orgB: any;
  let userA: any;
  let userB: any;
  let actorMemberA: AuthenticatedUser;
  let actorTrainerA: AuthenticatedUser;
  let actorMemberB: AuthenticatedUser;

  let testExerciseA: any;
  let testPhaseSetup: any;
  let testPhaseExecution: any;
  let testExpectationSetup: any;
  let testExpectationExecution: any;
  let testKnowledgeCheck: any;

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
    practiceService = app.get(MovementPracticeService);
    coachService = app.get(VisualMovementCoachService);

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

    // 1. Create a dedicated test exercise in Org A
    testExerciseA = await prisma.exercise.create({
      data: {
        organisationId: orgA.id,
        ownershipType: 'ORGANISATION',
        name: 'Romanian Deadlift (Guided Practice E2E)',
        slug: `rdl-guided-practice-${Date.now()}`,
        difficulty: 'INTERMEDIATE',
        exerciseType: 'STRENGTH',
        movementPattern: 'HINGE',
        primaryMuscleGroup: 'HAMSTRINGS',
        equipment: 'BARBELL',
        bodyPosition: 'STANDING',
        tempo: '3-0-1-0',
        rangeOfMotion: 'Barbell descends to mid-shin with neutral lumbar spine',
        breathingInstructions: 'Inhale into core brace at top, hold through hinge, exhale locking out',
        status: 'ACTIVE',
        contentStatus: 'PUBLISHED',
      },
    });

    // 2. Add equipment relation
    await prisma.exerciseEquipmentRelation.create({
      data: {
        exerciseId: testExerciseA.id,
        equipmentName: 'Olympic Barbell',
        requirementType: 'REQUIRED',
        equipmentCategory: 'FREE_WEIGHTS',
        isOptional: false,
      },
    });

    // 3. Create movement phases for Exercise A
    testPhaseSetup = await prisma.exerciseMovementPhase.create({
      data: {
        exerciseId: testExerciseA.id,
        phaseName: 'SETUP',
        phaseType: 'SETUP',
        title: 'Hinge Stance & Grip Setup',
        description: 'Stand tall with feet hip-width apart holding barbell against front thighs.',
        orderIndex: 0,
        cueText: 'Shoulders back and down, lats engaged, soft knee bend',
        bodyPosition: 'STANDING',
        status: 'PUBLISHED',
      },
    });

    testPhaseExecution = await prisma.exerciseMovementPhase.create({
      data: {
        exerciseId: testExerciseA.id,
        phaseName: 'DESCENT',
        phaseType: 'ECCENTRIC',
        title: 'Posterior Hip Hinge',
        description: 'Push hips directly back toward the wall behind you while keeping bar touching thighs.',
        orderIndex: 1,
        cueText: 'Hips back, weight in midfoot and heels, spine neutral',
        bodyPosition: 'HINGED',
        tempoSeconds: 3.0,
        status: 'PUBLISHED',
      },
    });

    // 4. Create common mistakes & safety guidelines
    await prisma.exerciseCommonMistake.create({
      data: {
        exerciseId: testExerciseA.id,
        phaseId: testPhaseExecution.id,
        mistake: 'Bar drifting away from thighs',
        consequence: 'Increases shear force on lumbar spine',
        correction: 'Actively engage lats to keep bar glued to legs throughout',
        severity: 'HIGH',
        sortOrder: 0,
      },
    });

    await prisma.exerciseSafetyGuideline.create({
      data: {
        exerciseId: testExerciseA.id,
        category: 'TECHNIQUE_WARNING',
        title: 'Maintain Neutral Lumbar Spine',
        description: 'Stop hinge descent if lower back rounds or hamstrings run out of active tension.',
        severity: 'HIGH',
      },
    });

    // 5. Create movement expectations
    testExpectationSetup = await coachService.createExpectation(
      orgA.id,
      testExerciseA.id,
      {
        title: 'Lat Engagement at Setup',
        description: 'Contract lats to lock shoulder blades down and maintain barbell position.',
        expectationType: 'STABILITY',
        priority: 'ESSENTIAL',
        bodyRegion: 'UPPER_BACK',
        movementPhaseId: testPhaseSetup.id,
        sortOrder: 0,
        status: 'PUBLISHED',
      },
      actorTrainerA,
    );

    testExpectationExecution = await coachService.createExpectation(
      orgA.id,
      testExerciseA.id,
      {
        title: 'Posterior Hip Travel Before Knee Flexion',
        description: 'Initiate movement purely by shifting hips backward, not squatting down.',
        expectationType: 'MOVEMENT_DIRECTION',
        priority: 'ESSENTIAL',
        bodyRegion: 'HIPS',
        movementPhaseId: testPhaseExecution.id,
        sortOrder: 1,
        status: 'PUBLISHED',
      },
      actorTrainerA,
    );

    // 6. Create published Knowledge Check for the exercise
    testKnowledgeCheck = await prisma.knowledgeCheck.create({
      data: {
        exerciseId: testExerciseA.id,
        title: 'Romanian Deadlift Technique Check',
        description: 'Verify your understanding of hip hinge mechanics and bar path.',
        passingScore: 75,
        contentStatus: 'PUBLISHED',
        questions: {
          create: [
            {
              questionText: 'Where should the barbell remain relative to your body during the RDL descent?',
              questionType: 'MULTIPLE_CHOICE',
              explanation: 'Keeping the barbell close minimizes leverage on the lower back.',
              sortOrder: 0,
              answers: {
                create: [
                  { answerText: 'In direct contact with legs / thighs', isCorrect: true, sortOrder: 0 },
                  { answerText: '6 inches away from shins', isCorrect: false, sortOrder: 1 },
                ],
              },
            },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    // Cleanup created test resources
    if (testExerciseA?.id) {
      await prisma.movementPracticeSession.deleteMany({ where: { exerciseId: testExerciseA.id } });
      await prisma.movementExpectation.deleteMany({ where: { exerciseId: testExerciseA.id } });
      await prisma.movementFeedbackRule.deleteMany({ where: { exerciseId: testExerciseA.id } });
      await prisma.exerciseCommonMistake.deleteMany({ where: { exerciseId: testExerciseA.id } });
      await prisma.exerciseSafetyGuideline.deleteMany({ where: { exerciseId: testExerciseA.id } });
      await prisma.exerciseEquipmentRelation.deleteMany({ where: { exerciseId: testExerciseA.id } });
      if (testKnowledgeCheck?.id) {
        await prisma.knowledgeAnswer.deleteMany({ where: { question: { checkId: testKnowledgeCheck.id } } });
        await prisma.knowledgeQuestion.deleteMany({ where: { checkId: testKnowledgeCheck.id } });
        await prisma.knowledgeCheck.deleteMany({ where: { id: testKnowledgeCheck.id } });
      }
      await prisma.exerciseMovementPhase.deleteMany({ where: { exerciseId: testExerciseA.id } });
      await prisma.exercise.delete({ where: { id: testExerciseA.id } });
    }
    await app.close();
  });

  describe('1. Guided Practice Data Retrieval', () => {
    it('retrieves comprehensive guided practice data for the exercise', async () => {
      const data = await practiceService.getGuidedPracticeData(
        orgA.id,
        testExerciseA.id,
        actorMemberA,
      );

      expect(data).toBeDefined();
      expect(data.exercise).toBeDefined();
      expect(data.exercise.id).toBe(testExerciseA.id);
      expect(data.exercise.name).toBe('Romanian Deadlift (Guided Practice E2E)');

      // Check ordered phases
      expect(data.phases.length).toBeGreaterThanOrEqual(2);
      const setupPhase = data.phases.find((p) => p.phaseName === 'SETUP');
      expect(setupPhase).toBeDefined();
      expect(setupPhase?.expectations.length).toBeGreaterThanOrEqual(1);

      // Check equipment
      expect(data.equipmentRequired.length).toBeGreaterThanOrEqual(1);
      expect(data.equipmentRequired[0].name).toBe('Olympic Barbell');

      // Check checklist
      expect(data.techniqueChecklist.length).toBeGreaterThanOrEqual(2);

      // Check stripped knowledge check questions
      expect(data.knowledgeCheck).toBeDefined();
      expect(data.knowledgeCheck?.questions.length).toBe(1);
      const question = data.knowledgeCheck?.questions[0];
      expect(question?.question).toContain('Where should the barbell remain');
      expect(question?.options.length).toBe(2);
      // Ensure answer key (isCorrect) is NOT exposed in stripped questions
      expect((question?.options[0] as any).isCorrect).toBeUndefined();
    });

    it('rejects cross-tenant exercise access for unauthorized member', async () => {
      await expect(
        practiceService.getGuidedPracticeData(orgB.id, testExerciseA.id, actorMemberB),
      ).rejects.toThrow();
    });
  });

  describe('2. Practice Session Lifecycle & State Machine', () => {
    let createdSession: any;

    it('starts or resumes a guided movement practice session at INTRO step', async () => {
      createdSession = await practiceService.startOrResumeSession(
        orgA.id,
        testExerciseA.id,
        {
          exerciseId: testExerciseA.id,
          sessionType: 'GUIDED_PRACTICE',
        },
        actorMemberA,
      );

      expect(createdSession).toBeDefined();
      expect(createdSession.id).toBeDefined();
      expect(createdSession.exerciseId).toBe(testExerciseA.id);
      expect(createdSession.userId).toBe(actorMemberA.id);
      expect(createdSession.status).toBe('IN_PROGRESS');
      expect(createdSession.currentStep).toBe('INTRO');
      expect(createdSession.progressPercent).toBe(0);
    });

    it('updates session preparation steps and advances to PHASE_LEARNING', async () => {
      const updated = await practiceService.updateSession(
        orgA.id,
        createdSession.id,
        {
          currentStep: 'PREPARATION',
          currentPhaseId: testPhaseSetup.id,
          checklistState: { 'environment-cleared': true, 'equipment-ready': true },
        },
        actorMemberA,
      );

      expect(updated.currentStep).toBe('PREPARATION');
      expect(updated.currentPhaseId).toBe(testPhaseSetup.id);
      expect(updated.checklistState['environment-cleared']).toBe(true);
      expect(updated.checklistState['equipment-ready']).toBe(true);
    });

    it('records phase practice repetitions and time', async () => {
      const recorded = await practiceService.recordPhasePractice(
        orgA.id,
        createdSession.id,
        {
          phaseId: testPhaseSetup.id,
          reps: 5,
          durationSeconds: 25,
        },
        actorMemberA,
      );

      expect(recorded.currentStep).toBe('PHASE_PRACTICE');
      expect(recorded.currentPhaseId).toBe(testPhaseSetup.id);
      expect(recorded.phasePracticeData.length).toBe(1);
      expect(recorded.phasePracticeData[0].reps).toBe(5);
      expect(recorded.phasePracticeData[0].durationSeconds).toBe(25);
    });

    it('records phase review and checklist items', async () => {
      const reviewResult = await practiceService.recordPhaseReview(
        orgA.id,
        createdSession.id,
        {
          phaseId: testPhaseSetup.id,
          reviewedItems: ['setup-lats'],
        },
        actorMemberA,
      );

      expect(reviewResult.currentStep).toBe('PHASE_REVIEW');
      expect(reviewResult.completedPhases).toContain(testPhaseSetup.id);
      expect(reviewResult.progressPercent).toBeGreaterThan(0);
    });

    it('records practice and review for execution phase', async () => {
      await practiceService.recordPhasePractice(
        orgA.id,
        createdSession.id,
        {
          phaseId: testPhaseExecution.id,
          reps: 6,
          durationSeconds: 35,
        },
        actorMemberA,
      );

      const reviewResult = await practiceService.recordPhaseReview(
        orgA.id,
        createdSession.id,
        {
          phaseId: testPhaseExecution.id,
          reviewedItems: ['hinge-hips-back'],
        },
        actorMemberA,
      );

      expect(reviewResult.completedPhases).toContain(testPhaseExecution.id);
      expect(reviewResult.completedPhases.length).toBe(2);
      expect(reviewResult.progressPercent).toBe(100);
    });

    it('completes the session, generates educational learning feedback, and updates mastery without touching workout logs', async () => {
      // Record baseline count of physical workouts to ensure strict zero-mutation
      const initialWorkoutCount = await prisma.workout.count();
      const initialWorkoutExerciseCount = await prisma.workoutExercise.count();

      const completed = await practiceService.completeSession(
        orgA.id,
        createdSession.id,
        {
          knowledgeCheckScore: 100,
          selfReflectionTopics: ['Hips pushed back fully', 'Barbell stayed glued to legs'],
        },
        actorMemberA,
      );

      expect(completed.status).toBe('COMPLETED');
      expect(completed.currentStep).toBe('COMPLETED');
      expect(completed.completedAt).toBeDefined();
      expect(completed.progressPercent).toBe(100);
      expect(completed.knowledgeCheckScore).toBe(100);
      expect(completed.selfReflection?.selectedTopics).toContain('Hips pushed back fully');

      // Check that getGuidedPracticeData now returns structured completion feedback
      const guidedDataAfterComplete = await practiceService.getGuidedPracticeData(
        orgA.id,
        testExerciseA.id,
        actorMemberA,
      );
      expect(guidedDataAfterComplete.completionFeedback).toBeDefined();
      expect(guidedDataAfterComplete.completionFeedback?.reviewedPhasesCount).toBe(2);
      expect(guidedDataAfterComplete.completionFeedback?.knowledgeCheckScore).toBe(100);
      expect(guidedDataAfterComplete.completionFeedback?.summaryMessage).toContain('complete');

      // Check ExerciseLearningProgress synchronization
      const progress = await prisma.exerciseLearningProgress.findFirst({
        where: {
          userId: actorMemberA.id,
          exerciseId: testExerciseA.id,
        },
      });
      expect(progress).toBeDefined();
      expect(progress?.status).toBe('COMPLETED');

      // Check LearningMastery synchronization
      const mastery = await prisma.learningMastery.findFirst({
        where: {
          userId: actorMemberA.id,
          contentType: 'EXERCISE',
          contentId: testExerciseA.id,
        },
      });
      expect(mastery).toBeDefined();
      expect(mastery?.completionPercent).toBeGreaterThanOrEqual(20);
      expect(mastery?.status).toBe('PROGRESSING');

      // Verify ZERO mutation of physical workout logging tables
      const finalWorkoutCount = await prisma.workout.count();
      const finalWorkoutExerciseCount = await prisma.workoutExercise.count();
      expect(finalWorkoutCount).toBe(initialWorkoutCount);
      expect(finalWorkoutExerciseCount).toBe(initialWorkoutExerciseCount);
    });

    it('returns null when getting active session after completion', async () => {
      const active = await practiceService.getActiveSession(orgA.id, actorMemberA);
      expect(active).toBeNull();
    });
  });

  describe('3. Multi-Tenant IDOR Security Isolation', () => {
    let sessionUserA: any;

    beforeAll(async () => {
      sessionUserA = await practiceService.startOrResumeSession(
        orgA.id,
        testExerciseA.id,
        {
          exerciseId: testExerciseA.id,
          sessionType: 'GUIDED_PRACTICE',
        },
        actorMemberA,
      );
    });

    it('prevents member B from accessing member A practice session', async () => {
      await expect(
        practiceService.getSession(orgB.id, sessionUserA.id, actorMemberB),
      ).rejects.toThrow();
    });

    it('prevents member B from updating member A practice session', async () => {
      await expect(
        practiceService.updateSession(
          orgB.id,
          sessionUserA.id,
          { currentStep: 'PREPARATION' },
          actorMemberB,
        ),
      ).rejects.toThrow();
    });

    it('prevents member B from recording practice reps on member A practice session', async () => {
      await expect(
        practiceService.recordPhasePractice(
          orgB.id,
          sessionUserA.id,
          { phaseId: testPhaseSetup.id, reps: 3 },
          actorMemberB,
        ),
      ).rejects.toThrow();
    });

    it('prevents member B from completing member A practice session', async () => {
      await expect(
        practiceService.completeSession(
          orgB.id,
          sessionUserA.id,
          { knowledgeCheckScore: 90 },
          actorMemberB,
        ),
      ).rejects.toThrow();
    });
  });
});
