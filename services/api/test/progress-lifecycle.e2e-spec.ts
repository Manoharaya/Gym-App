import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { BodyMeasurementService } from '../src/progress/services/body-measurement.service';
import { FitnessAssessmentService } from '../src/progress/services/fitness-assessment.service';
import { PersonalRecordService } from '../src/progress/services/personal-record.service';
import { AdherenceAnalyticsService } from '../src/progress/services/adherence-analytics.service';
import { GoalProgressService } from '../src/progress/services/goal-progress.service';
import { ProgressAnalyticsService } from '../src/progress/services/progress-analytics.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';
import { MeasurementTypeEnum, AssessmentCategoryEnum, AssessmentMetricTypeEnum } from '../src/progress/dto/progress.dto';

describe('Day 15: Progress Tracking, Assessments & Training Analytics Foundation E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let measurementService: BodyMeasurementService;
  let assessmentService: FitnessAssessmentService;
  let prService: PersonalRecordService;
  let adherenceService: AdherenceAnalyticsService;
  let goalService: GoalProgressService;
  let analyticsService: ProgressAnalyticsService;

  let orgA: any;
  let orgB: any;
  let outletA: any;
  let alexMember: any;
  let bobMemberOrgB: any;
  let marcusTrainer: any;
  let _mikeTrainer: any;

  let actorOwnerOrgA: AuthenticatedUser;
  let actorMarcusTrainer: AuthenticatedUser;
  let actorMikeTrainer: AuthenticatedUser;
  let actorAlexMember: AuthenticatedUser;
  let actorFinanceOrgA: AuthenticatedUser;
  let actorBobMemberOrgB: AuthenticatedUser;

  let benchPressExercise: any;
  let _squatExercise: any;
  let workout1: any;

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
    measurementService = app.get(BodyMeasurementService);
    assessmentService = app.get(FitnessAssessmentService);
    prService = app.get(PersonalRecordService);
    adherenceService = app.get(AdherenceAnalyticsService);
    goalService = app.get(GoalProgressService);
    analyticsService = app.get(ProgressAnalyticsService);

    // Retrieve seeded test data
    orgA = await prisma.organisation.findFirstOrThrow({ where: { slug: 'second-wind' } });
    orgB = await prisma.organisation.findFirstOrThrow({ where: { slug: 'apex-strength' } });
    outletA = await prisma.outlet.findFirstOrThrow({ where: { organisationId: orgA.id } });

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
        { resource: 'progress', action: 'read', scope: 'SELF' },
        { resource: 'assessments', action: 'read', scope: 'SELF' },
        { resource: 'body_measurements', action: 'manage', scope: 'SELF' },
        { resource: 'personal_records', action: 'read', scope: 'SELF' },
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
        { resource: 'progress', action: 'manage', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'assessments', action: 'manage', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'body_measurements', action: 'manage', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'personal_records', action: 'read', scope: 'ASSIGNED_CLIENTS' },
      ],
    };

    // Ensure Marcus has an active client assignment for Alex
    const existingAssignment = await prisma.trainerClientAssignment.findFirst({
      where: { trainerProfileId: marcusTrainer.id, memberProfileId: alexMember.id },
    });
    if (!existingAssignment) {
      await prisma.trainerClientAssignment.create({
        data: {
          organisationId: orgA.id,
          outletId: outletA.id,
          trainerProfileId: marcusTrainer.id,
          memberProfileId: alexMember.id,
          status: 'ACTIVE',
          assignmentType: 'PRIMARY',
          startDate: new Date(),
        },
      });
    }

    // Create unassigned trainer Mike in Org A
    const mikeUser = await prisma.user.upsert({
      where: { email: 'mike.unassigned@secondwind.com.au' },
      update: {},
      create: {
        email: 'mike.unassigned@secondwind.com.au',
        passwordHash: 'dummy',
        firstName: 'Mike',
        lastName: 'Unassigned',
        status: 'ACTIVE',
      },
    });
    const mikeStaff = await prisma.staffProfile.upsert({
      where: { userId: mikeUser.id },
      update: {},
      create: {
        userId: mikeUser.id,
        organisationId: orgA.id,
        displayName: 'Mike Unassigned',
        jobTitle: 'Trainer',
      },
    });
    _mikeTrainer = await prisma.trainerProfile.upsert({
      where: { staffProfileId: mikeStaff.id },
      update: {},
      create: {
        organisationId: orgA.id,
        staffProfileId: mikeStaff.id,
        professionalName: 'Mike Unassigned',
      },
    });
    actorMikeTrainer = {
      id: mikeUser.id,
      email: mikeUser.email,
      firstName: mikeUser.firstName,
      lastName: mikeUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'TRAINER', organisationId: orgA.id }],
      permissions: [
        { resource: 'progress', action: 'manage', scope: 'ASSIGNED_CLIENTS' },
      ],
    };

    // Finance user in Org A
    const financeUser = await prisma.user.upsert({
      where: { email: 'finance@secondwind.com.au' },
      update: {},
      create: {
        email: 'finance@secondwind.com.au',
        passwordHash: 'dummy',
        firstName: 'Fiona',
        lastName: 'Finance',
        status: 'ACTIVE',
      },
    });
    actorFinanceOrgA = {
      id: financeUser.id,
      email: financeUser.email,
      firstName: financeUser.firstName,
      lastName: financeUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'FINANCE', organisationId: orgA.id }],
      permissions: [{ resource: 'payments', action: 'manage', scope: 'ORGANISATION' }],
    };

    // Member in Organisation B (Cross-tenant actor)
    const bobUser = await prisma.user.upsert({
      where: { email: 'bob.orgb@apexstrength.com.au' },
      update: {},
      create: {
        email: 'bob.orgb@apexstrength.com.au',
        passwordHash: 'dummy',
        firstName: 'Bob',
        lastName: 'Apex',
        status: 'ACTIVE',
      },
    });
    bobMemberOrgB = await prisma.memberProfile.upsert({
      where: { userId: bobUser.id },
      update: {},
      create: {
        userId: bobUser.id,
        organisationId: orgB.id,
        status: 'ACTIVE',
      },
    });
    actorBobMemberOrgB = {
      id: bobUser.id,
      email: bobUser.email,
      firstName: bobUser.firstName,
      lastName: bobUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'MEMBER', organisationId: orgB.id }],
      permissions: [{ resource: 'progress', action: 'read', scope: 'SELF' }],
    };

    // Exercises
    benchPressExercise = await prisma.exercise.findFirstOrThrow({
      where: { slug: 'barbell-bench-press' },
    });
    _squatExercise = await prisma.exercise.findFirstOrThrow({
      where: { slug: 'barbell-back-squat' },
    });

    // Clean up any existing progress/measurements/PRs for test members so tests are completely idempotent
    await prisma.personalRecord.deleteMany({ where: { memberProfileId: alexMember.id } });
    await prisma.bodyMeasurement.deleteMany({ where: { memberProfileId: alexMember.id } });
    await prisma.assessmentResult.deleteMany({ where: { assessment: { memberProfileId: alexMember.id } } });
    await prisma.assessment.deleteMany({ where: { memberProfileId: alexMember.id } });
    await prisma.progressSnapshot.deleteMany({ where: { memberProfileId: alexMember.id } });
    await prisma.trainingGoal.deleteMany({ where: { memberProfileId: alexMember.id } });
  });

  afterAll(async () => {
    await app.close();
  });

  // =========================================================================
  // 1. BODY MEASUREMENTS & UNIT SYSTEM
  // =========================================================================

  describe('1. Body Measurements & Unit Architecture', () => {
    it('records append-only body weight and calculates delta trend', async () => {
      // Measurement 1: 80.0 kg
      const m1 = await measurementService.recordMeasurement(
        orgA.id,
        alexMember.id,
        {
          measurementType: MeasurementTypeEnum.WEIGHT,
          value: 80.0,
          unit: 'kg',
          notes: 'Baseline morning weigh-in',
        },
        actorAlexMember,
      );

      expect(m1.id).toBeDefined();
      expect(m1.value).toBe(80.0);
      expect(m1.unit).toBe('kg');
      expect(m1.previousValue).toBeNull();
      expect(m1.trend).toBe('STABLE');

      // Measurement 2: 78.5 kg (-1.5 kg, trend DOWN)
      const m2 = await measurementService.recordMeasurement(
        orgA.id,
        alexMember.id,
        {
          measurementType: MeasurementTypeEnum.WEIGHT,
          value: 78.5,
          unit: 'kg',
          notes: 'Week 2 weigh-in',
        },
        actorAlexMember,
      );

      expect(m2.value).toBe(78.5);
      expect(m2.previousValue).toBe(80.0);
      expect(m2.delta).toBe(-1.5);
      expect(m2.trend).toBe('DOWN');

      // Verify history is immutable (both records preserved in database)
      const history = await measurementService.getMeasurements(
        orgA.id,
        alexMember.id,
        { measurementType: 'WEIGHT' },
        actorAlexMember,
      );
      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history[0].value).toBe(78.5);
      expect(history[1].value).toBe(80.0);
    });

    it('validates units and rejects invalid units for measurement type', async () => {
      await expect(
        measurementService.recordMeasurement(
          orgA.id,
          alexMember.id,
          {
            measurementType: MeasurementTypeEnum.WEIGHT,
            value: 80,
            unit: 'meters', // Invalid unit for weight
          },
          actorAlexMember,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('computes statistical trend across measurement history', async () => {
      const trend = await measurementService.getMeasurementTrend(
        orgA.id,
        alexMember.id,
        'WEIGHT',
        actorAlexMember,
      );

      expect(trend).not.toBeNull();
      expect(trend!.firstValue).toBe(80.0);
      expect(trend!.latestValue).toBe(78.5);
      expect(trend!.netChange).toBe(-1.5);
      expect(trend!.trend).toBe('DOWN');
      expect(trend!.historyCount).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // 2. FITNESS ASSESSMENTS & RESULTS
  // =========================================================================

  describe('2. Fitness Assessments & Structured Results', () => {
    it('retrieves system assessment templates', async () => {
      const templates = await assessmentService.getTemplates(orgA.id);
      expect(templates.length).toBeGreaterThanOrEqual(8);

      const pushUpTemplate = templates.find((t) => t.slug === 'push-up-test');
      expect(pushUpTemplate).toBeDefined();
      expect(pushUpTemplate!.category).toBe('STRENGTH');
      expect(pushUpTemplate!.metricType).toBe('REPETITIONS');
    });

    it('allows trainer to create a custom organisation assessment template', async () => {
      const customTemplate = await assessmentService.createCustomTemplate(
        orgA.id,
        {
          name: 'Apex 300m Shuttle Run',
          category: AssessmentCategoryEnum.CARDIO,
          metricType: AssessmentMetricTypeEnum.TIME,
          defaultUnit: 'sec',
          description: 'High intensity anaerobic capacity sprint test',
        },
        actorMarcusTrainer,
      );

      expect(customTemplate.id).toBeDefined();
      expect(customTemplate.organisationId).toBe(orgA.id);
      expect(customTemplate.category).toBe('CARDIO');
    });

    it('records an assessment with structured typed results', async () => {
      const assessment = await assessmentService.recordAssessment(
        orgA.id,
        alexMember.id,
        {
          title: 'Physical Capacity Assessment Q3',
          category: AssessmentCategoryEnum.STRENGTH,
          outletId: outletA.id,
          summaryScore: 85.0,
          results: [
            {
              metricName: 'Push-Up Max Reps',
              repetitions: 42,
              unit: 'reps',
            },
            {
              metricName: '3RM Back Squat',
              weight: 120.0,
              unit: 'kg',
            },
            {
              metricName: 'Plank Hold Time',
              durationSeconds: 180,
              unit: 'sec',
            },
          ],
        },
        actorMarcusTrainer,
      );

      expect(assessment.id).toBeDefined();
      expect(assessment.results.length).toBe(3);
      expect(assessment.status).toBe('COMPLETED');
      expect(assessment.summaryScore).toBe(85.0);

      const squatResult = assessment.results.find((r) => r.metricName === '3RM Back Squat');
      expect(squatResult).toBeDefined();
      expect(squatResult!.weight).toBe(120.0);
    });

    it('retrieves member assessment history and comparisons', async () => {
      const assessments = await assessmentService.getMemberAssessments(
        orgA.id,
        alexMember.id,
        actorAlexMember,
      );

      expect(assessments.length).toBeGreaterThanOrEqual(1);
      expect(assessments[0].results.length).toBe(3);
    });
  });

  // =========================================================================
  // 3. WORKOUT PERFORMANCE, PERSONAL RECORDS & LINEAGE
  // =========================================================================

  describe('3. Workout Performance, Personal Records & Lineage Traceability', () => {
    let workout2: any;
    let workout3: any;

    it('calculates initial PRs from completed workout sets (Bench Press 80kg x 5)', async () => {
      // Create completed workout 1
      workout1 = await prisma.workout.create({
        data: {
          organisationId: orgA.id,
          outletId: outletA.id,
          memberProfileId: alexMember.id,
          title: 'Upper Body Power 1',
          status: 'COMPLETED',
          completedAt: new Date('2026-09-01T10:00:00Z'),
          exercises: {
            create: {
              exerciseId: benchPressExercise.id,
              orderIndex: 1,
              exerciseNameSnapshot: benchPressExercise.name,
              status: 'COMPLETED',
              sets: {
                create: [
                  {
                    setNumber: 1,
                    actualLoad: 70,
                    actualReps: 8,
                    loadUnit: 'KG',
                    completed: true,
                    completedAt: new Date('2026-09-01T10:10:00Z'),
                  },
                  {
                    setNumber: 2,
                    actualLoad: 80,
                    actualReps: 5,
                    loadUnit: 'KG',
                    completed: true,
                    completedAt: new Date('2026-09-01T10:15:00Z'),
                  },
                ],
              },
            },
          },
        },
      });

      // Evaluate PRs for workout 1
      const prResults = await prService.evaluateWorkoutForPRs(orgA.id, workout1.id, actorAlexMember);
      expect(prResults.length).toBeGreaterThanOrEqual(1);

      const maxWeightPR = prResults.find((p) => p.recordType === 'MAX_WEIGHT');
      expect(maxWeightPR).toBeDefined();
      expect(maxWeightPR!.value).toBe(80);
      expect(maxWeightPR!.isNewPR).toBe(true);
      expect(maxWeightPR!.previousValue).toBeNull();
    });

    it('detects a new PR when performance increases (Bench Press 85kg x 5)', async () => {
      // Create completed workout 2
      workout2 = await prisma.workout.create({
        data: {
          organisationId: orgA.id,
          outletId: outletA.id,
          memberProfileId: alexMember.id,
          title: 'Upper Body Power 2',
          status: 'COMPLETED',
          completedAt: new Date('2026-09-03T10:00:00Z'),
          exercises: {
            create: {
              exerciseId: benchPressExercise.id,
              orderIndex: 1,
              exerciseNameSnapshot: benchPressExercise.name,
              status: 'COMPLETED',
              sets: {
                create: [
                  {
                    setNumber: 1,
                    actualLoad: 85,
                    actualReps: 5,
                    loadUnit: 'KG',
                    completed: true,
                    completedAt: new Date('2026-09-03T10:15:00Z'),
                  },
                ],
              },
            },
          },
        },
      });

      const prResults = await prService.evaluateWorkoutForPRs(orgA.id, workout2.id, actorAlexMember);
      const maxWeightPR = prResults.find((p) => p.recordType === 'MAX_WEIGHT');

      expect(maxWeightPR).toBeDefined();
      expect(maxWeightPR!.value).toBe(85);
      expect(maxWeightPR!.previousValue).toBe(80);
      expect(maxWeightPR!.improvementPercentage).toBe(6.3); // (85-80)/80 * 100 = 6.25% rounded to 6.3%

      // Verify PR lineage links to exact set and workout
      const prRecord = await prisma.personalRecord.findUniqueOrThrow({
        where: { id: maxWeightPR!.recordId },
      });
      expect(prRecord.workoutId).toBe(workout2.id);
      expect(prRecord.exerciseId).toBe(benchPressExercise.id);
      expect(prRecord.memberProfileId).toBe(alexMember.id);
      expect(prRecord.previousValue).toBe(80);
    });

    it('does NOT create a false PR when performance is lower or identical (Bench Press 80kg x 5)', async () => {
      // Create completed workout 3 with lower load (80 kg)
      workout3 = await prisma.workout.create({
        data: {
          organisationId: orgA.id,
          outletId: outletA.id,
          memberProfileId: alexMember.id,
          title: 'Upper Body Deload',
          status: 'COMPLETED',
          completedAt: new Date('2026-09-05T10:00:00Z'),
          exercises: {
            create: {
              exerciseId: benchPressExercise.id,
              orderIndex: 1,
              exerciseNameSnapshot: benchPressExercise.name,
              status: 'COMPLETED',
              sets: {
                create: [
                  {
                    setNumber: 1,
                    actualLoad: 80,
                    actualReps: 5,
                    loadUnit: 'KG',
                    completed: true,
                    completedAt: new Date('2026-09-05T10:15:00Z'),
                  },
                ],
              },
            },
          },
        },
      });

      const prResults = await prService.evaluateWorkoutForPRs(orgA.id, workout3.id, actorAlexMember);
      const maxWeightPR = prResults.find((p) => p.recordType === 'MAX_WEIGHT');

      // No new MAX_WEIGHT PR should have been generated!
      expect(maxWeightPR).toBeUndefined();

      // Current best PR remains 85 kg
      const bestPRs = await prService.getMemberBestPRs(orgA.id, alexMember.id, actorAlexMember);
      const currentBenchBest = bestPRs.find(
        (p) => p.exerciseId === benchPressExercise.id && p.recordType === 'MAX_WEIGHT',
      );
      expect(currentBenchBest!.value).toBe(85);
    });

    it('preserves full PR history chronologically', async () => {
      const allPRs = await prService.getMemberPRs(
        orgA.id,
        alexMember.id,
        actorAlexMember,
        benchPressExercise.id,
      );

      // Contains both 80kg and 85kg historical records
      const maxWeightHistory = allPRs.filter((p) => p.recordType === 'MAX_WEIGHT');
      expect(maxWeightHistory.length).toBe(2);
      expect(maxWeightHistory[0].value).toBe(85);
      expect(maxWeightHistory[1].value).toBe(80);
    });
  });

  // =========================================================================
  // 4. TRAINING ADHERENCE ANALYTICS (EXACT SLICE 34 FORMULA)
  // =========================================================================

  describe('4. Training Adherence Analytics & Deterministic Formulas', () => {
    it('calculates 7/9 adherence from 10 scheduled, 7 completed, 2 skipped, 1 cancelled', async () => {
      // Create a test member dedicated to adherence formula validation
      const adhUser = await prisma.user.create({
        data: {
          email: `adherence.member.${Date.now()}@secondwind.com.au`,
          passwordHash: 'dummy',
          firstName: 'Adherence',
          lastName: 'Tester',
          status: 'ACTIVE',
        },
      });
      const adhMember = await prisma.memberProfile.create({
        data: {
          userId: adhUser.id,
          organisationId: orgA.id,
          status: 'ACTIVE',
        },
      });

      const baseDate = new Date();

      // 7 Completed workouts
      for (let i = 0; i < 7; i++) {
        await prisma.workout.create({
          data: {
            organisationId: orgA.id,
            memberProfileId: adhMember.id,
            title: `Completed ${i + 1}`,
            status: 'COMPLETED',
            scheduledDate: new Date(baseDate.getTime() - (i + 1) * 24 * 60 * 60 * 1000),
            completedAt: new Date(baseDate.getTime() - (i + 1) * 24 * 60 * 60 * 1000),
          },
        });
      }

      // 2 Skipped workouts
      for (let i = 0; i < 2; i++) {
        await prisma.workout.create({
          data: {
            organisationId: orgA.id,
            memberProfileId: adhMember.id,
            title: `Skipped ${i + 1}`,
            status: 'SKIPPED',
            scheduledDate: new Date(baseDate.getTime() - (8 + i) * 24 * 60 * 60 * 1000),
          },
        });
      }

      // 1 Cancelled workout
      await prisma.workout.create({
        data: {
          organisationId: orgA.id,
          memberProfileId: adhMember.id,
          title: 'Cancelled 1',
          status: 'CANCELLED',
          scheduledDate: new Date(baseDate.getTime() - 10 * 24 * 60 * 60 * 1000),
          cancelledAt: new Date(),
        },
      });

      // Calculate adherence over 30 days
      const adherence = await adherenceService.calculateMemberAdherence(
        orgA.id,
        adhMember.id,
        '30D',
      );

      expect(adherence.totalScheduled).toBe(10);
      expect(adherence.completed).toBe(7);
      expect(adherence.skipped).toBe(2);
      expect(adherence.cancelled).toBe(1);

      // Effective scheduled = 10 - 1 = 9
      expect(adherence.effectiveScheduled).toBe(9);

      // Adherence rate = 7 / 9 * 100 = 77.777% rounded to 78%
      expect(adherence.adherenceRate).toBe(78);

      // Completion rate = 7 / 10 * 100 = 70%
      expect(adherence.completionRate).toBe(70);
    });

    it('handles zero scheduled workouts gracefully with 100% baseline adherence', async () => {
      const emptyUser = await prisma.user.create({
        data: {
          email: `empty.adherence.${Date.now()}@secondwind.com.au`,
          passwordHash: 'dummy',
          firstName: 'Empty',
          lastName: 'Adherence',
          status: 'ACTIVE',
        },
      });
      const emptyMember = await prisma.memberProfile.create({
        data: {
          userId: emptyUser.id,
          organisationId: orgA.id,
          status: 'ACTIVE',
        },
      });

      const adherence = await adherenceService.calculateMemberAdherence(
        orgA.id,
        emptyMember.id,
        '30D',
      );

      expect(adherence.totalScheduled).toBe(0);
      expect(adherence.adherenceRate).toBe(100);
      expect(adherence.completionRate).toBe(100);
    });
  });

  // =========================================================================
  // 5. GOAL PROGRESS TESTING (EXACT SLICE 36 INCREASING & DECREASING)
  // =========================================================================

  describe('5. Goal Progress Testing (Increasing & Decreasing Goals)', () => {
    it('calculates 50% for increasing goal (Baseline 60kg, Target 80kg, Current 70kg)', () => {
      const result = goalService.calculateProgress(60, 80, 70);
      expect(result.progressPercentage).toBe(50.0);
      expect(result.direction).toBe('INCREASING');
    });

    it('calculates 50% for decreasing goal (Baseline 100kg, Target 80kg, Current 90kg)', () => {
      const result = goalService.calculateProgress(100, 80, 90);
      expect(result.progressPercentage).toBe(50.0);
      expect(result.direction).toBe('DECREASING');
    });

    it('calculates 100% when decreasing goal reaches target (Baseline 100kg, Target 80kg, Current 80kg)', () => {
      const result = goalService.calculateProgress(100, 80, 80);
      expect(result.progressPercentage).toBe(100.0);
    });

    it('synchronizes member goals when new body weight is recorded', async () => {
      // Create weight loss goal for Alex
      const weightGoal = await prisma.trainingGoal.create({
        data: {
          organisationId: orgA.id,
          memberProfileId: alexMember.id,
          title: 'Weight Loss Phase 1',
          category: 'WEIGHT_LOSS',
          baselineValue: 85.0,
          targetValue: 75.0,
          currentValue: 82.0,
          unit: 'kg',
          status: 'ACTIVE',
        },
      });

      // Log body measurement: 77.0 kg
      await measurementService.recordMeasurement(
        orgA.id,
        alexMember.id,
        {
          measurementType: MeasurementTypeEnum.WEIGHT,
          value: 77.0,
          unit: 'kg',
        },
        actorAlexMember,
      );

      // Auto-sync
      await goalService.syncGoalProgressFromMeasurement(orgA.id, alexMember.id, 'WEIGHT', 77.0);

      const updatedGoal = await prisma.trainingGoal.findUniqueOrThrow({
        where: { id: weightGoal.id },
      });
      expect(updatedGoal.currentValue).toBe(77.0);

      // Progress check: (85 - 77) / (85 - 75) = 8 / 10 = 80%
      const calculated = goalService.calculateProgress(
        updatedGoal.baselineValue,
        updatedGoal.targetValue,
        updatedGoal.currentValue,
      );
      expect(calculated.progressPercentage).toBe(80.0);
    });
  });

  // =========================================================================
  // 6. PROGRESS SUMMARY, VOLUME, COMPARISON & SNAPSHOTS
  // =========================================================================

  describe('6. Unified Progress Summary, Volume & Time Comparisons', () => {
    it('aggregates multi-dimensional progress summary for member', async () => {
      const summary = await analyticsService.getMemberProgressSummary(
        orgA.id,
        alexMember.id,
        '30D',
        actorAlexMember,
      );

      expect(summary.memberProfileId).toBe(alexMember.id);
      expect(summary.totalTonnageLifted).toBeGreaterThan(0);
      expect(summary.adherence).toBeDefined();
      expect(summary.personalRecords.length).toBeGreaterThan(0);
      expect(summary.recentMeasurements.length).toBeGreaterThan(0);
    });

    it('compares progress across two time windows (primary vs prior)', async () => {
      const comparison = await analyticsService.comparePeriods(
        orgA.id,
        alexMember.id,
        '30D',
        actorAlexMember,
      );

      expect(comparison.memberProfileId).toBe(alexMember.id);
      expect(comparison.primaryPeriod).toBeDefined();
      expect(comparison.comparisonPeriod).toBeDefined();
      expect(comparison.deltas).toBeDefined();
    });

    it('creates an immutable point-in-time progress snapshot', async () => {
      const snapshot = await analyticsService.createSnapshot(
        orgA.id,
        alexMember.id,
        '30D',
        actorAlexMember,
      );

      expect(snapshot.id).toBeDefined();
      expect(snapshot.memberProfileId).toBe(alexMember.id);
      expect(snapshot.adherenceRate).toBeDefined();
      expect(snapshot.tonnageLifted).toBeDefined();
    });
  });

  // =========================================================================
  // 7. SECURITY, TENANT ISOLATION, SCOPE & IDOR TESTING
  // =========================================================================

  describe('7. Security, Tenant Isolation & IDOR Verification', () => {
    it('strictly blocks Finance role from accessing member health and progress analytics', async () => {
      await expect(
        measurementService.assertProgressAccess(orgA.id, alexMember.id, actorFinanceOrgA),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        analyticsService.getMemberProgressSummary(orgA.id, alexMember.id, '30D', actorFinanceOrgA),
      ).rejects.toThrow(ForbiddenException);
    });

    it('strictly blocks Member A from accessing Member B progress (Cross-Member IDOR)', async () => {
      // Bob in Org B tries to access Alex in Org A
      await expect(
        measurementService.assertProgressAccess(orgA.id, alexMember.id, actorBobMemberOrgB),
      ).rejects.toThrow(ForbiddenException);
    });

    it('strictly blocks Cross-Tenant queries (Org A query for Org B member)', async () => {
      await expect(
        measurementService.assertProgressAccess(orgA.id, bobMemberOrgB.id, actorOwnerOrgA),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows assigned Trainer Marcus to access Alex Mercer progress', async () => {
      await expect(
        measurementService.assertProgressAccess(orgA.id, alexMember.id, actorMarcusTrainer),
      ).resolves.not.toThrow();
    });

    it('strictly blocks Unassigned Trainer Mike from accessing Alex Mercer progress', async () => {
      await expect(
        measurementService.assertProgressAccess(orgA.id, alexMember.id, actorMikeTrainer),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // 8. HISTORICAL INTEGRITY
  // =========================================================================

  describe('8. Historical Integrity Verification', () => {
    it('ensures changing exercise name does not rewrite historical progress or PR records', async () => {
      const originalName = benchPressExercise.name;

      // Update exercise metadata in catalogue
      await prisma.exercise.update({
        where: { id: benchPressExercise.id },
        data: { name: 'Barbell Bench Press (Updated)' },
      });

      // Historical workout snapshots remain intact
      const historicalWorkout = await prisma.workout.findFirstOrThrow({
        where: { id: workout1.id },
        include: { exercises: true },
      });
      expect(historicalWorkout.exercises[0].exerciseNameSnapshot).toBe(originalName);

      // Historical PRs remain intact
      const prs = await prService.getMemberPRs(
        orgA.id,
        alexMember.id,
        actorAlexMember,
        benchPressExercise.id,
      );
      const maxWeightPRs = prs.filter((p) => p.recordType === 'MAX_WEIGHT');
      expect(maxWeightPRs.length).toBe(2);
      expect(maxWeightPRs[0].value).toBe(85);

      // Revert name
      await prisma.exercise.update({
        where: { id: benchPressExercise.id },
        data: { name: originalName },
      });
    });
  });
});
