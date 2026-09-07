import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { WorkoutTemplateService } from '../src/workouts/services/workout-template.service';
import { WorkoutsService } from '../src/workouts/services/workouts.service';
import { WorkoutPerformanceService } from '../src/workouts/services/workout-performance.service';
import { TrainingPlansService } from '../src/training-plans/services/training-plans.service';
import { TrainingPlanGenerationService } from '../src/training-plans/services/training-plan-generation.service';
import { TrainingAdherenceService } from '../src/training-plans/services/training-adherence.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';
import { TrainingPlanStatusEnum } from '../src/training-plans/dto/training-plan.dto';
import { ProgressionTypeEnum } from '../src/training-plans/dto/progression-rule.dto';

describe('Day 14: Advanced Workout Programming & Training Plans E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let plansService: TrainingPlansService;
  let generationService: TrainingPlanGenerationService;
  let adherenceService: TrainingAdherenceService;
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
  let actorOrgBUser: AuthenticatedUser;

  let systemBench: any;
  let systemSquat: any;
  let sampleTemplate: any;

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
    plansService = app.get(TrainingPlansService);
    generationService = app.get(TrainingPlanGenerationService);
    adherenceService = app.get(TrainingAdherenceService);
    templateService = app.get(WorkoutTemplateService);
    workoutsService = app.get(WorkoutsService);
    performanceService = app.get(WorkoutPerformanceService);

    orgA = await prisma.organisation.findFirstOrThrow({ where: { slug: 'second-wind' } });
    orgB = await prisma.organisation.findFirstOrThrow({ where: { slug: 'apex-strength' } });

    // Seeded users
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
        { resource: 'training_plans', action: 'READ', scope: 'OWN' },
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
        { resource: 'training_plans', action: 'CREATE', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'training_plans', action: 'READ', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'training_plans', action: 'MANAGE', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'workouts', action: 'CREATE', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'workouts', action: 'READ', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'workouts', action: 'MANAGE', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'workout_templates', action: 'READ', scope: 'ORGANISATION' },
      ],
    };

    // Unassigned Trainer Mike
    const mikeProfile = await prisma.trainerProfile.findFirst({
      where: { organisationId: orgA.id, id: { not: marcusTrainer.id } },
      include: { staffProfile: { include: { user: true } } },
    });
    if (mikeProfile) {
      mikeTrainer = mikeProfile;
      actorMikeTrainer = {
        id: mikeProfile.staffProfile.userId,
        email: mikeProfile.staffProfile.user.email,
        firstName: mikeProfile.staffProfile.user.firstName,
        lastName: mikeProfile.staffProfile.user.lastName,
        status: 'ACTIVE',
        isSuperAdmin: false,
        roles: [{ role: 'TRAINER', organisationId: orgA.id }],
        permissions: [
          { resource: 'training_plans', action: 'MANAGE', scope: 'ASSIGNED_CLIENTS' },
          { resource: 'workouts', action: 'MANAGE', scope: 'ASSIGNED_CLIENTS' },
        ],
      };
    }

    // Org B User
    const orgBUser = await prisma.user.findFirstOrThrow({ where: { email: 'owner@apexstrength.com.au' } });
    actorOrgBUser = {
      id: orgBUser.id,
      email: orgBUser.email,
      firstName: orgBUser.firstName,
      lastName: orgBUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'ORGANISATION_OWNER', organisationId: orgB.id }],
      permissions: [{ resource: '*', action: 'MANAGE', scope: 'ORGANISATION' }],
    };

    systemBench = await prisma.exercise.findFirstOrThrow({ where: { slug: 'barbell-bench-press' } });
    systemSquat = await prisma.exercise.findFirstOrThrow({ where: { slug: 'barbell-back-squat' } });

    // Create a base template for generation tests
    sampleTemplate = await templateService.create(orgA.id, {
      name: 'Day 14 E2E Test Template',
      description: 'Template for multi-week generation and progression testing',
      difficulty: 'INTERMEDIATE',
      category: 'HYPERTROPHY',
      estimatedDurationMinutes: 60,
      exercises: [
        {
          exerciseId: systemBench.id,
          sortOrder: 0,
          prescriptionType: 'REPETITIONS',
          targetSets: 3,
          targetReps: 10,
          targetLoad: 70,
          targetRpe: 8,
          restSeconds: 90,
        },
      ],
    }, actorMarcusTrainer);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Multi-Week Training Plan Lifecycle', () => {
    let createdPlan: any;

    it('should create a multi-week training plan with periodized weeks initialized', async () => {
      createdPlan = await plansService.create(
        orgA.id,
        {
          memberProfileId: alexMember.id,
          name: 'Alex Mercer 4-Week Hypertrophy Surge',
          objective: 'Progressive overload on upper body compounds',
          durationWeeks: 4,
          startDate: new Date().toISOString(),
        },
        actorMarcusTrainer,
      );

      expect(createdPlan).toBeDefined();
      expect(createdPlan.name).toBe('Alex Mercer 4-Week Hypertrophy Surge');
      expect(createdPlan.status).toBe('DRAFT');
      expect(createdPlan.durationWeeks).toBe(4);
      expect(createdPlan.organisationId).toBe(orgA.id);
      expect(createdPlan.trainerProfileId).toBe(marcusTrainer.id);

      // Verify weeks were created
      const fullPlan = await plansService.findOne(orgA.id, createdPlan.id, actorMarcusTrainer);
      expect(fullPlan.weeks).toHaveLength(4);
      expect(fullPlan.weeks[0].weekNumber).toBe(1);
      expect(fullPlan.weeks[3].weekNumber).toBe(4);
    });

    it('should configure progression rule (+2.5kg per week LINEAR_LOAD)', async () => {
      const rule = await plansService.addProgressionRule(
        orgA.id,
        createdPlan.id,
        {
          exerciseId: systemBench.id,
          progressionType: ProgressionTypeEnum.LINEAR_LOAD,
          configuration: { loadIncrementKg: 2.5, frequencyWeeks: 1 },
          notes: 'Add 2.5kg every week on bench press',
        },
        actorMarcusTrainer,
      );

      expect(rule).toBeDefined();
      expect(rule.progressionType).toBe('LINEAR_LOAD');
      expect((rule.configuration as any).loadIncrementKg).toBe(2.5);
    });

    it('should activate and pause plan', async () => {
      const activated = await plansService.update(
        orgA.id,
        createdPlan.id,
        { status: TrainingPlanStatusEnum.ACTIVE },
        actorMarcusTrainer,
      );
      expect(activated.status).toBe('ACTIVE');

      const paused = await plansService.update(
        orgA.id,
        createdPlan.id,
        { status: TrainingPlanStatusEnum.PAUSED },
        actorMarcusTrainer,
      );
      expect(paused.status).toBe('PAUSED');

      // Reactivate for subsequent tests
      const reactivated = await plansService.update(
        orgA.id,
        createdPlan.id,
        { status: TrainingPlanStatusEnum.ACTIVE },
        actorMarcusTrainer,
      );
      expect(reactivated.status).toBe('ACTIVE');
    });

    it('should retrieve calendar schedule across plan days', async () => {
      const calendar = await plansService.getCalendar(orgA.id, createdPlan.id, undefined, undefined, actorMarcusTrainer);
      expect(calendar).toBeDefined();
      expect(Array.isArray(calendar)).toBe(true);
    });
  });

  describe('2. Multi-Week Workout Generation Engine & Deterministic Progression', () => {
    let testPlan: any;

    beforeAll(async () => {
      testPlan = await plansService.create(
        orgA.id,
        {
          memberProfileId: alexMember.id,
          name: 'Progression Test Plan',
          objective: 'Testing linear load progression across 3 weeks',
          durationWeeks: 3,
          startDate: new Date('2026-09-08T09:00:00.000Z').toISOString(),
        },
        actorMarcusTrainer,
      );

      // Add a 2.5kg/week linear load progression rule
      await plansService.addProgressionRule(
        orgA.id,
        testPlan.id,
        {
          exerciseId: systemBench.id,
          progressionType: ProgressionTypeEnum.LINEAR_LOAD,
          configuration: { loadIncrementKg: 2.5, frequencyWeeks: 1 },
        },
        actorMarcusTrainer,
      );
    });

    it('should generate workouts from template with weekly progression applied', async () => {
      const result = await generationService.generateWorkouts(
        orgA.id,
        testPlan.id,
        {
          workoutTemplateId: sampleTemplate.id,
          dayNumbers: [1], // Schedule on Day 1 of each week
          startWeek: 1,
          endWeek: 3,
          applyProgression: true,
        },
        actorMarcusTrainer,
      );

      expect(result).toBeDefined();
      expect(result.generatedCount).toBe(3);
      expect(result.skippedCount).toBe(0);
      expect(result.generatedWorkoutIds).toHaveLength(3);

      // Verify progression across weeks: Week 1 = 70kg, Week 2 = 72.5kg, Week 3 = 75kg
      const w1 = await workoutsService.findById(orgA.id, result.generatedWorkoutIds[0], actorMarcusTrainer);
      const w2 = await workoutsService.findById(orgA.id, result.generatedWorkoutIds[1], actorMarcusTrainer);
      const w3 = await workoutsService.findById(orgA.id, result.generatedWorkoutIds[2], actorMarcusTrainer);

      expect(Number(w1.exercises[0].targetLoad)).toBe(70);
      expect(Number(w2.exercises[0].targetLoad)).toBe(72.5);
      expect(Number(w3.exercises[0].targetLoad)).toBe(75);
    });

    it('should be idempotent and skip days that already have workouts', async () => {
      const repeatedResult = await generationService.generateWorkouts(
        orgA.id,
        testPlan.id,
        {
          workoutTemplateId: sampleTemplate.id,
          dayNumbers: [1],
          startWeek: 1,
          endWeek: 3,
          applyProgression: true,
        },
        actorMarcusTrainer,
      );

      // All 3 days already have workouts, so generatedCount should be 0, skippedCount should be 3
      expect(repeatedResult.generatedCount).toBe(0);
      expect(repeatedResult.skippedCount).toBe(3);
    });
  });

  describe('3. Exercise Groups & Supersets Engine', () => {
    let workoutForGroups: any;
    let createdGroupId: string;

    beforeAll(async () => {
      workoutForGroups = await workoutsService.assignWorkout(
        orgA.id,
        {
          memberProfileId: alexMember.id,
          name: 'Superset Testing Workout',
          difficulty: 'INTERMEDIATE',
          scheduledDate: new Date().toISOString(),
          exercises: [
            {
              exerciseId: systemBench.id,
              sortOrder: 0,
              prescriptionType: 'REPETITIONS',
              targetSets: 4,
              targetReps: 8,
              targetLoad: 80,
            },
            {
              exerciseId: systemSquat.id,
              sortOrder: 1,
              prescriptionType: 'REPETITIONS',
              targetSets: 4,
              targetReps: 8,
              targetLoad: 100,
            },
          ],
        },
        actorMarcusTrainer,
      );
    });

    it('should create a SUPERSET exercise group on workout', async () => {
      const updatedWorkout = await workoutsService.createExerciseGroup(
        orgA.id,
        workoutForGroups.id,
        {
          name: 'Antagonistic Superset A',
          type: 'SUPERSET',
          section: 'MAIN',
          rounds: 4,
          restBetweenExercises: 30,
          restBetweenRounds: 90,
          orderIndex: 0,
          exerciseIds: [workoutForGroups.exercises[0].id, workoutForGroups.exercises[1].id],
        },
        actorMarcusTrainer,
      );

      expect(updatedWorkout).toBeDefined();
      expect(updatedWorkout.exerciseGroups).toHaveLength(1);
      const group = updatedWorkout.exerciseGroups[0];
      createdGroupId = group.id;

      expect(group.name).toBe('Antagonistic Superset A');
      expect(group.type).toBe('SUPERSET');
      expect(group.rounds).toBe(4);
      expect(group.restBetweenExercises).toBe(30);
      expect(group.restBetweenRounds).toBe(90);
      expect(group.exercises).toHaveLength(2);
    });

    it('should retrieve workout with exercise groups populated', async () => {
      const retrieved = await workoutsService.findById(orgA.id, workoutForGroups.id, actorMarcusTrainer);
      expect(retrieved.exerciseGroups).toBeDefined();
      expect(retrieved.exerciseGroups).toHaveLength(1);
      expect(retrieved.exerciseGroups[0].type).toBe('SUPERSET');
      expect(retrieved.exerciseGroups[0].exercises).toHaveLength(2);
    });

    it('should update exercise group properties', async () => {
      const updatedWorkout = await workoutsService.updateExerciseGroup(
        orgA.id,
        workoutForGroups.id,
        createdGroupId,
        {
          name: 'Updated Superset A',
          rounds: 5,
        },
        actorMarcusTrainer,
      );

      const group = updatedWorkout.exerciseGroups.find((g: any) => g.id === createdGroupId);
      expect(group?.name).toBe('Updated Superset A');
      expect(group?.rounds).toBe(5);
    });

    it('should delete exercise group and unbind exercises safely', async () => {
      await workoutsService.deleteExerciseGroup(
        orgA.id,
        workoutForGroups.id,
        createdGroupId,
        actorMarcusTrainer,
      );

      const refreshed = await workoutsService.findById(orgA.id, workoutForGroups.id, actorMarcusTrainer);
      expect(refreshed.exerciseGroups).toHaveLength(0);
      // Exercises still exist on workout
      expect(refreshed.exercises).toHaveLength(2);
      expect(refreshed.exercises[0].workoutExerciseGroupId).toBeNull();
    });
  });

  describe('4. Progression Safety & Historical Immutability', () => {
    let historicalPlan: any;
    let completedWorkout: any;

    beforeAll(async () => {
      historicalPlan = await plansService.create(
        orgA.id,
        {
          memberProfileId: alexMember.id,
          name: 'Historical Safety Plan',
          durationWeeks: 2,
          startDate: new Date().toISOString(),
        },
        actorMarcusTrainer,
      );

      // Generate a workout
      const gen = await generationService.generateWorkouts(
        orgA.id,
        historicalPlan.id,
        {
          workoutTemplateId: sampleTemplate.id,
          dayNumbers: [1],
          startWeek: 1,
          endWeek: 1,
        },
        actorMarcusTrainer,
      );

      completedWorkout = await workoutsService.findById(orgA.id, gen.generatedWorkoutIds[0], actorAlexMember);

      // Execute and complete this workout
      await workoutsService.startWorkout(orgA.id, completedWorkout.id, actorAlexMember);
      await performanceService.logSet(
        orgA.id,
        completedWorkout.exercises[0].id,
        {
          setNumber: 1,
          setKind: 'WORKING',
          actualReps: 10,
          actualLoad: 70,
          loadUnit: 'KG',
          actualRpe: 8,
          isCompleted: true,
          idempotencyKey: `safety-test-${Date.now()}`,
        },
        actorAlexMember,
      );
      await workoutsService.completeWorkout(
        orgA.id,
        completedWorkout.id,
        {
          memberNotes: 'Great workout',
        },
        actorAlexMember,
      );
    });

    it('should ensure completed historical workouts cannot be modified by new progression rules', async () => {
      // Add or update progression rule with massive change
      await plansService.addProgressionRule(
        orgA.id,
        historicalPlan.id,
        {
          exerciseId: systemBench.id,
          progressionType: ProgressionTypeEnum.LINEAR_LOAD,
          configuration: { loadIncrementKg: 20.0, frequencyWeeks: 1 }, // Huge jump
        },
        actorMarcusTrainer,
      );

      // Verify the completed workout was untouched
      const verifiedWorkout = await workoutsService.findById(orgA.id, completedWorkout.id, actorMarcusTrainer);
      expect(verifiedWorkout.status).toBe('COMPLETED');
      expect(Number(verifiedWorkout.exercises[0].targetLoad)).toBe(70);
      const completedSet = verifiedWorkout.exercises[0].sets.find((s: any) => s.completed);
      expect(Number(completedSet?.actualLoad)).toBe(70);
    });
  });

  describe('5. Template Versioning Foundation', () => {
    it('should create a new version of a workout template without mutating the parent', async () => {
      const v2Template = await templateService.createVersion(
        orgA.id,
        sampleTemplate.id,
        {
          name: 'Day 14 E2E Test Template (v2)',
          description: 'Updated template with modified target volume',
          exercises: [
            {
              exerciseId: systemBench.id,
              sortOrder: 0,
              prescriptionType: 'REPETITIONS',
              targetSets: 5, // Changed from 3 to 5
              targetReps: 12,
              targetLoad: 75,
            },
          ],
        },
        actorMarcusTrainer,
      );

      expect(v2Template).toBeDefined();
      expect(v2Template.version).toBe(2);
      expect(v2Template.parentTemplateId).toBe(sampleTemplate.id);
      expect(v2Template.exercises).toHaveLength(1);
      expect(v2Template.exercises[0].targetSets).toBe(5);

      // Verify parent template is untouched
      const parent = await templateService.findById(orgA.id, sampleTemplate.id);
      expect(parent.version).toBe(1);
      expect(parent.exercises[0].targetSets).toBe(3);
    });
  });

  describe('6. Adherence Metrics Calculation & Overdue Processing', () => {
    let adherencePlan: any;
    let pastDayWorkoutId: string;

    beforeAll(async () => {
      // Create a plan with 2 workouts: 1 completed, 1 in the past (overdue)
      adherencePlan = await plansService.create(
        orgA.id,
        {
          memberProfileId: alexMember.id,
          name: 'Adherence Tracking Plan',
          durationWeeks: 1,
          startDate: new Date('2026-09-01T00:00:00.000Z').toISOString(),
        },
        actorMarcusTrainer,
      );

      const gen = await generationService.generateWorkouts(
        orgA.id,
        adherencePlan.id,
        {
          workoutTemplateId: sampleTemplate.id,
          dayNumbers: [1, 2],
          startWeek: 1,
          endWeek: 1,
        },
        actorMarcusTrainer,
      );

      const w1Id = gen.generatedWorkoutIds[0];
      pastDayWorkoutId = gen.generatedWorkoutIds[1];

      // Complete w1
      await workoutsService.startWorkout(orgA.id, w1Id, actorAlexMember);
      await workoutsService.completeWorkout(orgA.id, w1Id, {}, actorAlexMember);

      // Backdate pastDayWorkout to 3 days ago and leave SCHEDULED/ASSIGNED
      await prisma.workout.update({
        where: { id: pastDayWorkoutId },
        data: {
          scheduledDate: new Date('2026-09-04T09:00:00.000Z'),
        },
      });
    });

    it('should process overdue workouts correctly', async () => {
      const overdueResult = await workoutsService.processOverdueWorkouts(orgA.id, 1);
      expect(overdueResult).toHaveProperty('processedCount');
      expect(overdueResult.processedCount).toBeGreaterThanOrEqual(1);
    });

    it('should calculate comprehensive adherence metrics for plan', async () => {
      const adherence = await adherenceService.calculateAdherence(orgA.id, adherencePlan.id, actorMarcusTrainer);

      expect(adherence).toBeDefined();
      expect(adherence.totalScheduled).toBe(2);
      expect(adherence.completed).toBe(1);
      expect(adherence.adherencePercentage).toBe(50);
      expect(adherence.weeklyBreakdown).toHaveLength(1);
      expect(adherence.weeklyBreakdown![0].weekNumber).toBe(1);
    });
  });

  describe('7. Security, Multi-Tenant Isolation & IDOR Verification', () => {
    let orgAPlan: any;

    beforeAll(async () => {
      orgAPlan = await plansService.create(
        orgA.id,
        {
          memberProfileId: alexMember.id,
          name: 'Org A Protected Plan',
          durationWeeks: 2,
          startDate: new Date().toISOString(),
        },
        actorMarcusTrainer,
      );
    });

    it('should reject access to Org A training plan by Org B user (Tenant Isolation)', async () => {
      await expect(
        plansService.findOne(orgB.id, orgAPlan.id, actorOrgBUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject workout generation on Org A plan by Org B user', async () => {
      await expect(
        generationService.generateWorkouts(
          orgB.id,
          orgAPlan.id,
          {
            workoutTemplateId: sampleTemplate.id,
            dayNumbers: [1],
            startWeek: 1,
            endWeek: 2,
          },
          actorOrgBUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject unassigned trainer from programming for member (TrainerClientAssignment RBAC)', async () => {
      if (actorMikeTrainer) {
        // Mike is in Org A but not assigned to Alex Mercer
        await expect(
          plansService.create(
            orgA.id,
            {
              memberProfileId: alexMember.id,
              name: 'Unauthorized Plan Attempt',
              durationWeeks: 4,
              startDate: new Date().toISOString(),
            },
            actorMikeTrainer,
          ),
        ).rejects.toThrow(ForbiddenException);
      }
    });

    it('should allow member Alex to read own training plan and calendar', async () => {
      const memberPlanView = await plansService.findOne(orgA.id, orgAPlan.id, actorAlexMember);
      expect(memberPlanView).toBeDefined();
      expect(memberPlanView.id).toBe(orgAPlan.id);

      const calendarView = await plansService.getCalendar(orgA.id, orgAPlan.id, undefined, undefined, actorAlexMember);
      expect(calendarView).toBeDefined();
    });

    it('should forbid member from generating workouts or adding progression rules', async () => {
      await expect(
        generationService.generateWorkouts(
          orgA.id,
          orgAPlan.id,
          {
            workoutTemplateId: sampleTemplate.id,
            dayNumbers: [1],
            startWeek: 1,
            endWeek: 2,
          },
          actorAlexMember,
        ),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        plansService.addProgressionRule(
          orgA.id,
          orgAPlan.id,
          {
            exerciseId: systemBench.id,
            progressionType: ProgressionTypeEnum.LINEAR_LOAD,
            configuration: { loadIncrementKg: 5, frequencyWeeks: 1 },
          },
          actorAlexMember,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
