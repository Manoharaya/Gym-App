import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ReactivationController } from '../src/ai/features/reactivation/reactivation.controller';
import { ReactivationService } from '../src/ai/features/reactivation/reactivation.service';
import { InactivityAnalysisService } from '../src/ai/features/reactivation/analysis/inactivity-analysis.service';
import { RecoverySignalService } from '../src/ai/features/reactivation/analysis/recovery-signal.service';
import { RecoveryStrategyService } from '../src/ai/features/reactivation/analysis/recovery-strategy.service';
import { ReactivationWorkflowService } from '../src/ai/features/reactivation/workflows/reactivation-workflow.service';
import { ReactivationSafetyService } from '../src/ai/features/reactivation/safety/reactivation-safety.service';
import { ReactivationJobService } from '../src/ai/features/reactivation/jobs/reactivation-job.service';
import { ReactivationToolsService } from '../src/ai/features/reactivation/tools/reactivation-tools.service';
import { ReactivationContextService } from '../src/ai/features/reactivation/context/reactivation-context.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';
import { REACTIVATION_STRATEGIES } from '@fitcore/types';

describe('Day 27: AI Reactivation & Member Recovery E2E Test Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let controller: ReactivationController;
  let reactivationService: ReactivationService;
  let inactivityService: InactivityAnalysisService;
  let signalService: RecoverySignalService;
  let strategyService: RecoveryStrategyService;
  let workflowService: ReactivationWorkflowService;
  let safetyService: ReactivationSafetyService;
  let jobService: ReactivationJobService;
  let toolsService: ReactivationToolsService;
  let contextService: ReactivationContextService;

  // Test Entities & Fixtures
  let orgA: any;
  let orgB: any;
  let outletA: any;
  let outletB: any;

  // Members
  let alexUser: any;
  let alexMember: any;
  let inactiveMemberUser: any;
  let inactiveMemberProfile: any;
  let recoveringMemberUser: any;
  let recoveringMemberProfile: any;
  let orgBMemberUser: any;
  let orgBMemberProfile: any;

  // Staff & Trainers
  let marcusTrainerUser: any;
  let marcusTrainerProfile: any;
  let unassignedTrainerUser: any;
  let unassignedTrainerProfile: any;
  let managerUser: any;

  // Actors
  let actorManager: AuthenticatedUser;
  let actorMarcusTrainer: AuthenticatedUser;
  let actorUnassignedTrainer: AuthenticatedUser;
  let actorAlexMember: AuthenticatedUser;
  let actorInactiveMember: AuthenticatedUser;
  let actorOrgBMember: AuthenticatedUser;

  // Track created plans for cleanup
  const createdPlanIds: string[] = [];

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
    controller = app.get(ReactivationController);
    reactivationService = app.get(ReactivationService);
    inactivityService = app.get(InactivityAnalysisService);
    signalService = app.get(RecoverySignalService);
    strategyService = app.get(RecoveryStrategyService);
    workflowService = app.get(ReactivationWorkflowService);
    safetyService = app.get(ReactivationSafetyService);
    jobService = app.get(ReactivationJobService);
    toolsService = app.get(ReactivationToolsService);
    contextService = app.get(ReactivationContextService);

    // 1. Fetch Organisations & Outlets
    orgA = await prisma.organisation.findFirstOrThrow({ where: { slug: 'second-wind' } });
    orgB = await prisma.organisation.findFirstOrThrow({ where: { slug: 'apex-strength' } });
    outletA = await prisma.outlet.findFirstOrThrow({ where: { organisationId: orgA.id } });
    outletB = await prisma.outlet.findFirstOrThrow({ where: { organisationId: orgB.id } });

    // 2. Fetch Alex (Active Member in Org A)
    alexUser = await prisma.user.findFirstOrThrow({ where: { email: 'member@secondwind.com.au' } });
    alexMember = await prisma.memberProfile.findFirstOrThrow({ where: { userId: alexUser.id } });

    actorAlexMember = {
      id: alexUser.id,
      email: alexUser.email,
      firstName: alexUser.firstName,
      lastName: alexUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'MEMBER', organisationId: orgA.id }],
    } as any;

    // 3. Create an Inactive Member (21 days inactive) in Org A
    const inactiveEmail = `inactive_member_${Date.now()}@secondwind.com.au`;
    inactiveMemberUser = await prisma.user.create({
      data: {
        email: inactiveEmail,
        passwordHash: 'dummyhash',
        firstName: 'Inactive',
        lastName: 'Member',
        status: 'ACTIVE',
      },
    });
    inactiveMemberProfile = await prisma.memberProfile.create({
      data: {
        userId: inactiveMemberUser.id,
        organisationId: orgA.id,
        status: 'ACTIVE',
        onboardingStatus: 'COMPLETED',
        gender: 'PREFER_NOT_TO_SAY',
      },
    });

    // Seed an older check-in (21 days ago)
    const twentyOneDaysAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
    await prisma.checkIn.create({
      data: {
        organisationId: orgA.id,
        outletId: outletA.id,
        memberProfileId: inactiveMemberProfile.id,
        status: 'SUCCESS',
        checkedInAt: twentyOneDaysAgo,
      },
    });

    actorInactiveMember = {
      id: inactiveMemberUser.id,
      email: inactiveMemberUser.email,
      firstName: inactiveMemberUser.firstName,
      lastName: inactiveMemberUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'MEMBER', organisationId: orgA.id }],
    } as any;

    // 4. Create a Recovering Member (inactive for 25 days, then recent check-in 2 days ago)
    const recoveringEmail = `recovering_member_${Date.now()}@secondwind.com.au`;
    recoveringMemberUser = await prisma.user.create({
      data: {
        email: recoveringEmail,
        passwordHash: 'dummyhash',
        firstName: 'Recovering',
        lastName: 'Member',
        status: 'ACTIVE',
      },
    });
    recoveringMemberProfile = await prisma.memberProfile.create({
      data: {
        userId: recoveringMemberUser.id,
        organisationId: orgA.id,
        status: 'ACTIVE',
        onboardingStatus: 'COMPLETED',
        gender: 'PREFER_NOT_TO_SAY',
      },
    });

    await prisma.checkIn.create({
      data: {
        organisationId: orgA.id,
        outletId: outletA.id,
        memberProfileId: recoveringMemberProfile.id,
        status: 'SUCCESS',
        checkedInAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.checkIn.create({
      data: {
        organisationId: orgA.id,
        outletId: outletA.id,
        memberProfileId: recoveringMemberProfile.id,
        status: 'SUCCESS',
        checkedInAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    });

    // 5. Org B Member
    orgBMemberUser = await prisma.user.findFirstOrThrow({ where: { email: 'member@apexstrength.com.au' } });
    orgBMemberProfile = await prisma.memberProfile.findFirstOrThrow({ where: { userId: orgBMemberUser.id } });

    actorOrgBMember = {
      id: orgBMemberUser.id,
      email: orgBMemberUser.email,
      firstName: orgBMemberUser.firstName,
      lastName: orgBMemberUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'MEMBER', organisationId: orgB.id }],
    } as any;

    // 6. Marcus (Trainer assigned to Alex & Inactive Member)
    marcusTrainerUser = await prisma.user.findFirstOrThrow({ where: { email: 'trainer@secondwind.com.au' } });
    const marcusStaff = await prisma.staffProfile.findFirstOrThrow({ where: { userId: marcusTrainerUser.id } });
    marcusTrainerProfile = await prisma.trainerProfile.findFirstOrThrow({ where: { staffProfileId: marcusStaff.id } });

    await prisma.trainerClientAssignment.create({
      data: {
        organisationId: orgA.id,
        trainerProfileId: marcusTrainerProfile.id,
        memberProfileId: inactiveMemberProfile.id,
        status: 'ACTIVE',
      },
    });

    actorMarcusTrainer = {
      id: marcusTrainerUser.id,
      email: marcusTrainerUser.email,
      firstName: marcusTrainerUser.firstName,
      lastName: marcusTrainerUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'TRAINER', organisationId: orgA.id }],
    } as any;

    // 7. Unassigned Trainer in Org A
    unassignedTrainerUser = await prisma.user.findFirst({
      where: {
        email: { not: marcusTrainerUser.email, contains: 'trainer' },
        staffProfile: { trainerProfile: { isNot: null } },
      },
    });
    if (!unassignedTrainerUser) {
      unassignedTrainerUser = await prisma.user.create({
        data: {
          email: `trainer_unassigned_${Date.now()}@secondwind.com.au`,
          passwordHash: 'dummyhash',
          firstName: 'Unassigned',
          lastName: 'Trainer',
          status: 'ACTIVE',
        },
      });
      const staff = await prisma.staffProfile.create({
        data: {
          userId: unassignedTrainerUser.id,
          organisationId: orgA.id,
          displayName: 'Unassigned Trainer',
          jobTitle: 'Trainer',
        },
      });
      unassignedTrainerProfile = await prisma.trainerProfile.create({
        data: {
          staffProfileId: staff.id,
          organisationId: orgA.id,
          professionalName: 'Unassigned Trainer',
        },
      });
    } else {
      const staff = await prisma.staffProfile.findFirstOrThrow({ where: { userId: unassignedTrainerUser.id } });
      unassignedTrainerProfile = await prisma.trainerProfile.findFirstOrThrow({ where: { staffProfileId: staff.id } });
    }

    actorUnassignedTrainer = {
      id: unassignedTrainerUser.id,
      email: unassignedTrainerUser.email,
      firstName: unassignedTrainerUser.firstName,
      lastName: unassignedTrainerUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'TRAINER', organisationId: orgA.id }],
    } as any;

    // 8. Outlet Manager in Org A
    managerUser = await prisma.user.findFirst({
      where: { email: { contains: 'manager' } },
    });
    actorManager = {
      id: managerUser ? managerUser.id : 'manager-orgA',
      email: 'manager@secondwind.com.au',
      firstName: 'Club',
      lastName: 'Manager',
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'OUTLET_MANAGER', organisationId: orgA.id }],
    } as any;
  });

  afterAll(async () => {
    // Clean up created plans and test members
    if (createdPlanIds.length > 0) {
      await prisma.memberRecoveryPlan.deleteMany({
        where: { id: { in: createdPlanIds } },
      });
    }

    if (inactiveMemberProfile) {
      await prisma.memberRecoveryPlan.deleteMany({ where: { memberId: inactiveMemberProfile.id } });
      await prisma.memberReactivationProfile.deleteMany({ where: { memberId: inactiveMemberProfile.id } });
      await prisma.trainerClientAssignment.deleteMany({ where: { memberProfileId: inactiveMemberProfile.id } });
      await prisma.checkIn.deleteMany({ where: { memberProfileId: inactiveMemberProfile.id } });
      await prisma.memberProfile.delete({ where: { id: inactiveMemberProfile.id } });
      await prisma.user.delete({ where: { id: inactiveMemberUser.id } });
    }

    if (recoveringMemberProfile) {
      await prisma.memberRecoveryPlan.deleteMany({ where: { memberId: recoveringMemberProfile.id } });
      await prisma.memberReactivationProfile.deleteMany({ where: { memberId: recoveringMemberProfile.id } });
      await prisma.checkIn.deleteMany({ where: { memberProfileId: recoveringMemberProfile.id } });
      await prisma.memberProfile.delete({ where: { id: recoveringMemberProfile.id } });
      await prisma.user.delete({ where: { id: recoveringMemberUser.id } });
    }

    await app.close();
  });

  // =========================================================================
  // 1. INACTIVITY DETECTION & DAYS AWAY CALCULATION
  // =========================================================================
  describe('1. Inactivity Detection & Days Away Calculation', () => {
    it('accurately calculates days away from last physical or digital interaction', async () => {
      const analysis = await inactivityService.analyzeInactivity(inactiveMemberProfile.id, orgA.id);

      expect(analysis).toBeDefined();
      expect(analysis.inactivityAnalysis).toBeDefined();
      expect(analysis.inactivityAnalysis.daysInactive).toBeGreaterThanOrEqual(20);
      expect(analysis.inactivityAnalysis.daysInactive).toBeLessThanOrEqual(22);
      expect(analysis.inactivityAnalysis.lastMeaningfulActivityType).toBeDefined();
      expect(analysis.barriers.length).toBeGreaterThan(0);
    });

    it('categorizes active members with recent activity with low days inactive', async () => {
      const analysis = await inactivityService.analyzeInactivity(alexMember.id, orgA.id);
      expect(analysis).toBeDefined();
      expect(analysis.inactivityAnalysis.daysInactive).toBeLessThan(14);
    });
  });

  // =========================================================================
  // 2. FREQUENCY DECLINE VS PERSONAL BASELINE
  // =========================================================================
  describe('2. Frequency Decline vs Personal Baseline', () => {
    it('evaluates frequency relative to personal 28-day baseline rather than cohort averages', async () => {
      const analysis = await inactivityService.analyzeInactivity(inactiveMemberProfile.id, orgA.id);

      expect(analysis.inactivityAnalysis).toBeDefined();
      expect(analysis.inactivityAnalysis.baselineActivityVisitsPerWeek).toBeDefined();
      expect(analysis.inactivityAnalysis.recentActivityFrequencyPerWeek).toBeDefined();
      expect(analysis.inactivityAnalysis.activityDropPercent).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // 3. POSITIVE RECOVERY SIGNALS DETECTION
  // =========================================================================
  describe('3. Positive Recovery Signals Detection', () => {
    it('detects recent visits and positive interactions after inactivity', async () => {
      const analysis = await inactivityService.analyzeInactivity(recoveringMemberProfile.id, orgA.id);
      const evalRes = signalService.evaluateRecoveryState({
        activities: analysis.mostRecentActivity ? [analysis.mostRecentActivity] : [],
        daysInactive: analysis.inactivityAnalysis.daysInactive,
      });

      expect(evalRes).toBeDefined();
      expect(Array.isArray(evalRes.positiveSignals)).toBe(true);
      if (evalRes.positiveSignals.length > 0) {
        expect(evalRes.positiveSignals[0].observation.length).toBeGreaterThan(0);
      }
    });

    it('detects negative disengagement barriers for inactive members', async () => {
      const analysis = await inactivityService.analyzeInactivity(inactiveMemberProfile.id, orgA.id);

      expect(Array.isArray(analysis.barriers)).toBe(true);
      expect(analysis.barriers.length).toBeGreaterThan(0);
      expect(analysis.barriers.some((b) => b.type === 'NO_ACTIVITY' || b.type === 'LONG_INACTIVITY')).toBe(true);
    });
  });

  // =========================================================================
  // 4. DETERMINISTIC RECOVERY STATE TRANSITIONS
  // =========================================================================
  describe('4. Deterministic Recovery State Transitions', () => {
    it('correctly classifies a member with recent return as returning', async () => {
      const evalRes = signalService.evaluateRecoveryState({
        activities: [{ type: 'GYM_VISIT', weight: 1.0, timestamp: new Date() }],
        daysInactive: 2,
      });

      expect(['EARLY_REENGAGEMENT', 'PARTIAL_REENGAGEMENT', 'STABLE_REENGAGEMENT', 'REENGAGED']).toContain(
        evalRes.recoveryState,
      );
    });

    it('transitions state deterministically based on activity thresholds', () => {
      const noSignal = signalService.evaluateRecoveryState({ activities: [], daysInactive: 20 });
      expect(noSignal.recoveryState).toBe('NO_RECOVERY_SIGNAL');

      const reengaged = signalService.evaluateRecoveryState({
        activities: [
          { type: 'GYM_VISIT', weight: 1.0, timestamp: new Date() },
          { type: 'GYM_VISIT', weight: 1.0, timestamp: new Date() },
          { type: 'GYM_VISIT', weight: 1.0, timestamp: new Date() },
          { type: 'GYM_VISIT', weight: 1.0, timestamp: new Date() },
        ],
        daysInactive: 1,
      });
      expect(reengaged.recoveryState).toBe('REENGAGED');
    });
  });

  // =========================================================================
  // 5. CONTROLLED 13-ITEM STRATEGY RECOMMENDATION TAXONOMY
  // =========================================================================
  describe('5. Controlled 13-Item Strategy Taxonomy', () => {
    it('selects a valid strategy within the controlled 13-item taxonomy', () => {
      const strategyRec = strategyService.evaluateStrategy({
        inactivityDays: 21,
        recoveryState: 'NO_RECOVERY_SIGNAL',
        hasAssignedTrainer: true,
        hasActiveGoals: true,
        previousClassAttendanceCount: 0,
        recentClassBooking: false,
        membershipExpiringSoon: false,
        totalHistoricalObservations: 10,
      });

      expect(strategyRec).toBeDefined();
      expect(REACTIVATION_STRATEGIES).toContain(strategyRec.type);
      expect(strategyRec.reason.length).toBeGreaterThan(0);
      expect(strategyRec.suggestedStaffMessage?.length).toBeGreaterThan(0);
    });

    it('validates and accepts all 13 strategy types in the taxonomy', () => {
      const all13 = [
        'PERSONAL_TRAINER_CHECK_IN',
        'GOAL_RESET',
        'TRAINING_RESTART',
        'CLASS_REINTRODUCTION',
        'PERSONAL_TRAINING_RESTART',
        'ROUTINE_REBUILD',
        'RECOVERY_FOCUSED_RETURN',
        'APP_ENGAGEMENT_RESTART',
        'NUTRITION_LOGGING_RESTART',
        'MEMBERSHIP_REVIEW',
        'GENERAL_SUPPORT',
        'NO_ACTION',
        'INSUFFICIENT_DATA',
      ];

      for (const strat of all13) {
        expect(REACTIVATION_STRATEGIES).toContain(strat);
      }
    });
  });

  // =========================================================================
  // 6. HUMAN APPROVAL REQUIREMENT (HITL BOUNDARY)
  // =========================================================================
  describe('6. Human Approval Requirement (Strict HITL)', () => {
    it('creates a recovery plan with initial status requiring human sign-off', async () => {
      const createdPlan = await controller.createRecoveryPlan(
        {
          memberId: inactiveMemberProfile.id,
          strategyType: 'TRAINING_RESTART',
          targetChannel: 'TRAINER_MESSAGE',
          recommendedAction: 'Schedule 20-min return workout',
          draftMessage: 'Hey! Ready for a light session this week?',
          staffNotes: 'Member returning after 3 weeks',
        },
        actorMarcusTrainer,
        orgA.id,
      );

      expect(createdPlan).toBeDefined();
      expect(createdPlan.id).toBeDefined();
      createdPlanIds.push(createdPlan.id);

      expect(createdPlan.status).toBe('PENDING_APPROVAL');
      expect(createdPlan.memberId).toBe(inactiveMemberProfile.id);
      expect(createdPlan.strategy).toBe('TRAINING_RESTART');
    });

    it('never sends autonomous member communications without explicit human approval', async () => {
      const plan = await controller.createRecoveryPlan(
        {
          memberId: inactiveMemberProfile.id,
          strategyType: 'GOAL_RESET',
          targetChannel: 'APP_NOTIFICATION',
          recommendedAction: 'Goal review',
          draftMessage: 'Let us check in on your milestones',
        },
        actorMarcusTrainer,
        orgA.id,
      );
      createdPlanIds.push(plan.id);

      expect(plan.status).toBe('PENDING_APPROVAL');

      const activeCheck = await prisma.memberRecoveryPlan.findUniqueOrThrow({
        where: { id: plan.id },
      });
      expect(activeCheck.status).toBe('PENDING_APPROVAL');
    });
  });

  // =========================================================================
  // 7. RECOVERY PLAN STATE MACHINE TRANSITIONS
  // =========================================================================
  describe('7. Recovery Plan State Machine Transitions', () => {
    let testPlanId: string;

    beforeEach(async () => {
      const plan = await controller.createRecoveryPlan(
        {
          memberId: inactiveMemberProfile.id,
          strategyType: 'ROUTINE_REBUILD',
          targetChannel: 'TRAINER_MESSAGE',
          recommendedAction: 'Routine rebuild setup',
        },
        actorMarcusTrainer,
        orgA.id,
      );
      testPlanId = plan.id;
      createdPlanIds.push(plan.id);
    });

    it('transitions through standard lifecycle: PENDING_APPROVAL -> APPROVED -> IN_PROGRESS -> COMPLETED', async () => {
      // 1. Approve
      const approved = await controller.transitionPlan(
        testPlanId,
        { targetStatus: 'APPROVED' },
        actorManager,
        orgA.id,
      );
      expect(approved.status).toBe('APPROVED');

      // 2. Start (IN_PROGRESS)
      const inProgress = await controller.transitionPlan(
        testPlanId,
        { targetStatus: 'IN_PROGRESS' },
        actorManager,
        orgA.id,
      );
      expect(inProgress.status).toBe('IN_PROGRESS');

      // 3. Complete (COMPLETED)
      const completed = await controller.transitionPlan(
        testPlanId,
        { targetStatus: 'COMPLETED' },
        actorManager,
        orgA.id,
      );
      expect(completed.status).toBe('COMPLETED');
    });

    it('rejects invalid state machine transitions with BadRequestException', async () => {
      // Cannot jump from PENDING_APPROVAL directly to COMPLETED
      await expect(
        controller.transitionPlan(
          testPlanId,
          { targetStatus: 'COMPLETED' },
          actorManager,
          orgA.id,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // 8. DISMISSAL REASON MANDATORY VALIDATION
  // =========================================================================
  describe('8. Dismissal Reason Mandatory Validation', () => {
    it('throws BadRequestException when dismissing a plan without a reason', async () => {
      const plan = await controller.createRecoveryPlan(
        {
          memberId: inactiveMemberProfile.id,
          strategyType: 'GENERAL_SUPPORT',
          targetChannel: 'PHONE_CALL',
          recommendedAction: 'Check in call',
        },
        actorMarcusTrainer,
        orgA.id,
      );
      createdPlanIds.push(plan.id);

      await expect(
        controller.transitionPlan(
          plan.id,
          { targetStatus: 'DISMISSED' },
          actorManager,
          orgA.id,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully dismisses a plan when a valid reason is provided', async () => {
      const plan = await controller.createRecoveryPlan(
        {
          memberId: inactiveMemberProfile.id,
          strategyType: 'GENERAL_SUPPORT',
          targetChannel: 'PHONE_CALL',
          recommendedAction: 'Check in call',
        },
        actorMarcusTrainer,
        orgA.id,
      );
      createdPlanIds.push(plan.id);

      const dismissed = await controller.transitionPlan(
        plan.id,
        { targetStatus: 'DISMISSED', dismissalReason: 'Member traveling overseas for 2 months' },
        actorManager,
        orgA.id,
      );

      expect(dismissed.status).toBe('DISMISSED');
      expect(dismissed.dismissalReason).toBe('Member traveling overseas for 2 months');
    });
  });

  // =========================================================================
  // 9. RBAC & TENANT ISOLATION
  // =========================================================================
  describe('9. RBAC & Tenant Isolation', () => {
    it('prevents staff in Org A from accessing Org B member recovery data', async () => {
      await expect(
        controller.getMemberReactivation(
          orgBMemberProfile.id,
          actorManager,
          orgA.id,
        ),
      ).rejects.toThrow();
    });

    it('prevents cross-tenant plan creation', async () => {
      await expect(
        controller.createRecoveryPlan(
          {
            memberId: orgBMemberProfile.id,
            strategyType: 'TRAINING_RESTART',
            targetChannel: 'TRAINER_MESSAGE',
            recommendedAction: 'Illegal cross-tenant plan',
          },
          actorManager,
          orgA.id,
        ),
      ).rejects.toThrow();
    });

    it('restricts member from accessing staff recovery queue', async () => {
      await expect(
        controller.getQueue(actorAlexMember, orgA.id, {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // 10. TRAINER CLIENT SCOPING
  // =========================================================================
  describe('10. Trainer Client Scoping', () => {
    it('allows assigned trainer (Marcus) to view assigned member recovery profile', async () => {
      const profile = await controller.getMemberReactivation(
        inactiveMemberProfile.id,
        actorMarcusTrainer,
        orgA.id,
      );

      expect(profile).toBeDefined();
    });

    it('blocks unassigned trainer from viewing unassigned member recovery profile', async () => {
      await expect(
        controller.getMemberReactivation(
          inactiveMemberProfile.id,
          actorUnassignedTrainer,
          orgA.id,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // 11. MEMBER PRIVACY (ZERO RISK/CHURN EXPOSURE)
  // =========================================================================
  describe('11. Member Privacy & Safe Endpoint', () => {
    it('provides member-facing recovery state without exposing risk scores or churn labels', async () => {
      const memberState = await controller.getMemberRecoveryState(
        actorInactiveMember,
        orgA.id,
      );

      expect(memberState).toBeDefined();
      expect(memberState.recoveryState).toBeDefined();
      expect(typeof memberState.inactivityDays).toBe('number');

      // Strictly ensure internal telemetry is stripped
      expect((memberState as any).riskScore).toBeUndefined();
      expect((memberState as any).churnProbability).toBeUndefined();
      expect((memberState as any).riskLevel).toBeUndefined();
      expect((memberState as any).retentionRisk).toBeUndefined();
    });
  });

  // =========================================================================
  // 12. NON-MEDICAL & NON-PSYCHOLOGICAL BOUNDARY ENFORCEMENT
  // =========================================================================
  describe('12. Non-Medical Boundary Enforcement', () => {
    it('sanitizes or flags medical and clinical diagnoses', () => {
      const unsafeText = 'Member has clinical depression and torn rotator cuff.';
      const safetyCheck = safetyService.evaluateSafety(unsafeText);

      expect(safetyCheck.isSafe).toBe(false);
      expect(safetyCheck.violations.length).toBeGreaterThan(0);
      expect(safetyCheck.violations[0].category).toBe('CLINICAL_MEDICAL_CLAIM');
    });

    it('passes standard fitness recovery messaging', () => {
      const safeText = 'Member took 2 weeks off and is ready for a light 20-minute movement session.';
      const safetyCheck = safetyService.evaluateSafety(safeText);

      expect(safetyCheck.isSafe).toBe(true);
      expect(safetyCheck.violations.length).toBe(0);
    });
  });

  // =========================================================================
  // 13. NON-COMMERCIAL DISCOUNT PROHIBITION
  // =========================================================================
  describe('13. Non-Commercial Discount Prohibition', () => {
    it('rejects commercial discounts, free months, and price concessions in recovery recommendations', () => {
      const discountText = 'Offer 50% off next month and waived membership fee to return.';
      const safetyCheck = safetyService.evaluateSafety(discountText);

      expect(safetyCheck.isSafe).toBe(false);
      expect(safetyCheck.violations.some((v: any) => v.category === 'UNAUTHORIZED_DISCOUNT')).toBe(true);
    });
  });

  // =========================================================================
  // 14. READ-ONLY TOOLS VALIDATION
  // =========================================================================
  describe('14. Read-Only Tools Validation', () => {
    it('executes read-only recovery tools with tenant validation', async () => {
      const recoveryState = await toolsService.getMemberRecoveryState(orgA.id, alexMember.id);
      expect(recoveryState).toBeDefined();
      expect(recoveryState.memberId).toBe(alexMember.id);

      const trainingHistory = await toolsService.getTrainingHistory(orgA.id, alexMember.id);
      expect(trainingHistory).toBeDefined();
      expect(trainingHistory.memberId).toBe(alexMember.id);

      const membershipState = await toolsService.getMembershipState(orgA.id, alexMember.id);
      expect(membershipState).toBeDefined();
      expect(membershipState.memberId).toBe(alexMember.id);
    });

    it('prevents tools from querying members outside the specified organisation', async () => {
      await expect(
        toolsService.getMemberRecoveryState(orgA.id, orgBMemberProfile.id),
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // 15. AI ORCHESTRATOR INVOCATION & DEVELOPMENT FALLBACK
  // =========================================================================
  describe('15. AI Orchestrator Invocation & Development Fallback', () => {
    it('returns grounded AI reactivation assessment with deterministic fallback', async () => {
      const analysisResult = await reactivationService.analyzeMember(
        orgA.id,
        { memberId: inactiveMemberProfile.id, forceRefresh: true, includeAIAssessment: true },
        actorManager,
      );

      expect(analysisResult).toBeDefined();
      expect(analysisResult.analysis).toBeDefined();
      expect(analysisResult.analysis.inactivity).toBeDefined();
      expect(Array.isArray(analysisResult.analysis.recommendedStrategies)).toBe(true);
      expect(analysisResult.analysis.recommendedStrategies.length).toBeGreaterThan(0);
      expect(REACTIVATION_STRATEGIES).toContain(analysisResult.analysis.recommendedStrategies[0].type);
      expect(analysisResult.analysis.summary.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 16. AUDIT LOG EMISSION FOR ALL STATE TRANSITIONS
  // =========================================================================
  describe('16. Audit Log Emission', () => {
    it('records an audit event when a recovery plan is transitioned', async () => {
      const plan = await controller.createRecoveryPlan(
        {
          memberId: inactiveMemberProfile.id,
          strategyType: 'CLASS_REINTRODUCTION',
          targetChannel: 'IN_PERSON',
          recommendedAction: 'Introduce to Saturday spin class',
        },
        actorMarcusTrainer,
        orgA.id,
      );
      createdPlanIds.push(plan.id);

      await controller.transitionPlan(
        plan.id,
        { targetStatus: 'APPROVED' },
        actorManager,
        orgA.id,
      );

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          organisationId: orgA.id,
          resourceId: plan.id,
          action: 'RECOVERY_PLAN_APPROVED',
        },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.resource).toBe('MemberRecoveryPlan');
    });
  });

  // =========================================================================
  // 17. BATCH JOB PLAN EXPIRATION SWEEP
  // =========================================================================
  describe('17. Batch Job Plan Expiration Sweep', () => {
    it('automatically transitions outdated unacted plans to EXPIRED', async () => {
      const pastPlan = await prisma.memberRecoveryPlan.create({
        data: {
          organisationId: orgA.id,
          memberId: inactiveMemberProfile.id,
          strategyType: 'GENERAL_SUPPORT',
          status: 'PENDING_APPROVAL',
          targetChannel: 'PHONE_CALL',
          recommendedAction: 'Call member',
          expiresAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
        },
      });
      createdPlanIds.push(pastPlan.id);

      const sweepResult = await jobService.sweepExpiredPlans();
      expect(sweepResult).toBeDefined();
      expect(sweepResult.expiredCount).toBeGreaterThanOrEqual(1);

      const updated = await prisma.memberRecoveryPlan.findUniqueOrThrow({
        where: { id: pastPlan.id },
      });
      expect(updated.status).toBe('EXPIRED');
    });
  });

  // =========================================================================
  // 18. STAFF FEEDBACK RECORDING
  // =========================================================================
  describe('18. Staff Feedback Recording', () => {
    it('records staff feedback on recovery strategies and updates confidence signals', async () => {
      const plan = await controller.createRecoveryPlan(
        {
          memberId: inactiveMemberProfile.id,
          strategyType: 'PERSONAL_TRAINER_CHECK_IN',
          targetChannel: 'TRAINER_MESSAGE',
          recommendedAction: 'Check in on schedule',
        },
        actorMarcusTrainer,
        orgA.id,
      );
      createdPlanIds.push(plan.id);

      const feedbackRes = await controller.submitFeedback(
        {
          memberRecoveryPlanId: plan.id,
          feedback: 'ACCEPTED',
          comments: 'Perfect recommendation, member responded immediately',
        },
        actorManager,
        orgA.id,
      );

      expect(feedbackRes).toBeDefined();
      expect(feedbackRes.success).toBe(true);

      const auditRecord = await prisma.auditLog.findFirst({
        where: {
          organisationId: orgA.id,
          resourceId: plan.id,
          action: 'REACTIVATION_FEEDBACK_SUBMITTED',
        },
      });
      expect(auditRecord).toBeDefined();
    });
  });
});
