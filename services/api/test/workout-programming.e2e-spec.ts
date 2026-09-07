import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { WorkoutTemplateService } from '../src/workouts/services/workout-template.service';
import { WorkoutsService } from '../src/workouts/services/workouts.service';
import { WorkoutPerformanceService } from '../src/workouts/services/workout-performance.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Workout Programming & Execution Domain (Day 13 E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let templateService: WorkoutTemplateService;
  let workoutsService: WorkoutsService;
  let performanceService: WorkoutPerformanceService;

  let orgA: any;
  let orgB: any;
  let alexMember: any;
  let marcusTrainer: any;
  let mikeTrainer: any;

  let actorOwnerOrgA: AuthenticatedUser;
  let actorMarcusTrainer: AuthenticatedUser;
  let actorMikeTrainer: AuthenticatedUser;
  let actorAlexMember: AuthenticatedUser;

  let systemSquat: any;
  let systemBench: any;

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
    templateService = app.get(WorkoutTemplateService);
    workoutsService = app.get(WorkoutsService);
    performanceService = app.get(WorkoutPerformanceService);

    orgA = await prisma.organisation.findFirstOrThrow({ where: { slug: 'second-wind' } });
    orgB = await prisma.organisation.findFirstOrThrow({ where: { slug: 'apex-strength' } });

    // Seed users and profiles
    const ownerUser = await prisma.user.findFirstOrThrow({ where: { email: 'owner@secondwind.com.au' } });
    actorOwnerOrgA = {
      id: ownerUser.id,
      email: ownerUser.email,
      firstName: ownerUser.firstName,
      lastName: ownerUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'ORGANISATION_OWNER', organisationId: orgA.id }],
      permissions: [{ resource: '*', action: 'MANAGE', scope: 'ORGANISATION' }],
    };

    const alexUser = await prisma.user.findFirstOrThrow({ where: { email: 'member@secondwind.com.au' } });
    alexMember = await prisma.memberProfile.findFirstOrThrow({ where: { userId: alexUser.id, organisationId: orgA.id } });
    actorAlexMember = {
      id: alexUser.id,
      email: alexUser.email,
      firstName: alexUser.firstName,
      lastName: alexUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'MEMBER', organisationId: orgA.id }],
      permissions: [
        { resource: 'workouts', action: 'READ', scope: 'OWN' },
        { resource: 'workouts', action: 'MANAGE', scope: 'OWN' },
      ],
    };

    const marcusUser = await prisma.user.findFirstOrThrow({ where: { email: 'trainer@secondwind.com.au' } });
    marcusTrainer = await prisma.trainerProfile.findFirstOrThrow({
      where: { professionalName: 'Marcus Vance' },
    });
    actorMarcusTrainer = {
      id: marcusUser.id,
      email: marcusUser.email,
      firstName: marcusUser.firstName,
      lastName: marcusUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'TRAINER', organisationId: orgA.id }],
      permissions: [
        { resource: 'workouts', action: 'CREATE', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'workouts', action: 'READ', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'workouts', action: 'MANAGE', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'workout_templates', action: 'READ', scope: 'ORGANISATION' },
      ],
    };

    // Find or create an unassigned trainer to test authorization boundary
    mikeTrainer = await prisma.trainerProfile.findFirst({
      where: { organisationId: orgA.id, id: { not: marcusTrainer.id } },
      include: { staffProfile: { include: { user: true } } },
    });

    if (mikeTrainer) {
      actorMikeTrainer = {
        id: mikeTrainer.staffProfile.userId,
        email: mikeTrainer.staffProfile.user.email,
        firstName: mikeTrainer.staffProfile.user.firstName,
        lastName: mikeTrainer.staffProfile.user.lastName,
        status: 'ACTIVE',
        isSuperAdmin: false,
        roles: [{ role: 'TRAINER', organisationId: orgA.id }],
        permissions: [
          { resource: 'workouts', action: 'MANAGE', scope: 'ASSIGNED_CLIENTS' },
        ],
      };
    }

    systemSquat = await prisma.exercise.findFirstOrThrow({ where: { slug: 'barbell-back-squat' } });
    systemBench = await prisma.exercise.findFirstOrThrow({ where: { slug: 'barbell-bench-press' } });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Workout Template Engine', () => {
    let createdTemplate: any;

    it('should create a workout template with exercises and prescriptions', async () => {
      createdTemplate = await templateService.create(
        orgA.id,
        {
          name: 'Hypertrophy Push Protocol',
          description: 'Upper body chest and triceps focus',
          difficulty: 'INTERMEDIATE',
          category: 'HYPERTROPHY',
          estimatedDurationMinutes: 50,
          exercises: [
            {
              exerciseId: systemBench.id,
              sortOrder: 0,
              prescriptionType: 'REPETITIONS',
              targetSets: 4,
              targetReps: 10,
              targetLoad: 75,
              loadUnit: 'KG',
              restSeconds: 90,
              notes: 'Touch chest lightly, explosively push',
            },
          ],
        },
        actorOwnerOrgA,
      );

      expect(createdTemplate.id).toBeDefined();
      expect(createdTemplate.name).toBe('Hypertrophy Push Protocol');
      expect(createdTemplate.exercises.length).toBe(1);
    });

    it('should list and retrieve templates', async () => {
      const list = await templateService.findAll(orgA.id, { category: 'HYPERTROPHY' });
      expect(list.items.some((t) => t.id === createdTemplate.id)).toBe(true);

      const retrieved = await templateService.findById(orgA.id, createdTemplate.id);
      expect(retrieved.name).toBe('Hypertrophy Push Protocol');
    });
  });

  describe('2. Workout Assignment & Authorization Enforcement', () => {
    let assignedWorkout: any;

    it('should allow assigned trainer Marcus to assign workout to Alex Mercer', async () => {
      assignedWorkout = await workoutsService.assignWorkout(
        orgA.id,
        {
          memberProfileId: alexMember.id,
          name: 'Heavy Lower Body Session',
          description: 'Focus on squat form and cadence',
          scheduledDate: new Date().toISOString(),
          difficulty: 'ADVANCED',
          estimatedDurationMinutes: 60,
          exercises: [
            {
              exerciseId: systemSquat.id,
              sortOrder: 0,
              prescriptionType: 'REPETITIONS',
              targetSets: 3,
              targetReps: 5,
              targetLoad: 120,
              loadUnit: 'KG',
              restSeconds: 180,
              trainerNotes: 'Full depth below parallel',
            },
          ],
        },
        actorMarcusTrainer,
      );

      expect(assignedWorkout.id).toBeDefined();
      expect(assignedWorkout.status).toBe('SCHEDULED');
      expect(assignedWorkout.exercises.length).toBe(1);

      // Verify immutable snapshot
      const ex0 = assignedWorkout.exercises[0];
      expect(ex0.exerciseNameSnapshot).toBe(systemSquat.name);
      expect(ex0.instructionSnapshot).toBe(systemSquat.instructions);
    });

    if (actorMikeTrainer) {
      it('should reject unassigned trainer Mike from assigning workout to Alex Mercer', async () => {
        await expect(
          workoutsService.assignWorkout(
            orgA.id,
            {
              memberProfileId: alexMember.id,
              name: 'Unassigned Workout',
              scheduledDate: new Date().toISOString(),
              difficulty: 'BEGINNER',
              exercises: [
                {
                  exerciseId: systemSquat.id,
                  sortOrder: 0,
                  prescriptionType: 'REPETITIONS',
                  targetSets: 3,
                  targetReps: 10,
                },
              ],
            },
            actorMikeTrainer,
          ),
        ).rejects.toThrow(ForbiddenException);
      });
    }
  });

  describe('3. Workout Execution, Idempotent Set Logging & Retroactive Corrections', () => {
    let testWorkout: any;
    let targetExercise: any;
    let loggedSet1: any;

    beforeAll(async () => {
      testWorkout = await workoutsService.assignWorkout(
        orgA.id,
        {
          memberProfileId: alexMember.id,
          name: 'Alex Solo Leg Day',
          scheduledDate: new Date().toISOString(),
          difficulty: 'INTERMEDIATE',
          exercises: [
            {
              exerciseId: systemSquat.id,
              sortOrder: 0,
              prescriptionType: 'REPETITIONS',
              targetSets: 3,
              targetReps: 8,
              targetLoad: 100,
            },
          ],
        },
        actorAlexMember,
      );

      targetExercise = testWorkout.exercises[0];
    });

    it('should start workout and update status to IN_PROGRESS', async () => {
      const started = await workoutsService.startWorkout(orgA.id, testWorkout.id, actorAlexMember);
      expect(started.status).toBe('IN_PROGRESS');
      expect(started.startedAt).toBeDefined();
    });

    it('should log a completed set with idempotency key', async () => {
      const idempotencyKey = `alex-set-1-${Date.now()}`;

      loggedSet1 = await performanceService.logSet(
        orgA.id,
        targetExercise.id,
        {
          setNumber: 1,
          setKind: 'WORKING',
          actualReps: 8,
          actualLoad: 100,
          loadUnit: 'KG',
          actualRpe: 8,
          isCompleted: true,
          idempotencyKey,
        },
        actorAlexMember,
      );

      expect(loggedSet1.id).toBeDefined();
      expect(loggedSet1.actualReps).toBe(8);
      expect(loggedSet1.actualLoad).toBe(100);
      expect(loggedSet1.completed).toBe(true);

      // Replay same request: should return existing set without duplicate!
      const duplicateReplay = await performanceService.logSet(
        orgA.id,
        targetExercise.id,
        {
          setNumber: 1,
          setKind: 'WORKING',
          actualReps: 8,
          actualLoad: 100,
          loadUnit: 'KG',
          actualRpe: 8,
          isCompleted: true,
          idempotencyKey,
        },
        actorAlexMember,
      );

      expect(duplicateReplay.id).toBe(loggedSet1.id);
    });

    it('should record an audited set correction', async () => {
      const corrected = await performanceService.correctSet(
        orgA.id,
        loggedSet1.id,
        {
          actualLoad: 105,
          reason: 'Corrected warm-up calculation error: miscounted barbell collar weights',
        },
        actorAlexMember,
      );

      expect(corrected.actualLoad).toBe(105);
      expect(corrected.corrections.length).toBeGreaterThanOrEqual(1);
      expect(corrected.corrections[0].previousLoad).toBe(100);
      expect(corrected.corrections[0].newLoad).toBe(105);
      expect(corrected.corrections[0].reason).toContain('miscounted barbell collar');
    });

    it('should complete workout transactionally and freeze modifications', async () => {
      const completed = await workoutsService.completeWorkout(
        orgA.id,
        testWorkout.id,
        {
          memberNotes: 'Legs felt strong, hit target RPE nicely',
          rating: 5,
        },
        actorAlexMember,
      );

      expect(completed.status).toBe('COMPLETED');
      expect(completed.completedAt).toBeDefined();

      // Further set logging must be rejected
      await expect(
        performanceService.logSet(
          orgA.id,
          targetExercise.id,
          {
            setNumber: 2,
            actualReps: 8,
            actualLoad: 100,
          },
          actorAlexMember,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
