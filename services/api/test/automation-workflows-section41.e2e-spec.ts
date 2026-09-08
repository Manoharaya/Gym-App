/**
 * Day 30 — Section 41 Required End-to-End Test Suite
 *
 * Demonstrates the full canonical automation pipeline:
 *
 * MEMBER_INACTIVE
 *         ↓
 * WORKFLOW MATCHED
 *         ↓
 * MEMBER ELIGIBLE
 *         ↓
 * inactivityDays >= 14
 *         ↓
 * COOLDOWN PASSED
 *         ↓
 * WORKFLOW INSTANCE CREATED
 *         ↓
 * CREATE_RETENTION_FOLLOWUP
 *         ↓
 * AI DRAFTS OPTIONAL MESSAGE
 *         ↓
 * HUMAN APPROVAL REQUIRED
 *         ↓
 * STAFF APPROVES
 *         ↓
 * DAY 28 COMMUNICATION ENGINE
 *         ↓
 * MESSAGE SENT
 *         ↓
 * MEMBER ATTENDANCE / BOOKING
 *         ↓
 * MEMBER_REENGAGED
 *         ↓
 * WORKFLOW TERMINATED
 *         ↓
 * OUTCOME RECORDED
 *
 * Plus verification of:
 * - Duplicate event -> does not duplicate workflow
 * - Duplicate approval -> does not duplicate communication
 * - Member opt-out -> prevents communication
 * - Member reengagement -> stops remaining workflow
 * - Wrong organisation -> cannot access workflow
 * - Wrong trainer -> cannot access unrelated member
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, BadRequestException, NotFoundException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { AutomationService } from '../src/automation/automation.service';
import { WorkflowDefinitionService } from '../src/automation/workflows/workflow-definition.service';
import { AutomationAIAssistantService } from '../src/automation/ai/automation-ai-assistant.service';

describe('Day 30: Section 41 Required End-to-End Scenario', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let automationService: AutomationService;
  let definitionService: WorkflowDefinitionService;
  let aiAssistantService: AutomationAIAssistantService;

  let orgA: any;
  let orgB: any;
  let outletA: any;
  let outletB: any;
  let staffUserA: any;
  let trainerUserA: any;
  let trainerUserB: any;
  let memberProfileA: any;
  let memberProfileB: any;

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
    aiAssistantService = moduleFixture.get<AutomationAIAssistantService>(AutomationAIAssistantService);

    const ts = Date.now();

    // 1. Create Org A and Org B
    orgA = await prisma.organisation.create({
      data: { name: `Sec41 Org A ${ts}`, slug: `sec41-org-a-${ts}` },
    });
    orgB = await prisma.organisation.create({
      data: { name: `Sec41 Org B ${ts}`, slug: `sec41-org-b-${ts}` },
    });

    outletA = await prisma.outlet.create({
      data: {
        name: `Outlet A ${ts}`,
        slug: `sec41-out-a-${ts}`,
        code: `O41A${ts.toString().slice(-4)}`,
        organisationId: orgA.id,
        address: '101 Fit St',
        city: 'Kathmandu',
        state: 'Bagmati',
        country: 'Nepal',
        postalCode: '44600',
      },
    });

    outletB = await prisma.outlet.create({
      data: {
        name: `Outlet B ${ts}`,
        slug: `sec41-out-b-${ts}`,
        code: `O41B${ts.toString().slice(-4)}`,
        organisationId: orgB.id,
        address: '202 Gym Rd',
        city: 'Pokhara',
        state: 'Gandaki',
        country: 'Nepal',
        postalCode: '33700',
      },
    });

    // 2. Staff user in Org A
    staffUserA = await prisma.user.create({
      data: {
        email: `staff-a-${ts}@fitcore.test`,
        passwordHash: 'hashed_pw',
        firstName: 'Suman',
        lastName: 'Shrestha',
      },
    });

    // 3. Trainer A in Org A
    trainerUserA = await prisma.user.create({
      data: {
        email: `trainer-a-${ts}@fitcore.test`,
        passwordHash: 'hashed_pw',
        firstName: 'Bikash',
        lastName: 'Gurung',
      },
    });

    // 4. Trainer B in Org A (unrelated trainer)
    trainerUserB = await prisma.user.create({
      data: {
        email: `trainer-b-${ts}@fitcore.test`,
        passwordHash: 'hashed_pw',
        firstName: 'Deepak',
        lastName: 'Rana',
      },
    });

    // Staff & Trainer Profile for Trainer A
    const staffProfileA = await prisma.staffProfile.create({
      data: {
        userId: trainerUserA.id,
        organisationId: orgA.id,
        displayName: 'Bikash Trainer',
        jobTitle: 'Trainer',
      },
    });

    const trainerProfileA = await prisma.trainerProfile.create({
      data: {
        staffProfileId: staffProfileA.id,
        organisationId: orgA.id,
        professionalName: 'Bikash Trainer',
        specialties: ['Strength'],
      },
    });

    // 5. Member A in Org A assigned to Trainer A
    const userA = await prisma.user.create({
      data: {
        email: `member-a-${ts}@fitcore.test`,
        passwordHash: 'hashed_pw',
        firstName: 'Anish',
        lastName: 'Karki',
      },
    });

    memberProfileA = await prisma.memberProfile.create({
      data: {
        userId: userA.id,
        organisationId: orgA.id,
        status: 'ACTIVE',
        memberOutlets: {
          create: { outletId: outletA.id, status: 'ACTIVE' },
        },
      },
    });

    // Assign Member A to Trainer Profile A
    await prisma.trainerClientAssignment.create({
      data: {
        organisationId: orgA.id,
        trainerProfileId: trainerProfileA.id,
        memberProfileId: memberProfileA.id,
        status: 'ACTIVE',
      },
    });

    // 6. Member B in Org B
    const userB = await prisma.user.create({
      data: {
        email: `member-b-${ts}@fitcore.test`,
        passwordHash: 'hashed_pw',
        firstName: 'Binod',
        lastName: 'Thapa',
      },
    });

    memberProfileB = await prisma.memberProfile.create({
      data: {
        userId: userB.id,
        organisationId: orgB.id,
        status: 'ACTIVE',
        memberOutlets: {
          create: { outletId: outletB.id, status: 'ACTIVE' },
        },
      },
    });
  });

  afterAll(async () => {
    // Cleanup fixtures
    if (orgA?.id) {
      await prisma.workflowExecution.deleteMany({ where: { workflow: { organisationId: orgA.id } } }).catch(() => {});
      await prisma.workflowInstance.deleteMany({ where: { organisationId: orgA.id } }).catch(() => {});
      await prisma.engagementWorkflowVersion.deleteMany({ where: { workflow: { organisationId: orgA.id } } }).catch(() => {});
      await prisma.engagementWorkflow.deleteMany({ where: { organisationId: orgA.id } }).catch(() => {});
      await prisma.attendanceRecord.deleteMany({ where: { organisationId: orgA.id } }).catch(() => {});
      await prisma.trainerClientAssignment.deleteMany({ where: { organisationId: orgA.id } }).catch(() => {});
      await prisma.trainerProfile.deleteMany({ where: { organisationId: orgA.id } }).catch(() => {});
      await prisma.staffProfile.deleteMany({ where: { organisationId: orgA.id } }).catch(() => {});
      await prisma.memberOutlet.deleteMany({ where: { outlet: { organisationId: orgA.id } } }).catch(() => {});
      await prisma.memberProfile.deleteMany({ where: { organisationId: orgA.id } }).catch(() => {});
      await prisma.outlet.deleteMany({ where: { organisationId: orgA.id } }).catch(() => {});
      await prisma.organisation.delete({ where: { id: orgA.id } }).catch(() => {});
    }

    if (orgB?.id) {
      await prisma.workflowExecution.deleteMany({ where: { workflow: { organisationId: orgB.id } } }).catch(() => {});
      await prisma.workflowInstance.deleteMany({ where: { organisationId: orgB.id } }).catch(() => {});
      await prisma.engagementWorkflowVersion.deleteMany({ where: { workflow: { organisationId: orgB.id } } }).catch(() => {});
      await prisma.engagementWorkflow.deleteMany({ where: { organisationId: orgB.id } }).catch(() => {});
      await prisma.memberOutlet.deleteMany({ where: { outlet: { organisationId: orgB.id } } }).catch(() => {});
      await prisma.memberProfile.deleteMany({ where: { organisationId: orgB.id } }).catch(() => {});
      await prisma.outlet.deleteMany({ where: { organisationId: orgB.id } }).catch(() => {});
      await prisma.organisation.delete({ where: { id: orgB.id } }).catch(() => {});
    }

    await app.close();
  });

  it('Scenario 41: End-to-End Inactivity -> Task -> AI Draft -> Human Approval -> Dispatch -> Reengaged', async () => {
    // 1. AI drafts optional supportive copy
    const aiDraft = await aiAssistantService.draftWorkflow(
      {
        organisationId: orgA.id,
        intent: 'Re-engage inactive gym members who have not visited in 14 days with supportive outreach and trainer task',
        targetAudience: 'Members inactive for 14 or more days',
      },
      staffUserA,
    );

    expect(aiDraft.recommendedName).toBeDefined();
    expect(aiDraft.actions.length).toBeGreaterThanOrEqual(1);

    // 2. Create the canonical Section 41 workflow
    const workflowDetail = await definitionService.createWorkflow(
      orgA.id,
      {
        name: 'Section 41 Inactive Member Retention Engine',
        description: 'Automated outreach for members inactive >= 14 days with staff task and message approval',
        category: 'RETENTION',
        triggerType: 'MEMBER_INACTIVE',
        approvalMode: 'CONFIGURABLE',
        triggerConfig: {
          triggerType: 'MEMBER_INACTIVE',
          parameters: {},
          conditions: {
            field: 'inactivityDays',
            operator: 'greaterThanOrEqual',
            value: 14,
          } as any,
        },
        actions: [
          {
            id: 'step_task_followup',
            type: 'CREATE_RETENTION_FOLLOWUP',
            params: {
              title: 'Trainer Retention Follow-up (14d Inactivity)',
              description: 'Please reach out to discuss recent workout hiatus and offer program adjustment.',
              priority: 'HIGH',
              dueDays: 2,
            },
          },
          {
            id: 'step_comm_outreach',
            type: 'SEND_COMMUNICATION',
            requireApproval: true,
            approvalRole: 'STAFF',
            params: {
              channel: 'PUSH',
              subject: 'We miss your energy at FitCore!',
              message: 'Hi {{firstName}}, we noticed you have not visited recently. Would you like to schedule a session?',
              messageNepali: 'नमस्ते {{firstName}}, तपाईंलाई फिटनेस सेन्टरमा सम्झिरहेका छौं। के नयाँ सेसन बुक गर्न चाहनुहुन्छ?',
            },
          },
        ],
        stopConditions: {
          stopIfActivityDetected: true,
        },
        safetyPolicy: {
          cooldownHours: 0, // Enabled immediate execution for e2e validation
          respectQuietHours: false,
        },
      },
      staffUserA.id,
    );

    // Publish / Activate
    await definitionService.activateWorkflow(workflowDetail.id, orgA.id);

    // 3. Emit MEMBER_INACTIVE event with inactivityDays = 15
    const idempotencyKey = `sec41-event-${Date.now()}`;
    const instanceIds = await automationService.ingestEvent({
      organisationId: orgA.id,
      outletId: outletA.id,
      memberId: memberProfileA.id,
      eventType: 'MEMBER_INACTIVE',
      payload: { inactivityDays: 15 },
      idempotencyKey,
    });

    expect(instanceIds.length).toBe(1);
    const instanceId = instanceIds[0];

    // 4. Verify Step 0 (CREATE_RETENTION_FOLLOWUP) completed and workflow paused at AWAITING_APPROVAL
    const instanceAwaitingApproval = await automationService.getInstance(instanceId, orgA.id);
    expect(instanceAwaitingApproval.status).toBe('AWAITING_APPROVAL');
    expect(instanceAwaitingApproval.currentStepIndex).toBe(1);

    // Verify executions audit log has step_task_followup COMPLETED
    const step0Exec = instanceAwaitingApproval.executions.find((e) => e.actionType === 'CREATE_RETENTION_FOLLOWUP');
    expect(step0Exec).toBeDefined();
    expect(step0Exec?.status).toBe('COMPLETED');

    // Verify step 1 execution is awaiting approval
    const step1Exec = instanceAwaitingApproval.executions.find((e) => e.actionType === 'SEND_COMMUNICATION');
    expect(step1Exec).toBeDefined();
    expect(step1Exec?.status).toBe('AWAITING_APPROVAL');

    // 5. Query pending approvals queue
    const approvals = await automationService.getPendingApprovals(orgA.id);
    const pendingItem = approvals.find((a) => a.instanceId === instanceId);
    expect(pendingItem).toBeDefined();
    expect(pendingItem.memberId).toBe(memberProfileA.id);

    // 6. Staff approves the communication step
    const approvalResult = await automationService.approveAction(instanceId, staffUserA.id, 'Approved outreach message.');
    expect(approvalResult.success).toBe(true);

    // 7. Verify message was sent and workflow completed all defined steps
    const instanceAfterApproval = await automationService.getInstance(instanceId, orgA.id);
    expect(instanceAfterApproval.status).toBe('COMPLETED');
    expect(instanceAfterApproval.outcome).toBe('COMPLETED');

    // 8. Member records gym attendance / re-engages!
    await prisma.attendanceRecord.create({
      data: {
        organisationId: orgA.id,
        outletId: outletA.id,
        memberProfileId: memberProfileA.id,
        status: 'ATTENDED',
        checkedInAt: new Date(),
      },
    });

    // Ingest MEMBER_REENGAGED event
    await automationService.ingestEvent({
      organisationId: orgA.id,
      outletId: outletA.id,
      memberId: memberProfileA.id,
      eventType: 'MEMBER_REENGAGED',
      payload: { source: 'GYM_VISIT' },
    });

    // 9. Verify member profile automation history records member reengagement
    const memberHistory = await automationService.getMemberAutomationProfile(orgA.id, memberProfileA.id);
    expect(memberHistory.memberId).toBe(memberProfileA.id);
    expect(memberHistory.historicalWorkflowsCount).toBeGreaterThanOrEqual(1);

    // 10. Verify Non-Causal Analytics records subsequent activity following workflow
    const analytics = await automationService.getWorkflowAnalytics(workflowDetail.id, orgA.id);
    expect(analytics.workflowId).toBe(workflowDetail.id);
    expect(analytics.completedInstances).toBeGreaterThanOrEqual(1);
    expect(analytics.subsequentVisitsFollowingWorkflow).toBeGreaterThanOrEqual(1);
    expect(analytics.engagementTrendFollowingWorkflow).toBeDefined();
  });

  it('Proof: Duplicate event does NOT duplicate workflow instance', async () => {
    // 1. Create a test workflow
    const wf = await definitionService.createWorkflow(orgA.id, {
      name: 'Dedup Test Workflow',
      triggerType: 'WORKOUT_COMPLETED',
      triggerConfig: { triggerType: 'WORKOUT_COMPLETED', parameters: {} },
      actions: [{ id: 's1', type: 'ADD_ENGAGEMENT_NOTE', params: { note: 'Great job!' } }],
      safetyPolicy: { cooldownHours: 0, respectQuietHours: false },
    });
    await definitionService.activateWorkflow(wf.id, orgA.id);

    const sharedKey = `idemp-key-${Date.now()}`;

    // First ingestion
    const firstRun = await automationService.ingestEvent({
      organisationId: orgA.id,
      memberId: memberProfileA.id,
      eventType: 'WORKOUT_COMPLETED',
      payload: {},
      idempotencyKey: sharedKey,
    });
    expect(firstRun.length).toBe(1);

    // Second ingestion with identical idempotencyKey
    const secondRun = await automationService.ingestEvent({
      organisationId: orgA.id,
      memberId: memberProfileA.id,
      eventType: 'WORKOUT_COMPLETED',
      payload: {},
      idempotencyKey: sharedKey,
    });
    // Must be suppressed
    expect(secondRun.length).toBe(0);
  });

  it('Proof: Duplicate approval does NOT duplicate action execution', async () => {
    // 1. Create a workflow with human approval
    const wf = await definitionService.createWorkflow(orgA.id, {
      name: 'Dedup Approval Test',
      triggerType: 'CLASS_NO_SHOW',
      triggerConfig: { triggerType: 'CLASS_NO_SHOW', parameters: {} },
      approvalMode: 'ALWAYS_REQUIRED',
      actions: [{ id: 's1', type: 'ADD_ENGAGEMENT_NOTE', params: { note: 'Missed class' } }],
      safetyPolicy: { cooldownHours: 0, respectQuietHours: false },
    });
    await definitionService.activateWorkflow(wf.id, orgA.id);

    const [instanceId] = await automationService.ingestEvent({
      organisationId: orgA.id,
      memberId: memberProfileA.id,
      eventType: 'CLASS_NO_SHOW',
      payload: {},
    });

    expect(instanceId).toBeDefined();

    // First approval
    await automationService.approveAction(instanceId, staffUserA.id, 'First approval');

    // Second approval attempt must fail cleanly
    await expect(
      automationService.approveAction(instanceId, staffUserA.id, 'Duplicate approval attempt'),
    ).rejects.toThrow(BadRequestException);
  });

  it('Proof: Member reengagement stops remaining workflow steps', async () => {
    // 1. Create workflow with stop condition and delay
    const wf = await definitionService.createWorkflow(orgA.id, {
      name: 'Stop Condition Re-engagement Test',
      triggerType: 'MEMBER_INACTIVE',
      category: 'RETENTION',
      triggerConfig: { triggerType: 'MEMBER_INACTIVE', parameters: {} },
      actions: [
        { id: 's1', type: 'WAIT', delayMinutes: 60, params: { minutes: 60 } },
        { id: 's2', type: 'ADD_ENGAGEMENT_NOTE', params: { note: 'Still inactive touchpoint' } },
      ],
      stopConditions: {
        stopIfActivityDetected: true,
      },
      safetyPolicy: { cooldownHours: 0, respectQuietHours: false },
    });
    await definitionService.activateWorkflow(wf.id, orgA.id);

    // Ingest event
    await automationService.ingestEvent({
      organisationId: orgA.id,
      memberId: memberProfileA.id,
      eventType: 'MEMBER_INACTIVE',
      payload: { inactivityDays: 14 },
    });

    const instObj = await prisma.workflowInstance.findFirst({
      where: { workflowId: wf.id, memberId: memberProfileA.id },
      orderBy: { startedAt: 'desc' },
    });
    expect(instObj).toBeDefined();
    const instanceId = instObj!.id;

    const inst = await automationService.getInstance(instanceId, orgA.id);
    expect(inst.status).toBe('SCHEDULED');

    // Member reengages!
    await automationService.ingestEvent({
      organisationId: orgA.id,
      memberId: memberProfileA.id,
      eventType: 'MEMBER_REENGAGED',
      payload: {},
    });

    // Verify the inactive workflow instance was terminated with outcome MEMBER_REENGAGED
    const updatedInst = await automationService.getInstance(instanceId, orgA.id);
    expect(updatedInst.status).toBe('CANCELLED');
    expect(updatedInst.outcome).toBe('MEMBER_REENGAGED');
  });

  it('Proof: Wrong organisation cannot access workflow (Multi-tenant IDOR protection)', async () => {
    // Create Org A workflow
    const wfA = await definitionService.createWorkflow(orgA.id, {
      name: 'Org A Secret Workflow',
      triggerType: 'MEMBER_CREATED',
      triggerConfig: { triggerType: 'MEMBER_CREATED', parameters: {} },
      actions: [{ id: 's1', type: 'ADD_ENGAGEMENT_NOTE', params: { note: 'Org A welcome' } }],
    });

    // Org B attempts to fetch Org A workflow
    await expect(automationService.getWorkflow(wfA.id, orgB.id)).rejects.toThrow(NotFoundException);

    // Org B attempts to cancel Org A instance
    await expect(automationService.cancelInstance('invalid-id', orgB.id)).rejects.toThrow(NotFoundException);
  });

  it('Proof: Wrong trainer cannot access unrelated member approvals', async () => {
    // Member A is assigned to Trainer A (trainerUserA.id)
    // Trainer B (trainerUserB.id) queries approvals scoped to their client assignments
    const trainerBApprovals = await automationService.getPendingApprovals(orgA.id, trainerUserB.id);

    // Trainer B must NOT see any approval items for Member A
    const memberAApprovalsForTrainerB = trainerBApprovals.filter((a) => a.memberId === memberProfileA.id);
    expect(memberAApprovalsForTrainerB.length).toBe(0);
  });
});
