import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ExercisesService } from '../src/exercises/services/exercises.service';
import { ExerciseCollectionsLearningPathsService } from '../src/exercises/services/exercise-collections-learning-paths.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Day 70: Exercise Collections, Programs & Guided Learning Paths E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let exercisesService: ExercisesService;
  let collectionsPathsService: ExerciseCollectionsLearningPathsService;

  let orgA: any;
  let orgB: any;
  let memberUserA: any;
  let actorMemberOrgA: AuthenticatedUser;
  let actorOwnerOrgB: AuthenticatedUser;

  let exBenchPress: any;
  let exInclineDumbbell: any;
  let exTricepDip: any;
  let orgBPrivateExercise: any;

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

    // 1. Setup exercises in Org A
    exBenchPress = await exercisesService.create(
      orgA.id,
      {
        name: `Day 70 Barbell Bench Press ${stamp}`,
        difficulty: 'INTERMEDIATE',
        exerciseType: 'STRENGTH',
        movementPattern: 'PUSH',
        primaryMuscleGroup: 'CHEST',
        equipmentType: 'BARBELL',
        description: 'Foundational horizontal press for chest and triceps strength',
      },
      actorMemberOrgA,
    );

    exInclineDumbbell = await exercisesService.create(
      orgA.id,
      {
        name: `Day 70 Incline DB Press ${stamp}`,
        difficulty: 'INTERMEDIATE',
        exerciseType: 'STRENGTH',
        movementPattern: 'PUSH',
        primaryMuscleGroup: 'CHEST',
        equipmentType: 'DUMBBELL',
        description: 'Upper chest pressing variation with dumbbells',
      },
      actorMemberOrgA,
    );

    exTricepDip = await exercisesService.create(
      orgA.id,
      {
        name: `Day 70 Parallel Bar Dip ${stamp}`,
        difficulty: 'ADVANCED',
        exerciseType: 'STRENGTH',
        movementPattern: 'PUSH',
        primaryMuscleGroup: 'CHEST',
        equipmentType: 'BODYWEIGHT',
        description: 'Bodyweight pressing finisher targeting lower chest and triceps',
      },
      actorMemberOrgA,
    );

    // 2. Setup private exercise in Org B
    orgBPrivateExercise = await exercisesService.create(
      orgB.id,
      {
        name: `Day 70 Org B Exclusive Press ${stamp}`,
        difficulty: 'ADVANCED',
        exerciseType: 'STRENGTH',
        movementPattern: 'PUSH',
        primaryMuscleGroup: 'CHEST',
        equipmentType: 'BARBELL',
        description: 'Confidential exercise for Org B',
      },
      actorOwnerOrgB,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  // =========================================================================
  // TEST SUITE 1: EXERCISE COLLECTIONS
  // =========================================================================
  describe('Exercise Collections Domain', () => {
    let createdCollectionId: string;
    const stamp = Date.now();

    it('should create a curated exercise collection with ordered items and metadata', async () => {
      const collection = await collectionsPathsService.createCollection(
        orgA.id,
        memberUserA.id,
        {
          title: `Upper Body Push Foundations ${stamp}`,
          description: 'A structured curation of primary and accessory pressing movements',
          category: 'STRENGTH',
          difficulty: 'INTERMEDIATE',
          primaryMuscleGroup: 'CHEST',
          equipmentType: 'BARBELL',
          featured: true,
          items: [
            {
              exerciseId: exBenchPress.id,
              sectionTitle: 'Primary Compound',
              sortOrder: 0,
              customTitle: 'The Main Lift: Barbell Bench Press',
              learningObjective: 'Master scapular retraction and bar path under load',
            },
            {
              exerciseId: exInclineDumbbell.id,
              sectionTitle: 'Accessory Movement',
              sortOrder: 1,
              customTitle: 'Clavicular Head Hypertrophy: Incline DB Press',
              learningObjective: 'Focus on full pectoral stretch at 30-degree incline',
            },
            {
              exerciseId: exTricepDip.id,
              sectionTitle: 'Compound Finisher',
              sortOrder: 2,
              customTitle: 'Bodyweight Mastery: Dips',
              learningObjective: 'Controlled descent without shoulder impingement',
            },
          ],
        },
        'ORGANISATION',
      );

      expect(collection).toBeDefined();
      expect(collection.id).toBeDefined();
      expect(collection.title).toContain('Upper Body Push Foundations');
      expect(collection.exerciseCount).toBe(3);
      expect(collection.items).toHaveLength(3);

      // Verify strict sequential ordering
      expect(collection.items[0].sortOrder).toBe(0);
      expect(collection.items[0].exerciseId).toBe(exBenchPress.id);
      expect(collection.items[0].exercise.name).toBe('The Main Lift: Barbell Bench Press');

      expect(collection.items[1].sortOrder).toBe(1);
      expect(collection.items[1].exerciseId).toBe(exInclineDumbbell.id);

      expect(collection.items[2].sortOrder).toBe(2);
      expect(collection.items[2].exerciseId).toBe(exTricepDip.id);

      createdCollectionId = collection.id;
    });

    it('should list collections with pagination and filtering by category and muscle group', async () => {
      const result = await collectionsPathsService.findCollections(orgA.id, {
        category: 'STRENGTH',
        primaryMuscleGroup: 'CHEST',
        page: 1,
        limit: 10,
      });

      expect(result.items.length).toBeGreaterThanOrEqual(1);
      const matched = result.items.find((c) => c.id === createdCollectionId);
      expect(matched).toBeDefined();
      expect(matched?.category).toBe('STRENGTH');
      expect(matched?.primaryMuscleGroup).toBe('CHEST');
      expect(matched?.exerciseCount).toBe(3);
      expect(matched?.previewExercises.length).toBeGreaterThan(0);
    });

    it('should update collection metadata and replace items sequence atomically', async () => {
      // 1. Update metadata
      const updatedMeta = await collectionsPathsService.updateCollection(
        orgA.id,
        memberUserA.id,
        createdCollectionId,
        {
          description: 'Updated description: Elite pressing curriculum',
          featured: true,
        },
      );
      expect(updatedMeta.description).toBe('Updated description: Elite pressing curriculum');

      // 2. Reorder items: Swap Bench and Incline DB
      const reordered = await collectionsPathsService.setCollectionItems(
        orgA.id,
        memberUserA.id,
        createdCollectionId,
        {
          items: [
            {
              exerciseId: exInclineDumbbell.id,
              sectionTitle: 'Warmup Pre-exhaust',
              sortOrder: 0,
            },
            {
              exerciseId: exBenchPress.id,
              sectionTitle: 'Heavy Working Sets',
              sortOrder: 1,
            },
          ],
        },
      );

      expect(reordered.exerciseCount).toBe(2);
      expect(reordered.items[0].exerciseId).toBe(exInclineDumbbell.id);
      expect(reordered.items[1].exerciseId).toBe(exBenchPress.id);
    });
  });

  // =========================================================================
  // TEST SUITE 2: GUIDED LEARNING PATHS & PROGRESS
  // =========================================================================
  describe('Guided Learning Paths Domain & Progress Lifecycle', () => {
    let createdPathId: string;
    let lesson1Id: string;
    let lesson2Id: string;
    let lesson3Id: string;
    let lesson4Id: string;
    const stamp = Date.now();

    it('should create a structured multi-section learning path with lessons and exercises', async () => {
      const path = await collectionsPathsService.createLearningPath(
        orgA.id,
        memberUserA.id,
        {
          title: `Mastering the Barbell Bench Press ${stamp}`,
          description: 'A comprehensive step-by-step masterclass on optimal bench press biomechanics, setup, and safety',
          category: 'SKILL_MASTERY',
          difficulty: 'INTERMEDIATE',
          primaryGoal: 'TECHNIQUE',
          estimatedDurationMinutes: 45,
          featured: true,
          sections: [
            {
              title: 'Phase 1: Setup, Arch & Stability',
              description: 'Laying the foundation on the bench before moving any weight',
              sortOrder: 0,
              lessons: [
                {
                  title: 'Scapular Retraction & Grip Width',
                  description: 'How to lock the upper back into the bench and establish consistent grip width',
                  sortOrder: 0,
                  lessonType: 'CONCEPT_LESSON',
                  learningObjective: 'Establish a rigid base of support using the latissimus dorsi and rhomboids',
                  estimatedMinutes: 5,
                  isRequired: true,
                  keyTakeaways: [
                    'Pinch shoulder blades together and down into back pockets',
                    'Maintain consistent ring-finger or index-finger alignment on knurling marks',
                  ],
                },
                {
                  title: 'Leg Drive & Pelvic Position',
                  description: 'Connecting feet to the floor to create whole-body kinetic chain tension',
                  sortOrder: 1,
                  lessonType: 'MOVEMENT_LESSON',
                  exerciseId: exBenchPress.id,
                  learningObjective: 'Direct ground reaction force backwards through the torso into the traps',
                  estimatedMinutes: 7,
                  isRequired: true,
                  keyTakeaways: [
                    'Keep heels planted firmly',
                    'Glutes must remain in continuous contact with the bench pad',
                  ],
                },
              ],
            },
            {
              title: 'Phase 2: Execution, Touchpoint & Lockout',
              description: 'Controlling the bar path during descent and explosive concentric recovery',
              sortOrder: 1,
              lessons: [
                {
                  title: 'The Eccentric Descent & Bar Path',
                  description: 'Controlled lowering to the lower sternum at a natural 45-75 degree elbow angle',
                  sortOrder: 2,
                  lessonType: 'EXERCISE_LESSON',
                  exerciseId: exBenchPress.id,
                  learningObjective: 'Eliminate bar bounce and maintain lat engagement at the bottom touchpoint',
                  estimatedMinutes: 8,
                  isRequired: true,
                  keyTakeaways: [
                    'Do not flare elbows out at 90 degrees',
                    'Touch lower chest smoothly without losing chest height',
                  ],
                },
                {
                  title: 'Spotter Communication & Emergency Bailout',
                  description: 'Crucial safety procedures and spotter communication commands',
                  sortOrder: 3,
                  lessonType: 'REVIEW',
                  learningObjective: 'Understand safe lift-off cues and safety pin adjustment in the power rack',
                  estimatedMinutes: 5,
                  isRequired: true,
                  keyTakeaways: [
                    'Always set safety pins just below chest arch height',
                    'Never use a thumbless suicide grip when training without safeties',
                  ],
                },
              ],
            },
          ],
        },
        'ORGANISATION',
      );

      expect(path).toBeDefined();
      expect(path.id).toBeDefined();
      expect(path.title).toContain('Mastering the Barbell Bench Press');
      expect(path.sections).toHaveLength(2);
      expect(path.lessons).toHaveLength(4);
      expect(path.lessonCount).toBe(4);

      // Verify progress initialized to NOT_STARTED for the member
      expect(path.progress.status).toBe('NOT_STARTED');
      expect(path.progress.completedLessons).toBe(0);
      expect(path.progress.percentComplete).toBe(0);
      expect(path.nextLessonId).toBe(path.lessons[0].id);

      createdPathId = path.id;
      lesson1Id = path.lessons[0].id;
      lesson2Id = path.lessons[1].id;
      lesson3Id = path.lessons[2].id;
      lesson4Id = path.lessons[3].id;
    });

    it('should get detailed lesson content with prev/next navigation pointers', async () => {
      const lesson = await collectionsPathsService.getLesson(
        orgA.id,
        memberUserA.id,
        createdPathId,
        lesson2Id,
      );

      expect(lesson).toBeDefined();
      expect(lesson.id).toBe(lesson2Id);
      expect(lesson.title).toBe('Leg Drive & Pelvic Position');
      expect(lesson.previousLessonId).toBe(lesson1Id);
      expect(lesson.nextLessonId).toBe(lesson3Id);
      expect(lesson.position.current).toBe(2);
      expect(lesson.position.total).toBe(4);
      expect(lesson.isCompleted).toBe(false);
      expect(lesson.exercise).toBeDefined();
      expect(lesson.exercise?.id).toBe(exBenchPress.id);
    });

    it('should complete lessons step-by-step and advance progress percentage and resume pointer', async () => {
      // 1. Complete Lesson 1
      const step1Result = await collectionsPathsService.completeLesson(
        orgA.id,
        memberUserA.id,
        createdPathId,
        lesson1Id,
        { notes: 'Understood shoulder blade positioning' },
      );

      expect(step1Result.success).toBe(true);
      expect(step1Result.pathProgress.status).toBe('IN_PROGRESS');
      expect(step1Result.pathProgress.completedLessons).toBe(1);
      expect(step1Result.pathProgress.percentComplete).toBe(25);
      expect(step1Result.nextLessonId).toBe(lesson2Id);

      // Idempotency check: completing lesson 1 again should not increment or corrupt count
      const idempotentStep1 = await collectionsPathsService.completeLesson(
        orgA.id,
        memberUserA.id,
        createdPathId,
        lesson1Id,
      );
      expect(idempotentStep1.pathProgress.completedLessons).toBe(1);
      expect(idempotentStep1.pathProgress.percentComplete).toBe(25);

      // 2. Complete Lesson 2
      const step2Result = await collectionsPathsService.completeLesson(
        orgA.id,
        memberUserA.id,
        createdPathId,
        lesson2Id,
      );
      expect(step2Result.pathProgress.completedLessons).toBe(2);
      expect(step2Result.pathProgress.percentComplete).toBe(50);
      expect(step2Result.nextLessonId).toBe(lesson3Id);

      // 3. Complete Lesson 3 & 4 to finish path
      await collectionsPathsService.completeLesson(
        orgA.id,
        memberUserA.id,
        createdPathId,
        lesson3Id,
      );

      const finalStep = await collectionsPathsService.completeLesson(
        orgA.id,
        memberUserA.id,
        createdPathId,
        lesson4Id,
      );

      expect(finalStep.pathProgress.status).toBe('COMPLETED');
      expect(finalStep.pathProgress.completedLessons).toBe(4);
      expect(finalStep.pathProgress.percentComplete).toBe(100);
      expect(finalStep.pathProgress.completedAt).toBeDefined();
      expect(finalStep.nextLessonId).toBeNull();

      // Check path detail shows completed status
      const updatedPath = await collectionsPathsService.findLearningPathById(
        orgA.id,
        memberUserA.id,
        createdPathId,
      );
      expect(updatedPath.progress.status).toBe('COMPLETED');
      expect(updatedPath.progress.percentComplete).toBe(100);
      expect(updatedPath.lessons.every((l) => l.isCompleted)).toBe(true);
    });

    it('should reset member progress to start learning path over', async () => {
      const resetResult = await collectionsPathsService.resetPathProgress(
        orgA.id,
        memberUserA.id,
        createdPathId,
      );

      expect(resetResult.success).toBe(true);
      expect(resetResult.status).toBe('NOT_STARTED');

      const pathAfterReset = await collectionsPathsService.findLearningPathById(
        orgA.id,
        memberUserA.id,
        createdPathId,
      );
      expect(pathAfterReset.progress.status).toBe('NOT_STARTED');
      expect(pathAfterReset.progress.completedLessons).toBe(0);
      expect(pathAfterReset.progress.percentComplete).toBe(0);
      expect(pathAfterReset.lessons.every((l) => !l.isCompleted)).toBe(true);
    });

    it('should strictly maintain decoupling between learning lessons and workout execution', async () => {
      // Complete lesson 1
      await collectionsPathsService.completeLesson(
        orgA.id,
        memberUserA.id,
        createdPathId,
        lesson1Id,
      );

      // Assert that no Workout or WorkoutExercise was created or logged for this lesson
      const workoutCount = await prisma.workout.count({
        where: {
          memberProfile: { userId: memberUserA.id },
          title: { contains: 'Barbell Bench Press' },
        },
      });
      // Completing an educational lesson should never generate a physical workout session
      expect(workoutCount).toBe(0);
    });
  });

  // =========================================================================
  // TEST SUITE 3: CROSS-LINKING & MULTI-TENANT ISOLATION
  // =========================================================================
  describe('Cross-Linking & Multi-Tenant Isolation', () => {
    it('should discover related collections and learning paths containing a given exercise', async () => {
      const related = await collectionsPathsService.getRelatedCollectionsAndPathsForExercise(
        orgA.id,
        exBenchPress.id,
        memberUserA.id,
      );

      expect(related.exerciseId).toBe(exBenchPress.id);
      expect(related.collections.length).toBeGreaterThanOrEqual(1);
      expect(related.learningPaths.length).toBeGreaterThanOrEqual(1);

      const foundCollection = related.collections.find((c) => c.title.includes('Upper Body Push'));
      expect(foundCollection).toBeDefined();

      const foundPath = related.learningPaths.find((p) => p.title.includes('Mastering the Barbell Bench Press'));
      expect(foundPath).toBeDefined();
    });

    it('should prevent cross-tenant access to collections and paths (IDOR protection)', async () => {
      // 1. Create a private collection in Org B
      const orgBCollection = await collectionsPathsService.createCollection(
        orgB.id,
        actorOwnerOrgB.id,
        {
          title: 'Org B Secret Powerlifting Protocol',
          category: 'STRENGTH',
          items: [
            {
              exerciseId: orgBPrivateExercise.id,
              sortOrder: 0,
            },
          ],
        },
        'ORGANISATION',
      );

      // 2. Org A user attempting to access Org B collection directly should get 404 (or 403)
      await expect(
        collectionsPathsService.findCollectionById(orgA.id, orgBCollection.id),
      ).rejects.toThrow(NotFoundException);

      // 3. Org A user attempting to modify Org B collection should get 403 Forbidden
      await expect(
        collectionsPathsService.updateCollection(
          orgA.id,
          memberUserA.id,
          orgBCollection.id,
          { title: 'Hacked title' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
