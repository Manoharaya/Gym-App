import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { GuidedSessionService } from '../src/exercises/services/guided-session.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';
import { GuidedSessionItemType } from '../src/exercises/dto/guided-session.dto';

describe('Day 76: Guided Exercise Sessions & Structured Practice Programs E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessionService: GuidedSessionService;

  let orgA: any;
  let orgB: any;
  let userA: any;
  let userB: any;
  let actorMemberA: AuthenticatedUser;
  let actorTrainerA: AuthenticatedUser;
  let actorMemberB: AuthenticatedUser;
  let actorTrainerB: AuthenticatedUser;

  let testExerciseA1: any;
  let testExerciseA2: any;
  let testKnowledgeCheckA: any;
  let testSessionA: any;

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
    sessionService = app.get(GuidedSessionService);

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

    actorTrainerB = {
      id: userB.id,
      email: userB.email,
      roles: [{ role: 'TRAINER', organisationId: orgB.id }],
    } as any;

    // Create published test exercises for Tenant A
    testExerciseA1 = await prisma.exercise.create({
      data: {
        name: 'Day 76 Goblet Squat',
        slug: `day-76-goblet-squat-${Date.now()}`,
        organisationId: orgA.id,
        ownershipType: 'ORGANISATION',
        exerciseType: 'STRENGTH',
        difficulty: 'BEGINNER',
        movementPattern: 'SQUAT',
        primaryMuscleGroup: 'QUADRICEPS',
        equipment: 'DUMBBELL',
        contentStatus: 'PUBLISHED',
      },
    });

    testExerciseA2 = await prisma.exercise.create({
      data: {
        name: 'Day 76 Dumbbell Romanian Deadlift',
        slug: `day-76-dumbbell-rdl-${Date.now()}`,
        organisationId: orgA.id,
        ownershipType: 'ORGANISATION',
        exerciseType: 'STRENGTH',
        difficulty: 'INTERMEDIATE',
        movementPattern: 'HINGE',
        primaryMuscleGroup: 'HAMSTRINGS',
        equipment: 'DUMBBELL',
        contentStatus: 'PUBLISHED',
      },
    });

    // Create a published knowledge check for Tenant A
    testKnowledgeCheckA = await prisma.knowledgeCheck.create({
      data: {
        title: 'Day 76 Squat & Hinge Mechanics Review',
        tenantId: orgA.id,
        exerciseId: testExerciseA1.id,
        passingScore: 70,
        contentStatus: 'PUBLISHED',
        questions: {
          create: [
            {
              questionText: 'During a goblet squat, where should the elbows stay positioned?',
              questionType: 'MULTIPLE_CHOICE',
              sortOrder: 0,
              explanation: 'Keeping elbows inside the knees reinforces an upright torso.',
              answers: {
                create: [
                  { answerText: 'Pointing downward inside the knees', isCorrect: true },
                  { answerText: 'Flared outward to the sides', isCorrect: false },
                ],
              },
            },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    // Clean up created entities
    if (testSessionA?.id) {
      await prisma.userGuidedSessionItemCompletion.deleteMany({
        where: { sessionId: testSessionA.id },
      });
      await prisma.userGuidedSessionProgress.deleteMany({
        where: { sessionId: testSessionA.id },
      });
      await prisma.guidedSessionItem.deleteMany({
        where: { sessionId: testSessionA.id },
      });
      await prisma.guidedSessionSection.deleteMany({
        where: { sessionId: testSessionA.id },
      });
      await prisma.guidedSession.deleteMany({
        where: { id: testSessionA.id },
      });
    }

    if (testKnowledgeCheckA?.id) {
      await prisma.knowledgeAnswer.deleteMany({
        where: { question: { checkId: testKnowledgeCheckA.id } },
      });
      await prisma.knowledgeQuestion.deleteMany({
        where: { checkId: testKnowledgeCheckA.id },
      });
      await prisma.knowledgeCheck.deleteMany({
        where: { id: testKnowledgeCheckA.id },
      });
    }

    if (testExerciseA1?.id) {
      await prisma.exercise.deleteMany({ where: { id: testExerciseA1.id } });
    }
    if (testExerciseA2?.id) {
      await prisma.exercise.deleteMany({ where: { id: testExerciseA2.id } });
    }

    await app.close();
  });

  // =========================================================================
  // 1. AUTHORING & STRUCTURE MANAGEMENT
  // =========================================================================

  describe('Session Authoring & Structure', () => {
    it('should create a guided session draft with sections and ordered items', async () => {
      // 1. Create Session Draft
      testSessionA = await sessionService.createSession(orgA.id, actorTrainerA, {
        title: 'Lower Body Technique & Fundamentals',
        description:
          'A structured multi-exercise tutorial flow mastering the squat and hip hinge mechanics.',
        category: 'FUNDAMENTALS',
        difficulty: 'BEGINNER',
        primaryGoal: 'TECHNIQUE',
        estimatedDurationMinutes: 25,
      });

      expect(testSessionA).toBeDefined();
      expect(testSessionA.title).toBe('Lower Body Technique & Fundamentals');
      expect(testSessionA.contentStatus).toBe('DRAFT');
      expect(testSessionA.organisationId).toBe(orgA.id);

      // 2. Add Sections
      const section1 = await sessionService.addSection(orgA.id, testSessionA.id, actorTrainerA, {
        title: 'Section 1 - Movement Preparation',
        description: 'Joint mobilization and core activation',
        sortOrder: 0,
      });

      const section2 = await sessionService.addSection(orgA.id, testSessionA.id, actorTrainerA, {
        title: 'Section 2 - Squat Mechanics',
        description: 'Goblet squat visual demonstration and practice',
        sortOrder: 1,
      });

      const section3 = await sessionService.addSection(orgA.id, testSessionA.id, actorTrainerA, {
        title: 'Section 3 - Assessment & Recovery',
        description: 'Knowledge check and cooldown breathing',
        sortOrder: 2,
      });

      expect(section1.id).toBeDefined();
      expect(section2.id).toBeDefined();
      expect(section3.id).toBeDefined();

      // 3. Add Items across sections
      const introItem = await sessionService.addItem(orgA.id, testSessionA.id, actorTrainerA, {
        sectionId: section1.id,
        itemType: GuidedSessionItemType.INTRO,
        title: 'Session Overview & Objectives',
        description: 'Learn foot positioning, neutral spine, and pelvic control.',
        durationSeconds: 60,
        sortOrder: 0,
      });

      const warmupItem = await sessionService.addItem(orgA.id, testSessionA.id, actorTrainerA, {
        sectionId: section1.id,
        itemType: GuidedSessionItemType.WARMUP,
        title: 'Hip & Ankle Mobility Drills',
        description: 'Dynamic ankle dorsiflexion and glute bridges.',
        durationSeconds: 180,
        sortOrder: 1,
      });

      const squatTutorialItem = await sessionService.addItem(orgA.id, testSessionA.id, actorTrainerA, {
        sectionId: section2.id,
        itemType: GuidedSessionItemType.EXERCISE_TUTORIAL,
        title: 'Goblet Squat Interactive Tutorial',
        description: 'Watch phases: setup, descent, transition, drive, and lockout.',
        exerciseId: testExerciseA1.id,
        durationSeconds: 300,
        sortOrder: 2,
      });

      const squatPracticeItem = await sessionService.addItem(orgA.id, testSessionA.id, actorTrainerA, {
        sectionId: section2.id,
        itemType: GuidedSessionItemType.PRACTICE,
        title: 'Goblet Squat Practice Protocol',
        description: 'Complete 8 self-directed repetitions focusing on vertical torso.',
        exerciseId: testExerciseA1.id,
        repetitionCount: 8,
        durationSeconds: 90,
        sortOrder: 3,
      });

      const restItem = await sessionService.addItem(orgA.id, testSessionA.id, actorTrainerA, {
        sectionId: section2.id,
        itemType: GuidedSessionItemType.REST,
        title: 'Recovery Interval',
        description: 'Reset breathing and shake out legs.',
        durationSeconds: 45,
        sortOrder: 4,
      });

      const transitionItem = await sessionService.addItem(orgA.id, testSessionA.id, actorTrainerA, {
        sectionId: section2.id,
        itemType: GuidedSessionItemType.TRANSITION,
        title: 'Transition to Hip Hinge',
        description: 'Grab a moderate pair of dumbbells for the Romanian Deadlift.',
        exerciseId: testExerciseA2.id,
        durationSeconds: 30,
        sortOrder: 5,
      });

      const knowledgeCheckItem = await sessionService.addItem(orgA.id, testSessionA.id, actorTrainerA, {
        sectionId: section3.id,
        itemType: GuidedSessionItemType.KNOWLEDGE_CHECK,
        title: 'Mechanics Quick Check',
        description: 'Confirm understanding of elbow position and spinal neutrality.',
        knowledgeCheckId: testKnowledgeCheckA.id,
        durationSeconds: 120,
        sortOrder: 6,
      });

      const cooldownItem = await sessionService.addItem(orgA.id, testSessionA.id, actorTrainerA, {
        sectionId: section3.id,
        itemType: GuidedSessionItemType.COOLDOWN,
        title: 'Diaphragmatic Breathing & Hip Flexor Stretch',
        description: 'Slow down heart rate and stretch quads and psoas.',
        durationSeconds: 120,
        sortOrder: 7,
      });

      expect(introItem.id).toBeDefined();
      expect(squatTutorialItem.id).toBeDefined();
      expect(squatPracticeItem.repetitionCount).toBe(8);
      expect(restItem.durationSeconds).toBe(45);
      expect(knowledgeCheckItem.knowledgeCheckId).toBe(testKnowledgeCheckA.id);
      expect(cooldownItem.id).toBeDefined();
    });

    it('should validate publishing rules and prevent invalid sessions from publishing', async () => {
      // Create incomplete session without items
      const incompleteSession = await sessionService.createSession(orgA.id, actorTrainerA, {
        title: 'Empty Incomplete Session',
        category: 'STRENGTH',
      });

      const validation = await sessionService.validateSessionForPublishing(
        orgA.id,
        incompleteSession.id,
      );
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        'Session must contain at least one learning item before publishing',
      );

      // Attempting to publish should throw BadRequestException
      await expect(
        sessionService.publishSession(orgA.id, incompleteSession.id, actorTrainerA),
      ).rejects.toThrow();

      // Clean up
      await prisma.guidedSession.delete({ where: { id: incompleteSession.id } });
    });

    it('should validate and publish a complete session with published dependencies', async () => {
      const validation = await sessionService.validateSessionForPublishing(
        orgA.id,
        testSessionA.id,
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
      expect(validation.summary?.exerciseTutorialCount).toBeGreaterThanOrEqual(1);
      expect(validation.summary?.equipmentNeeded).toContain('DUMBBELL');

      // Publish the session
      const published = await sessionService.publishSession(
        orgA.id,
        testSessionA.id,
        actorTrainerA,
      );
      expect(published.contentStatus).toBe('PUBLISHED');
    });

    it('should support duplicating a session with all its sections and items', async () => {
      const duplicate = await sessionService.duplicateSession(
        orgA.id,
        testSessionA.id,
        actorTrainerA,
      );

      expect(duplicate).toBeDefined();
      expect(duplicate.title).toContain('(Copy)');
      expect(duplicate.contentStatus).toBe('DRAFT');
      expect(duplicate.itemCount).toBe(8);

      // Clean up duplicate
      await prisma.guidedSessionItem.deleteMany({ where: { sessionId: duplicate.id } });
      await prisma.guidedSessionSection.deleteMany({ where: { sessionId: duplicate.id } });
      await prisma.guidedSession.delete({ where: { id: duplicate.id } });
    });
  });

  // =========================================================================
  // 2. MEMBER EXPERIENCE & PROGRESSION LIFECYCLE
  // =========================================================================

  describe('Member Experience & Progression', () => {
    it('should return aggregated session detail with exercises, equipment summary, and breakdown', async () => {
      const detail = await sessionService.getSessionDetail(
        orgA.id,
        testSessionA.id,
        actorMemberA,
      );

      expect(detail.session.id).toBe(testSessionA.id);
      expect(detail.session.title).toBe('Lower Body Technique & Fundamentals');
      expect(detail.equipmentNeededSummary).toContain('DUMBBELL');
      expect(detail.movementPatterns).toContain('SQUAT');
      expect(detail.primeMuscles).toContain('QUADRICEPS');
      expect(detail.sections.length).toBe(3);
      expect(detail.items.length).toBe(8);
      expect(detail.structureBreakdown.totalItems).toBe(8);
    });

    it('should start session and initialize user progress', async () => {
      const progress = await sessionService.startSession(
        orgA.id,
        testSessionA.id,
        actorMemberA.id,
        { resetProgress: true },
      );

      expect(progress.status).toBe('IN_PROGRESS');
      expect(progress.currentStepIndex).toBe(0);
      expect(progress.percentComplete).toBe(0);
      expect(progress.completedItemCount).toBe(0);
    });

    it('should record incremental progress as member completes steps', async () => {
      const sessionDetail = await sessionService.getSessionDetail(
        orgA.id,
        testSessionA.id,
        actorMemberA,
      );
      const items = sessionDetail.items;

      // Complete Item 0 (Intro)
      const progress1 = await sessionService.updateProgress(
        orgA.id,
        testSessionA.id,
        actorMemberA.id,
        {
          currentStepIndex: 1,
          currentItemId: items[1].id,
          completedItemId: items[0].id,
          timeSpentSecondsIncrement: 60,
        },
      );

      expect(progress1.completedItemCount).toBe(1);
      expect(progress1.percentComplete).toBe(13); // 1 / 8 = 12.5% -> 13%
      expect(progress1.completedItemIds).toContain(items[0].id);

      // Complete Item 1 (Warmup)
      const progress2 = await sessionService.updateProgress(
        orgA.id,
        testSessionA.id,
        actorMemberA.id,
        {
          currentStepIndex: 2,
          currentItemId: items[2].id,
          completedItemId: items[1].id,
          timeSpentSecondsIncrement: 180,
        },
      );

      expect(progress2.completedItemCount).toBe(2);
      expect(progress2.percentComplete).toBe(25);
    });

    it('should support practice item completion with rep count and checklist verification', async () => {
      const sessionDetail = await sessionService.getSessionDetail(
        orgA.id,
        testSessionA.id,
        actorMemberA,
      );
      const practiceItem = sessionDetail.items.find(
        (i: any) => i.itemType === 'PRACTICE',
      );

      const progress = await sessionService.updateProgress(
        orgA.id,
        testSessionA.id,
        actorMemberA.id,
        {
          completedItemId: practiceItem.id,
          itemCompletionData: {
            completedReps: 8,
            checklistState: {
              'Starting position set': true,
              'Core braced and elbows inside knees': true,
              'Controlled descent': true,
              'Full hip extension': true,
            },
          },
          timeSpentSecondsIncrement: 90,
        },
      );

      expect(progress.completedItemIds).toContain(practiceItem.id);
    });

    it('should support rest timer and skip logging', async () => {
      const sessionDetail = await sessionService.getSessionDetail(
        orgA.id,
        testSessionA.id,
        actorMemberA,
      );
      const restItem = sessionDetail.items.find((i: any) => i.itemType === 'REST');

      const progress = await sessionService.updateProgress(
        orgA.id,
        testSessionA.id,
        actorMemberA.id,
        {
          completedItemId: restItem.id,
          itemCompletionData: {
            restSkipped: true,
          },
          timeSpentSecondsIncrement: 15,
        },
      );

      expect(progress.completedItemIds).toContain(restItem.id);
    });

    it('should return deterministic resume position for member learning dashboard', async () => {
      const resume = await sessionService.getResumeSession(orgA.id, actorMemberA.id);

      expect(resume).toBeDefined();
      expect(resume?.sessionId).toBe(testSessionA.id);
      expect(resume?.sessionTitle).toBe('Lower Body Technique & Fundamentals');
      expect(resume?.totalItems).toBe(8);
      expect(resume?.percentComplete).toBeGreaterThan(0);
    });

    it('should complete session, mark status COMPLETED, and synchronize exercise progress', async () => {
      const completion = await sessionService.completeSession(
        orgA.id,
        testSessionA.id,
        actorMemberA.id,
        {
          totalTimeSpentSeconds: 1200,
          practiceFeedback: {
            confidenceRating: 5,
            notes: 'Great cues on keeping elbows inside knees.',
          },
        },
      );

      expect(completion.sessionTitle).toBe('Lower Body Technique & Fundamentals');
      expect(completion.percentComplete).toBe(100);
      expect(completion.exerciseTutorialsCompleted).toBeGreaterThanOrEqual(1);
      expect(completion.practiceCompleted).toBeGreaterThanOrEqual(1);

      // Verify progress record is COMPLETED
      const finalProgress = await sessionService.getSessionProgress(
        orgA.id,
        testSessionA.id,
        actorMemberA.id,
      );
      expect(finalProgress.status).toBe('COMPLETED');
      expect(finalProgress.percentComplete).toBe(100);

      // Verify exercise learning progress synced for exercise 1
      const exerciseProgress = await prisma.exerciseLearningProgress.findUnique({
        where: {
          userId_exerciseId: {
            userId: actorMemberA.id,
            exerciseId: testExerciseA1.id,
          },
        },
      });
      expect(exerciseProgress?.status).toBe('COMPLETED');
    });
  });

  // =========================================================================
  // 3. MULTI-TENANT ISOLATION & SECURITY
  // =========================================================================

  describe('Multi-Tenant Isolation & Security', () => {
    it('should prevent Tenant B member from accessing Tenant A private session', async () => {
      // Create private draft session in Tenant A
      const privateDraft = await sessionService.createSession(orgA.id, actorTrainerA, {
        title: 'Tenant A Private Advanced Session',
        category: 'SKILL_MASTERY',
      });

      // Member of Tenant B should not find it (404)
      await expect(
        sessionService.getSessionDetail(orgB.id, privateDraft.id, actorMemberB),
      ).rejects.toThrow();

      // Clean up
      await prisma.guidedSession.delete({ where: { id: privateDraft.id } });
    });

    it('should prevent Trainer of Tenant B from editing or publishing Tenant A session', async () => {
      await expect(
        sessionService.updateSession(orgB.id, testSessionA.id, actorTrainerB, {
          title: 'Hacked Title',
        }),
      ).rejects.toThrow();

      await expect(
        sessionService.publishSession(orgB.id, testSessionA.id, actorTrainerB),
      ).rejects.toThrow();
    });

    it('should enforce IDOR protection: Member B cannot overwrite Member A progress', async () => {
      // Member B updates their OWN progress
      const progressB = await sessionService.startSession(
        orgA.id,
        testSessionA.id,
        actorMemberB.id,
        { resetProgress: true },
      );

      expect(progressB.userId).toBe(actorMemberB.id);

      // Member A progress should remain COMPLETED and intact
      const progressA = await sessionService.getSessionProgress(
        orgA.id,
        testSessionA.id,
        actorMemberA.id,
      );
      expect(progressA.status).toBe('COMPLETED');
      expect((progressA as any).userId).toBe(actorMemberA.id);
    });

    it('should forbid non-superadmin trainers from mutating SYSTEM-level sessions', async () => {
      // Create a SYSTEM session directly
      const systemSession = await prisma.guidedSession.create({
        data: {
          title: 'Platform System Movement Foundations',
          slug: `system-foundations-${Date.now()}`,
          ownershipType: 'SYSTEM',
          contentStatus: 'PUBLISHED',
        },
      });

      // Regular gym trainer attempts to update system session -> should throw ForbiddenException
      await expect(
        sessionService.updateSession(orgA.id, systemSession.id, actorTrainerA, {
          title: 'Modified by Gym Trainer',
        }),
      ).rejects.toThrow();

      // Clean up
      await prisma.guidedSession.delete({ where: { id: systemSession.id } });
    });
  });
});
