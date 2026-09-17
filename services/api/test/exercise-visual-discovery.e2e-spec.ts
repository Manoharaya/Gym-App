import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ExercisesService } from '../src/exercises/services/exercises.service';
import { ExerciseVisualDiscoveryService } from '../src/exercises/services/exercise-visual-discovery.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Day 69: Advanced Visual Exercise Discovery, Muscle & Equipment Explorer E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let exercisesService: ExercisesService;
  let discoveryService: ExerciseVisualDiscoveryService;

  let orgA: any;
  let orgB: any;
  let memberUserA: any;
  let actorMemberOrgA: AuthenticatedUser;

  let testChestExercise: any;
  let testNoEquipExercise: any;
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
    discoveryService = app.get(ExerciseVisualDiscoveryService);

    orgA = await prisma.organisation.findFirstOrThrow({ where: { slug: 'second-wind' } });
    orgB = await prisma.organisation.findFirstOrThrow({ where: { slug: 'apex-strength' } });

    memberUserA =
      (await prisma.user.findFirst({ where: { email: 'member@secondwind.com.au' } })) ||
      (await prisma.user.findFirstOrThrow({ where: { email: 'owner@secondwind.com.au' } }));

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

    const stamp = Date.now();

    // Create a Chest Dumbbell exercise in Org A
    testChestExercise = await exercisesService.create(
      orgA.id,
      {
        name: `Day 69 Dumbbell Incline Bench ${stamp}`,
        difficulty: 'INTERMEDIATE',
        exerciseType: 'STRENGTH',
        movementPattern: 'PUSH',
        primaryMuscleGroup: 'CHEST',
        equipmentType: 'DUMBBELL',
        description: 'Incline dumbbell bench press targeting the clavicular head of the pectorals',
      },
      actorMemberOrgA,
    );

    // Attach explicit muscle relation
    await prisma.exerciseMuscleRelation.create({
      data: {
        exerciseId: testChestExercise.id,
        muscleGroup: 'UPPER_BODY',
        muscle: 'CHEST',
        role: 'PRIMARY',
        activationLevel: 'HIGH',
      },
    });

    // Create a No-Equipment Core exercise in Org A
    testNoEquipExercise = await exercisesService.create(
      orgA.id,
      {
        name: `Day 69 Bodyweight Plank ${stamp}`,
        difficulty: 'BEGINNER',
        exerciseType: 'CORE',
        movementPattern: 'ISOMETRIC',
        primaryMuscleGroup: 'CORE',
        equipmentType: 'BODYWEIGHT',
        description: 'Isometric prone plank for anti-extension core stability without machinery',
      },
      actorMemberOrgA,
    );

    // Create private exercise in Org B
    const ownerUserB = await prisma.user.findFirstOrThrow({ where: { email: 'owner@apexstrength.com.au' } });
    orgBPrivateExercise = await exercisesService.create(
      orgB.id,
      {
        name: `Day 69 Apex Vault Exercise ${stamp}`,
        difficulty: 'EXPERT',
        exerciseType: 'STRENGTH',
        movementPattern: 'HINGE',
        primaryMuscleGroup: 'GLUTES',
        equipmentType: 'BARBELL',
        description: 'Confidential proprietary exercise belonging exclusively to Apex Strength',
      },
      {
        id: ownerUserB.id,
        email: ownerUserB.email,
        firstName: ownerUserB.firstName,
        lastName: ownerUserB.lastName,
        status: 'ACTIVE',
        isSuperAdmin: false,
        roles: [{ role: 'ORGANISATION_OWNER', organisationId: orgB.id }],
        permissions: [{ resource: '*', action: 'MANAGE', scope: 'ORGANISATION' }],
      },
    );
  }, 60000);

  afterAll(async () => {
    if (testChestExercise) {
      await prisma.exerciseMuscleRelation.deleteMany({ where: { exerciseId: testChestExercise.id } });
      await prisma.exercise.deleteMany({ where: { id: testChestExercise.id } });
    }
    if (testNoEquipExercise) {
      await prisma.exercise.deleteMany({ where: { id: testNoEquipExercise.id } });
    }
    if (orgBPrivateExercise) {
      await prisma.exercise.deleteMany({ where: { id: orgBPrivateExercise.id } });
    }
    await app.close();
  });

  describe('1. Discovery Landing Overview', () => {
    it('should aggregate real server-side counts across all discovery dimensions', async () => {
      const overview = await discoveryService.getDiscoveryOverview(orgA.id);

      expect(overview).toBeDefined();
      expect(overview.totalExercises).toBeGreaterThan(0);
      expect(Array.isArray(overview.categories)).toBe(true);
      expect(Array.isArray(overview.muscles)).toBe(true);
      expect(Array.isArray(overview.equipment)).toBe(true);
      expect(Array.isArray(overview.movementPatterns)).toBe(true);
      expect(Array.isArray(overview.goals)).toBe(true);
      expect(Array.isArray(overview.difficulties)).toBe(true);

      // Verify category counts
      const strengthCat = overview.categories.find((c) => c.code === 'STRENGTH');
      expect(strengthCat).toBeDefined();
      expect(strengthCat?.count).toBeGreaterThan(0);

      // Verify muscle count and anterior/posterior mapping
      const chestMuscle = overview.muscles.find((m) => m.code === 'CHEST');
      expect(chestMuscle).toBeDefined();
      expect(chestMuscle?.region).toBe('ANTERIOR');
      expect(chestMuscle?.count).toBeGreaterThan(0);

      const latsMuscle = overview.muscles.find((m) => m.code === 'LATS');
      expect(latsMuscle).toBeDefined();
      expect(latsMuscle?.region).toBe('POSTERIOR');

      // Verify equipment count
      const dbEquip = overview.equipment.find((e) => e.code === 'DUMBBELL');
      expect(dbEquip).toBeDefined();
      expect(dbEquip?.count).toBeGreaterThan(0);

      // Verify no-equipment mode
      const noEquip = overview.equipment.find((e) => e.code === 'NO_EQUIPMENT');
      expect(noEquip).toBeDefined();
      expect(noEquip?.isNoEquipment).toBe(true);
      expect(noEquip?.count).toBeGreaterThan(0);
    });
  });

  describe('2. Dedicated Taxonomy Dimension Lists', () => {
    it('should return categories with proper metadata', async () => {
      const categories = await discoveryService.getCategories(orgA.id);
      expect(categories.length).toBeGreaterThanOrEqual(5);
      expect(categories.some((c) => c.code === 'STRENGTH')).toBe(true);
      expect(categories.some((c) => c.code === 'CARDIO')).toBe(true);
      expect(categories.some((c) => c.code === 'MOBILITY')).toBe(true);
    });

    it('should return muscles partitioned into anterior and posterior regions', async () => {
      const muscles = await discoveryService.getMuscles(orgA.id);
      expect(muscles.length).toBeGreaterThanOrEqual(10);
      const anterior = muscles.filter((m) => m.region === 'ANTERIOR');
      const posterior = muscles.filter((m) => m.region === 'POSTERIOR');
      expect(anterior.length).toBeGreaterThan(0);
      expect(posterior.length).toBeGreaterThan(0);
    });

    it('should return movement patterns with biomechanical descriptions', async () => {
      const movements = await discoveryService.getMovements(orgA.id);
      const push = movements.find((m) => m.code === 'PUSH');
      expect(push).toBeDefined();
      expect(push?.description).toContain('pressing');
    });

    it('should return difficulty levels with real distribution', async () => {
      const difficulties = await discoveryService.getDifficulty(orgA.id);
      expect(difficulties.length).toBe(4);
      expect(difficulties.map((d) => d.code)).toEqual(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']);
      expect(difficulties.every((d) => typeof d.count === 'number')).toBe(true);
    });
  });

  describe('3. Dimension Detail & Cross-Discovery Co-occurrences', () => {
    it('should return deep detail for muscle CHEST including related equipment and movements', async () => {
      const detail = await discoveryService.getDimensionDetail(orgA.id, 'muscle', 'CHEST');

      expect(detail.dimension).toBe('muscle');
      expect(detail.value).toBe('CHEST');
      expect(detail.title).toContain('Chest');
      expect(detail.region).toBe('ANTERIOR');
      expect(detail.exerciseCount).toBeGreaterThan(0);
      expect(detail.roles).toBeDefined();
      expect(detail.roles?.primaryCount).toBeGreaterThan(0);

      // Verify cross-discovery co-occurrences
      expect(Array.isArray(detail.relatedEquipment)).toBe(true);
      expect(Array.isArray(detail.relatedMovements)).toBe(true);
      expect(Array.isArray(detail.previewExercises)).toBe(true);
      expect(detail.previewExercises.length).toBeGreaterThan(0);

      // Verify that the created chest exercise is in the preview
      const foundPreview = detail.previewExercises.find((p) => p.id === testChestExercise.id);
      expect(foundPreview).toBeDefined();
      expect(foundPreview?.muscleRole).toBe('PRIMARY');
    });

    it('should return deep detail for NO_EQUIPMENT mode', async () => {
      const detail = await discoveryService.getDimensionDetail(orgA.id, 'equipment', 'NO_EQUIPMENT');

      expect(detail.dimension).toBe('equipment');
      expect(detail.isNoEquipment).toBe(true);
      expect(detail.exerciseCount).toBeGreaterThan(0);

      // Verify that the created plank exercise is in preview
      const foundPlank = detail.previewExercises.find((p) => p.id === testNoEquipExercise.id);
      expect(foundPlank).toBeDefined();
    });

    it('should return deep detail for movement PUSH', async () => {
      const detail = await discoveryService.getDimensionDetail(orgA.id, 'movement', 'PUSH');

      expect(detail.dimension).toBe('movement');
      expect(detail.value).toBe('PUSH');
      expect(detail.exerciseCount).toBeGreaterThan(0);
      expect(detail.previewExercises.some((p) => p.movementPattern === 'PUSH')).toBe(true);
    });
  });

  describe('4. Multi-Tenant Isolation & IDOR Protection', () => {
    it('should NOT leak Org B private exercises in Org A discovery overview or detail', async () => {
      // 1. Check Org A overview
      const overviewA = await discoveryService.getDiscoveryOverview(orgA.id);
      // Ensure preview samples do not contain orgBPrivateExercise
      const hasOrgBInCat = overviewA.categories.some(
        (c) => c.representativeExercise?.id === orgBPrivateExercise.id
      );
      expect(hasOrgBInCat).toBe(false);

      // 2. Check Org A glutes detail
      const glutesDetailA = await discoveryService.getDimensionDetail(orgA.id, 'muscle', 'GLUTES');
      const leakedInOrgA = glutesDetailA.previewExercises.some(
        (p) => p.id === orgBPrivateExercise.id
      );
      expect(leakedInOrgA).toBe(false);

      // 3. In Org B, the private exercise SHOULD be found
      const glutesDetailB = await discoveryService.getDimensionDetail(orgB.id, 'muscle', 'GLUTES');
      const foundInOrgB = glutesDetailB.previewExercises.some(
        (p) => p.id === orgBPrivateExercise.id
      );
      expect(foundInOrgB).toBe(true);
    });
  });
});
