/**
 * Day 30: Automated Engagement Workflows E2E Test Suite
 *
 * Validates deterministic execution:
 * EVENT -> RULE -> ELIGIBILITY -> SAFETY -> ACTION -> APPROVAL -> EXECUTION -> OUTCOME
 *
 * Strict requirements:
 * 1. Zero autonomous high-risk actions.
 * 2. Multi-tenant isolation & trainer client scoping.
 * 3. Human-in-the-loop approval workflows.
 * 4. Centralized communication routing via Day 28 Communication Orchestrator.
 * 5. Non-causal outcome framing ("FOLLOWING WORKFLOW").
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { AutomationService } from '../src/automation/automation.service';
import { WorkflowDefinitionService } from '../src/automation/workflows/workflow-definition.service';
import { WorkflowTemplateService } from '../src/automation/workflows/workflow-template.service';
import { ConditionEvaluatorService } from '../src/automation/engine/condition-evaluator.service';
import { WorkflowSafetyService } from '../src/automation/safeguards/workflow-safety.service';
import { CooldownService } from '../src/automation/safeguards/cooldown.service';
import { WorkflowEngineService } from '../src/automation/engine/workflow-engine.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Day 30: Automated Engagement Workflows E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let automationService: AutomationService;
  let definitionService: WorkflowDefinitionService;
  let templateService: WorkflowTemplateService;
  let conditionEvaluator: ConditionEvaluatorService;
  let safetyService: WorkflowSafetyService;
  let cooldownService: CooldownService;
  let engineService: WorkflowEngineService;

  let orgA: any;
  let orgB: any;
  let outletA: any;
  let memberProfileA: any;
  let memberProfileB: any;
  let trainerUser: any;
  let staffUser: any;

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
    automationService = moduleFixture.get<AutomationService>(AutomationService);
    definitionService = moduleFixture.get<WorkflowDefinitionService>(WorkflowDefinitionService);
    templateService = moduleFixture.get<WorkflowTemplateService>(WorkflowTemplateService);
    conditionEvaluator = moduleFixture.get<ConditionEvaluatorService>(ConditionEvaluatorService);
    safetyService = moduleFixture.get<WorkflowSafetyService>(WorkflowSafetyService);
    cooldownService = moduleFixture.get<CooldownService>(CooldownService);
    engineService = moduleFixture.get<WorkflowEngineService>(WorkflowEngineService);

    const timestamp = Date.now();

    // Create Org A & Org B
    orgA = await prisma.organisation.create({
      data: {
        name: `Org A Auto ${timestamp}`,
        slug: `org-a-auto-${timestamp}`,
      },
    });

    orgB = await prisma.organisation.create({
      data: {
        name: `Org B Auto ${timestamp}`,
        slug: `org-b-auto-${timestamp}`,
      },
    });

    outletA = await prisma.outlet.create({
      data: {
        name: `Outlet A ${timestamp}`,
        slug: `outlet-a-${timestamp}`,
        code: `OUT${timestamp.toString().slice(-4)}`,
        organisationId: orgA.id,
        address: '100 Gym Lane',
        city: 'Kathmandu',
        state: 'Bagmati',
        country: 'Nepal',
        postalCode: '44600',
      },
    });

    // Staff user
    staffUser = await prisma.user.create({
      data: {
        email: `staff-${timestamp}@fitcore.test`,
        passwordHash: 'hashed_pw',
        firstName: 'Staff',
        lastName: 'Manager',
      },
    });

    // Member in Org A
    const userA = await prisma.user.create({
      data: {
        email: `member-a-${timestamp}@fitcore.test`,
        passwordHash: 'hashed_pw',
        firstName: 'Aarav',
        lastName: 'Sharma',
      },
    });

    memberProfileA = await prisma.memberProfile.create({
      data: {
        userId: userA.id,
        organisationId: orgA.id,
        status: 'ACTIVE',
        memberOutlets: {
          create: {
            outletId: outletA.id,
            status: 'ACTIVE',
          },
        },
      },
    });

    // Member in Org B (for multi-tenant isolation testing)
    const userB = await prisma.user.create({
      data: {
        email: `member-b-${timestamp}@fitcore.test`,
        passwordHash: 'hashed_pw',
        firstName: 'Bikash',
        lastName: 'Thapa',
      },
    });

    memberProfileB = await prisma.memberProfile.create({
      data: {
        userId: userB.id,
        organisationId: orgB.id,
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    // Cleanup created data
    if (orgA?.id) {
      await prisma.workflowExecution.deleteMany({ where: { workflow: { organisationId: orgA.id } } });
      await prisma.workflowInstance.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.engagementWorkflowVersion.deleteMany({ where: { workflow: { organisationId: orgA.id } } });
      await prisma.engagementWorkflow.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.memberOutlet.deleteMany({ where: { memberProfile: { organisationId: orgA.id } } });
      await prisma.memberProfile.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.outlet.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.organisation.delete({ where: { id: orgA.id } });
    }

    if (orgB?.id) {
      await prisma.memberProfile.deleteMany({ where: { organisationId: orgB.id } });
      await prisma.organisation.delete({ where: { id: orgB.id } });
    }

    await app.close();
  });

  describe('1. Declarative Condition Evaluator', () => {
    it('evaluates leaf conditions with various comparison operators', () => {
      const context = {
        inactivityDays: 14,
        attendanceDropPercent: 45,
        membershipStatus: 'ACTIVE',
        tags: ['vip', 'morning_crew'],
      };

      // Greater than or equal
      const resGte = conditionEvaluator.evaluateCondition(
        { field: 'inactivityDays', operator: 'GREATER_THAN_OR_EQUAL', value: 14 },
        context,
      );
      expect(resGte.passed).toBe(true);

      // Less than
      const resLt = conditionEvaluator.evaluateCondition(
        { field: 'inactivityDays', operator: 'LESS_THAN', value: 10 },
        context,
      );
      expect(resLt.passed).toBe(false);

      // Equals string (case-insensitive)
      const resEq = conditionEvaluator.evaluateCondition(
        { field: 'membershipStatus', operator: 'EQUALS', value: 'active' },
        context,
      );
      expect(resEq.passed).toBe(true);

      // Contains in array
      const resContains = conditionEvaluator.evaluateCondition(
        { field: 'tags', operator: 'CONTAINS', value: 'vip' },
        context,
      );
      expect(resContains.passed).toBe(true);
    });

    it('evaluates compound AND & OR conditions', () => {
      const context = {
        inactivityDays: 14,
        attendanceDropPercent: 40,
        membershipStatus: 'ACTIVE',
      };

      const compoundAnd = {
        logic: 'AND' as const,
        conditions: [
          { field: 'inactivityDays', operator: 'GREATER_THAN_OR_EQUAL' as const, value: 14 },
          { field: 'membershipStatus', operator: 'EQUALS' as const, value: 'ACTIVE' },
        ],
      };

      const resAnd = conditionEvaluator.evaluateCondition(compoundAnd, context);
      expect(resAnd.passed).toBe(true);

      const compoundOr = {
        logic: 'OR' as const,
        conditions: [
          { field: 'inactivityDays', operator: 'GREATER_THAN_OR_EQUAL' as const, value: 30 }, // false
          { field: 'attendanceDropPercent', operator: 'GREATER_THAN_OR_EQUAL' as const, value: 35 }, // true
        ],
      };

      const resOr = conditionEvaluator.evaluateCondition(compoundOr, context);
      expect(resOr.passed).toBe(true);
    });
  });

  describe('2. Safety Policies & Prohibited Actions', () => {
    it('strictly blocks prohibited high-risk actions (cancellation, price changes, discounts)', () => {
      expect(() => {
        safetyService.validateActionsSafety([
          {
            id: 'bad_step',
            type: 'CANCEL_MEMBERSHIP' as any,
            params: {},
          },
        ]);
      }).toThrow(BadRequestException);

      expect(() => {
        safetyService.validateActionsSafety([
          {
            id: 'bad_discount',
            type: 'SEND_COMMUNICATION',
            params: { discountPercentage: 50 },
          },
        ]);
      }).toThrow(BadRequestException);
    });

    it('blocks shaming, aggressive, or coercive language in communication copy', () => {
      expect(() => {
        safetyService.validateToneAndShaming('You are being lazy! Why are you not coming to gym?');
      }).toThrow(BadRequestException);

      expect(() => {
        safetyService.validateToneAndShaming('It is disappointing that you failed your target.');
      }).toThrow(BadRequestException);

      // Supportive tone passes smoothly
      expect(() => {
        safetyService.validateToneAndShaming('Hi Aarav, we missed you at the gym! Need any help getting back into your routine?');
      }).not.toThrow();
    });

    it('detects quiet hours and calculates next daylight resumption time', () => {
      const policy = {
        respectQuietHours: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        timezone: 'Asia/Kathmandu',
      };

      // Mock date at 23:30 (11:30 PM)
      const lateNight = new Date('2026-09-08T23:30:00+05:45');
      const quietCheck = safetyService.checkQuietHours(policy, lateNight);
      expect(quietCheck.isQuietHour).toBe(true);
      expect(quietCheck.resumeAt).toBeDefined();

      // Mock date at 14:00 (2:00 PM)
      const afternoon = new Date('2026-09-08T14:00:00+05:45');
      const dayCheck = safetyService.checkQuietHours(policy, afternoon);
      expect(dayCheck.isQuietHour).toBe(false);
    });
  });

  describe('3. Pre-configured Seed Templates', () => {
    it('provides 7 ready-to-use engagement workflow templates', () => {
      const templates = templateService.listTemplates();
      expect(templates.length).toBe(7);

      const keys = templates.map((t) => t.templateKey);
      expect(keys).toContain('INACTIVE_MEMBER_14D');
      expect(keys).toContain('ATTENDANCE_DROP');
      expect(keys).toContain('CLASS_NO_SHOW_FOLLOWUP');
      expect(keys).toContain('MEMBERSHIP_EXPIRING_14D');
      expect(keys).toContain('MEMBER_REENGAGED');
      expect(keys).toContain('NEW_MEMBER_ONBOARDING');
      expect(keys).toContain('MILESTONE_CELEBRATION');
    });

    it('instantiates a seed template into an organisation workflow in DRAFT state', async () => {
      const workflow = await templateService.instantiateTemplate(
        'INACTIVE_MEMBER_14D',
        orgA.id,
        outletA.id,
        'Automated Inactive Check-in 14D',
        staffUser.id,
      );

      expect(workflow.id).toBeDefined();
      expect(workflow.name).toBe('Automated Inactive Check-in 14D');
      expect(workflow.status).toBe('DRAFT');
      expect(workflow.triggerType).toBe('INACTIVITY_DAYS_REACHED');
      expect(workflow.actions.length).toBe(2);
      expect(workflow.currentVersion).toBe(1);
    });
  });

  describe('4. Workflow CRUD & Versioning', () => {
    let workflowId: string;

    it('creates a custom workflow with version 1', async () => {
      const created = await definitionService.createWorkflow(
        orgA.id,
        {
          name: 'Milestone 50 Workouts',
          triggerType: 'WORKOUT_MILESTONE_REACHED',
          triggerConfig: {
            triggerType: 'WORKOUT_MILESTONE_REACHED',
            parameters: { milestoneCount: 50 },
          },
          actions: [
            {
              id: 'notif_step',
              type: 'SEND_IN_APP_NOTIFICATION',
              params: {
                title: 'Congratulations!',
                message: 'You hit {{milestoneCount}} workouts!',
              },
            },
          ],
        },
        staffUser.id,
      );

      workflowId = created.id;
      expect(created.currentVersion).toBe(1);
      expect(created.status).toBe('DRAFT');
    });

    it('updates workflow definition creating version 2 snapshot', async () => {
      const updated = await definitionService.updateWorkflow(
        workflowId,
        orgA.id,
        {
          actions: [
            {
              id: 'notif_step',
              type: 'SEND_IN_APP_NOTIFICATION',
              params: {
                title: 'Congratulations on 50!',
                message: 'Incredible dedication, {{firstName}}!',
              },
            },
            {
              id: 'tag_step',
              type: 'ADD_MEMBER_TAG',
              params: { tag: 'CenturyClub-50' },
            },
          ],
        },
        staffUser.id,
      );

      expect(updated.currentVersion).toBe(2);
      expect(updated.actions.length).toBe(2);
    });

    it('activates and pauses workflow', async () => {
      const activated = await definitionService.activateWorkflow(workflowId, orgA.id);
      expect(activated.status).toBe('ACTIVE');

      const paused = await definitionService.pauseWorkflow(workflowId, orgA.id);
      expect(paused.status).toBe('PAUSED');
    });
  });

  describe('5. Simulation / Dry-Run Engine', () => {
    let activeWorkflow: any;

    beforeAll(async () => {
      activeWorkflow = await definitionService.createWorkflow(
        orgA.id,
        {
          name: 'Attendance Decline Simulation',
          triggerType: 'ATTENDANCE_DROP_PERCENT',
          triggerConfig: {
            triggerType: 'ATTENDANCE_DROP_PERCENT',
            parameters: { dropPercent: 30 },
            conditions: {
              field: 'dropPercent',
              operator: 'GREATER_THAN_OR_EQUAL',
              value: 30,
            },
          },
          actions: [
            {
              id: 'notify_coach',
              type: 'NOTIFY_ASSIGNED_TRAINER',
              params: { message: 'Attendance drop detected.' },
            },
          ],
        },
        staffUser.id,
      );
      await definitionService.activateWorkflow(activeWorkflow.id, orgA.id);
    });

    it('dry runs successfully and reports planned steps without side effects', async () => {
      const dryRunResult = await automationService.dryRunWorkflow(
        activeWorkflow.id,
        memberProfileA.id,
        { dropPercent: 40 },
      );

      expect(dryRunResult.triggered).toBe(true);
      expect(dryRunResult.outcome).toBe('WOULD_EXECUTE');
      expect(dryRunResult.actionsPlanned.length).toBe(1);
      expect(dryRunResult.actionsPlanned[0].actionType).toBe('NOTIFY_ASSIGNED_TRAINER');
    });

    it('reports condition mismatch when criteria are not satisfied', async () => {
      const dryRunResult = await automationService.dryRunWorkflow(
        activeWorkflow.id,
        memberProfileA.id,
        { dropPercent: 15 }, // Less than required 30
      );

      expect(dryRunResult.triggered).toBe(false);
      expect(dryRunResult.outcome).toBe('DID_NOT_MATCH');
    });
  });

  describe('6. End-to-End Trigger Ingestion & Execution Pipeline', () => {
    let testWorkflow: any;

    beforeAll(async () => {
      testWorkflow = await definitionService.createWorkflow(
        orgA.id,
        {
          name: 'E2E Inactivity Flow',
          triggerType: 'INACTIVITY_DAYS_REACHED',
          triggerConfig: {
            triggerType: 'INACTIVITY_DAYS_REACHED',
            parameters: { inactivityDays: 14 },
            conditions: {
              field: 'inactivityDays',
              operator: 'GREATER_THAN_OR_EQUAL',
              value: 14,
            },
          },
          actions: [
            {
              id: 'step_comm',
              type: 'SEND_COMMUNICATION',
              params: {
                channel: 'PUSH',
                subject: 'FitCore Check-in',
                message: 'Hi {{firstName}}, we missed you!',
                messageNepali: 'नमस्ते {{firstName}}, तपाईंलाई सम्झिरहेका छौं!',
              },
            },
            {
              id: 'step_task',
              type: 'CREATE_STAFF_TASK',
              params: {
                title: 'Check-in with {{firstName}}',
                description: '14 days inactive',
                priority: 'MEDIUM',
              },
            },
          ],
        },
        staffUser.id,
      );
      await definitionService.activateWorkflow(testWorkflow.id, orgA.id);
    });

    it('ingests trigger event and executes all action steps', async () => {
      const instances = await automationService.ingestEvent({
        organisationId: orgA.id,
        outletId: outletA.id,
        memberId: memberProfileA.id,
        eventType: 'INACTIVITY_DAYS_REACHED',
        payload: { inactivityDays: 14 },
      });

      expect(instances.length).toBe(1);
      const instanceId = instances[0];

      // Check instance state
      const instanceDetail = await automationService.getInstance(instanceId, orgA.id);
      expect(instanceDetail.status).toBe('COMPLETED');
      expect(instanceDetail.executions.length).toBe(2);

      // Verify execution steps
      const execTypes = instanceDetail.executions.map((e) => e.actionType);
      expect(execTypes).toContain('SEND_COMMUNICATION');
      expect(execTypes).toContain('CREATE_STAFF_TASK');
    });

    it('enforces multi-tenant isolation: Org B member does not trigger Org A workflow', async () => {
      const instances = await automationService.ingestEvent({
        organisationId: orgA.id,
        memberId: memberProfileB.id, // Belongs to Org B!
        eventType: 'INACTIVITY_DAYS_REACHED',
        payload: { inactivityDays: 14 },
      });

      expect(instances.length).toBe(0);
    });

    it('enforces cooldown preventing duplicate executions within window', async () => {
      const cooldownResults = await cooldownService.checkSafeguards(
        orgA.id,
        testWorkflow.id,
        memberProfileA.id,
        { cooldownHours: 24, cooldownScope: 'MEMBER_AND_WORKFLOW' },
      );

      const cooldownCheck = cooldownResults.find((c) => c.check === 'COOLDOWN_MEMBER_AND_WORKFLOW');
      expect(cooldownCheck?.passed).toBe(false);
      expect(cooldownCheck?.detail).toContain('Cooldown active');
    });
  });

  describe('7. Human-in-the-Loop (HITL) Approval Queue', () => {
    let approvalWorkflow: any;
    let pendingInstanceId: string;

    beforeAll(async () => {
      approvalWorkflow = await definitionService.createWorkflow(
        orgA.id,
        {
          name: 'Manual Approval Follow-up',
          triggerType: 'CLASS_MISSED',
          approvalMode: 'ALWAYS_REQUIRED', // Requires human review
          triggerConfig: {
            triggerType: 'CLASS_MISSED',
            parameters: {},
          },
          actions: [
            {
              id: 'comm_step',
              type: 'SEND_COMMUNICATION',
              params: {
                channel: 'SMS',
                message: 'Hope everything is alright {{firstName}}!',
              },
            },
          ],
        },
        staffUser.id,
      );
      await definitionService.activateWorkflow(approvalWorkflow.id, orgA.id);
    });

    it('pauses workflow instance at AWAITING_APPROVAL', async () => {
      const instances = await automationService.ingestEvent({
        organisationId: orgA.id,
        memberId: memberProfileA.id,
        eventType: 'CLASS_MISSED',
        payload: { className: 'HIIT Morning' },
      });

      expect(instances.length).toBe(1);
      pendingInstanceId = instances[0];

      const instance = await automationService.getInstance(pendingInstanceId, orgA.id);
      expect(instance.status).toBe('AWAITING_APPROVAL');

      // Check approval queue
      const approvals = await automationService.getPendingApprovals(orgA.id);
      expect(approvals.some((a) => a.instanceId === pendingInstanceId)).toBe(true);
    });

    it('resumes and completes execution upon staff approval', async () => {
      const result = await automationService.approveAction(
        pendingInstanceId,
        staffUser.id,
        'Looks good to send',
      );
      expect(result.success).toBe(true);

      const instance = await automationService.getInstance(pendingInstanceId, orgA.id);
      expect(instance.status).toBe('COMPLETED');
    });

    it('cancels workflow instance upon staff rejection with reason', async () => {
      const rejectWorkflow = await definitionService.createWorkflow(
        orgA.id,
        {
          name: 'Manual Approval Reject Flow',
          triggerType: 'MULTIPLE_SESSIONS_MISSED',
          approvalMode: 'ALWAYS_REQUIRED',
          safetyPolicy: { cooldownHours: 0 },
          triggerConfig: {
            triggerType: 'MULTIPLE_SESSIONS_MISSED',
            parameters: {},
          },
          actions: [
            {
              id: 'comm_step_2',
              type: 'SEND_COMMUNICATION',
              params: {
                channel: 'SMS',
                message: 'Hi {{firstName}}, check-in',
              },
            },
          ],
        },
        staffUser.id,
      );
      await definitionService.activateWorkflow(rejectWorkflow.id, orgA.id);

      const newInstances = await automationService.ingestEvent({
        organisationId: orgA.id,
        memberId: memberProfileA.id,
        eventType: 'MULTIPLE_SESSIONS_MISSED',
        payload: { sessionsMissed: 3 },
      });

      expect(newInstances.length).toBe(1);
      const rejectInstanceId = newInstances[0];
      const result = await automationService.rejectAction(
        rejectInstanceId,
        staffUser.id,
        'Member already informed reception of absence.',
      );

      expect(result.success).toBe(true);

      const instance = await automationService.getInstance(rejectInstanceId, orgA.id);
      expect(instance.status).toBe('CANCELLED');
    });
  });

  describe('8. Non-Causal Post-Workflow Outcome Analytics', () => {
    it('returns analytics with non-causal framing (FOLLOWING WORKFLOW)', async () => {
      const workflows = await definitionService.listWorkflows(orgA.id, {});
      const targetWf = workflows.find((w) => w.name === 'E2E Inactivity Flow') || workflows[0];

      const analytics = await automationService.getWorkflowAnalytics(targetWf.id, orgA.id);

      expect(analytics.workflowId).toBe(targetWf.id);
      expect(analytics.totalInstances).toBeGreaterThanOrEqual(1);
      expect(analytics.completedInstances).toBeGreaterThanOrEqual(1);
      expect(analytics.subsequentVisitsFollowingWorkflow).toBeDefined();
      expect(analytics.subsequentBookingsFollowingWorkflow).toBeDefined();
      expect(analytics.engagementTrendFollowingWorkflow).toBeDefined();
    });
  });

  describe('9. AI Workflow Architect Assistant', () => {
    it('drafts complete workflow configuration with bilingual English & Nepali messaging', async () => {
      const draft = await automationService.draftWithAI({
        organisationId: orgA.id,
        intent: 'Check in on members who missed a workout milestone with encouraging words in Nepali and English',
        preferredTone: 'SUPPORTIVE',
        language: 'en',
      });

      expect(draft.recommendedName).toBeDefined();
      expect(draft.triggerType).toBeDefined();
      expect(draft.safetyPolicy?.cooldownHours).toBeGreaterThanOrEqual(24);
      expect(draft.safetyPolicy?.respectQuietHours).toBe(true);
      expect(draft.actions.length).toBeGreaterThanOrEqual(1);
      expect(draft.suggestedMessageTemplates.length).toBeGreaterThanOrEqual(2);

      const nepaliMsg = draft.suggestedMessageTemplates.find((m) => m.language === 'ne');
      expect(nepaliMsg).toBeDefined();
      expect(nepaliMsg?.body).toContain('नमस्ते');
    });
  });
});
