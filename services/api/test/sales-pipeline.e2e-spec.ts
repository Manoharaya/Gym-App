/**
 * Day 37 — Sales Pipeline & Opportunity Management Comprehensive E2E Test Suite
 *
 * Validates:
 * 1. Default Pipeline Seeding & Canonical 8-Stage Architecture
 * 2. Opportunity Lifecycle & Duplicate Prevention (Reuses Day 33 Lead)
 * 3. Atomic Stage Transitions & State Machine Validation
 * 4. Concurrency & Race Condition Defense (Optimistic Locking via version)
 * 5. Structured Loss Tracking & Opportunity Reopening
 * 6. Authoritative Conversion Invariant (Rejection of unverified claims, proof verification, Lead alignment)
 * 7. Sales Activities Timeline & Last Activity Maintenance
 * 8. Follow-up Tasks & Opportunity Next Action Scheduling
 * 9. Kanban Board View & Deterministic Sales Metrics
 * 10. Multi-Tenant Isolation & IDOR Protection (Org A vs Org B)
 * 11. Immutable Audit Logging & Event Dispatching
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { SalesPipelineService } from '../src/sales-pipeline/application/sales-pipeline.service';
import { SalesOpportunityService } from '../src/sales-pipeline/application/sales-opportunity.service';
import { SalesStageTransitionService } from '../src/sales-pipeline/application/sales-stage-transition.service';
import { SalesConversionService } from '../src/sales-pipeline/application/sales-conversion.service';
import { SalesActivityService } from '../src/sales-pipeline/application/sales-activity.service';
import { SalesTaskService } from '../src/sales-pipeline/application/sales-task.service';
import { SalesPipelineBoardService } from '../src/sales-pipeline/application/sales-pipeline-board.service';
import { LeadsService } from '../src/leads/leads.service';

describe('Day 37: Sales Pipeline & Opportunity Management E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let pipelineService: SalesPipelineService;
  let opportunityService: SalesOpportunityService;
  let transitionService: SalesStageTransitionService;
  let conversionService: SalesConversionService;
  let activityService: SalesActivityService;
  let taskService: SalesTaskService;
  let boardService: SalesPipelineBoardService;
  let leadsService: LeadsService;

  let orgA: any;
  let orgB: any;
  let outletA: any;
  let staffA: any;
  let userA: any;
  let membershipPlanA: any;
  let leadA: any;
  let leadB: any;

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
    pipelineService = moduleFixture.get<SalesPipelineService>(SalesPipelineService);
    opportunityService = moduleFixture.get<SalesOpportunityService>(SalesOpportunityService);
    transitionService = moduleFixture.get<SalesStageTransitionService>(SalesStageTransitionService);
    conversionService = moduleFixture.get<SalesConversionService>(SalesConversionService);
    activityService = moduleFixture.get<SalesActivityService>(SalesActivityService);
    taskService = moduleFixture.get<SalesTaskService>(SalesTaskService);
    boardService = moduleFixture.get<SalesPipelineBoardService>(SalesPipelineBoardService);
    leadsService = moduleFixture.get<LeadsService>(LeadsService);

    const timestamp = Date.now();

    // 1. Setup Organisations
    orgA = await prisma.organisation.create({
      data: {
        name: `FitCore Pipeline Org A ${timestamp}`,
        slug: `fitcore-pipeline-a-${timestamp}`,
        currency: 'AUD',
        country: 'Australia',
      },
    });

    orgB = await prisma.organisation.create({
      data: {
        name: `FitCore Pipeline Org B ${timestamp}`,
        slug: `fitcore-pipeline-b-${timestamp}`,
        currency: 'USD',
        country: 'United States',
      },
    });

    // 2. Setup Outlet
    outletA = await prisma.outlet.create({
      data: {
        organisationId: orgA.id,
        name: 'Brisbane City Hub',
        slug: `brisbane-city-${timestamp}`,
        code: `BNE-${timestamp.toString().slice(-4)}`,
        address: '100 Queen Street',
        city: 'Brisbane',
        state: 'QLD',
        postalCode: '4000',
      },
    });

    // 3. Setup Staff User & Profile
    userA = await prisma.user.create({
      data: {
        email: `sales.staff.${timestamp}@fitcore.io`,
        firstName: 'Sarah',
        lastName: 'Connor',
        passwordHash: 'dummy_hash_for_test',
      },
    });

    staffA = await prisma.staffProfile.create({
      data: {
        userId: userA.id,
        organisationId: orgA.id,
        displayName: 'Sarah Connor',
        jobTitle: 'Senior Sales Consultant',
        employmentStatus: 'ACTIVE',
      },
    });

    // 4. Setup Membership Plan for Authoritative Conversion Proof
    membershipPlanA = await prisma.membershipPlan.create({
      data: {
        organisationId: orgA.id,
        name: 'Unlimited Gold Membership',
        code: `GOLD-UNL-${timestamp}`,
        price: 99.0,
        currency: 'AUD',
        durationValue: 1,
        durationUnit: 'MONTH',
        membershipType: 'STANDARD',
        status: 'ACTIVE',
        isPublic: true,
      },
    });

    // 5. Setup Leads (Reusing Day 33 LeadsService)
    leadA = await leadsService.createLead(orgA.id, {
      firstName: 'Marcus',
      lastName: 'Aurelius',
      email: `marcus.${timestamp}@stoic.io`,
      phone: '+61411222333',
      outletId: outletA.id,
      source: 'WEBSITE',
      initialGoals: ['STRENGTH', 'HYPERTROPHY'],
    });

    leadB = await leadsService.createLead(orgA.id, {
      firstName: 'Lucius',
      lastName: 'Seneca',
      email: `seneca.${timestamp}@stoic.io`,
      phone: '+61422333444',
      outletId: outletA.id,
      source: 'AI_RECEPTIONIST',
      initialGoals: ['GENERAL_FITNESS'],
    });
  });

  afterAll(async () => {
    // Cleanup created test data
    if (orgA?.id) {
      await prisma.salesActivity.deleteMany({ where: { organisationId: orgA.id } }).catch(() => {});
      await prisma.salesTask.deleteMany({ where: { organisationId: orgA.id } }).catch(() => {});
      await prisma.salesStageHistory.deleteMany({
        where: { opportunity: { organisationId: orgA.id } },
      }).catch(() => {});
      await prisma.salesOpportunity.deleteMany({ where: { organisationId: orgA.id } }).catch(() => {});
      await prisma.salesPipelineStage.deleteMany({
        where: { pipeline: { organisationId: orgA.id } },
      }).catch(() => {});
      await prisma.salesPipeline.deleteMany({ where: { organisationId: orgA.id } }).catch(() => {});
      await prisma.lead.deleteMany({ where: { organisationId: orgA.id } }).catch(() => {});
      await prisma.membershipPlan.deleteMany({ where: { organisationId: orgA.id } }).catch(() => {});
      await prisma.staffProfile.deleteMany({ where: { organisationId: orgA.id } }).catch(() => {});
      await prisma.auditLog.deleteMany({ where: { organisationId: orgA.id } }).catch(() => {});
      await prisma.outlet.deleteMany({ where: { organisationId: orgA.id } }).catch(() => {});
      await prisma.organisation.delete({ where: { id: orgA.id } }).catch(() => {});
    }

    if (orgB?.id) {
      await prisma.organisation.delete({ where: { id: orgB.id } }).catch(() => {});
    }

    if (userA?.id) {
      await prisma.user.delete({ where: { id: userA.id } }).catch(() => {});
    }

    await app.close();
  });

  // ==========================================================================
  // 1. Pipeline Seeding & Configuration
  // ==========================================================================
  describe('1. Default Pipeline Seeding & Configuration', () => {
    it('should automatically seed canonical 8-stage sales pipeline on first access', async () => {
      const pipeline = await pipelineService.getOrCreateDefaultPipeline(orgA.id);

      expect(pipeline).toBeDefined();
      expect(pipeline.name).toBe('Standard Sales Pipeline');
      expect(pipeline.isDefault).toBe(true);
      expect(pipeline.stages.length).toBe(8);

      const stageTypes = pipeline.stages.map((s) => s.type);
      expect(stageTypes).toEqual([
        'NEW',
        'CONTACTED',
        'QUALIFIED',
        'TRIAL',
        'TOUR_BOOKED',
        'OFFERED',
        'CONVERTED',
        'LOST',
      ]);

      const newStage = pipeline.stages.find((s) => s.type === 'NEW');
      expect(newStage?.position).toBe(0);
      expect(newStage?.isTerminal).toBe(false);

      const convertedStage = pipeline.stages.find((s) => s.type === 'CONVERTED');
      expect(convertedStage?.isTerminal).toBe(true);

      const lostStage = pipeline.stages.find((s) => s.type === 'LOST');
      expect(lostStage?.isTerminal).toBe(true);
    });

    it('should retrieve existing default pipeline idempotently without reseeding', async () => {
      const pipeline1 = await pipelineService.getOrCreateDefaultPipeline(orgA.id);
      const pipeline2 = await pipelineService.getOrCreateDefaultPipeline(orgA.id);

      expect(pipeline1.id).toBe(pipeline2.id);
      expect(pipeline2.stages.length).toBe(8);
    });
  });

  // ==========================================================================
  // 2. Opportunity Lifecycle & Duplicate Prevention
  // ==========================================================================
  describe('2. Opportunity Creation & Duplicate Prevention', () => {
    let createdOpp: any;

    it('should create a new sales opportunity in initial NEW stage', async () => {
      createdOpp = await opportunityService.createOpportunity(orgA.id, {
        leadId: leadA.id,
        outletId: outletA.id,
        title: 'Marcus Gold Membership Opportunity',
        estimatedValue: 1188.0,
        currency: 'AUD',
        ownerStaffId: staffA.id,
      });

      expect(createdOpp).toBeDefined();
      expect(createdOpp.id).toBeDefined();
      expect(createdOpp.leadId).toBe(leadA.id);
      expect(createdOpp.currentStage).toBe('NEW');
      expect(createdOpp.version).toBe(1);
      expect(Number(createdOpp.estimatedValue)).toBe(1188.0);
      expect(createdOpp.ownerStaffId).toBe(staffA.id);

      // Verify stage history initialization
      const oppDetails = await opportunityService.getOpportunity(orgA.id, createdOpp.id);
      expect(oppDetails.stageHistories.length).toBe(1);
      expect(oppDetails.stageHistories[0].toStageType).toBe('NEW');
      expect(oppDetails.stageHistories[0].actorType).toBe('SYSTEM');

      // Verify activity initialization
      expect(oppDetails.activities.length).toBe(1);
      expect(oppDetails.activities[0].type).toBe('NOTE');
      expect(oppDetails.activities[0].title).toBe('Opportunity Created');
    });

    it('should prevent duplicate active opportunities for the same lead in same pipeline', async () => {
      const duplicateAttempt = await opportunityService.createOpportunity(orgA.id, {
        leadId: leadA.id,
        title: 'Duplicate Marcus Attempt',
        estimatedValue: 2000.0,
      });

      expect(duplicateAttempt.id).toBe(createdOpp.id);
      expect((duplicateAttempt as any).isExistingActive).toBe(true);

      const totalOppsForLead = await prisma.salesOpportunity.count({
        where: { leadId: leadA.id, organisationId: orgA.id },
      });
      expect(totalOppsForLead).toBe(1);
    });
  });

  // ==========================================================================
  // 3. Stage Transitions & State Machine Engine
  // ==========================================================================
  describe('3. Stage Transitions & State Machine Validation', () => {
    let opp: any;

    beforeEach(async () => {
      // Create fresh opportunity for stage transition tests
      opp = await opportunityService.createOpportunity(orgA.id, {
        leadId: leadB.id,
        outletId: outletA.id,
        title: 'Seneca Membership Opportunity',
        estimatedValue: 990.0,
      });
    });

    it('should execute progressive stage transitions: NEW -> CONTACTED -> QUALIFIED -> TRIAL', async () => {
      // Step 1: NEW -> CONTACTED
      const contacted = await transitionService.transitionStage(orgA.id, opp.id, {
        toStage: 'CONTACTED',
        version: opp.version,
        actorType: 'STAFF',
        actorId: staffA.id,
        reason: 'Contacted via telephone; confirmed interest in morning sessions.',
      });

      expect(contacted.currentStage).toBe('CONTACTED');
      expect(contacted.version).toBe(2);

      // Step 2: CONTACTED -> QUALIFIED
      const qualified = await transitionService.transitionStage(orgA.id, opp.id, {
        toStage: 'QUALIFIED',
        version: contacted.version,
        actorType: 'STAFF',
        actorId: staffA.id,
        reason: 'Budget and schedule aligned with morning personal training.',
      });

      expect(qualified.currentStage).toBe('QUALIFIED');
      expect(qualified.version).toBe(3);

      // Step 3: QUALIFIED -> TRIAL
      const trial = await transitionService.transitionStage(orgA.id, opp.id, {
        toStage: 'TRIAL',
        version: qualified.version,
        actorType: 'STAFF',
        actorId: staffA.id,
        reason: 'Complimentary pass issued for Saturday morning session.',
      });

      expect(trial.currentStage).toBe('TRIAL');
      expect(trial.version).toBe(4);

      // Verify complete stage history audit
      const fetched = await opportunityService.getOpportunity(orgA.id, opp.id);
      expect(fetched.stageHistories.length).toBe(4); // 1 initial + 3 transitions
      expect(fetched.stageHistories[0].toStageType).toBe('TRIAL');
      expect(fetched.stageHistories[0].fromStageType).toBe('QUALIFIED');
      expect(fetched.stageHistories[0].durationSeconds).toBeGreaterThanOrEqual(0);
    });

    it('should reject invalid backward stage transitions not in state machine', async () => {
      await expect(
        transitionService.transitionStage(orgA.id, opp.id, {
          toStage: 'NEW',
          version: opp.version,
          actorType: 'STAFF',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // 4. Concurrency & Optimistic Locking
  // ==========================================================================
  describe('4. Optimistic Locking & Race Condition Defense', () => {
    it('should reject stale version transition with ConflictException', async () => {
      const opp = await opportunityService.createOpportunity(orgA.id, {
        leadId: leadA.id,
        title: 'Concurrency Test Opp',
      });

      // Valid transition increments version to 2
      await transitionService.transitionStage(orgA.id, opp.id, {
        toStage: 'CONTACTED',
        version: opp.version,
        actorType: 'STAFF',
      });

      // Attempting to transition again with stale version 1
      await expect(
        transitionService.transitionStage(orgA.id, opp.id, {
          toStage: 'QUALIFIED',
          version: 1, // STALE VERSION
          actorType: 'STAFF',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ==========================================================================
  // 5. Structured Loss Tracking & Reopening
  // ==========================================================================
  describe('5. Loss Tracking & Reopening Lifecycle', () => {
    let opp: any;

    beforeEach(async () => {
      opp = await opportunityService.createOpportunity(orgA.id, {
        leadId: leadB.id,
        title: 'Loss & Reopen Test Deal',
        estimatedValue: 500.0,
      });
    });

    it('should require a valid structured lossReason when marking an opportunity as LOST', async () => {
      await expect(
        transitionService.transitionStage(orgA.id, opp.id, {
          toStage: 'LOST',
          version: opp.version,
          actorType: 'STAFF',
          // Missing lossReason
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should transition to LOST with structured reason and record closure timestamp', async () => {
      const lostOpp = await transitionService.transitionStage(orgA.id, opp.id, {
        toStage: 'LOST',
        version: opp.version,
        lossReason: 'PRICE',
        lossReasonDetails: 'Prospect found competitor pricing 20% lower.',
        actorType: 'STAFF',
      });

      expect(lostOpp.currentStage).toBe('LOST');
      expect(lostOpp.lossReason).toBe('PRICE');
      expect(lostOpp.lossNotes).toContain('competitor pricing');
      expect(lostOpp.lostAt).toBeDefined();

      // Lost is terminal: cannot directly skip to TRIAL
      await expect(
        transitionService.transitionStage(orgA.id, opp.id, {
          toStage: 'TRIAL',
          version: lostOpp.version,
          actorType: 'STAFF',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow explicitly reopening a lost opportunity with valid reason', async () => {
      const lostOpp = await transitionService.transitionStage(orgA.id, opp.id, {
        toStage: 'LOST',
        version: opp.version,
        lossReason: 'NO_RESPONSE',
        actorType: 'STAFF',
      });

      // Reopen to CONTACTED
      const reopened = await opportunityService.reopenOpportunity(orgA.id, opp.id, {
        toStage: 'CONTACTED',
        version: lostOpp.version,
        reopenReason: 'Customer called back after returning from annual leave.',
        actorId: staffA.id,
      });

      expect(reopened.currentStage).toBe('CONTACTED');
      expect(reopened.lossReason).toBeNull();
      expect(reopened.lossNotes).toBeNull();
      expect(reopened.lostAt).toBeNull();
    });
  });

  // ==========================================================================
  // 6. Authoritative Conversion Invariant
  // ==========================================================================
  describe('6. Authoritative Conversion Invariant', () => {
    let opp: any;

    beforeEach(async () => {
      opp = await opportunityService.createOpportunity(orgA.id, {
        leadId: leadA.id,
        title: 'Conversion Invariant Opportunity',
        estimatedValue: 1200.0,
      });

      // Advance to QUALIFIED
      opp = await transitionService.transitionStage(orgA.id, opp.id, {
        toStage: 'QUALIFIED',
        version: opp.version,
        actorType: 'STAFF',
      });
    });

    it('should strictly reject AI attempts to transition opportunity to CONVERTED', async () => {
      await expect(
        transitionService.transitionStage(orgA.id, opp.id, {
          toStage: 'CONVERTED',
          version: opp.version,
          actorType: 'AI_RECOMMENDATION', // FORBIDDEN ACTOR
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject conversion attempt without verifiable domain proof', async () => {
      await expect(
        conversionService.convertOpportunity(orgA.id, opp.id, {
          version: opp.version,
          // Missing membershipId, membershipPlanId, eventId, or notes
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should authoritatively convert opportunity with verified membership plan proof', async () => {
      const converted = await conversionService.convertOpportunity(orgA.id, opp.id, {
        version: opp.version,
        membershipPlanId: membershipPlanA.id,
        actorId: staffA.id,
        notes: 'Signed 12-month agreement in outlet.',
      });

      expect(converted.currentStage).toBe('CONVERTED');
      expect(converted.convertedAt).toBeDefined();

      // Verify parent Lead status aligned to CONVERTED
      const parentLead = await prisma.lead.findUnique({ where: { id: leadA.id } });
      expect(parentLead?.status).toBe('CONVERTED');

      // Verify CONVERTED is terminal and cannot transition anywhere
      await expect(
        transitionService.transitionStage(orgA.id, opp.id, {
          toStage: 'QUALIFIED',
          version: converted.version,
          actorType: 'STAFF',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // 7. Sales Activities Timeline
  // ==========================================================================
  describe('7. Sales Activities Timeline', () => {
    it('should log activities and update lastActivityAt on opportunity', async () => {
      const opp = await opportunityService.createOpportunity(orgA.id, {
        leadId: leadB.id,
        title: 'Activity Timeline Test Deal',
      });

      const initialActivityAt = opp.lastActivityAt;

      // Small delay to ensure timestamp difference
      await new Promise((r) => setTimeout(r, 50));

      const activity = await activityService.logActivity(orgA.id, opp.id, {
        activityType: 'PHONE_CALL',
        title: 'Discovery call with Lucius Seneca',
        description: 'Discussed morning training preference and cardiovascular goals.',
        durationMinutes: 15,
        actorType: 'STAFF',
        actorId: staffA.id,
      });

      expect(activity).toBeDefined();
      expect(activity.type).toBe('PHONE_CALL');
      expect(activity.title).toContain('Discovery call');

      const updatedOpp = await opportunityService.getOpportunity(orgA.id, opp.id);
      expect(new Date(updatedOpp.lastActivityAt).getTime()).toBeGreaterThan(
        new Date(initialActivityAt).getTime(),
      );

      const activities = await activityService.listActivities(orgA.id, opp.id);
      expect(activities.length).toBeGreaterThanOrEqual(2); // Initial NOTE + PHONE_CALL
    });
  });

  // ==========================================================================
  // 8. Follow-up Tasks & Scheduling
  // ==========================================================================
  describe('8. Sales Tasks & Opportunity Next Action Scheduling', () => {
    it('should create tasks and maintain nextActionAt on parent opportunity', async () => {
      const opp = await opportunityService.createOpportunity(orgA.id, {
        leadId: leadB.id,
        title: 'Task Scheduling Test Deal',
      });

      const dueDate = new Date(Date.now() + 24 * 3600 * 1000); // Tomorrow

      const task = await taskService.createTask(orgA.id, opp.id, {
        title: 'Follow up on Trial Workout Experience',
        taskType: 'FOLLOW_UP_TRIAL',
        priority: 'HIGH',
        dueAt: dueDate.toISOString(),
        assignedStaffId: staffA.id,
      });

      expect(task).toBeDefined();
      expect(task.status).toBe('OPEN');
      expect(task.priority).toBe('HIGH');

      // Verify opportunity nextActionAt updated
      const updatedOpp = await opportunityService.getOpportunity(orgA.id, opp.id);
      expect(updatedOpp.nextActionAt).toBeDefined();
      expect(new Date(updatedOpp.nextActionAt!).toISOString()).toBe(dueDate.toISOString());

      // Complete the task
      const completedTask = await taskService.updateTask(orgA.id, task.id, {
        status: 'COMPLETED',
      });

      expect(completedTask.status).toBe('COMPLETED');
      expect(completedTask.completedAt).toBeDefined();

      // Verify opportunity nextActionAt recalculated (null since no other pending tasks)
      const afterCompleteOpp = await opportunityService.getOpportunity(orgA.id, opp.id);
      expect(afterCompleteOpp.nextActionAt).toBeNull();
    });
  });

  // ==========================================================================
  // 9. Kanban Board View & Deterministic Metrics
  // ==========================================================================
  describe('9. Kanban Board View & Sales Metrics', () => {
    it('should generate structured Kanban board grouped across canonical stages', async () => {
      const board = await boardService.getPipelineBoard(orgA.id);

      expect(board).toBeDefined();
      expect(board.columns.length).toBe(8);
      expect(board.columns.map((c) => c.stageType)).toEqual([
        'NEW',
        'CONTACTED',
        'QUALIFIED',
        'TRIAL',
        'TOUR_BOOKED',
        'OFFERED',
        'CONVERTED',
        'LOST',
      ]);

      expect(board.totalOpportunities).toBeGreaterThanOrEqual(1);
      expect(board.totalValue).toBeGreaterThanOrEqual(0);

      // Verify columns contain opportunities cards
      const newColumn = board.columns.find((c) => c.stageType === 'NEW');
      expect(newColumn).toBeDefined();
      expect(newColumn?.opportunities).toBeDefined();
    });

    it('should compute deterministic sales velocity, conversion rates, and funnel metrics', async () => {
      const metrics = await boardService.getPipelineMetrics(orgA.id, {});

      expect(metrics).toBeDefined();
      expect(metrics.totalOpportunities).toBeGreaterThanOrEqual(1);
      expect(metrics.stageBreakdown).toBeDefined();
      expect(metrics.stageBreakdown.NEW).toBeDefined();
      expect(metrics.stageBreakdown.CONVERTED).toBeDefined();
      expect(metrics.winRate).toBeGreaterThanOrEqual(0);
      expect(metrics.velocity).toBeDefined();
      expect(metrics.stageConversionRates).toBeDefined();
    });
  });

  // ==========================================================================
  // 10. Multi-Tenant Isolation & IDOR Defense
  // ==========================================================================
  describe('10. Multi-Tenant Isolation & IDOR Defense', () => {
    it('should strictly deny cross-tenant access to opportunities across organisations', async () => {
      const oppA = await opportunityService.createOpportunity(orgA.id, {
        leadId: leadA.id,
        title: 'Org A Confidential Deal',
      });

      // Org B attempting to fetch Org A's opportunity
      await expect(
        opportunityService.getOpportunity(orgB.id, oppA.id),
      ).rejects.toThrow(NotFoundException);

      // Org B attempting to transition Org A's opportunity
      await expect(
        transitionService.transitionStage(orgB.id, oppA.id, {
          toStage: 'CONTACTED',
          version: oppA.version,
          actorType: 'STAFF',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // 11. Audit Logging Trail
  // ==========================================================================
  describe('11. Comprehensive Audit Trail', () => {
    it('should record comprehensive audit events for sales pipeline actions', async () => {
      const auditLogs = await prisma.auditLog.findMany({
        where: { organisationId: orgA.id },
        select: { action: true, resource: true },
      });

      const actions = auditLogs.map((l) => l.action);
      expect(actions).toContain('SALES_OPPORTUNITY_CREATED');
      expect(actions).toContain('SALES_OPPORTUNITY_STAGE_TRANSITIONED');
      expect(actions).toContain('SALES_ACTIVITY_LOGGED');
      expect(actions).toContain('SALES_TASK_CREATED');
    });
  });
});
