import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { RetentionMetricsEngineService } from '../src/ai/features/retention-agent/metrics/retention-metrics-engine.service';
import { RetentionAgentContextService } from '../src/ai/features/retention-agent/context/retention-agent-context.service';
import { RetentionAgentService } from '../src/ai/features/retention-agent/retention-agent.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Section 7A: Explicit Retention Data Definitions & Deterministic Metrics', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let metricsEngine: RetentionMetricsEngineService;
  let contextService: RetentionAgentContextService;
  let agentService: RetentionAgentService;

  let orgA: any;
  let orgB: any;
  let outletA: any;
  let ownerUserA: any;
  let trainerUserA: any;
  let trainerProfileA: any;
  let memberUserA: any;
  let memberProfileA: any;
  let newMemberUser: any;
  let newMemberProfile: any;

  let actorOwnerA: AuthenticatedUser;
  let actorTrainerA: AuthenticatedUser;
  let actorOwnerB: AuthenticatedUser;

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

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    metricsEngine = moduleFixture.get<RetentionMetricsEngineService>(RetentionMetricsEngineService);
    contextService = moduleFixture.get<RetentionAgentContextService>(RetentionAgentContextService);
    agentService = moduleFixture.get<RetentionAgentService>(RetentionAgentService);

    const timestamp = Date.now();

    // Create Org A and Org B
    orgA = await prisma.organisation.create({
      data: {
        name: `Org A RetDef ${timestamp}`,
        slug: `org-a-retdef-${timestamp}`,
      },
    });

    orgB = await prisma.organisation.create({
      data: {
        name: `Org B RetDef ${timestamp}`,
        slug: `org-b-retdef-${timestamp}`,
      },
    });

    // Create Outlet A (Asia/Kathmandu timezone: UTC+5:45)
    outletA = await prisma.outlet.create({
      data: {
        name: `Outlet A ${timestamp}`,
        slug: `outlet-a-${timestamp}`,
        code: `RDA${timestamp.toString().slice(-4)}`,
        organisationId: orgA.id,
        address: '100 Core St',
        city: 'Sydney',
        state: 'NSW',
        country: 'Australia',
        postalCode: '2000',
        timezone: 'Asia/Kathmandu',
      },
    });

    // Owner in Org A
    ownerUserA = await prisma.user.create({
      data: {
        email: `owner-a-${timestamp}@fitcore.test`,
        passwordHash: 'hash',
        firstName: 'Owner',
        lastName: 'A',
      },
    });
    actorOwnerA = {
      id: ownerUserA.id,
      email: ownerUserA.email,
      roles: [{ role: 'ORGANISATION_OWNER', organisationId: orgA.id, outletId: outletA.id }],
    } as any;

    // Trainer in Org A
    trainerUserA = await prisma.user.create({
      data: {
        email: `trainer-a-${timestamp}@fitcore.test`,
        passwordHash: 'hash',
        firstName: 'Marcus',
        lastName: 'Trainer',
      },
    });
    const staffProfile = await prisma.staffProfile.create({
      data: {
        userId: trainerUserA.id,
        organisationId: orgA.id,
        displayName: 'Marcus Trainer',
        jobTitle: 'Trainer',
      },
    });
    trainerProfileA = await prisma.trainerProfile.create({
      data: {
        staffProfileId: staffProfile.id,
        organisationId: orgA.id,
        professionalName: 'Marcus Trainer',
        specialties: ['Strength', 'Retention'],
      },
    });
    actorTrainerA = {
      id: trainerUserA.id,
      email: trainerUserA.email,
      roles: [{ role: 'TRAINER', organisationId: orgA.id, outletId: outletA.id }],
    } as any;

    // Owner in Org B
    const ownerUserB = await prisma.user.create({
      data: {
        email: `owner-b-${timestamp}@fitcore.test`,
        passwordHash: 'hash',
        firstName: 'Owner',
        lastName: 'B',
      },
    });
    actorOwnerB = {
      id: ownerUserB.id,
      email: ownerUserB.email,
      roles: [{ role: 'ORGANISATION_OWNER', organisationId: orgB.id }],
    } as any;

    // Established Member in Org A (joined 60 days ago)
    memberUserA = await prisma.user.create({
      data: {
        email: `member-a-${timestamp}@fitcore.test`,
        passwordHash: 'hash',
        firstName: 'Aarav',
        lastName: 'Sharma',
      },
    });
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    memberProfileA = await prisma.memberProfile.create({
      data: {
        userId: memberUserA.id,
        organisationId: orgA.id,
        status: 'ACTIVE',
        createdAt: sixtyDaysAgo,
      },
    });

    await prisma.memberOutlet.create({
      data: {
        memberProfileId: memberProfileA.id,
        outletId: outletA.id,
      },
    });

    await prisma.trainerClientAssignment.create({
      data: {
        memberProfileId: memberProfileA.id,
        trainerProfileId: trainerProfileA.id,
        organisationId: orgA.id,
        status: 'ACTIVE',
      },
    });

    // New Member in Org A (joined 3 days ago, no activity yet)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    newMemberUser = await prisma.user.create({
      data: {
        email: `newmember-a-${timestamp}@fitcore.test`,
        passwordHash: 'hash',
        firstName: 'Pooja',
        lastName: 'Thapa',
      },
    });
    newMemberProfile = await prisma.memberProfile.create({
      data: {
        userId: newMemberUser.id,
        organisationId: orgA.id,
        status: 'ACTIVE',
        createdAt: threeDaysAgo,
      },
    });

    await prisma.memberOutlet.create({
      data: {
        memberProfileId: newMemberProfile.id,
        outletId: outletA.id,
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.retentionOutreach.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.attendanceRecord.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.booking.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.classSession.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.classType.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.workout.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.dailyCheckIn.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.foodLog.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.food.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.wearableConnection.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.memberMembership.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.membershipPlan.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.trainerClientAssignment.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.trainerProfile.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.staffProfile.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.memberOutlet.deleteMany({ where: { memberProfileId: { in: [memberProfileA.id, newMemberProfile.id] } } });
      await prisma.memberProfile.deleteMany({ where: { organisationId: { in: [orgA.id, orgB.id] } } });
      await prisma.outlet.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [
              ownerUserA.email,
              trainerUserA.email,
              memberUserA.email,
              newMemberUser.email,
              actorOwnerB.email,
            ],
          },
        },
      });
      await prisma.organisation.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
    } catch {}

    await app.close();
  });

  // =========================================================================
  // 1. INACTIVITY DAYS & LOCAL TIMEZONE CALCULATION
  // =========================================================================
  describe('1. Inactivity Days & Local Calendar Day Calculation', () => {
    it('calculates calendar inactivityDays correctly in outlet timezone (Asia/Kathmandu)', async () => {
      // Create a gym check-in 5 calendar days ago
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      await prisma.attendanceRecord.create({
        data: {
          memberProfileId: memberProfileA.id,
          organisationId: orgA.id,
          outletId: outletA.id,
          checkedInAt: fiveDaysAgo,
          status: 'CHECKED_IN',
        },
      });

      const metrics = await metricsEngine.computeRetentionDataBundle(
        memberProfileA.id,
        orgA.id,
      );

      expect(metrics.inactivity.inactivityDays).toBe(5);
      expect(metrics.inactivity.lastActivityType).toBe('CLASS_ATTENDED');
      expect(metrics.inactivity.status).toBe('ACTIVE');
      expect(metrics.inactivity.timezone).toBe('Asia/Kathmandu');
    });

    it('handles new member with no activity gracefully without flagging churn risk', async () => {
      const metrics = await metricsEngine.computeRetentionDataBundle(
        newMemberProfile.id,
        orgA.id,
      );

      // New member should have null inactivityDays and status 'NO_ACTIVITY_DATA'
      expect(metrics.inactivity.inactivityDays).toBeNull();
      expect(metrics.inactivity.lastActivityAt).toBeNull();
      expect(metrics.inactivity.status).toBe('NO_ACTIVITY_DATA');
      expect(metrics.inactivity.timezone).toBe('Asia/Kathmandu');
    });
  });

  // =========================================================================
  // 2. ATTENDANCE FREQUENCY & DETERMINISTIC TRENDS
  // =========================================================================
  describe('2. Attendance Frequency & Trend Baseline Comparison', () => {
    it('computes attendance drops deterministically (DECLINING trend)', async () => {
      // Seed 2 check-ins in current 30-day window
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      await prisma.attendanceRecord.create({
        data: {
          memberProfileId: memberProfileA.id,
          organisationId: orgA.id,
          outletId: outletA.id,
          checkedInAt: tenDaysAgo,
          status: 'CHECKED_IN',
        },
      });

      const twelveDaysAgo = new Date();
      twelveDaysAgo.setDate(twelveDaysAgo.getDate() - 12);
      await prisma.attendanceRecord.create({
        data: {
          memberProfileId: memberProfileA.id,
          organisationId: orgA.id,
          outletId: outletA.id,
          checkedInAt: twelveDaysAgo,
          status: 'CHECKED_IN',
        },
      });

      // Seed 8 check-ins in baseline window (30-60 days ago)
      for (let i = 35; i <= 42; i++) {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - i);
        await prisma.attendanceRecord.create({
          data: {
            memberProfileId: memberProfileA.id,
            organisationId: orgA.id,
            outletId: outletA.id,
            checkedInAt: pastDate,
            status: 'CHECKED_IN',
          },
        });
      }

      const metrics = await metricsEngine.computeRetentionDataBundle(
        memberProfileA.id,
        orgA.id,
      );

      // Current 30D window: 2 records (from this test) + 1 (from previous test) = 3 visits
      // Baseline 30D window: 8 visits
      // Absolute difference: 3 - 8 = -5 (-62.5%) -> DECLINING
      expect(metrics.attendance.trend).toBe('DECLINING');
      expect(metrics.attendance.attendedCount).toBe(3);
      expect(metrics.attendance.baseline?.attendedCount).toBe(8);
      expect(metrics.attendance.percentageDifference).toBeLessThan(-50);
      expect(metrics.attendance.dataQuality).toBe('HIGH');
    });
  });

  // =========================================================================
  // 3. WORKOUT ADHERENCE CALCULATION
  // =========================================================================
  describe('3. Workout Adherence (Completed / Eligible Scheduled)', () => {
    it('correctly calculates adherence excluding cancelled and future workouts', async () => {
      // 1. Past completed workout
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      await prisma.workout.create({
        data: {
          memberProfileId: memberProfileA.id,
          organisationId: orgA.id,
          title: 'Upper Body Blast',
          status: 'COMPLETED',
          scheduledDate: twoDaysAgo,
          completedAt: twoDaysAgo,
          createdAt: twoDaysAgo,
        },
      });

      // 2. Past cancelled workout (must NOT count against adherence denominator)
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
      await prisma.workout.create({
        data: {
          memberProfileId: memberProfileA.id,
          organisationId: orgA.id,
          title: 'Leg Day',
          status: 'CANCELLED',
          scheduledDate: fourDaysAgo,
          createdAt: fourDaysAgo,
        },
      });

      // 3. Future scheduled workout (must NOT count as overdue or against adherence)
      const twoDaysFuture = new Date();
      twoDaysFuture.setDate(twoDaysFuture.getDate() + 2);
      await prisma.workout.create({
        data: {
          memberProfileId: memberProfileA.id,
          organisationId: orgA.id,
          title: 'Cardio Session',
          status: 'SCHEDULED',
          scheduledDate: twoDaysFuture,
          createdAt: new Date(),
        },
      });

      const metrics = await metricsEngine.computeRetentionDataBundle(
        memberProfileA.id,
        orgA.id,
      );

      // Eligible scheduled: 1 (completed), cancelled and future are excluded
      // Adherence: 1 / 1 = 100%
      expect(metrics.workoutAdherence.completedCount).toBe(1);
      expect(metrics.workoutAdherence.adherencePercentage).toBe(100);
      expect(metrics.workoutAdherence.trend).toBe('IMPROVING');
    });
  });

  // =========================================================================
  // 4. BOOKING ENGAGEMENT & NO-SHOW RATE
  // =========================================================================
  describe('4. Booking Engagement & No-Show Rate', () => {
    it('calculates no-show rate excluding gym-cancelled and policy cancellations', async () => {
      const classType = await prisma.classType.create({
        data: {
          organisationId: orgA.id,
          name: 'Spin 45',
          category: 'CARDIO',
          durationMinutes: 45,
        },
      });

      const session1 = await prisma.classSession.create({
        data: {
          classTypeId: classType.id,
          organisationId: orgA.id,
          outletId: outletA.id,
          name: 'Spin Session 1',
          startsAt: new Date(Date.now() - 3 * 86400000),
          endsAt: new Date(Date.now() - 3 * 86400000 + 45 * 60000),
          capacity: 20,
          status: 'PUBLISHED',
        },
      });

      const session2 = await prisma.classSession.create({
        data: {
          classTypeId: classType.id,
          organisationId: orgA.id,
          outletId: outletA.id,
          name: 'Spin Session 2 (Gym Cancelled)',
          startsAt: new Date(Date.now() - 2 * 86400000),
          endsAt: new Date(Date.now() - 2 * 86400000 + 45 * 60000),
          capacity: 20,
          status: 'CANCELLED',
        },
      });

      // 1. Attended booking
      await prisma.booking.create({
        data: {
          classSessionId: session1.id,
          memberProfileId: memberProfileA.id,
          organisationId: orgA.id,
          outletId: outletA.id,
          status: 'COMPLETED',
          bookedAt: new Date(Date.now() - 4 * 86400000),
        },
      });

      // 2. No-show booking
      await prisma.booking.create({
        data: {
          classSessionId: session1.id,
          memberProfileId: memberProfileA.id,
          organisationId: orgA.id,
          outletId: outletA.id,
          status: 'NO_SHOW',
          bookedAt: new Date(Date.now() - 4 * 86400000),
        },
      });

      // 3. Gym-cancelled session booking (must NOT count against member)
      await prisma.booking.create({
        data: {
          classSessionId: session2.id,
          memberProfileId: memberProfileA.id,
          organisationId: orgA.id,
          outletId: outletA.id,
          status: 'CANCELLED',
          bookedAt: new Date(Date.now() - 4 * 86400000),
        },
      });

      // 4. Cancelled by member within valid policy (isLateCancellation = false)
      await prisma.booking.create({
        data: {
          classSessionId: session1.id,
          memberProfileId: memberProfileA.id,
          organisationId: orgA.id,
          outletId: outletA.id,
          status: 'CANCELLED',
          isLateCancellation: false,
          bookedAt: new Date(Date.now() - 4 * 86400000),
        },
      });

      const metrics = await metricsEngine.computeRetentionDataBundle(
        memberProfileA.id,
        orgA.id,
      );

      // Bookings evaluated for no-show: 1 completed/attended + 1 no-show = 2 eligible
      // No-show count = 1 -> rate = 50%
      expect(metrics.noShow.noShows).toBe(1);
      expect(metrics.noShow.eligibleSessions).toBe(2);
      expect(metrics.noShow.noShowRate).toBe(50);
      expect(metrics.booking.bookingsCreated).toBe(4);
    });
  });

  // =========================================================================
  // 5. APP ENGAGEMENT VS GYM VISITS
  // =========================================================================
  describe('5. App Engagement vs Physical Gym Visits Distinction', () => {
    it('tracks app engagement without treating app activity as physical attendance', async () => {
      // Log an AI Request interaction
      await prisma.aIRequest.create({
        data: {
          organisationId: orgA.id,
          memberId: memberProfileA.id,
          userId: memberUserA.id,
          feature: 'FITNESS_COACH',
          status: 'SUCCESS',
        },
      });

      const metrics = await metricsEngine.computeRetentionDataBundle(
        memberProfileA.id,
        orgA.id,
      );

      // App actions tracked
      expect(metrics.appEngagement.aiCoachInteractionsCount).toBeGreaterThanOrEqual(1);
      expect(metrics.appEngagement.totalAppActions).toBeGreaterThanOrEqual(1);

      // Attendance frequency strictly counts physical gym visits (not app interactions)
      expect(metrics.attendance.attendedCount).toBe(3);
    });
  });

  // =========================================================================
  // 6. PRIVACY BOUNDARIES: ZERO VITALS & ZERO DIETARY/CLINICAL INFERENCE
  // =========================================================================
  describe('6. Strict Privacy Boundaries in Retention Data', () => {
    it('tracks daily check-in participation rate with ZERO clinical/medical inference', async () => {
      // Seed 5 daily check-ins
      for (let i = 1; i <= 5; i++) {
        const checkInDate = new Date();
        checkInDate.setDate(checkInDate.getDate() - i);
        await prisma.dailyCheckIn.create({
          data: {
            memberId: memberProfileA.id,
            organisationId: orgA.id,
            checkInDate: checkInDate,
            status: 'COMPLETED',
            energyLevel: 'MODERATE',
            sleepQuality: 'GOOD',
          },
        });
      }

      const metrics = await metricsEngine.computeRetentionDataBundle(
        memberProfileA.id,
        orgA.id,
      );

      // Only metadata participation metrics are collected
      expect(metrics.checkInEngagement.checkInsCompleted).toBe(5);
      expect(metrics.checkInEngagement.completionRate).toBe(16.7); // 5/30 * 100

      // Verify no health/medical answers exist on the contract
      expect((metrics.checkInEngagement as any).energyLevel).toBeUndefined();
      expect((metrics.checkInEngagement as any).medicalNotes).toBeUndefined();
      expect((metrics.checkInEngagement as any).soreness).toBeUndefined();
    });

    it('tracks nutrition logging frequency with ZERO calories or macronutrient data', async () => {
      const food = await prisma.food.create({
        data: {
          organisationId: orgA.id,
          name: 'Chicken Bowl',
          category: 'MEALS',
          calories: 650,
          protein: 45,
          carbohydrates: 50,
          fat: 15,
          servingSize: 100,
          servingUnit: 'g',
        },
      });

      await prisma.foodLog.create({
        data: {
          organisationId: orgA.id,
          memberProfileId: memberProfileA.id,
          loggedById: memberUserA.id,
          foodId: food.id,
          mealType: 'LUNCH',
          quantity: 150,
          unit: 'g',
          consumedAt: new Date(),
          foodNameAtLog: 'Chicken Bowl',
          calories: 650,
          protein: 45,
          carbohydrates: 50,
          fat: 15,
        },
      });

      const metrics = await metricsEngine.computeRetentionDataBundle(
        memberProfileA.id,
        orgA.id,
      );

      expect(metrics.nutritionEngagement.foodLogsCount).toBeGreaterThanOrEqual(1);
      expect(metrics.nutritionEngagement.totalNutritionEvents).toBeGreaterThanOrEqual(1);

      // Verify strict privacy: zero calorie, macro, or food items in retention metrics
      expect((metrics.nutritionEngagement as any).calories).toBeUndefined();
      expect((metrics.nutritionEngagement as any).protein).toBeUndefined();
      expect((metrics.nutritionEngagement as any).dietaryRestrictions).toBeUndefined();
      expect((metrics.nutritionEngagement as any).foodName).toBeUndefined();
    });

    it('tracks wearable connection status with ZERO raw vitals (no HRV, resting HR, sleep score)', async () => {
      await prisma.wearableConnection.create({
        data: {
          memberId: memberProfileA.id,
          organisationId: orgA.id,
          provider: 'FITBIT',
          status: 'CONNECTED',
          lastSyncAt: new Date(),
        },
      });

      const metrics = await metricsEngine.computeRetentionDataBundle(
        memberProfileA.id,
        orgA.id,
      );

      expect(metrics.wearableEngagement.isConnected).toBe(true);
      expect(metrics.wearableEngagement.provider).toBe('FITBIT');
      expect(metrics.wearableEngagement.lastSyncedAt).toBeDefined();

      // Verify strict privacy: Prohibited vitals must be strictly undefined
      expect((metrics.wearableEngagement as any).hrv).toBeUndefined();
      expect((metrics.wearableEngagement as any).heartRateVariability).toBeUndefined();
      expect((metrics.wearableEngagement as any).restingHeartRate).toBeUndefined();
      expect((metrics.wearableEngagement as any).sleepScore).toBeUndefined();
      expect((metrics.wearableEngagement as any).caloriesBurned).toBeUndefined();
    });
  });

  // =========================================================================
  // 7. MEMBERSHIP EXPIRATION WINDOW CLASSIFICATION
  // =========================================================================
  describe('7. Membership Expiration Window Classification', () => {
    it('classifies membership expiring within 14 days as EXPIRING_14_DAYS', async () => {
      const plan = await prisma.membershipPlan.create({
        data: {
          organisationId: orgA.id,
          name: 'Annual Flex',
          code: `ANN-FLEX-${Date.now()}`,
          price: 12000,
          currency: 'AUD',
          billingType: 'RECURRING',
          durationValue: 12,
          durationUnit: 'MONTHS',
          status: 'ACTIVE',
        },
      });

      const expiringIn10Days = new Date();
      expiringIn10Days.setDate(expiringIn10Days.getDate() + 10);

      await prisma.memberMembership.create({
        data: {
          organisationId: orgA.id,
          memberProfileId: memberProfileA.id,
          membershipPlanId: plan.id,
          originOutletId: outletA.id,
          accessScope: 'ALL_ORGANISATION_OUTLETS',
          status: 'ACTIVE',
          startDate: new Date(Date.now() - 355 * 86400000),
          endDate: expiringIn10Days,
          planNameAtPurchase: plan.name,
          priceAtPurchase: plan.price,
          currencyAtPurchase: plan.currency,
          billingTypeAtPurchase: plan.billingType,
          durationValueAtPurchase: plan.durationValue,
          durationUnitAtPurchase: plan.durationUnit,
        },
      });

      const metrics = await metricsEngine.computeRetentionDataBundle(
        memberProfileA.id,
        orgA.id,
      );

      expect(metrics.membership.status).toBe('ACTIVE');
      expect(metrics.membership.expirationWindow).toBe('EXPIRING_14_DAYS');
      expect(metrics.membership.daysUntilExpiration).toBeLessThanOrEqual(10);
      expect(metrics.membership.daysUntilExpiration).toBeGreaterThan(7);
      expect(metrics.membership.membershipPlanName).toBe('Annual Flex');
    });
  });

  // =========================================================================
  // 8. LIFECYCLE STAGE ASSIGNMENT
  // =========================================================================
  describe('8. Member Lifecycle Stage Assignment', () => {
    it('assigns NEW_MEMBER to a member joined 3 days ago', async () => {
      const metrics = await metricsEngine.computeRetentionDataBundle(
        newMemberProfile.id,
        orgA.id,
      );

      expect(metrics.lifecycleStage).toBe('NEW_MEMBER');
    });

    it('assigns EARLY_MEMBERSHIP to a member joined 60 days ago', async () => {
      const metrics = await metricsEngine.computeRetentionDataBundle(
        memberProfileA.id,
        orgA.id,
      );

      expect(metrics.lifecycleStage).toBe('EARLY_MEMBERSHIP');
    });
  });

  // =========================================================================
  // 9. RE-ENGAGEMENT SIGNALS & NON-CAUSAL TERMINOLOGY
  // =========================================================================
  describe('9. Re-engagement Signals & Non-Causal Grounding', () => {
    it('records re-engagement activity as FOLLOWING OUTREACH, never CAUSED BY OUTREACH', async () => {
      // Create an outreach sent 2 days ago
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      await prisma.retentionOutreach.create({
        data: {
          organisationId: orgA.id,
          memberId: memberProfileA.id,
          outletId: outletA.id,
          status: 'DELIVERED',
          recommendedChannel: 'SMS',
          selectedChannel: 'SMS',
          interventionType: 'GENERAL_CHECK_IN',
          messageDraft: 'Hi Aarav, looking forward to seeing you at the gym!',
          createdAt: twoDaysAgo,
          sentAt: twoDaysAgo,
        },
      });

      // Member checked in today (physical re-engagement after outreach)
      await prisma.attendanceRecord.create({
        data: {
          memberProfileId: memberProfileA.id,
          organisationId: orgA.id,
          outletId: outletA.id,
          checkedInAt: new Date(),
          status: 'CHECKED_IN',
        },
      });

      const metrics = await metricsEngine.computeRetentionDataBundle(
        memberProfileA.id,
        orgA.id,
      );

      expect(metrics.reengagement.isReengaged).toBe(true);
      expect(metrics.reengagement.signalType).toBe('GYM_CHECK_IN');
      expect(metrics.reengagement.sourceEvent).toContain('Recent gym check-in observed.');
    });
  });

  // =========================================================================
  // 10. CONTACT FREQUENCY & RETENTION COOLDOWN
  // =========================================================================
  describe('10. Contact Frequency & Retention Cooldown Enforcement', () => {
    it('enforces 14-day retention outreach cooldown and tracks contact frequency', async () => {
      const metrics = await metricsEngine.computeRetentionDataBundle(
        memberProfileA.id,
        orgA.id,
      );

      expect(metrics.contactFrequency.isCooldownActive).toBe(true);
      expect(metrics.contactFrequency.retentionCommunicationsLast7d).toBeGreaterThanOrEqual(1);
      expect(metrics.contactFrequency.lastOutreachAt).toBeDefined();
      expect(metrics.contactFrequency.cooldownReason).toContain('14 days');
    });
  });

  // =========================================================================
  // 11. STANDARDIZED DATA POINT CONTRACT
  // =========================================================================
  describe('11. Standardized RetentionDataPoint[] Array', () => {
    it('exports all metrics conforming to the standardized RetentionDataPoint contract', async () => {
      const bundle = await metricsEngine.computeRetentionDataBundle(
        memberProfileA.id,
        orgA.id,
      );

      expect(Array.isArray(bundle.dataPoints)).toBe(true);
      expect(bundle.dataPoints.length).toBeGreaterThanOrEqual(5);

      const attendancePoint = bundle.dataPoints.find(
        (p) => p.type === 'ATTENDANCE_FREQUENCY',
      );
      expect(attendancePoint).toBeDefined();
      expect(attendancePoint?.observationWindow).toBe('30D');
      expect(attendancePoint?.baselineWindow).toBe('30D');
      expect(attendancePoint?.trend).toBeDefined();
      expect(attendancePoint?.dataQuality).toBe('HIGH');
      expect(attendancePoint?.source).toBe('AttendanceService');
      expect(attendancePoint?.evidence).toBeDefined();
    });
  });

  // =========================================================================
  // 12. RETENTION AGENT CONTEXT INTEGRATION
  // =========================================================================
  describe('12. Retention Agent Context Integration', () => {
    it('injects dataBundle, dataPoints, and overall dataQuality into RetentionAgentMemberContext', async () => {
      const context = await contextService.buildContext(
        memberProfileA.id,
        orgA.id,
      );

      expect(context.dataBundle).toBeDefined();
      expect(context.dataPoints).toBeDefined();
      expect(Array.isArray(context.dataPoints)).toBe(true);
      expect(context.dataQuality).toBeDefined();
      expect(['HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT_DATA']).toContain(context.dataQuality);
      expect(context.dataBundle?.inactivity.inactivityDays).toBeDefined();
    });
  });

  // =========================================================================
  // 13. API ENDPOINT & IDOR PROTECTION
  // =========================================================================
  describe('13. API Endpoint & Cross-Tenant IDOR Protection', () => {
    it('allows owner to retrieve member deterministic metrics via agent service', async () => {
      const metrics = await agentService.getMemberMetrics(
        memberProfileA.id,
        orgA.id,
        actorOwnerA,
      );

      expect(metrics).toBeDefined();
      expect(metrics.memberId).toBe(memberProfileA.id);
      expect(metrics.organisationId).toBe(orgA.id);
      expect(metrics.dataPoints).toBeDefined();
      expect(metrics.overallDataQuality).toBeDefined();
      expect(metrics.inactivity).toBeDefined();
    });

    it('denies Org B access to Org A member metrics (cross-tenant IDOR protection)', async () => {
      await expect(
        agentService.getMemberMetrics(memberProfileA.id, orgB.id, actorOwnerB),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows assigned trainer to access client metrics', async () => {
      const metrics = await agentService.getMemberMetrics(
        memberProfileA.id,
        orgA.id,
        actorTrainerA,
      );
      expect(metrics).toBeDefined();
      expect(metrics.memberId).toBe(memberProfileA.id);
    });

    it('denies trainer access to an unassigned member metrics', async () => {
      // Unassigned member in Org A
      const unassignedUser = await prisma.user.create({
        data: {
          email: `unassigned-retdef-${Date.now()}@fitcore.test`,
          passwordHash: 'hash',
          firstName: 'Unassigned',
          lastName: 'User',
        },
      });
      const unassignedMember = await prisma.memberProfile.create({
        data: {
          userId: unassignedUser.id,
          organisationId: orgA.id,
          status: 'ACTIVE',
        },
      });

      await expect(
        agentService.getMemberMetrics(unassignedMember.id, orgA.id, actorTrainerA),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
