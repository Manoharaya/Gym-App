import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Workout Programming, Security & Verification E2E Suite (Day 13)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Tokens & IDs
  let ownerTokenOrgA: string;
  let trainerMarcusTokenOrgA: string;
  let trainerMikeTokenOrgA: string;
  let memberAlexTokenOrgA: string;
  let ownerTokenOrgB: string;
  let memberChloeTokenOrgB: string;

  let orgA: any;
  let orgB: any;
  let alexProfile: any;
  let chloeProfile: any;
  let systemSquat: any;
  let customExerciseA: any;
  let templateA: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: ['health', 'health/live', 'health/ready'],
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    orgA = await prisma.organisation.findFirstOrThrow({ where: { slug: 'second-wind' } });
    orgB = await prisma.organisation.findFirstOrThrow({ where: { slug: 'apex-strength' } });

    // Authenticate all test actors
    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'FitCoreDev2026!' });
      return res.body.data.accessToken;
    };

    ownerTokenOrgA = await login('owner@secondwind.com.au');
    trainerMarcusTokenOrgA = await login('trainer@secondwind.com.au');
    trainerMikeTokenOrgA = await login('trainer.mike@secondwind.com.au');
    memberAlexTokenOrgA = await login('member@secondwind.com.au');
    ownerTokenOrgB = await login('owner@apexstrength.com.au');
    memberChloeTokenOrgB = await login('member@apexstrength.com.au');

    const alexUser = await prisma.user.findFirstOrThrow({ where: { email: 'member@secondwind.com.au' } });
    alexProfile = await prisma.memberProfile.findFirstOrThrow({ where: { userId: alexUser.id, organisationId: orgA.id } });

    const chloeUser = await prisma.user.findFirstOrThrow({ where: { email: 'member@apexstrength.com.au' } });
    chloeProfile = await prisma.memberProfile.findFirstOrThrow({ where: { userId: chloeUser.id, organisationId: orgB.id } });

    systemSquat = await prisma.exercise.findFirstOrThrow({
      where: { slug: 'barbell-back-squat', ownershipType: 'SYSTEM' },
    });

    // Create a custom exercise for Org A to test cross-tenant access
    customExerciseA = await prisma.exercise.create({
      data: {
        organisationId: orgA.id,
        name: 'Second Wind Strict Kettlebell Press',
        slug: `sw-kb-press-${Date.now()}`,
        description: 'Org A proprietary technique',
        ownershipType: 'ORGANISATION',
        difficulty: 'ADVANCED',
        exerciseType: 'STRENGTH',
        movementPattern: 'PUSH',
        primaryMuscleGroup: 'SHOULDERS',
        equipment: 'KETTLEBELL',
        instructions: 'Press bells overhead with locked glutes and packed lats',
        status: 'ACTIVE',
      },
    });

    // Create a template for Org A
    templateA = await prisma.workoutTemplate.create({
      data: {
        organisationId: orgA.id,
        name: 'Perth Power Builder',
        description: 'Org A exclusive program template',
        difficulty: 'ADVANCED',
        goal: 'STRENGTH',
        status: 'ACTIVE',
        exercises: {
          create: [
            {
              exerciseId: customExerciseA.id,
              orderIndex: 0,
              prescriptionType: 'REPETITIONS',
              targetSets: 4,
              targetReps: 8,
              targetLoad: 24,
              targetRPE: 8,
              restSeconds: 120,
            },
          ],
        },
      },
      include: { exercises: true },
    });
  });

  afterAll(async () => {
    // Cleanup custom test records
    await prisma.workoutExercise.deleteMany({
      where: { exerciseId: customExerciseA.id },
    });
    await prisma.workoutTemplateExercise.deleteMany({
      where: { workoutTemplateId: templateA.id },
    });
    await prisma.workoutTemplate.deleteMany({
      where: { id: templateA.id },
    });
    await prisma.exercise.deleteMany({
      where: { id: customExerciseA.id },
    });
    await app.close();
  });

  describe('1. Multi-Tenant Boundary & IDOR Protections', () => {
    it('Org B user CANNOT view Org A custom exercise', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/exercises/${customExerciseA.id}`)
        .set('Authorization', `Bearer ${memberChloeTokenOrgB}`)
        .set('x-organisation-id', orgB.id);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('Org B user CANNOT update Org A custom exercise', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/exercises/${customExerciseA.id}`)
        .set('Authorization', `Bearer ${ownerTokenOrgB}`)
        .set('x-organisation-id', orgB.id)
        .send({ name: 'Hacked Exercise Name' });

      expect(res.status).toBe(404);
    });

    it('System exercise CANNOT be updated by organisation staff', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/exercises/${systemSquat.id}`)
        .set('Authorization', `Bearer ${ownerTokenOrgA}`)
        .set('x-organisation-id', orgA.id)
        .send({ name: 'Renamed System Squat' });

      expect(res.status).toBe(403);
    });

    it('Org B user CANNOT view Org A workout template', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/workout-templates/${templateA.id}`)
        .set('Authorization', `Bearer ${memberChloeTokenOrgB}`)
        .set('x-organisation-id', orgB.id);

      expect([403, 404]).toContain(res.status);

      // Org B Owner has workout_templates:read, but cannot view Org A template (404 isolated)
      const ownerRes = await request(app.getHttpServer())
        .get(`/api/v1/workout-templates/${templateA.id}`)
        .set('Authorization', `Bearer ${ownerTokenOrgB}`)
        .set('x-organisation-id', orgB.id);

      expect(ownerRes.status).toBe(404);
    });
  });

  describe('2. Trainer-Client Assignment Authorization', () => {
    it('Assigned Trainer (Marcus) CAN assign workout to Member Alex', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/workouts/assign')
        .set('Authorization', `Bearer ${trainerMarcusTokenOrgA}`)
        .set('x-organisation-id', orgA.id)
        .send({
          memberProfileId: alexProfile.id,
          templateId: templateA.id,
          name: 'Monday Strength Protocol',
          description: 'Prescribed by assigned trainer Marcus',
          scheduledDate: new Date().toISOString(),
          difficulty: 'INTERMEDIATE',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.memberProfileId).toBe(alexProfile.id);
      expect(res.body.data.exercises.length).toBe(1);
      expect(res.body.data.exercises[0].exerciseNameSnapshot).toBe(customExerciseA.name);
    });

    it('Unassigned Trainer (Mike) CANNOT assign workout to Member Alex (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/workouts/assign')
        .set('Authorization', `Bearer ${trainerMikeTokenOrgA}`)
        .set('x-organisation-id', orgA.id)
        .send({
          memberProfileId: alexProfile.id,
          templateId: templateA.id,
          name: 'Unassigned Workout Attempt',
          scheduledDate: new Date().toISOString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('TRAINER_CLIENT_NOT_ASSIGNED');
    });
  });

  describe('3. Member Workout Execution, Set Logging & Retroactive Corrections', () => {
    let assignedWorkoutId: string;
    let workoutExerciseId: string;
    let loggedSetId: string;

    beforeAll(async () => {
      // Assign a fresh workout to Member Alex
      const res = await request(app.getHttpServer())
        .post('/api/v1/workouts/assign')
        .set('Authorization', `Bearer ${trainerMarcusTokenOrgA}`)
        .set('x-organisation-id', orgA.id)
        .send({
          memberProfileId: alexProfile.id,
          templateId: templateA.id,
          name: 'Execution Flow Workout',
          scheduledDate: new Date().toISOString(),
        });
      assignedWorkoutId = res.body.data.id;
      workoutExerciseId = res.body.data.exercises[0].id;
    });

    afterAll(async () => {
      if (assignedWorkoutId) {
        await prisma.workoutSetCorrection.deleteMany({
          where: { workoutSet: { workoutExercise: { workoutId: assignedWorkoutId } } },
        });
        await prisma.workoutSet.deleteMany({
          where: { workoutExercise: { workoutId: assignedWorkoutId } },
        });
        await prisma.workoutExercise.deleteMany({
          where: { workoutId: assignedWorkoutId },
        });
        await prisma.workout.deleteMany({
          where: { id: assignedWorkoutId },
        });
      }
    });

    it('Member Alex can view their own assigned workout', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/workouts/${assignedWorkoutId}`)
        .set('Authorization', `Bearer ${memberAlexTokenOrgA}`)
        .set('x-organisation-id', orgA.id);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(assignedWorkoutId);
      expect(res.body.data.status).toBe('SCHEDULED');
    });

    it('Org B Member Chloe CANNOT view Member Alex workout (404/403 IDOR blocked)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/workouts/${assignedWorkoutId}`)
        .set('Authorization', `Bearer ${memberChloeTokenOrgB}`)
        .set('x-organisation-id', orgB.id);

      expect(res.status).toBe(404);
    });

    it('Member Alex starts the workout session', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/workouts/${assignedWorkoutId}/start`)
        .set('Authorization', `Bearer ${memberAlexTokenOrgA}`)
        .set('x-organisation-id', orgA.id);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('IN_PROGRESS');
      expect(res.body.data.startedAt).toBeDefined();
    });

    it('Member Alex logs a completed set with idempotency key', async () => {
      const idempotencyKey = `set-test-${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/workouts/exercises/${workoutExerciseId}/sets`)
        .set('Authorization', `Bearer ${memberAlexTokenOrgA}`)
        .set('x-organisation-id', orgA.id)
        .send({
          setNumber: 1,
          actualReps: 8,
          actualLoad: 24,
          loadUnit: 'KG',
          actualRpe: 8,
          isCompleted: true,
          idempotencyKey,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.actualReps).toBe(8);
      expect(res.body.data.actualLoad).toBe(24);
      expect(res.body.data.completed).toBe(true);
      loggedSetId = res.body.data.id;

      // Duplicate submission with same idempotency key returns existing set
      const retryRes = await request(app.getHttpServer())
        .post(`/api/v1/workouts/exercises/${workoutExerciseId}/sets`)
        .set('Authorization', `Bearer ${memberAlexTokenOrgA}`)
        .set('x-organisation-id', orgA.id)
        .send({
          setNumber: 1,
          actualReps: 8,
          actualLoad: 24,
          idempotencyKey,
        });

      expect(retryRes.status).toBe(201);
      expect(retryRes.body.data.id).toBe(loggedSetId);
    });

    it('Member Alex retroactively corrects set values with audited reason', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/workouts/sets/${loggedSetId}/correct`)
        .set('Authorization', `Bearer ${memberAlexTokenOrgA}`)
        .set('x-organisation-id', orgA.id)
        .send({
          actualReps: 9,
          actualLoad: 26,
          actualRpe: 8.5,
          reason: 'Corrected typo: performed 9 reps with 26kg bells',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.actualReps).toBe(9);
      expect(res.body.data.actualLoad).toBe(26);
      expect(res.body.data.corrections.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.corrections[0].previousReps).toBe(8);
      expect(res.body.data.corrections[0].newReps).toBe(9);
      expect(res.body.data.corrections[0].reason).toContain('Corrected typo');
    });

    it('Member Alex completes workout session', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/workouts/${assignedWorkoutId}/complete`)
        .set('Authorization', `Bearer ${memberAlexTokenOrgA}`)
        .set('x-organisation-id', orgA.id)
        .send({
          memberNotes: 'Felt strong throughout all sets',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('COMPLETED');
      expect(res.body.data.completedAt).toBeDefined();
    });
  });

  describe('4. Historical Snapshot Integrity Test (Section 7 Scenario)', () => {
    let testExercise: any;
    let testTemplate: any;
    let testWorkout: any;

    it('maintains prescribed snapshots after source exercise and template are modified', async () => {
      // 1. Create Exercise A
      testExercise = await prisma.exercise.create({
        data: {
          organisationId: orgA.id,
          name: 'Original Military Press',
          slug: `orig-press-${Date.now()}`,
          instructions: 'Step 1: Stand tall. Step 2: Press overhead strictly.',
          coachingCues: ['Elbows tucked', 'Squeeze glutes'],
          status: 'ACTIVE',
        },
      });

      // 2. Create Workout Template A
      testTemplate = await prisma.workoutTemplate.create({
        data: {
          organisationId: orgA.id,
          name: 'Original Press Template',
          status: 'ACTIVE',
          exercises: {
            create: [
              {
                exerciseId: testExercise.id,
                orderIndex: 0,
                targetSets: 3,
                targetReps: 10,
                targetLoad: 50,
                targetRPE: 8,
              },
            ],
          },
        },
      });

      // 3. Create Workout A from Template A
      const assignRes = await request(app.getHttpServer())
        .post('/api/v1/workouts/assign')
        .set('Authorization', `Bearer ${trainerMarcusTokenOrgA}`)
        .set('x-organisation-id', orgA.id)
        .send({
          memberProfileId: alexProfile.id,
          templateId: testTemplate.id,
          name: 'Historical Integrity Test Workout',
          scheduledDate: new Date().toISOString(),
        });
      expect(assignRes.status).toBe(201);
      testWorkout = assignRes.body.data;

      // 4. Complete Workout A
      await request(app.getHttpServer())
        .post(`/api/v1/workouts/${testWorkout.id}/start`)
        .set('Authorization', `Bearer ${memberAlexTokenOrgA}`)
        .set('x-organisation-id', orgA.id);

      await request(app.getHttpServer())
        .post(`/api/v1/workouts/${testWorkout.id}/complete`)
        .set('Authorization', `Bearer ${memberAlexTokenOrgA}`)
        .set('x-organisation-id', orgA.id)
        .send({});

      // 5. Change the template (e.g. update name and archive or clear exercises)
      await prisma.workoutTemplate.update({
        where: { id: testTemplate.id },
        data: { name: 'Completely Rewritten Press Template v2' },
      });

      // 6 & 7. Change exercise metadata, name, and instructions
      await prisma.exercise.update({
        where: { id: testExercise.id },
        data: {
          name: 'Drastically Altered Dumbbell Push Press',
          instructions: 'New instructions completely different from original',
        },
      });

      // 8. Retrieve completed Workout A
      const getRes = await request(app.getHttpServer())
        .get(`/api/v1/workouts/${testWorkout.id}`)
        .set('Authorization', `Bearer ${memberAlexTokenOrgA}`)
        .set('x-organisation-id', orgA.id);

      expect(getRes.status).toBe(200);
      const retrievedExercise = getRes.body.data.exercises[0];

      // Verification: Snapshot fields preserve original state
      expect(retrievedExercise.exerciseNameSnapshot).toBe('Original Military Press');
      expect(retrievedExercise.instructionSnapshot).toBe('Step 1: Stand tall. Step 2: Press overhead strictly.');
      expect(retrievedExercise.targetSets).toBe(3);
      expect(retrievedExercise.targetReps).toBe(10);
      expect(retrievedExercise.targetLoad).toBe(50);

      // Cleanup
      await prisma.workoutExercise.deleteMany({ where: { workoutId: testWorkout.id } });
      await prisma.workout.deleteMany({ where: { id: testWorkout.id } });
      await prisma.workoutTemplateExercise.deleteMany({ where: { workoutTemplateId: testTemplate.id } });
      await prisma.workoutTemplate.deleteMany({ where: { id: testTemplate.id } });
      await prisma.exercise.deleteMany({ where: { id: testExercise.id } });
    });
  });

  describe('5. Input Validation Testing', () => {
    it('Rejects negative target load in workout assignment (400 Bad Request)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/workouts/assign')
        .set('Authorization', `Bearer ${trainerMarcusTokenOrgA}`)
        .set('x-organisation-id', orgA.id)
        .send({
          memberProfileId: alexProfile.id,
          name: 'Invalid Negative Load Workout',
          scheduledDate: new Date().toISOString(),
          exercises: [
            {
              exerciseId: systemSquat.id,
              sortOrder: 0,
              targetSets: 3,
              targetReps: 10,
              targetLoad: -50, // Invalid negative weight
            },
          ],
        });

      expect(res.status).toBe(400);
    });

    it('Rejects negative actual reps in set logging (400 Bad Request)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/workouts/exercises/${customExerciseA.id}/sets`)
        .set('Authorization', `Bearer ${memberAlexTokenOrgA}`)
        .set('x-organisation-id', orgA.id)
        .send({
          setNumber: 1,
          actualReps: -5, // Invalid negative reps
          actualLoad: 50,
        });

      expect(res.status).toBe(400);
    });
  });
});
