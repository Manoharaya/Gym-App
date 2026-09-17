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

describe('Day 66: Exercise Detail & Visual Learning Experience E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let exercisesService: ExercisesService;
  let metadataService: ExerciseMetadataService;

  let orgA: any;
  let orgB: any;
  let actorOwnerOrgA: AuthenticatedUser;
  let actorOwnerOrgB: AuthenticatedUser;

  let mainExercise: any;
  let relatedExercise: any;
  let progressionExercise: any;
  let regressionExercise: any;
  let substituteExercise: any;
  let orgBExercise: any;

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

    // 1. Create Main Exercise in Org A
    mainExercise = await exercisesService.create(
      orgA.id,
      {
        name: `Day 66 Main Barbell Squat ${stamp}`,
        difficulty: 'INTERMEDIATE',
        exerciseType: 'STRENGTH',
        movementPattern: 'SQUAT',
        primaryMuscleGroup: 'QUADRICEPS',
        equipmentType: 'BARBELL',
        description: 'Flagship Barbell Back Squat for Day 66 Visual Learning tests',
      },
      actorOwnerOrgA,
    );

    // 2. Create Related Exercise (same movement pattern and primary muscle)
    relatedExercise = await exercisesService.create(
      orgA.id,
      {
        name: `Day 66 Front Squat ${stamp}`,
        difficulty: 'ADVANCED',
        exerciseType: 'STRENGTH',
        movementPattern: 'SQUAT',
        primaryMuscleGroup: 'QUADRICEPS',
        equipmentType: 'BARBELL',
        description: 'Related squat movement',
      },
      actorOwnerOrgA,
    );

    // 3. Create Progression Exercise
    progressionExercise = await exercisesService.create(
      orgA.id,
      {
        name: `Day 66 Overhead Squat ${stamp}`,
        difficulty: 'ADVANCED',
        exerciseType: 'STRENGTH',
        movementPattern: 'SQUAT',
        primaryMuscleGroup: 'QUADRICEPS',
        equipmentType: 'BARBELL',
        description: 'Progression movement',
      },
      actorOwnerOrgA,
    );

    // 4. Create Regression Exercise
    regressionExercise = await exercisesService.create(
      orgA.id,
      {
        name: `Day 66 Goblet Squat ${stamp}`,
        difficulty: 'BEGINNER',
        exerciseType: 'STRENGTH',
        movementPattern: 'SQUAT',
        primaryMuscleGroup: 'QUADRICEPS',
        equipmentType: 'DUMBBELL',
        description: 'Regression movement',
      },
      actorOwnerOrgA,
    );

    // 5. Create Substitute Exercise
    substituteExercise = await exercisesService.create(
      orgA.id,
      {
        name: `Day 66 Leg Press ${stamp}`,
        difficulty: 'BEGINNER',
        exerciseType: 'STRENGTH',
        movementPattern: 'SQUAT',
        primaryMuscleGroup: 'QUADRICEPS',
        equipmentType: 'MACHINE',
        description: 'Machine substitute movement',
      },
      actorOwnerOrgA,
    );

    // 6. Create Org B Private Exercise
    orgBExercise = await exercisesService.create(
      orgB.id,
      {
        name: `Day 66 Org B Private Movement ${stamp}`,
        difficulty: 'INTERMEDIATE',
        exerciseType: 'STRENGTH',
        movementPattern: 'PULL',
        primaryMuscleGroup: 'BACK',
        equipmentType: 'CABLE',
        description: 'Private exercise in Org B',
      },
      actorOwnerOrgB,
    );

    // Link variations to mainExercise
    await prisma.exerciseVariation.createMany({
      data: [
        {
          baseExerciseId: mainExercise.id,
          targetExerciseId: progressionExercise.id,
          relationshipType: 'PROGRESSION',
          notes: 'Master back squat before progressing to overhead squat',
        },
        {
          baseExerciseId: mainExercise.id,
          targetExerciseId: regressionExercise.id,
          relationshipType: 'REGRESSION',
          notes: 'Regress to goblet squat if mobility limits depth',
        },
        {
          baseExerciseId: mainExercise.id,
          targetExerciseId: substituteExercise.id,
          relationshipType: 'ALTERNATIVE',
          notes: 'Machine alternative when rack is occupied',
        },
      ],
    });

    // Add media to mainExercise
    await prisma.exerciseMedia.create({
      data: {
        exerciseId: mainExercise.id,
        mediaType: 'VIDEO',
        url: 'https://cdn.fitbeat.app/videos/squat-hero.mp4',
        storageKey: 'videos/squat-hero.mp4',
        mimeType: 'video/mp4',
        thumbnailUrl: 'https://cdn.fitbeat.app/thumbnails/squat-hero.jpg',
        isPrimary: true,
        title: 'Barbell Squat Form Demonstration',
      },
    });

    // Add movement phases
    await prisma.exerciseMovementPhase.createMany({
      data: [
        {
          exerciseId: mainExercise.id,
          orderIndex: 0,
          phaseName: 'SETUP',
          phaseType: 'SETUP',
          title: 'Setup & Unrack',
          description: 'Grip bar firmly, brace core, and step back',
          breathingPattern: 'Deep diaphragmatic inhale',
          cueText: 'Bar pinned on upper traps',
        },
        {
          exerciseId: mainExercise.id,
          orderIndex: 1,
          phaseName: 'DESCENT',
          phaseType: 'ECCENTRIC',
          title: 'Eccentric Descent',
          description: 'Hips back and knees track over toes',
          breathingPattern: 'Hold intra-abdominal pressure',
          cueText: 'Chest upright, knees wide',
        },
        {
          exerciseId: mainExercise.id,
          orderIndex: 2,
          phaseName: 'ASCENT',
          phaseType: 'CONCENTRIC',
          title: 'Concentric Drive',
          description: 'Drive feet through floor to full hip extension',
          breathingPattern: 'Exhale through sticking point',
          cueText: 'Drive through midfoot',
        },
      ],
    });

    // Add instruction steps
    await prisma.exerciseInstructionStep.createMany({
      data: [
        {
          exerciseId: mainExercise.id,
          stepNumber: 1,
          title: 'Foot Placement',
          description: 'Stand with feet shoulder-width apart, toes flared slightly out.',
        },
        {
          exerciseId: mainExercise.id,
          stepNumber: 2,
          title: 'Brace Core',
          description: 'Take a 360-degree breath into your belly and brace as if about to be punched.',
        },
        {
          exerciseId: mainExercise.id,
          stepNumber: 3,
          title: 'Descend to Parallel',
          description: 'Break at the hips and knees simultaneously until hip crease is below knee.',
        },
      ],
    });

    // Add muscle relations
    await metadataService.addMuscleRelation(
      orgA.id,
      mainExercise.id,
      {
        muscle: 'QUADRICEPS',
        muscleGroup: 'LOWER_BODY',
        role: 'PRIMARY',
        activationLevel: 'HIGH',
      },
      actorOwnerOrgA,
    );

    await metadataService.addMuscleRelation(
      orgA.id,
      mainExercise.id,
      {
        muscle: 'GLUTES',
        muscleGroup: 'LOWER_BODY',
        role: 'SECONDARY',
        activationLevel: 'HIGH',
      },
      actorOwnerOrgA,
    );

    // Add equipment relation
    await metadataService.addEquipmentRelation(
      orgA.id,
      mainExercise.id,
      {
        equipmentName: 'Barbell',
        requirementType: 'REQUIRED',
        equipmentCategory: 'FREE_WEIGHTS',
        alternatives: ['Dumbbells', 'Smith Machine'],
      },
      actorOwnerOrgA,
    );

    // Add common mistake and safety guideline
    await prisma.exerciseCommonMistake.create({
      data: {
        exerciseId: mainExercise.id,
        mistake: 'Knees Caving In (Valgus)',
        consequence: 'Knees collapse inward during ascent placing shear stress on ACL.',
        correction: 'Push knees outward into imaginary resistance band',
        severity: 'SEVERE',
      },
    });

    await prisma.exerciseSafetyGuideline.create({
      data: {
        exerciseId: mainExercise.id,
        category: 'TECHNIQUE_WARNING',
        description: 'Maintain neutral spine throughout; avoid butt wink at bottom.',
        severity: 'HIGH',
      },
    });
  });

  afterAll(async () => {
    const ids = [
      mainExercise?.id,
      relatedExercise?.id,
      progressionExercise?.id,
      regressionExercise?.id,
      substituteExercise?.id,
      orgBExercise?.id,
    ].filter(Boolean);

    if (ids.length > 0) {
      await prisma.exerciseVariation.deleteMany({
        where: {
          OR: [
            { baseExerciseId: { in: ids } },
            { targetExerciseId: { in: ids } },
          ],
        },
      }).catch(() => null);

      await prisma.exerciseMovementPhase.deleteMany({ where: { exerciseId: { in: ids } } }).catch(() => null);
      await prisma.exerciseInstructionStep.deleteMany({ where: { exerciseId: { in: ids } } }).catch(() => null);
      await prisma.exerciseMedia.deleteMany({ where: { exerciseId: { in: ids } } }).catch(() => null);
      await prisma.exerciseMuscleRelation.deleteMany({ where: { exerciseId: { in: ids } } }).catch(() => null);
      await prisma.exerciseEquipmentRelation.deleteMany({ where: { exerciseId: { in: ids } } }).catch(() => null);
      await prisma.exerciseCommonMistake.deleteMany({ where: { exerciseId: { in: ids } } }).catch(() => null);
      await prisma.exerciseSafetyGuideline.deleteMany({ where: { exerciseId: { in: ids } } }).catch(() => null);

      await prisma.exercise.deleteMany({ where: { id: { in: ids } } }).catch(() => null);
    }
    await app.close();
  });

  describe('1. Single-Query findVisualContent API', () => {
    it('should return complete visual learning payload in a single response', async () => {
      const result = await exercisesService.findVisualContent(orgA.id, mainExercise.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(mainExercise.id);
      expect(result.name).toBe(mainExercise.name);

      // Media
      expect(result.media).toBeDefined();
      expect(result.media.length).toBeGreaterThanOrEqual(1);
      expect(result.media[0].url).toContain('videos_squat-hero.mp4');

      // Movement phases
      expect(result.movementPhases).toBeDefined();
      expect(result.movementPhases.length).toBe(3);
      expect(result.movementPhases[0].phaseType).toBe('SETUP');
      expect(result.movementPhases[1].phaseType).toBe('ECCENTRIC');
      expect(result.movementPhases[2].phaseType).toBe('CONCENTRIC');

      // Instruction steps
      expect(result.instructionSteps).toBeDefined();
      expect(result.instructionSteps.length).toBe(3);
      expect(result.instructionSteps[0].title).toBe('Foot Placement');

      // Muscles & Equipment
      expect(result.muscleRelations).toBeDefined();
      expect(result.muscleRelations.length).toBe(2);
      expect(result.equipmentRelations).toBeDefined();
      expect(result.equipmentRelations.length).toBe(1);

      // Common mistakes & Safety guidelines
      expect(result.commonMistakes).toBeDefined();
      expect(result.commonMistakes.length).toBe(1);
      expect(result.commonMistakes[0].mistake).toBe('Knees Caving In (Valgus)');
      expect(result.safetyGuidelines).toBeDefined();
      expect(result.safetyGuidelines.length).toBe(1);
    });

    it('should categorize variations into progressions, regressions, and substitutes', async () => {
      const result = await exercisesService.findVisualContent(orgA.id, mainExercise.id);

      expect(result.categorizedVariations).toBeDefined();
      const { progressions, regressions, substitutes } = result.categorizedVariations;

      // Progression
      expect(progressions.length).toBeGreaterThanOrEqual(1);
      expect(progressions.some((p: any) => p.name === progressionExercise.name)).toBe(true);

      // Regression
      expect(regressions.length).toBeGreaterThanOrEqual(1);
      expect(regressions.some((r: any) => r.name === regressionExercise.name)).toBe(true);

      // Substitute
      expect(substitutes.length).toBeGreaterThanOrEqual(1);
      expect(substitutes.some((s: any) => s.name === substituteExercise.name)).toBe(true);
    });

    it('should return biomechanically related exercises matching primaryMuscleGroup or movementPattern', async () => {
      const result = await exercisesService.findVisualContent(orgA.id, mainExercise.id);

      expect(result.relatedExercises).toBeDefined();
      expect(Array.isArray(result.relatedExercises)).toBe(true);
      expect(result.relatedExercises.length).toBeGreaterThanOrEqual(1);
      expect(result.relatedExercises.some((rel: any) => rel.id === relatedExercise.id)).toBe(true);
      // Verify related exercise does not include mainExercise itself
      expect(result.relatedExercises.every((rel: any) => rel.id !== mainExercise.id)).toBe(true);
    });

    it('should invert variation direction correctly when exercise is targetExercise', async () => {
      // progressionExercise has mainExercise pointing to it with PROGRESSION.
      // From progressionExercise's perspective, mainExercise is a REGRESSION.
      const result = await exercisesService.findVisualContent(orgA.id, progressionExercise.id);

      expect(result.categorizedVariations).toBeDefined();
      const { regressions } = result.categorizedVariations;
      expect(regressions.some((r: any) => r.name === mainExercise.name)).toBe(true);
    });
  });

  describe('2. Multi-Tenant Isolation & Security', () => {
    it('should reject access to Org B private exercise when queried by Org A', async () => {
      await expect(
        exercisesService.findVisualContent(orgA.id, orgBExercise.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow Org B to view its own exercise', async () => {
      const result = await exercisesService.findVisualContent(orgB.id, orgBExercise.id);
      expect(result.id).toBe(orgBExercise.id);
      expect(result.name).toBe(orgBExercise.name);
    });
  });
});
