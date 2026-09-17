import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, NotFoundException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ExercisesService } from '../src/exercises/services/exercises.service';
import { ExercisePersonalizationService } from '../src/exercises/services/exercise-personalization.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';
import { PersonalizedExerciseItem } from '../src/exercises/dto/exercise-personalization.dto';

describe('Day 68: Personalized Exercise Discovery & Smart Learning Foundation E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let exercisesService: ExercisesService;
  let personalizationService: ExercisePersonalizationService;

  let orgA: any;
  let orgB: any;
  let memberUserA: any;
  let actorMemberOrgA: AuthenticatedUser;
  let actorOwnerOrgB: AuthenticatedUser;

  let exHypertrophyBench: any;
  let exBodyweightPullUp: any;
  let exKettlebellSquat: any;
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
    personalizationService = app.get(ExercisePersonalizationService);

    orgA = await prisma.organisation.findFirstOrThrow({ where: { slug: 'second-wind' } });
    orgB = await prisma.organisation.findFirstOrThrow({ where: { slug: 'apex-strength' } });

    // Use an existing user from Org A (e.g. member@secondwind.com.au or owner@secondwind.com.au)
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

    // 1. Create Strength / Hypertrophy Barbell Bench Press in Org A
    exHypertrophyBench = await exercisesService.create(
      orgA.id,
      {
        name: `Day 68 Barbell Bench ${stamp}`,
        difficulty: 'INTERMEDIATE',
        exerciseType: 'STRENGTH',
        movementPattern: 'PUSH',
        primaryMuscleGroup: 'CHEST',
        equipmentType: 'BARBELL',
        description: 'Standard barbell bench press for chest hypertrophy and upper push strength',
      },
      actorMemberOrgA,
    );

    // 2. Create Bodyweight Pull Up in Org A
    exBodyweightPullUp = await exercisesService.create(
      orgA.id,
      {
        name: `Day 68 Calisthenic Pull Up ${stamp}`,
        difficulty: 'ADVANCED',
        exerciseType: 'STRENGTH',
        movementPattern: 'PULL',
        primaryMuscleGroup: 'BACK',
        equipmentType: 'BODYWEIGHT',
        description: 'Bodyweight vertical pulling movement',
      },
      actorMemberOrgA,
    );

    // 3. Create Kettlebell Squat in Org A
    exKettlebellSquat = await exercisesService.create(
      orgA.id,
      {
        name: `Day 68 Kettlebell Goblet Squat ${stamp}`,
        difficulty: 'BEGINNER',
        exerciseType: 'MOBILITY',
        movementPattern: 'SQUAT',
        primaryMuscleGroup: 'QUADRICEPS',
        equipmentType: 'KETTLEBELL',
        description: 'Functional squat pattern with kettlebell load',
      },
      actorMemberOrgA,
    );

    // 4. Create Org B Private Exercise
    orgBPrivateExercise = await exercisesService.create(
      orgB.id,
      {
        name: `Day 68 Org B Secret Exercise ${stamp}`,
        difficulty: 'EXPERT',
        exerciseType: 'STRENGTH',
        movementPattern: 'HINGE',
        primaryMuscleGroup: 'HAMSTRINGS',
        equipmentType: 'BARBELL',
        description: 'Exclusive private lift in Org B only',
      },
      actorOwnerOrgB,
    );
  });

  afterAll(async () => {
    const ids = [
      exHypertrophyBench?.id,
      exBodyweightPullUp?.id,
      exKettlebellSquat?.id,
      orgBPrivateExercise?.id,
    ].filter(Boolean);

    if (ids.length > 0) {
      await prisma.exerciseLearningProgress.deleteMany({ where: { exerciseId: { in: ids } } });
      await prisma.userExerciseRecentView.deleteMany({ where: { exerciseId: { in: ids } } });
      await prisma.userExerciseFavorite.deleteMany({ where: { exerciseId: { in: ids } } });
      await prisma.exercise.deleteMany({ where: { id: { in: ids } } });
    }

    if (memberUserA?.id) {
      await prisma.memberExercisePreference.deleteMany({ where: { userId: memberUserA.id } });
      await prisma.exerciseLearningProgress.deleteMany({ where: { userId: memberUserA.id } });
    }

    await app.close();
  });

  describe('1. Member Preferences Management', () => {
    it('should derive default preferences from user profile when no record exists', async () => {
      const prefs = await personalizationService.getPreferences(orgA.id, memberUserA.id);

      expect(prefs).toBeDefined();
      expect(prefs.userId).toBe(memberUserA.id);
      expect(prefs.fitnessGoals).toContain('STRENGTH');
      expect(prefs.preferredDifficulty).toBe('INTERMEDIATE');
      expect(Array.isArray(prefs.availableEquipment)).toBe(true);
    });

    it('should update member exercise preferences successfully', async () => {
      const updated = await personalizationService.updatePreferences(orgA.id, memberUserA.id, {
        fitnessGoals: ['BUILD_MUSCLE', 'INCREASE_STRENGTH'],
        preferredDifficulty: 'INTERMEDIATE',
        availableEquipment: ['BARBELL', 'DUMBBELL'],
        preferredCategories: ['STRENGTH'],
        workoutLocation: 'COMMERCIAL_GYM',
      });

      expect(updated.fitnessGoals).toEqual(
        expect.arrayContaining(['BUILD_MUSCLE', 'INCREASE_STRENGTH']),
      );
      expect(updated.availableEquipment).toEqual(
        expect.arrayContaining(['BARBELL', 'DUMBBELL']),
      );
      expect(updated.workoutLocation).toBe('COMMERCIAL_GYM');
    });

    it('should reset preferences to profile defaults', async () => {
      const reset = await personalizationService.resetPreferences(orgA.id, memberUserA.id);

      expect(reset).toBeDefined();
      expect(reset.fitnessGoals).toContain('STRENGTH');
      expect(reset.preferredDifficulty).toBe('INTERMEDIATE');
    });
  });

  describe('2. Deterministic Scoring & Personalized Discovery Hub', () => {
    it('should return personalized discovery sections for member', async () => {
      // Set explicit preferences tailored to Barbell & Strength
      await personalizationService.updatePreferences(orgA.id, memberUserA.id, {
        fitnessGoals: ['BUILD_MUSCLE'],
        preferredDifficulty: 'INTERMEDIATE',
        availableEquipment: ['BARBELL'],
        preferredCategories: ['STRENGTH'],
      });

      // Also record a favorite for the bench press
      await exercisesService.toggleFavorite(orgA.id, memberUserA.id, exHypertrophyBench.id);

      const discovery = await personalizationService.getPersonalizedDiscovery(
        orgA.id,
        memberUserA.id,
      );

      expect(discovery).toBeDefined();
      expect(discovery.forYou).toBeDefined();
      expect(discovery.forYou.length).toBeGreaterThan(0);

      // Verify that top For You exercise has deterministic reason tags
      const topForYou = discovery.forYou.find(
        (item: PersonalizedExerciseItem) => item.id === exHypertrophyBench.id,
      );
      expect(topForYou).toBeDefined();
      expect(topForYou!.reasonCode).toBeDefined();
      expect(topForYou!.reasonText).toBeDefined();

      // Verify Based on Goals section includes matching exercises
      expect(discovery.basedOnGoals.length).toBeGreaterThan(0);
      const goalMatches = discovery.basedOnGoals.map((i: PersonalizedExerciseItem) => i.id);
      expect(goalMatches).toContain(exHypertrophyBench.id);

      // Verify Based on Equipment section includes BARBELL exercises
      expect(discovery.basedOnEquipment.length).toBeGreaterThan(0);
      const equipMatches = discovery.basedOnEquipment.map((i: PersonalizedExerciseItem) => i.id);
      expect(equipMatches).toContain(exHypertrophyBench.id);

      // Verify Favorites section includes the favorited bench press
      const favMatches = discovery.favorites.map((i: PersonalizedExerciseItem) => i.id);
      expect(favMatches).toContain(exHypertrophyBench.id);

      // Verify Explore New section contains unviewed exercises
      expect(discovery.exploreNew.length).toBeGreaterThan(0);
    });
  });

  describe('3. Smart Learning Progress Lifecycle', () => {
    it('should return not-started learning progress initially for Kettlebell Squat', async () => {
      const progress = await personalizationService.getLearningProgress(
        orgA.id,
        memberUserA.id,
        exKettlebellSquat.id,
      );

      expect(progress.status).toBe('NOT_STARTED');
      expect(progress.completedSteps).toBe(0);
    });

    it('should start and update learning progress to IN_PROGRESS', async () => {
      const updated = await personalizationService.updateLearningProgress(
        orgA.id,
        memberUserA.id,
        exKettlebellSquat.id,
        {
          stepNumber: 2,
          completedSteps: 2,
          totalSteps: 5,
          mediaViewed: true,
          instructionsViewed: true,
          phasesExplored: true,
        },
      );

      expect(updated).toBeDefined();
      expect(updated.status).toBe('IN_PROGRESS');
      expect(updated.lastStepNumber).toBe(2);
      expect(updated.completedSteps).toBe(2);
      expect(updated.mediaViewed).toBe(true);
      expect(updated.phasesExplored).toBe(true);
    });

    it('should reflect active learning exercise in Continue Learning section', async () => {
      const discovery = await personalizationService.getPersonalizedDiscovery(
        orgA.id,
        memberUserA.id,
      );

      expect(discovery.continueLearning.length).toBeGreaterThan(0);
      const continueIds = discovery.continueLearning.map((i: PersonalizedExerciseItem) => i.id);
      expect(continueIds).toContain(exKettlebellSquat.id);

      const kettlebellItem = discovery.continueLearning.find(
        (i: PersonalizedExerciseItem) => i.id === exKettlebellSquat.id,
      );
      expect(kettlebellItem?.learningProgress).toBeDefined();
      expect(kettlebellItem?.learningProgress?.status).toBe('IN_PROGRESS');
      expect(kettlebellItem?.learningProgress?.lastStepNumber).toBe(2);
    });

    it('should mark learning as COMPLETED with timestamp', async () => {
      const completed = await personalizationService.updateLearningProgress(
        orgA.id,
        memberUserA.id,
        exKettlebellSquat.id,
        {
          isComplete: true,
          completedSteps: 5,
          stepNumber: 5,
          totalSteps: 5,
        },
      );

      expect(completed.status).toBe('COMPLETED');
      expect(completed.completedAt).toBeDefined();

      // Now verify that Continue Learning section only shows active in-progress items
      const discovery = await personalizationService.getPersonalizedDiscovery(
        orgA.id,
        memberUserA.id,
      );
      const continueIds = discovery.continueLearning.map((i: PersonalizedExerciseItem) => i.id);
      expect(continueIds).not.toContain(exKettlebellSquat.id);
    });
  });

  describe('4. Zero-Trust IDOR & Multi-Tenant Isolation', () => {
    it('should reject learning progress access to private exercise belonging to another organisation', async () => {
      await expect(
        personalizationService.getLearningProgress(
          orgA.id,
          memberUserA.id,
          orgBPrivateExercise.id,
        ),
      ).rejects.toThrow(NotFoundException);

      await expect(
        personalizationService.updateLearningProgress(
          orgA.id,
          memberUserA.id,
          orgBPrivateExercise.id,
          {
            stepNumber: 1,
          },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should never include another organisation private exercise in personalized discovery sections', async () => {
      const discovery = await personalizationService.getPersonalizedDiscovery(
        orgA.id,
        memberUserA.id,
      );

      const allDiscoveredIds = [
        ...discovery.forYou,
        ...discovery.basedOnGoals,
        ...discovery.basedOnEquipment,
        ...discovery.continueLearning,
        ...discovery.favorites,
        ...discovery.recentlyViewed,
        ...discovery.exploreNew,
      ].map((item: PersonalizedExerciseItem) => item.id);

      expect(allDiscoveredIds).not.toContain(orgBPrivateExercise.id);
    });
  });
});
