import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ExerciseTutorialService } from '../src/exercises/services/exercise-tutorial.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Day 75: Interactive Exercise Tutorials & Technique Coaching E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tutorialService: ExerciseTutorialService;

  let orgA: any;
  let orgB: any;
  let userA: any;
  let userB: any;
  let actorMemberA: AuthenticatedUser;
  let actorTrainerA: AuthenticatedUser;
  let actorMemberB: AuthenticatedUser;
  let actorTrainerB: AuthenticatedUser;

  let testExerciseA: any;
  let testExerciseB: any;
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
    tutorialService = app.get(ExerciseTutorialService);

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

    // Create a comprehensive test exercise for Tenant A with phases, steps, mistakes, safety, muscles, equipment
    testExerciseA = await prisma.exercise.create({
      data: {
        name: 'Day 75 Barbell Overhead Press',
        slug: `day-75-barbell-overhead-press-${Date.now()}`,
        organisationId: orgA.id,
        ownershipType: 'ORGANISATION',
        exerciseType: 'STRENGTH',
        difficulty: 'INTERMEDIATE',
        movementPattern: 'VERTICAL_PUSH',
        primaryMuscleGroup: 'SHOULDERS',
        equipment: 'BARBELL',
        bodyPosition: 'STANDING',
        tempo: '2-0-1-1',
        tempoStructure: {
          eccentricSeconds: 2,
          bottomHoldSeconds: 0,
          concentricSeconds: 1,
          topHoldSeconds: 1,
        },
        rangeOfMotion: 'Full lockout overhead with chin clearing bar plane',
        breathingInstructions: 'Inhale deep into abdomen before press, hold through chin clearance, exhale at top lockout.',
        status: 'ACTIVE',
        contentStatus: 'PUBLISHED',
        tutorialConfig: {
          defaultMode: 'STEP_BY_STEP',
          estimatedMinutes: 4,
          audioGuidanceUrl: 'https://cdn.fitcore.local/audio/ohp-coaching.mp3',
          audioGuidanceTranscript: 'Keep glutes squeezed and ribs pinned down as you press the bar vertically overhead.',
          keyTechniquePoints: [
            'Vertical forearm angle directly below barbell collar',
            'Full glute squeeze preventing lumbar hyperextension',
            'Slight head retreat until bar clears forehead plane',
            'Active shoulder shrug into overhead lockout',
          ],
          checklist: [
            'Forearm verticality under bar collar',
            'Squeeze glutes tight before unrack',
            'Tuck chin slightly during ascent',
            'Active shoulder shrug into overhead lockout',
          ],
        },
        media: {
          create: [
            {
              mediaType: 'VIDEO',
              purpose: 'PRIMARY_DEMONSTRATION',
              storageKey: 'test/ohp-demo.mp4',
              mimeType: 'video/mp4',
              url: 'https://cdn.fitcore.local/videos/ohp-demo-4k.mp4',
              thumbnailUrl: 'https://cdn.fitcore.local/videos/ohp-thumb.jpg',
              durationSeconds: 12,
              isPublished: true,
              sortOrder: 0,
            },
          ],
        },
        movementPhases: {
          create: [
            {
              phaseName: 'Front Rack Setup',
              phaseType: 'SETUP',
              title: 'Rack Positioning & Grip',
              description: 'Grip bar just outside shoulders with elbows slightly in front of bar.',
              orderIndex: 0,
              cueText: 'Squeeze glutes tight and stack forearms vertically under the bar.',
              bodyPosition: 'STANDING',
              tempoSeconds: 2,
              breathingPattern: 'INHALE_PREPARATION',
            },
            {
              phaseName: 'Vertical Press Drive',
              phaseType: 'CONCENTRIC',
              title: 'Drive Overhead',
              description: 'Press bar upward in straight vertical trajectory while pulling head back slightly.',
              orderIndex: 1,
              cueText: 'Drive straight up close to nose, then push head forward once bar clears.',
              tempoSeconds: 1,
              breathingPattern: 'HOLD_VALSALVA',
            },
            {
              phaseName: 'Overhead Lockout',
              phaseType: 'TRANSITION_TOP',
              title: 'Lockout & Stabilization',
              description: 'Lock elbows with bar positioned directly over midfoot and scapulae upwardly rotated.',
              orderIndex: 2,
              cueText: 'Push the ceiling away and hold for 1 count.',
              tempoSeconds: 1,
              breathingPattern: 'EXHALE_EFFORT',
            },
            {
              phaseName: 'Controlled Lowering',
              phaseType: 'ECCENTRIC',
              title: 'Lower to Collarbones',
              description: 'Lower barbell with full control back to front delts over 2 seconds.',
              orderIndex: 3,
              cueText: 'Control the descent back to collarbones, keeping chest proud.',
              tempoSeconds: 2,
              breathingPattern: 'INHALE_DESCENT',
            },
          ],
        },
        instructionSteps: {
          create: [
            {
              stepNumber: 1,
              title: 'Set Grip & Stance',
              description: 'Stand with feet shoulder-width apart, gripping bar with knuckles facing up.',
              coachingCue: 'Wrists rigid, elbows just ahead of the bar.',
            },
            {
              stepNumber: 2,
              title: 'Brace & Unrack',
              description: 'Inhale into belly, squeeze glutes firmly, and lift bar from J-hooks.',
              coachingCue: 'Ribs glued to pelvis.',
            },
            {
              stepNumber: 3,
              title: 'Press Vertical',
              description: 'Tuck chin back and drive bar straight upward toward the ceiling.',
              coachingCue: 'Bar brushes past nose.',
            },
            {
              stepNumber: 4,
              title: 'Lockout Overhead',
              description: 'Push head through window created by arms, locking elbows overhead.',
              coachingCue: 'Biceps next to ears.',
            },
            {
              stepNumber: 5,
              title: 'Reset & Repeat',
              description: 'Lower bar slowly back to clavicles under control.',
              coachingCue: 'Soft landing on collarbone shelf.',
            },
          ],
        },
        commonMistakes: {
          create: [
            {
              mistake: 'Excessive Lumbar Hyperextension',
              severity: 'SEVERE',
              consequence: 'Spinal compression and shear force on lumbar discs.',
              correction: 'Squeeze glutes as hard as possible and lock ribcage down toward pelvis.',
              sortOrder: 0,
            },
            {
              mistake: 'Flared Elbows Out Wide',
              severity: 'MODERATE',
              consequence: 'Subacromial impingement and anterior shoulder pain.',
              correction: 'Tuck elbows roughly 30 degrees forward in scapular plane.',
              sortOrder: 1,
            },
          ],
        },
        safetyGuidelines: {
          create: [
            {
              category: 'GENERAL_PRECAUTION',
              title: 'Active Shoulder Impingement',
              description: 'Individuals with acute subacromial impingement should modify grip or use neutral-grip dumbbells.',
              severity: 'STANDARD',
            },
            {
              category: 'TECHNIQUE_WARNING',
              title: 'Lumbar Extension Guard',
              description: 'Avoid hyperextending lower back under load; reduce weight if torso bends backward.',
              severity: 'HIGH',
            },
          ],
        },
        muscleRelations: {
          create: [
            {
              muscle: 'ANTERIOR_DELTOID',
              muscleGroup: 'UPPER_BODY',
              role: 'PRIMARY',
              activationLevel: 'HIGH',
              notes: 'Prime mover for shoulder flexion overhead',
            },
            {
              muscle: 'LATERAL_DELTOID',
              muscleGroup: 'UPPER_BODY',
              role: 'PRIMARY',
              activationLevel: 'HIGH',
              notes: 'Abducts arm in scapular plane',
            },
            {
              muscle: 'TRICEPS',
              muscleGroup: 'UPPER_BODY',
              role: 'SECONDARY',
              activationLevel: 'HIGH',
              notes: 'Drives elbow extension through upper lockout',
            },
            {
              muscle: 'CORE',
              muscleGroup: 'CORE',
              role: 'STABILIZER',
              activationLevel: 'HIGH',
              notes: 'Resists spinal extension and transfers force to floor',
            },
          ],
        },
        equipmentRelations: {
          create: [
            {
              equipmentName: 'Olympic Barbell',
              requirementType: 'REQUIRED',
              equipmentCategory: 'FREE_WEIGHTS',
              alternatives: ['Dumbbells', 'Kettlebell'],
            },
          ],
        },
      },
    });

    // Create knowledge check attached to testExerciseA
    testKnowledgeCheck = await prisma.knowledgeCheck.create({
      data: {
        exerciseId: testExerciseA.id,
        tenantId: orgA.id,
        title: 'Overhead Press Technique Check',
        description: 'Verify your understanding of overhead press alignment, bar path, and breathing.',
        contentStatus: 'PUBLISHED',
        questions: {
          create: [
            {
              questionText: 'Where should the barbell be positioned relative to your body at full overhead lockout?',
              questionType: 'MULTIPLE_CHOICE',
              explanation: 'At lockout, the bar must balance directly over the glenohumeral joint and midfoot.',
              sortOrder: 0,
              answers: {
                create: [
                  { answerText: 'Directly in front of your forehead', isCorrect: false, sortOrder: 0 },
                  { answerText: 'Directly over midfoot with biceps aligned near ears', isCorrect: true, sortOrder: 1 },
                  { answerText: 'Behind the neck touching upper traps', isCorrect: false, sortOrder: 2 },
                ],
              },
            },
          ],
        },
      },
    });

    // Create isolated exercise for Tenant B for IDOR and boundary testing
    testExerciseB = await prisma.exercise.create({
      data: {
        name: 'Day 75 Apex Secret Drill',
        slug: `day-75-apex-secret-drill-${Date.now()}`,
        organisationId: orgB.id,
        ownershipType: 'ORGANISATION',
        exerciseType: 'STRENGTH',
        difficulty: 'ADVANCED',
        movementPattern: 'VERTICAL_PUSH',
        primaryMuscleGroup: 'SHOULDERS',
        equipment: 'BARBELL',
        status: 'ACTIVE',
        contentStatus: 'PUBLISHED',
      },
    });
  });

  afterAll(async () => {
    if (testKnowledgeCheck?.id) {
      await prisma.knowledgeCheck.delete({ where: { id: testKnowledgeCheck.id } }).catch(() => {});
    }
    if (testExerciseA?.id) {
      await prisma.exercise.delete({ where: { id: testExerciseA.id } }).catch(() => {});
    }
    if (testExerciseB?.id) {
      await prisma.exercise.delete({ where: { id: testExerciseB.id } }).catch(() => {});
    }
    await app.close();
  });

  // =========================================================================
  // 1. AGGREGATED TUTORIAL RETRIEVAL & PEDAGOGICAL PIPELINE
  // =========================================================================

  describe('GET /exercises/:id/tutorial (Aggregated Tutorial Read Model)', () => {
    it('should aggregate exercise, media, phases, steps, coaching, mistakes, safety, and checklist in one call', async () => {
      const tutorial = await tutorialService.getExerciseTutorial(
        orgA.id,
        testExerciseA.id,
        actorMemberA,
      );

      expect(tutorial).toBeDefined();
      expect(tutorial.exercise.id).toBe(testExerciseA.id);
      expect(tutorial.exercise.name).toBe('Day 75 Barbell Overhead Press');
      expect(tutorial.exercise.movementPattern).toBe('VERTICAL_PUSH');

      // Demonstration media
      expect(tutorial.demonstrations).toBeDefined();
      expect(tutorial.demonstrations.length).toBeGreaterThan(0);
      expect(tutorial.demonstrations[0].url).toContain('ohp-demo-4k.mp4');

      // Phases with timestamps & cues
      expect(tutorial.phases.length).toBe(4);
      expect(tutorial.phases[0].phaseName).toBe('Front Rack Setup');
      expect(tutorial.phases[0].cueText).toContain('Squeeze glutes');
      expect(tutorial.phases[1].phaseType).toBe('CONCENTRIC');

      // Steps with cues
      expect(tutorial.steps.length).toBe(5);
      expect(tutorial.steps[0].title).toBe('Set Grip & Stance');
      expect(tutorial.steps[0].coachingCue).toContain('Wrists rigid');

      // Technique Coaching Panel
      expect(tutorial.coaching).toBeDefined();
      expect(tutorial.coaching.setup.length).toBeGreaterThan(0);
      expect(tutorial.coaching.breathing.pattern).toBeDefined();
      expect(tutorial.coaching.tempo.value).toBe('2-0-1-1');

      // Checklist (Interactive Practice)
      expect(tutorial.tutorialConfig.checklist?.length).toBe(4);
      expect(tutorial.tutorialConfig.checklist?.[0]).toContain('Forearm verticality');

      // Common Mistakes & Safety
      expect(tutorial.commonMistakes.length).toBe(2);
      expect(tutorial.commonMistakes[0].mistake).toContain('Lumbar Hyperextension');
      expect(tutorial.safetyGuidelines.length).toBe(2);

      // Muscles & Equipment
      expect(tutorial.muscles.primary.length).toBe(2);
      expect(tutorial.equipment.required.length).toBeGreaterThanOrEqual(1);
      expect(tutorial.equipment.required).toContain('Olympic Barbell');

      // Why It Works
      expect(tutorial.whyItWorks).toBeDefined();
      expect(tutorial.whyItWorks.overview).toContain('VERTICAL_PUSH');

      // Knowledge check integration
      expect(tutorial.knowledgeCheck).toBeDefined();
      expect(tutorial.knowledgeCheck?.title).toBe('Overhead Press Technique Check');
    });

    it('should provide fallback visual placeholder when video media is not present', async () => {
      const fallbackTutorial = await tutorialService.getExerciseTutorial(
        orgB.id,
        testExerciseB.id,
        actorMemberB,
      );

      expect(fallbackTutorial).toBeDefined();
      expect(fallbackTutorial.demonstrations.length).toBe(1);
      expect(fallbackTutorial.demonstrations[0].altText).toContain('Demonstration Placeholder');
    });
  });

  // =========================================================================
  // 2. TUTORIAL PROGRESSION CYCLE & CHECKPOINTING
  // =========================================================================

  describe('Tutorial Progress Tracking (Start -> Checkpoint -> Complete)', () => {
    it('should start tutorial session and initialize user progress', async () => {
      const startResult = await tutorialService.startTutorial(
        orgA.id,
        testExerciseA.id,
        userA.id,
        { mode: 'STEP_BY_STEP' },
      );

      expect(startResult).toBeDefined();
      expect(startResult.status).toBe('IN_PROGRESS');
      expect(startResult.currentMode).toBe('STEP_BY_STEP');
      expect(startResult.completedSections).toContain('OVERVIEW');
    });

    it('should record incremental progress (phase, step, checklist items)', async () => {
      const progressResult = await tutorialService.recordTutorialProgress(
        orgA.id,
        testExerciseA.id,
        userA.id,
        {
          mode: 'MOVEMENT_BREAKDOWN',
          phaseIndex: 2,
          stepIndex: 3,
          section: 'BREAKDOWN',
          checklistState: { 'chk-1': true, 'chk-2': true },
          practiceCompleted: false,
          timeSpentSeconds: 45,
        },
      );

      expect(progressResult).toBeDefined();
      expect(progressResult.currentMode).toBe('MOVEMENT_BREAKDOWN');
      expect(progressResult.currentPhaseIndex).toBe(2);
      expect(progressResult.currentStepIndex).toBe(3);
      expect(progressResult.checklistState['chk-1']).toBe(true);
      expect(progressResult.checklistState['chk-2']).toBe(true);
      expect(progressResult.completedSections).toContain('BREAKDOWN');
      expect(progressResult.timeSpentSeconds).toBe(45);
    });

    it('should record practice mode completion and checklist verification', async () => {
      const practiceResult = await tutorialService.recordTutorialProgress(
        orgA.id,
        testExerciseA.id,
        userA.id,
        {
          section: 'PRACTICE',
          checklistState: { 'chk-1': true, 'chk-2': true, 'chk-3': true, 'chk-4': true },
          practiceCompleted: true,
          timeSpentSeconds: 60,
        },
      );

      expect(practiceResult.practiceCompleted).toBe(true);
      expect(practiceResult.practiceCompletedAt).toBeDefined();
      expect(practiceResult.completedSections).toContain('PRACTICE');
      expect(practiceResult.timeSpentSeconds).toBe(105);
    });

    it('should complete tutorial, record score, and mark status COMPLETED', async () => {
      const completeResult = await tutorialService.completeTutorial(
        orgA.id,
        testExerciseA.id,
        userA.id,
        {
          knowledgeCheckScore: 100,
          timeSpentSeconds: 30,
        },
      );

      expect(completeResult).toBeDefined();
      expect(completeResult.status).toBe('COMPLETED');
      expect(completeResult.completedAt).toBeDefined();
      expect(completeResult.knowledgeCheckCompleted).toBe(true);
      expect(completeResult.knowledgeCheckScore).toBe(100);
      expect(completeResult.completedSections).toContain('COMPLETE');

      // Verify db state directly
      const dbProgress = await prisma.exerciseLearningProgress.findUniqueOrThrow({
        where: { userId_exerciseId: { userId: userA.id, exerciseId: testExerciseA.id } },
      });
      expect(dbProgress.status).toBe('COMPLETED');
      expect((dbProgress.tutorialProgress as any).knowledgeCheckScore).toBe(100);

      // Verify no WorkoutExercise record was created (pedagogical progression decoupled from workout logs)
      const workoutExCount = await prisma.workoutExercise.count({
        where: { exerciseId: testExerciseA.id },
      });
      expect(workoutExCount).toBe(0);
    });
  });

  // =========================================================================
  // 3. RELATED TUTORIAL RECOMMENDATIONS
  // =========================================================================

  describe('GET /exercises/:id/tutorial/related', () => {
    it('should return deterministic recommendations for same movement pattern', async () => {
      const related = await tutorialService.getRelatedTutorials(orgA.id, testExerciseA.id);

      expect(related).toBeDefined();
      expect(related.movementPattern).toBe('VERTICAL_PUSH');
      expect(related.primaryMuscle).toBe('SHOULDERS');
      expect(Array.isArray(related.related)).toBe(true);
    });
  });

  // =========================================================================
  // 4. TRAINER / ADMIN AUTHORING & RBAC
  // =========================================================================

  describe('PATCH /exercises/:id/tutorial (Trainer/Admin Tutorial Configuration)', () => {
    it('should forbid member from authoring tutorial config', async () => {
      await expect(
        tutorialService.updateTutorialConfig(orgA.id, testExerciseA.id, actorMemberA, {
          estimatedMinutes: 8,
        }),
      ).rejects.toThrow();
    });

    it('should allow trainer to author and update tutorial config', async () => {
      const updatedConfig = await tutorialService.updateTutorialConfig(
        orgA.id,
        testExerciseA.id,
        actorTrainerA,
        {
          estimatedMinutes: 6,
          audioGuidanceTranscript: 'Custom trainer coaching: maintain active hollow body.',
          keyTechniquePoints: [
            'Forearms vertical at start',
            'Full overhead reach with active scapular elevation',
          ],
        },
      );

      expect(updatedConfig).toBeDefined();
      expect((updatedConfig as any).estimatedMinutes).toBe(6);
      expect((updatedConfig as any).audioGuidanceTranscript).toContain('active hollow body');

      // Verify audit log was recorded
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'EXERCISE_TUTORIAL_CONFIG_UPDATED',
          resourceId: testExerciseA.id,
        },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.userId).toBe(actorTrainerA.id);
    });
  });

  // =========================================================================
  // 5. MULTI-TENANT ISOLATION & IDOR PROTECTION
  // =========================================================================

  describe('Multi-Tenant Isolation & IDOR Protection', () => {
    it('should prevent Tenant B member from viewing private exercise tutorial of Tenant A', async () => {
      await expect(
        tutorialService.getExerciseTutorial(orgB.id, testExerciseA.id, actorMemberB),
      ).rejects.toThrow();
    });

    it('should prevent Tenant B trainer from authoring tutorial config of Tenant A exercise', async () => {
      await expect(
        tutorialService.updateTutorialConfig(orgB.id, testExerciseA.id, actorTrainerB, {
          estimatedMinutes: 10,
        }),
      ).rejects.toThrow();
    });
  });
});
