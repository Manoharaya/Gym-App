import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { VisualMovementCoachService } from '../src/exercises/services/visual-movement-coach.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Day 81: Visual Movement Coach Foundation & Structured Movement Feedback E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
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
  let testPhaseDescent: any;
  let testExpectation: any;
  let testFeedbackRule: any;

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

    // Create a dedicated test exercise in Org A
    testExerciseA = await prisma.exercise.create({
      data: {
        organisationId: orgA.id,
        ownershipType: 'ORGANISATION',
        name: 'Goblet Squat (Movement Coach E2E)',
        slug: `goblet-squat-coach-${Date.now()}`,
        difficulty: 'BEGINNER',
        exerciseType: 'STRENGTH',
        movementPattern: 'SQUAT',
        primaryMuscleGroup: 'QUADRICEPS',
        equipment: 'KETTLEBELL',
        bodyPosition: 'STANDING',
        tempo: '3-1-1-0',
        rangeOfMotion: 'Hip crease below top of knee',
        breathingInstructions: 'Inhale on descent, exhale on ascent',
        status: 'ACTIVE',
        contentStatus: 'PUBLISHED',
      },
    });

    // Create movement phases for exercise A
    testPhaseSetup = await prisma.exerciseMovementPhase.create({
      data: {
        exerciseId: testExerciseA.id,
        phaseName: 'SETUP',
        phaseType: 'SETUP',
        title: 'Starting Setup & Kettlebell Hold',
        description: 'Stand tall with feet shoulder-width apart holding the kettlebell horns at chest level.',
        orderIndex: 0,
        cueText: 'Tall posture, ribs down, horns secured',
        bodyPosition: 'STANDING',
        status: 'PUBLISHED',
      },
    });

    testPhaseDescent = await prisma.exerciseMovementPhase.create({
      data: {
        exerciseId: testExerciseA.id,
        phaseName: 'DESCENT',
        phaseType: 'ECCENTRIC',
        title: 'Controlled Hip & Knee Flexion',
        description: 'Descend smoothly between knees while maintaining vertical torso angle.',
        orderIndex: 1,
        cueText: 'Knees track over second toe, hips sink between heels',
        bodyPosition: 'SQUATTING',
        tempoSeconds: 3.0,
        status: 'PUBLISHED',
      },
    });

    // Create common mistake and safety guideline
    await prisma.exerciseCommonMistake.create({
      data: {
        exerciseId: testExerciseA.id,
        phaseId: testPhaseDescent.id,
        mistake: 'Knees caving inward (valgus collapse)',
        consequence: 'Increases medial knee stress and reduces glute activation',
        correction: 'Actively push the floor apart and track knees outward in line with middle toes',
        severity: 'MODERATE',
        sortOrder: 0,
      },
    });

    await prisma.exerciseSafetyGuideline.create({
      data: {
        exerciseId: testExerciseA.id,
        category: 'TECHNIQUE_WARNING',
        title: 'Avoid Torso Collapse',
        description: 'Do not allow the kettlebell weight to pull the chest forward into excessive flexion.',
        severity: 'STANDARD',
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testExerciseA?.id) {
      await prisma.movementFeedbackRule.deleteMany({ where: { exerciseId: testExerciseA.id } });
      await prisma.movementExpectation.deleteMany({ where: { exerciseId: testExerciseA.id } });
      await prisma.exerciseCommonMistake.deleteMany({ where: { exerciseId: testExerciseA.id } });
      await prisma.exerciseSafetyGuideline.deleteMany({ where: { exerciseId: testExerciseA.id } });
      await prisma.exerciseMovementPhase.deleteMany({ where: { exerciseId: testExerciseA.id } });
      await prisma.exercise.delete({ where: { id: testExerciseA.id } });
    }
    await app.close();
  });

  describe('1. Movement Expectation Authoring & Management', () => {
    it('allows a trainer to create an ESSENTIAL movement expectation', async () => {
      testExpectation = await coachService.createExpectation(
        orgA.id,
        testExerciseA.id,
        {
          title: 'Neutral Spine Under Load',
          description: 'Keep thoracic and lumbar spine in neutral alignment throughout the descent.',
          expectationType: 'SPINE_POSITION',
          priority: 'ESSENTIAL',
          bodyRegion: 'SPINE',
          movementPhaseId: testPhaseDescent.id,
          expectedAlignment: 'Vertical torso angle within 15 degrees of tibia angle',
          sortOrder: 1,
          status: 'PUBLISHED',
        },
        actorTrainerA,
      );

      expect(testExpectation).toBeDefined();
      expect(testExpectation.id).toBeDefined();
      expect(testExpectation.priority).toBe('ESSENTIAL');
      expect(testExpectation.bodyRegion).toBe('SPINE');
      expect(testExpectation.movementPhaseId).toBe(testPhaseDescent.id);
    });

    it('allows creating an IMPORTANT movement expectation', async () => {
      const breathingExp = await coachService.createExpectation(
        orgA.id,
        testExerciseA.id,
        {
          title: 'Descent Inhale Brace',
          description: 'Inhale into the abdominal cylinder prior to initiating descent.',
          expectationType: 'BREATHING',
          priority: 'IMPORTANT',
          bodyRegion: 'CORE',
          movementPhaseId: testPhaseSetup.id,
          expectedBreathing: 'Inhale 360-degree expansion',
          sortOrder: 2,
          status: 'PUBLISHED',
        },
        actorTrainerA,
      );

      expect(breathingExp.priority).toBe('IMPORTANT');
      expect(breathingExp.expectationType).toBe('BREATHING');
    });

    it('rejects expectation creation if movementPhaseId does not belong to exercise', async () => {
      await expect(
        coachService.createExpectation(
          orgA.id,
          testExerciseA.id,
          {
            title: 'Invalid Phase Test',
            description: 'This should fail',
            movementPhaseId: 'invalid-phase-id-999',
          },
          actorTrainerA,
        ),
      ).rejects.toThrow();
    });

    it('allows updating an existing expectation', async () => {
      const updated = await coachService.updateExpectation(
        orgA.id,
        testExpectation.id,
        {
          expectedRangeOfMotion: 'Full parallel squat depth',
        },
        actorTrainerA,
      );

      expect(updated.expectedRangeOfMotion).toBe('Full parallel squat depth');
    });

    it('lists expectations for the exercise', async () => {
      const expectations = await coachService.getExpectations(
        orgA.id,
        testExerciseA.id,
        undefined,
        actorMemberA,
      );

      expect(expectations.length).toBeGreaterThanOrEqual(2);
      expect(expectations.some((e) => e.title === 'Neutral Spine Under Load')).toBe(true);
    });
  });

  describe('2. Movement Feedback Rules Foundation', () => {
    it('allows trainer to author a movement feedback rule for future pose deviation comparison', async () => {
      testFeedbackRule = await coachService.createFeedbackRule(
        orgA.id,
        testExerciseA.id,
        {
          movementPhaseId: testPhaseDescent.id,
          expectationId: testExpectation.id,
          conditionType: 'ALIGNMENT_DEVIATION',
          conditionParameters: {
            joint: 'TORSO_TIBIA_ANGLE',
            allowableToleranceDegrees: 15,
            axis: 'SAGITTAL',
          },
          feedbackType: 'REMINDER',
          feedbackMessage: 'Keep chest upright and brace core to maintain vertical torso posture.',
          severity: 'MODERATE',
          priority: 'IMPORTANT',
          status: 'PUBLISHED',
        },
        actorTrainerA,
      );

      expect(testFeedbackRule).toBeDefined();
      expect(testFeedbackRule.conditionType).toBe('ALIGNMENT_DEVIATION');
      expect(testFeedbackRule.feedbackType).toBe('REMINDER');
      expect(testFeedbackRule.conditionParameters).toBeDefined();
      expect(testFeedbackRule.conditionParameters.joint).toBe('TORSO_TIBIA_ANGLE');
    });

    it('lists feedback rules for the exercise', async () => {
      const rules = await coachService.getFeedbackRules(
        orgA.id,
        testExerciseA.id,
        testPhaseDescent.id,
        actorTrainerA,
      );

      expect(rules.length).toBeGreaterThanOrEqual(1);
      expect(rules[0].conditionType).toBe('ALIGNMENT_DEVIATION');
    });

    it('allows updating a feedback rule', async () => {
      const updated = await coachService.updateFeedbackRule(
        orgA.id,
        testFeedbackRule.id,
        {
          feedbackMessage: 'Refined: Ensure your chest stays proud and torso remains upright.',
        },
        actorTrainerA,
      );

      expect(updated.feedbackMessage).toContain('Refined');
    });
  });

  describe('3. Consolidated Movement Coach Read Model & Checklist', () => {
    it('returns complete structured movement coach data with phases, focus hierarchy, and checklist', async () => {
      const coachData = await coachService.getMovementCoachData(
        orgA.id,
        testExerciseA.id,
        actorMemberA,
      );

      expect(coachData).toBeDefined();
      expect(coachData.exercise.id).toBe(testExerciseA.id);
      expect(coachData.exercise.name).toBe(testExerciseA.name);

      // Phases verification
      expect(coachData.phases.length).toBe(2);
      const descentPhase = coachData.phases.find((p) => p.phaseName === 'DESCENT');
      expect(descentPhase).toBeDefined();
      expect(descentPhase!.expectations.length).toBeGreaterThanOrEqual(1);
      expect(descentPhase!.mistakes.length).toBeGreaterThanOrEqual(1);
      expect(descentPhase!.mistakes[0].mistake).toContain('valgus');

      // Focus hierarchy verification
      expect(coachData.whatToFocusOn).toBeDefined();
      expect(coachData.whatToFocusOn.essential.length).toBeGreaterThanOrEqual(1);
      expect(coachData.whatToFocusOn.important.length).toBeGreaterThanOrEqual(1);
      expect(
        coachData.whatToFocusOn.essential.some((e) => e.title === 'Neutral Spine Under Load'),
      ).toBe(true);

      // Technique Checklist verification
      expect(coachData.techniqueChecklist.length).toBeGreaterThanOrEqual(3);
      expect(coachData.techniqueChecklist.some((c) => c.category === 'SETUP')).toBe(true);
      expect(coachData.techniqueChecklist.some((c) => c.category === 'ALIGNMENT')).toBe(true);

      // Safety guidance
      expect(coachData.safetyGuidance.length).toBeGreaterThanOrEqual(1);
    });

    it('returns technique checklist via dedicated endpoint', async () => {
      const checklist = await coachService.getTechniqueChecklist(
        orgA.id,
        testExerciseA.id,
        actorMemberA,
      );

      expect(Array.isArray(checklist)).toBe(true);
      expect(checklist.length).toBeGreaterThanOrEqual(3);
      expect(checklist[0].order).toBe(1);
      expect(checklist[0].isRequired).toBe(true);
    });
  });

  describe('4. Future Computer Vision & Pose Comparison Readiness', () => {
    it('generates ExpectedMovementState representation without running camera or CV dependencies', async () => {
      const targetState = await coachService.getExpectedMovementState(
        orgA.id,
        testExerciseA.id,
        testPhaseDescent.id,
      );

      expect(targetState).toBeDefined();
      expect(targetState.phaseName).toBe('DESCENT');
      expect(targetState.bodyPosition).toBe('SQUATTING');
      expect(targetState.bodyRegions).toContain('SPINE');
      expect(targetState.alignmentExpectations.length).toBeGreaterThanOrEqual(1);
      expect(targetState.tempo).toBe('3s');
      expect(targetState.breathing).toBeDefined();
    });
  });

  describe('5. Security, Tenant Isolation & Access Control', () => {
    it('prevents normal members from creating movement expectations (403 Forbidden)', async () => {
      await expect(
        coachService.createExpectation(
          orgA.id,
          testExerciseA.id,
          {
            title: 'Unauthorized Member Expectation',
            description: 'Should fail',
          },
          actorMemberA,
        ),
      ).rejects.toThrow();
    });

    it('prevents cross-tenant access to unpublished exercises', async () => {
      const unpublishedOrgBExercise = await prisma.exercise.create({
        data: {
          organisationId: orgB.id,
          ownershipType: 'ORGANISATION',
          name: 'Secret Apex Exercise (Coach)',
          slug: `secret-apex-coach-${Date.now()}`,
          difficulty: 'ADVANCED',
          exerciseType: 'STRENGTH',
          status: 'ACTIVE',
          contentStatus: 'DRAFT',
        },
      });

      // Member A in Org A cannot access Org B draft exercise
      await expect(
        coachService.getMovementCoachData(
          orgA.id,
          unpublishedOrgBExercise.id,
          actorMemberA,
        ),
      ).rejects.toThrow();

      // Clean up
      await prisma.exercise.delete({ where: { id: unpublishedOrgBExercise.id } });
    });

    it('allows deleting feedback rules and expectations', async () => {
      const delRule = await coachService.deleteFeedbackRule(
        orgA.id,
        testFeedbackRule.id,
        actorTrainerA,
      );
      expect(delRule.deleted).toBe(true);

      const delExp = await coachService.deleteExpectation(
        orgA.id,
        testExpectation.id,
        actorTrainerA,
      );
      expect(delExp.deleted).toBe(true);
    });
  });
});
