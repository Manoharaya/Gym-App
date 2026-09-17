import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  NotFoundException,
} from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ExercisesService } from '../src/exercises/services/exercises.service';
import { ExerciseMetadataService } from '../src/exercises/services/exercise-metadata.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Day 67: Member Visual Exercise Library & Discovery Experience E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let exercisesService: ExercisesService;
  let metadataService: ExerciseMetadataService;

  let orgA: any;
  let orgB: any;
  let actorOwnerOrgA: AuthenticatedUser;
  let actorOwnerOrgB: AuthenticatedUser;

  let exBenchPress: any;
  let exPullUp: any;
  let exGobletSquat: any;
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
    metadataService = app.get(ExerciseMetadataService);

    orgA = await prisma.organisation.findFirstOrThrow({ where: { slug: 'second-wind' } });
    orgB = await prisma.organisation.findFirstOrThrow({ where: { slug: 'apex-strength' } });

    const ownerUserA = await prisma.user.findFirstOrThrow({ where: { email: 'owner@secondwind.com.au' } });
    actorOwnerOrgA = {
      id: ownerUserA.id,
      email: ownerUserA.email,
      firstName: ownerUserA.firstName,
      lastName: ownerUserA.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'ORGANISATION_OWNER', organisationId: orgA.id }],
      permissions: [{ resource: '*', action: 'MANAGE', scope: 'ORGANISATION' }],
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

    // 1. Create Bench Press in Org A (Strength, Push, Chest, Barbell)
    exBenchPress = await exercisesService.create(
      orgA.id,
      {
        name: `Day 67 Barbell Bench Press ${stamp}`,
        difficulty: 'INTERMEDIATE',
        exerciseType: 'STRENGTH',
        movementPattern: 'PUSH',
        primaryMuscleGroup: 'CHEST',
        equipmentType: 'BARBELL',
        description: 'Classic horizontal barbell chest press for upper body power',
      },
      actorOwnerOrgA,
    );
    await metadataService.updateClassification(orgA.id, exBenchPress.id, {
      exerciseCategory: 'STRENGTH',
      exerciseMechanics: 'COMPOUND',
    }, actorOwnerOrgA);

    // 2. Create Pull-up in Org A (Strength, Pull, Back, Bodyweight)
    exPullUp = await exercisesService.create(
      orgA.id,
      {
        name: `Day 67 Strict Pull Up ${stamp}`,
        difficulty: 'ADVANCED',
        exerciseType: 'STRENGTH',
        movementPattern: 'PULL',
        primaryMuscleGroup: 'BACK',
        equipmentType: 'BODYWEIGHT',
        description: 'Upper body vertical pull using bodyweight bar',
      },
      actorOwnerOrgA,
    );
    await metadataService.updateClassification(orgA.id, exPullUp.id, {
      exerciseCategory: 'STRENGTH',
      exerciseMechanics: 'COMPOUND',
    }, actorOwnerOrgA);

    // 3. Create Goblet Squat in Org A (Mobility / Functional, Squat, Quads, Kettlebell)
    exGobletSquat = await exercisesService.create(
      orgA.id,
      {
        name: `Day 67 Mobility Goblet Squat ${stamp}`,
        difficulty: 'BEGINNER',
        exerciseType: 'MOBILITY',
        movementPattern: 'SQUAT',
        primaryMuscleGroup: 'QUADRICEPS',
        equipmentType: 'KETTLEBELL',
        description: 'Deep mobility squat holding kettlebell close to chest',
      },
      actorOwnerOrgA,
    );
    await metadataService.updateClassification(orgA.id, exGobletSquat.id, {
      exerciseCategory: 'MOBILITY',
      exerciseMechanics: 'COMPOUND',
    }, actorOwnerOrgA);

    // 4. Create Org B Private Exercise
    orgBPrivateExercise = await exercisesService.create(
      orgB.id,
      {
        name: `Day 67 Org B Secret Lift ${stamp}`,
        difficulty: 'EXPERT',
        exerciseType: 'STRENGTH',
        movementPattern: 'HINGE',
        primaryMuscleGroup: 'HAMSTRINGS',
        equipmentType: 'BARBELL',
        description: 'Confidential custom exercise exclusive to Org B',
      },
      actorOwnerOrgB,
    );
  });

  afterAll(async () => {
    // Cleanup created test records
    const ids = [exBenchPress?.id, exPullUp?.id, exGobletSquat?.id, orgBPrivateExercise?.id].filter(Boolean);
    if (ids.length > 0) {
      await prisma.userExerciseRecentView.deleteMany({ where: { exerciseId: { in: ids } } });
      await prisma.userExerciseFavorite.deleteMany({ where: { exerciseId: { in: ids } } });
      await prisma.exerciseMuscleRelation.deleteMany({ where: { exerciseId: { in: ids } } });
      await prisma.exerciseEquipmentRelation.deleteMany({ where: { exerciseId: { in: ids } } });
      await prisma.exerciseMedia.deleteMany({ where: { exerciseId: { in: ids } } });
      await prisma.exercise.deleteMany({ where: { id: { in: ids } } });
    }
    await app.close();
  });

  describe('1. Dynamic Filter Metadata', () => {
    it('should return aggregated categories, muscles, equipment, and counts for active exercises', async () => {
      const metadata = await exercisesService.getFilterMetadata(orgA.id);

      expect(metadata).toBeDefined();
      expect(metadata.totalCount).toBeGreaterThanOrEqual(3);
      expect(Array.isArray(metadata.categories)).toBe(true);
      expect(Array.isArray(metadata.muscleGroups)).toBe(true);
      expect(Array.isArray(metadata.equipment)).toBe(true);
      expect(Array.isArray(metadata.difficulties)).toBe(true);
      expect(Array.isArray(metadata.movementPatterns)).toBe(true);

      const mobilityCat = metadata.categories.find((c: any) => c.id === 'MOBILITY');
      expect(mobilityCat).toBeDefined();
      expect(mobilityCat!.count).toBeGreaterThanOrEqual(1);

      const squatPat = metadata.movementPatterns.find((p: any) => p.id === 'SQUAT');
      expect(squatPat).toBeDefined();
      expect(squatPat!.count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. Multi-Filter & Search Queries', () => {
    it('should filter exercises by category and movement pattern', async () => {
      const results = await exercisesService.findAll(orgA.id, {
        exerciseCategory: 'MOBILITY',
        movementPattern: 'SQUAT',
      });

      expect(results.items.some((e: any) => e.id === exGobletSquat.id)).toBe(true);
      expect(results.items.some((e: any) => e.id === exBenchPress.id)).toBe(false);
    });

    it('should sort exercises alphabetically', async () => {
      const results = await exercisesService.findAll(orgA.id, {
        sortBy: 'ALPHABETICAL',
        limit: 10,
      });

      expect(results.items.length).toBeGreaterThanOrEqual(2);
      for (let i = 0; i < results.items.length - 1; i++) {
        expect(results.items[i].name.localeCompare(results.items[i + 1].name)).toBeLessThanOrEqual(0);
      }
    });

    it('should search exercises by multiple keywords across name and description', async () => {
      const results = await exercisesService.findAll(orgA.id, {
        search: 'horizontal chest upper',
      });

      expect(results.items.some((e: any) => e.id === exBenchPress.id)).toBe(true);
      expect(results.items.some((e: any) => e.id === exPullUp.id)).toBe(false);
    });
  });

  describe('3. User Favorites Bookmarking & Shelves', () => {
    it('should toggle favorite bookmark on and off for a user', async () => {
      const userId = actorOwnerOrgA.id;

      // 1. Toggle ON
      const resOn = await exercisesService.toggleFavorite(orgA.id, userId, exBenchPress.id);
      expect(resOn.isFavorite).toBe(true);
      expect(resOn.exerciseId).toBe(exBenchPress.id);

      // 2. Query findAll with userId to verify isFavorite flag
      const listAfterFav = await exercisesService.findAll(orgA.id, { search: exBenchPress.name }, userId);
      const foundItem = listAfterFav.items.find((e: any) => e.id === exBenchPress.id);
      expect(foundItem).toBeDefined();
      expect(foundItem!.isFavorite).toBe(true);

      // 3. Query getFavorites
      const favsList = await exercisesService.getFavorites(orgA.id, userId);
      expect(favsList.items.some((e: any) => e.id === exBenchPress.id)).toBe(true);

      // 4. Query findAll with isFavorite=true
      const onlyFavs = await exercisesService.findAll(orgA.id, { isFavorite: true }, userId);
      expect(onlyFavs.items.every((e: any) => e.isFavorite === true)).toBe(true);

      // 5. Toggle OFF
      const resOff = await exercisesService.toggleFavorite(orgA.id, userId, exBenchPress.id);
      expect(resOff.isFavorite).toBe(false);

      // 6. Verify removed from favorites
      const favsAfter = await exercisesService.getFavorites(orgA.id, userId);
      expect(favsAfter.items.some((e: any) => e.id === exBenchPress.id)).toBe(false);
    });
  });

  describe('4. Recent View Tracking', () => {
    it('should record recent exercise views and return them in chronological order', async () => {
      const userId = actorOwnerOrgA.id;

      // View Goblet Squat first, then Pull-up
      await exercisesService.recordRecentView(orgA.id, userId, exGobletSquat.id);
      await exercisesService.recordRecentView(orgA.id, userId, exPullUp.id);

      const recentViews = await exercisesService.getRecentlyViewed(orgA.id, userId, 5);
      expect(recentViews.items.length).toBeGreaterThanOrEqual(2);
      expect(recentViews.items[0].id).toBe(exPullUp.id);
      expect(recentViews.items[1].id).toBe(exGobletSquat.id);
    });
  });

  describe('5. Multi-Tenant Isolation & IDOR Protection', () => {
    it('should prevent Org A users from viewing or favoriting private exercises of Org B', async () => {
      const userIdA = actorOwnerOrgA.id;

      // Org A cannot toggle favorite on Org B private exercise
      await expect(
        exercisesService.toggleFavorite(orgA.id, userIdA, orgBPrivateExercise.id),
      ).rejects.toThrow(NotFoundException);

      // Org A cannot record view on Org B private exercise
      await expect(
        exercisesService.recordRecentView(orgA.id, userIdA, orgBPrivateExercise.id),
      ).rejects.toThrow(NotFoundException);

      // Org A discovery search cannot see Org B private exercise
      const orgAList = await exercisesService.findAll(orgA.id, { search: orgBPrivateExercise.name });
      expect(orgAList.items.some((e: any) => e.id === orgBPrivateExercise.id)).toBe(false);
    });
  });
});
