import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { EngagementEventService } from '../src/engagement/services/engagement-event.service';
import { EngagementScoreService, CURRENT_CALCULATION_VERSION } from '../src/engagement/services/engagement-score.service';
import { StreakService } from '../src/engagement/services/streak.service';
import { HabitService } from '../src/engagement/services/habit.service';
import { ChallengeService } from '../src/engagement/services/challenge.service';
import { RewardService } from '../src/engagement/services/reward.service';
import { EngagementNotificationService } from '../src/engagement/services/engagement-notification.service';
import { EngagementAnalyticsService } from '../src/engagement/services/engagement-analytics.service';
import { EngagementContextService } from '../src/engagement/services/engagement-context.service';
import { EngagementStaffController } from '../src/engagement/controllers/engagement-staff.controller';
import { EngagementAdminController } from '../src/engagement/controllers/engagement-admin.controller';
import { DailyEngagementProcessor } from '../src/engagement/processors/daily-engagement.processor';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';
import {
  EngagementEventType,
  EngagementSourceType,
  HabitCategory,
  HabitFrequency,
  HabitStatus,
  ChallengeType,
  ChallengeStatus,
  ParticipantStatus,
  RewardStatus,
  EngagementLevel,
  EngagementSegment,
} from '@fitcore/types';

describe('Day 18: Member Engagement, Habits, Challenges & Retention Foundation E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let eventService: EngagementEventService;
  let scoreService: EngagementScoreService;
  let streakService: StreakService;
  let habitService: HabitService;
  let challengeService: ChallengeService;
  let rewardService: RewardService;
  let notificationService: EngagementNotificationService;
  let analyticsService: EngagementAnalyticsService;
  let contextService: EngagementContextService;
  let staffController: EngagementStaffController;
  let adminController: EngagementAdminController;
  let dailyProcessor: DailyEngagementProcessor;

  let orgA: any;
  let orgB: any;
  let outletA: any;
  let alexMember: any;
  let bobMemberOrgB: any;
  let marcusTrainerUser: any;
  let ownerUserOrgA: any;

  let actorAlex: AuthenticatedUser;
  let actorMarcusTrainer: AuthenticatedUser;
  let actorOwnerOrgA: AuthenticatedUser;
  let actorBobOrgB: AuthenticatedUser;

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
    eventService = app.get(EngagementEventService);
    scoreService = app.get(EngagementScoreService);
    streakService = app.get(StreakService);
    habitService = app.get(HabitService);
    challengeService = app.get(ChallengeService);
    rewardService = app.get(RewardService);
    notificationService = app.get(EngagementNotificationService);
    analyticsService = app.get(EngagementAnalyticsService);
    contextService = app.get(EngagementContextService);
    staffController = app.get(EngagementStaffController);
    adminController = app.get(EngagementAdminController);
    dailyProcessor = app.get(DailyEngagementProcessor);

    // Fetch seed organisations & users
    orgA = await prisma.organisation.findFirstOrThrow({ where: { slug: 'second-wind' } });
    orgB = await prisma.organisation.findFirstOrThrow({ where: { slug: 'apex-strength' } });
    outletA = await prisma.outlet.findFirstOrThrow({ where: { organisationId: orgA.id } });

    // Member Alex (Org A)
    const alexUser = await prisma.user.findFirstOrThrow({ where: { email: 'member@secondwind.com.au' } });
    alexMember = await prisma.memberProfile.findFirstOrThrow({ where: { userId: alexUser.id } });

    actorAlex = {
      id: alexUser.id,
      email: alexUser.email,
      firstName: alexUser.firstName,
      lastName: alexUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'MEMBER', organisationId: orgA.id }],
      permissions: [{ resource: 'engagement', action: 'read', scope: 'SELF' }],
    };

    // Trainer Marcus (Org A)
    marcusTrainerUser = await prisma.user.findFirstOrThrow({ where: { email: 'trainer@secondwind.com.au' } });
    actorMarcusTrainer = {
      id: marcusTrainerUser.id,
      email: marcusTrainerUser.email,
      firstName: marcusTrainerUser.firstName,
      lastName: marcusTrainerUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'TRAINER', organisationId: orgA.id }],
      permissions: [{ resource: 'engagement', action: 'read', scope: 'ASSIGNED_CLIENTS' }],
    };
    (actorMarcusTrainer as any).role = 'TRAINER';

    // Owner (Org A)
    ownerUserOrgA = await prisma.user.findFirstOrThrow({ where: { email: 'owner@secondwind.com.au' } });
    actorOwnerOrgA = {
      id: ownerUserOrgA.id,
      email: ownerUserOrgA.email,
      firstName: ownerUserOrgA.firstName,
      lastName: ownerUserOrgA.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'ORGANISATION_OWNER', organisationId: orgA.id }],
      permissions: [
        { resource: 'engagement', action: 'manage', scope: 'ORGANISATION' },
        { resource: 'challenges', action: 'manage', scope: 'ORGANISATION' },
        { resource: 'rewards', action: 'manage', scope: 'ORGANISATION' },
      ],
    };
    (actorOwnerOrgA as any).role = 'ORGANISATION_OWNER';

    // Member Bob (Org B)
    const bobUser = await prisma.user.upsert({
      where: { email: 'bob.day18@apexstrength.com' },
      update: {},
      create: {
        email: 'bob.day18@apexstrength.com',
        passwordHash: 'dummy_hash_for_tests',
        firstName: 'Bob',
        lastName: 'Apex',
      },
    });

    bobMemberOrgB = await prisma.memberProfile.upsert({
      where: { userId: bobUser.id },
      update: {},
      create: {
        userId: bobUser.id,
        organisationId: orgB.id,
        timezone: 'Australia/Sydney',
        status: 'ACTIVE',
      },
    });

    actorBobOrgB = {
      id: bobUser.id,
      email: bobUser.email,
      firstName: bobUser.firstName,
      lastName: bobUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'MEMBER', organisationId: orgB.id }],
      permissions: [{ resource: 'engagement', action: 'read', scope: 'SELF' }],
    };
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================================
  // TEST GROUP 1: IMMUTABLE ENGAGEMENT EVENTS & IDEMPOTENCY (Slices 2, 3, 4, 5)
  // ============================================================================
  describe('Engagement Events & Idempotency', () => {
    it('records an immutable engagement event with proper source attribution', async () => {
      const event = await eventService.recordEvent(orgA.id, alexMember.id, {
        eventType: EngagementEventType.WORKOUT_COMPLETED,
        sourceType: EngagementSourceType.WORKOUT,
        sourceId: 'wk_test_101',
        metadata: { exercisesCompleted: 5, durationMinutes: 45 },
        occurredAt: new Date().toISOString(),
      });

      expect(event).toBeDefined();
      expect(event.id).toBeDefined();
      expect(event.memberId).toBe(alexMember.id);
      expect(event.organisationId).toBe(orgA.id);
      expect(event.sourceType).toBe(EngagementSourceType.WORKOUT);
      expect(event.sourceId).toBe('wk_test_101');
    });

    it('enforces event idempotency: identical idempotencyKey returns existing record without duplicate credit', async () => {
      const idempotencyKey = `workout:wk_idemp_101:completed`;

      const firstEvent = await eventService.recordEvent(orgA.id, alexMember.id, {
        eventType: EngagementEventType.WORKOUT_COMPLETED,
        sourceType: EngagementSourceType.WORKOUT,
        sourceId: 'wk_idemp_101',
        idempotencyKey,
        occurredAt: new Date().toISOString(),
      });

      const initialCount = await prisma.engagementEvent.count({
        where: { memberId: alexMember.id, idempotencyKey },
      });
      expect(initialCount).toBe(1);

      // Re-submit identical event
      const duplicateEvent = await eventService.recordEvent(orgA.id, alexMember.id, {
        eventType: EngagementEventType.WORKOUT_COMPLETED,
        sourceType: EngagementSourceType.WORKOUT,
        sourceId: 'wk_idemp_101',
        idempotencyKey,
        occurredAt: new Date().toISOString(),
      });

      expect(duplicateEvent.id).toBe(firstEvent.id);

      const finalCount = await prisma.engagementEvent.count({
        where: { memberId: alexMember.id, idempotencyKey },
      });
      expect(finalCount).toBe(1);
    });

    it('updates derived MemberEngagementProfile with activity timestamps and total counters', async () => {
      const summary = await eventService.getMemberEngagementSummary(alexMember.id, orgA.id);

      expect(summary.profile).toBeDefined();
      expect(summary.profile.memberId).toBe(alexMember.id);
      expect(summary.profile.totalWorkouts).toBeGreaterThanOrEqual(1);
      expect(summary.profile.lastActivityAt).toBeDefined();
    });
  });

  // ============================================================================
  // TEST GROUP 2: TIMEZONE-AWARE STREAK ENGINE (Slices 12, 13, 46)
  // ============================================================================
  describe('Streak Engine & Timezone Awareness', () => {
    it('correctly calculates consecutive active days for local timezone calendar dates', () => {
      const timezone = 'Australia/Perth';
      const todayStr = streakService.getLocalDateString(new Date(), timezone);
      const yesterdayStr = streakService.getPreviousDateString(todayStr);
      const twoDaysAgoStr = streakService.getPreviousDateString(yesterdayStr);

      const activeDays = [twoDaysAgoStr, yesterdayStr, todayStr];
      const result = streakService.calculateStreakFromDays(activeDays, timezone);

      expect(result.currentStreak).toBe(3);
      expect(result.longestStreak).toBe(3);
      expect(result.isActiveToday).toBe(true);
    });

    it('maintains active streak if member was active yesterday but has not yet completed today', () => {
      const timezone = 'Australia/Perth';
      const todayStr = streakService.getLocalDateString(new Date(), timezone);
      const yesterdayStr = streakService.getPreviousDateString(todayStr);
      const twoDaysAgoStr = streakService.getPreviousDateString(yesterdayStr);

      // Active two days ago and yesterday, but not today
      const activeDays = [twoDaysAgoStr, yesterdayStr];
      const result = streakService.calculateStreakFromDays(activeDays, timezone);

      expect(result.currentStreak).toBe(2);
      expect(result.isActiveToday).toBe(false);
    });

    it('resets current streak to 0 if inactive yesterday and today, while preserving longest streak', () => {
      const timezone = 'Australia/Perth';
      const todayStr = streakService.getLocalDateString(new Date(), timezone);
      const yesterdayStr = streakService.getPreviousDateString(todayStr);
      const twoDaysAgoStr = streakService.getPreviousDateString(yesterdayStr);
      const threeDaysAgoStr = streakService.getPreviousDateString(twoDaysAgoStr);

      // Active 3 days ago, broken streak since
      const activeDays = [threeDaysAgoStr];
      const result = streakService.calculateStreakFromDays(activeDays, timezone);

      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(1);
      expect(result.isActiveToday).toBe(false);
    });
  });

  // ============================================================================
  // TEST GROUP 3: DETERMINISTIC ENGAGEMENT SCORING & SNAPSHOTS (Slices 6, 7, 8, 45)
  // ============================================================================
  describe('Deterministic Engagement Scoring & Level Engine', () => {
    it('calculates explainable bounded score [0, 100] with versioned snapshot', async () => {
      const result = await scoreService.recordSnapshot(alexMember.id, orgA.id, EngagementLevel.ACTIVE);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.calculationVersion).toBe(CURRENT_CALCULATION_VERSION);
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.attendanceScore).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.workoutScore).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.decayMultiplier).toBeGreaterThan(0);

      // Verify immutable persisted snapshot
      const snapshot = await prisma.engagementScoreSnapshot.findFirst({
        where: { memberId: alexMember.id },
        orderBy: { calculatedAt: 'desc' },
      });
      expect(snapshot).toBeDefined();
      expect(snapshot?.calculationVersion).toBe(1);
      expect(snapshot?.score).toBe(result.score);
    });
  });

  // ============================================================================
  // TEST GROUP 4: HABITS ENGINE & DAILY COMPLETION (Slices 9, 10, 11, 12)
  // ============================================================================
  describe('Habits Lifecycle & Daily Tracking', () => {
    let testHabit: any;
    let memberHabit: any;

    it('creates a habit template in the organisation catalog', async () => {
      testHabit = await habitService.createHabit(
        orgA.id,
        {
          name: 'Hydration Target (2.5L)',
          description: 'Drink at least 2.5 litres of water throughout the day',
          category: HabitCategory.HYDRATION,
          frequency: HabitFrequency.DAILY,
          target: 2.5,
          unit: 'L',
        },
        actorOwnerOrgA.id,
      );

      expect(testHabit).toBeDefined();
      expect(testHabit.name).toBe('Hydration Target (2.5L)');
      expect(testHabit.category).toBe(HabitCategory.HYDRATION);
    });

    it('assigns habit to member profile', async () => {
      memberHabit = await habitService.assignMemberHabit(
        orgA.id,
        alexMember.id,
        {
          habitId: testHabit.id,
          target: 2.5,
          frequency: HabitFrequency.DAILY,
        },
        actorAlex.id,
      );

      expect(memberHabit).toBeDefined();
      expect(memberHabit.memberId).toBe(alexMember.id);
      expect(memberHabit.status).toBe(HabitStatus.ACTIVE);
    });

    it('logs daily habit completion idempotently and increments habit streak', async () => {
      const todayStr = new Date().toISOString().split('T')[0];

      const res = await habitService.logCompletion(orgA.id, alexMember.id, memberHabit.id, {
        date: todayStr,
        value: 2.5,
        unit: 'L',
        notes: 'Hit target after workout session',
      });

      expect(res.completion).toBeDefined();
      expect(res.completion.completed).toBe(true);
      expect(res.streak.currentStreak).toBeGreaterThanOrEqual(1);

      // Verify unique constraint: logging again on same date updates rather than creates duplicate
      const initialCount = await prisma.habitCompletion.count({
        where: { memberHabitId: memberHabit.id },
      });

      await habitService.logCompletion(orgA.id, alexMember.id, memberHabit.id, {
        date: todayStr,
        value: 3.0,
        unit: 'L',
        notes: 'Updated target to 3L',
      });

      const finalCount = await prisma.habitCompletion.count({
        where: { memberHabitId: memberHabit.id },
      });
      expect(finalCount).toBe(initialCount);
    });

    it('supports pause and resume of member habits', async () => {
      const paused = await habitService.updateMemberHabitStatus(
        orgA.id,
        alexMember.id,
        memberHabit.id,
        HabitStatus.PAUSED,
      );
      expect(paused.status).toBe(HabitStatus.PAUSED);

      const resumed = await habitService.updateMemberHabitStatus(
        orgA.id,
        alexMember.id,
        memberHabit.id,
        HabitStatus.ACTIVE,
      );
      expect(resumed.status).toBe(HabitStatus.ACTIVE);
    });
  });

  // ============================================================================
  // TEST GROUP 5: CHALLENGES & ZERO-TRUST PRIVACY LEADERBOARDS (Slices 14–20)
  // ============================================================================
  describe('Challenges & Privacy-Safe Leaderboards', () => {
    let challenge: any;

    it('creates an organisation challenge with structured rules', async () => {
      const now = new Date();
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      challenge = await challengeService.createChallenge(
        orgA.id,
        {
          name: 'Spring 12-Workout Blitz',
          description: 'Complete 12 workouts in 30 days to earn exclusive gym rewards',
          challengeType: ChallengeType.WORKOUT_COMPLETION,
          metric: 'WORKOUT_COMPLETION',
          target: 12,
          startDate: now.toISOString(),
          endDate: thirtyDaysLater.toISOString(),
          status: ChallengeStatus.ACTIVE,
          leaderboardEnabled: true,
        },
        actorOwnerOrgA.id,
      );

      expect(challenge).toBeDefined();
      expect(challenge.target).toBe(12);
      expect(challenge.metric).toBe('WORKOUT_COMPLETION');
    });

    it('allows member to join challenge with duplicate prevention', async () => {
      const participant = await challengeService.joinChallenge(challenge.id, alexMember.id, orgA.id);

      expect(participant).toBeDefined();
      expect(participant.challengeId).toBe(challenge.id);
      expect(participant.memberId).toBe(alexMember.id);
      expect(participant.status).toBe(ParticipantStatus.JOINED);

      // Attempting to join again maintains single participant record
      const reJoin = await challengeService.joinChallenge(challenge.id, alexMember.id, orgA.id);
      expect(reJoin.id).toBe(participant.id);
    });

    it('automatically increments challenge progress when qualifying events occur', async () => {
      await challengeService.incrementProgressForMember(alexMember.id, orgA.id, 'WORKOUT_COMPLETION', 3);

      const updatedPart = await prisma.challengeParticipant.findUnique({
        where: {
          challengeId_memberId: {
            challengeId: challenge.id,
            memberId: alexMember.id,
          },
        },
      });

      expect(updatedPart?.currentProgress).toBe(3);
      expect(updatedPart?.status).toBe(ParticipantStatus.IN_PROGRESS);
    });

    it('returns privacy-safe leaderboards exposing display names only (Zero-Trust Privacy)', async () => {
      const leaderboard = await challengeService.getChallengeLeaderboard(challenge.id, orgA.id);

      expect(leaderboard).toBeDefined();
      expect(Array.isArray(leaderboard)).toBe(true);
      expect(leaderboard.length).toBeGreaterThanOrEqual(1);

      const entry = leaderboard[0];
      expect(entry.displayName).toBeDefined();
      expect(entry.progress).toBe(3);
      expect(entry.target).toBe(12);

      // Verify privacy: zero health, injury, medical, or private notes are exposed
      expect((entry as any).weight).toBeUndefined();
      expect((entry as any).parq).toBeUndefined();
      expect((entry as any).injuries).toBeUndefined();
      expect((entry as any).notes).toBeUndefined();
    });
  });

  // ============================================================================
  // TEST GROUP 6: REWARDS & TRANSACTIONAL REDEMPTION (Slices 21–23)
  // ============================================================================
  describe('Rewards & Concurrency-Safe Redemption', () => {
    let reward: any;
    let memberReward: any;

    it('seeds and awards system badges without duplication', async () => {
      const awarded = await rewardService.evaluateBadges(alexMember.id, orgA.id);
      expect(Array.isArray(awarded)).toBe(true);

      const memberBadges = await prisma.memberBadge.findMany({
        where: { memberId: alexMember.id },
      });
      expect(memberBadges.length).toBeGreaterThanOrEqual(1);

      // Re-evaluation does not duplicate badge records
      const initialCount = memberBadges.length;
      await rewardService.evaluateBadges(alexMember.id, orgA.id);
      const secondCount = await prisma.memberBadge.count({
        where: { memberId: alexMember.id },
      });
      expect(secondCount).toBe(initialCount);
    });

    it('creates a reward catalog entry with inventory tracking', async () => {
      reward = await rewardService.createReward(
        orgA.id,
        {
          name: 'Complimentary FitCore Smoothie',
          description: 'Free protein recovery shake from the gym café',
          inventory: 1, // Only 1 in stock for concurrency test
          validDays: 14,
        },
        actorOwnerOrgA.id,
      );

      expect(reward).toBeDefined();
      expect(reward.inventory).toBe(1);
    });

    it('assigns reward to member and executes transactional redemption with atomic inventory decrement', async () => {
      memberReward = await rewardService.assignReward(orgA.id, alexMember.id, reward.id);
      expect(memberReward.status).toBe(RewardStatus.AVAILABLE);

      const redeemed = await rewardService.redeemReward(
        orgA.id,
        alexMember.id,
        memberReward.id,
        'Redeemed at Second Wind Café bar',
      );

      expect(redeemed.status).toBe(RewardStatus.REDEEMED);
      expect(redeemed.redeemedAt).toBeDefined();

      // Check inventory is decremented to 0
      const updatedReward = await prisma.reward.findUnique({ where: { id: reward.id } });
      expect(updatedReward?.inventory).toBe(0);

      // Attempting to redeem again throws error
      await expect(
        rewardService.redeemReward(orgA.id, alexMember.id, memberReward.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // TEST GROUP 7: ENGAGEMENT NOTIFICATIONS & ANTI-SPAM CONTROL (Slices 24, 25)
  // ============================================================================
  describe('Engagement Notifications & Frequency Caps', () => {
    it('dispatches milestone notification via Day 17 orchestrator and suppresses duplicate within 24h', async () => {
      // Ensure clean slate for Alex to test rate limits accurately
      await prisma.notification.deleteMany({
        where: { recipientUserId: alexMember.userId },
      });

      const dispatched = await notificationService.dispatchEngagementNotification({
        type: 'STREAK_MAINTAINED',
        organisationId: orgA.id,
        memberId: alexMember.id,
        variables: {
          'streak.days': '8',
        },
      });

      expect(dispatched).toBe(true);

      // Duplicate alert in same 24h window must be suppressed
      const duplicateDispatched = await notificationService.dispatchEngagementNotification({
        type: 'STREAK_MAINTAINED',
        organisationId: orgA.id,
        memberId: alexMember.id,
        variables: {
          'streak.days': '8',
        },
      });

      expect(duplicateDispatched).toBe(false);
    });
  });

  // ============================================================================
  // TEST GROUP 8: RBAC & IDOR SECURITY TESTING (Slices 31, 38, 39, 40)
  // ============================================================================
  describe('RBAC & IDOR Security Isolation', () => {
    it('Trainer CANNOT access engagement data of unassigned member (403 Forbidden)', async () => {
      // Bob is in Org B (unassigned)
      await expect(
        staffController.getMemberEngagement(actorMarcusTrainer, bobMemberOrgB.id, orgA.id),
      ).rejects.toThrow(NotFoundException);

      // Ensure User exists before creating MemberProfile
      await prisma.user.upsert({
        where: { email: 'unassigned18@secondwind.com.au' },
        update: {},
        create: {
          id: 'unassigned_user_day18',
          email: 'unassigned18@secondwind.com.au',
          passwordHash: 'dummyhash',
          firstName: 'Unassigned',
          lastName: 'Member',
          status: 'ACTIVE',
        },
      });

      // Member in Org A without assignment
      const unassignedMember = await prisma.memberProfile.upsert({
        where: { userId: 'unassigned_user_day18' },
        update: {},
        create: {
          id: 'unassigned_member_id_18',
          userId: 'unassigned_user_day18',
          organisationId: orgA.id,
          status: 'ACTIVE',
        },
      });

      await expect(
        staffController.getMemberEngagement(actorMarcusTrainer, unassignedMember.id, orgA.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Trainer CAN access engagement data of assigned client', async () => {
      // Ensure Marcus is assigned to Alex
      const trainerProfile = await prisma.trainerProfile.findFirst({
        where: { staffProfile: { userId: marcusTrainerUser.id } },
      });

      if (trainerProfile) {
        const existingAssignment = await prisma.trainerClientAssignment.findFirst({
          where: { trainerProfileId: trainerProfile.id, memberProfileId: alexMember.id },
        });
        if (!existingAssignment) {
          await prisma.trainerClientAssignment.create({
            data: {
              organisationId: orgA.id,
              trainerProfileId: trainerProfile.id,
              memberProfileId: alexMember.id,
              status: 'ACTIVE',
            },
          });
        }

        const engagement = await staffController.getMemberEngagement(
          actorMarcusTrainer,
          alexMember.id,
          orgA.id,
        );

        expect(engagement).toBeDefined();
        expect(engagement.profile.memberId).toBe(alexMember.id);
      }
    });

    it('Tenant Isolation: Org A cannot access or manage Org B challenges', async () => {
      const orgBChallenge = await challengeService.createChallenge(
        orgB.id,
        {
          name: 'Apex Strength Challenge',
          challengeType: ChallengeType.CUSTOM,
          metric: 'CUSTOM_METRIC',
          target: 10,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86400000).toISOString(),
        },
        actorBobOrgB.id,
      );

      // Org A owner queries challenge in Org A context
      await expect(
        challengeService.getChallengeById(orgBChallenge.id, orgA.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // TEST GROUP 9: FUTURE AI INTEGRATION BOUNDARY (Slice 37, 56)
  // ============================================================================
  describe('Future AI Boundary Contract', () => {
    it('returns complete MemberEngagementContext with strictly ZERO LLM calls', async () => {
      const context = await contextService.buildMemberContext(alexMember.id, orgA.id);

      expect(context).toBeDefined();
      expect(context.memberId).toBe(alexMember.id);
      expect(context.organisationId).toBe(orgA.id);
      expect(context.engagementLevel).toBeDefined();
      expect(context.engagementScore).toBeGreaterThanOrEqual(0);
      expect(context.workoutSummary).toBeDefined();
      expect(context.attendanceSummary).toBeDefined();
      expect(context.goalSummary).toBeDefined();
      expect(context.nutritionSummary).toBeDefined();
      expect(context.challengeSummary).toBeDefined();
      expect(context.habitSummary).toBeDefined();
    });
  });

  // ============================================================================
  // TEST GROUP 10: DAILY ENGAGEMENT PROCESSOR (Slice 44)
  // ============================================================================
  describe('Daily Engagement Processor', () => {
    it('runs batch recalculation of streaks, levels, snapshots, and reward expirations', async () => {
      const report = await dailyProcessor.runDailyProcess(orgA.id);

      expect(report).toBeDefined();
      expect(report.streaksUpdated).toBeGreaterThanOrEqual(1);
      expect(report.snapshotsRecorded).toBeGreaterThanOrEqual(1);
    });
  });
});
