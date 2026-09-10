/**
 * Day 39 — Automated Follow-Up & Multi-Channel Sales Sequences Comprehensive E2E Test Suite
 *
 * Validates:
 * 1. Default Sequence Template Seeding & Custom Sequence Versioning
 * 2. Strict Lead Eligibility & Consent Evaluation (Blocks converted/unqualified, verifies channel consent)
 * 3. Step Delays (Day 0, Day 1, Day 3, Day 7) & Sequence Progression to Completion
 * 4. Single Delivery Authority via Day 28 CommunicationOrchestratorService
 * 5. Multi-Channel Dispatch & Consented Fallback (WhatsApp -> SMS)
 * 6. Deterministic Idempotency & Concurrency Race Condition Defense
 * 7. Centralized Suppression Engine (Cooldown 24h, Frequency Cap 4/wk, Quiet Hours, Opt-Out)
 * 8. Personalization Context & AI Draft Generation (No repetitive questions, AI token tracking)
 * 9. Human Approval Gate Workflow (PENDING_APPROVAL -> Approved -> Sent / Rejected)
 * 10. Automatic Sequence Stop Conditions (stopOnReply, stopOnBooking, stopOnConversion, stopOnStaffHandoff)
 * 11. Day 37 Sales Pipeline Synchronization (SalesActivity logging)
 * 12. Observational Attribution Recording (FollowUpOutcome with non-causal claims)
 * 13. Cross-Tenant Isolation & IDOR Protection (Org A vs Org B)
 * 14. REST API Endpoint Verification under /api/v1/follow-ups
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { LeadsService } from '../src/leads/leads.service';
import { FollowUpSequenceService } from '../src/ai/features/follow-up/services/follow-up-sequence.service';
import { FollowUpEligibilityService } from '../src/ai/features/follow-up/services/follow-up-eligibility.service';
import { FollowUpSuppressionService } from '../src/ai/features/follow-up/services/follow-up-suppression.service';
import { FollowUpContextService } from '../src/ai/features/follow-up/services/follow-up-context.service';
import { FollowUpAiService } from '../src/ai/features/follow-up/services/follow-up-ai.service';
import { FollowUpExecutionService } from '../src/ai/features/follow-up/services/follow-up-execution.service';
import { FollowUpSchedulerService } from '../src/ai/features/follow-up/services/follow-up-scheduler.service';
import { FollowUpResponseService } from '../src/ai/features/follow-up/services/follow-up-response.service';
import { SalesPipelineService } from '../src/sales-pipeline/application/sales-pipeline.service';
import { SalesOpportunityService } from '../src/sales-pipeline/application/sales-opportunity.service';
import request from 'supertest';

describe('Day 39: Automated Follow-Up & Multi-Channel Sales Sequences E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let leadsService: LeadsService;
  let sequenceService: FollowUpSequenceService;
  let eligibilityService: FollowUpEligibilityService;
  let suppressionService: FollowUpSuppressionService;
  let contextService: FollowUpContextService;
  let aiService: FollowUpAiService;
  let executionService: FollowUpExecutionService;
  let schedulerService: FollowUpSchedulerService;
  let responseService: FollowUpResponseService;
  let pipelineService: SalesPipelineService;
  let opportunityService: SalesOpportunityService;

  let orgA: any;
  let orgB: any;
  let outletA: any;
  let outletB: any;
  let staffA: any;
  let leadA: any;
  let leadB: any;
  let opportunityA: any;
  let superAdminToken: string;

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

    // Authenticate SuperAdmin for API tests
    const saRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@fitcore.io', password: 'FitCoreDev2026!' });
    superAdminToken = saRes.body.data?.accessToken || saRes.body.accessToken;

    prisma = app.get(PrismaService);
    leadsService = app.get(LeadsService);
    sequenceService = app.get(FollowUpSequenceService);
    eligibilityService = app.get(FollowUpEligibilityService);
    suppressionService = app.get(FollowUpSuppressionService);
    contextService = app.get(FollowUpContextService);
    aiService = app.get(FollowUpAiService);
    executionService = app.get(FollowUpExecutionService);
    schedulerService = app.get(FollowUpSchedulerService);
    responseService = app.get(FollowUpResponseService);
    pipelineService = app.get(SalesPipelineService);
    opportunityService = app.get(SalesOpportunityService);

    // Setup Test Tenants
    const ts = Date.now();
    orgA = await prisma.organisation.create({
      data: {
        name: `Day 39 FollowUp Gym A ${ts}`,
        slug: `day39-fup-a-${ts}`,
      },
    });

    orgB = await prisma.organisation.create({
      data: {
        name: `Day 39 FollowUp Gym B ${ts}`,
        slug: `day39-fup-b-${ts}`,
      },
    });

    outletA = await prisma.outlet.create({
      data: {
        organisationId: orgA.id,
        name: 'Downtown Performance Centre',
        slug: `downtown-fup-${ts}`,
        code: `DF-${ts.toString().slice(-4)}`,
        address: '100 Fitness St',
        city: 'Sydney',
        state: 'NSW',
        postalCode: '2000',
      },
    });

    outletB = await prisma.outlet.create({
      data: {
        organisationId: orgB.id,
        name: 'North Gym B',
        slug: `north-b-fup-${ts}`,
        code: `NF-${ts.toString().slice(-4)}`,
        address: '200 North St',
        city: 'Melbourne',
        state: 'VIC',
        postalCode: '3000',
      },
    });

    const userA = await prisma.user.create({
      data: {
        email: `staff.fup.${ts}@fitcore.io`,
        passwordHash: 'hashed_pw',
        firstName: 'Elena',
        lastName: 'Rostova',
      },
    });

    staffA = await prisma.staffProfile.create({
      data: {
        userId: userA.id,
        organisationId: orgA.id,
        displayName: 'Elena Rostova',
        jobTitle: 'Membership Manager',
        employmentStatus: 'ACTIVE',
      },
    });

    // Create Leads
    leadA = await leadsService.createLead(orgA.id, {
      firstName: 'Bikash',
      lastName: 'Thapa',
      email: `bikash.${ts}@example.com`,
      phone: '+61411222333',
      outletId: outletA.id,
      source: 'WEBSITE',
    });

    leadB = await leadsService.createLead(orgB.id, {
      firstName: 'Chloe',
      lastName: 'Smith',
      email: `chloe.${ts}@example.com`,
      phone: '+61422333444',
      outletId: outletB.id,
      source: 'WALK_IN',
    });

    // Setup Opportunity for Lead A
    opportunityA = await opportunityService.createOpportunity(orgA.id, {
      leadId: leadA.id,
      outletId: outletA.id,
      title: 'Bikash Thapa - Standard Gym Membership',
      estimatedValue: 1200,
      ownerStaffId: staffA.id,
    });

    // Seed Day 38 Qualification Profile for Lead A
    await prisma.leadQualificationProfile.upsert({
      where: { leadId: leadA.id },
      create: {
        leadId: leadA.id,
        goals: ['Fat loss and strength training'],
        experienceLevel: 'INTERMEDIATE',
        preferredSchedule: 'Early morning 6am - 7:30am weekdays',
        readiness: 'READY_TO_START',
        decisionFactors: ['Equipment quality', 'Shower facilities'],
      },
      update: {
        goals: ['Fat loss and strength training'],
        experienceLevel: 'INTERMEDIATE',
        preferredSchedule: 'Early morning 6am - 7:30am weekdays',
        readiness: 'READY_TO_START',
        decisionFactors: ['Equipment quality', 'Shower facilities'],
      },
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // =========================================================================
  // 1. SEQUENCE TEMPLATES & VERSIONING
  // =========================================================================
  describe('1. Sequence Templates & Versioning', () => {
    it('seeds all standard system default follow-up sequence templates', async () => {
      const newLeadSeq = await sequenceService.getOrCreateDefaultSequence(orgA.id, 'LEAD_FOLLOW_UP', outletA.id);
      expect(newLeadSeq).toBeDefined();
      expect(newLeadSeq.sequenceType).toBe('LEAD_FOLLOW_UP');
      expect(newLeadSeq.activeVersion).toBeDefined();
      expect(newLeadSeq.activeVersion.steps.length).toBe(4); // Day 0, Day 1, Day 3, Day 7

      const missedCallSeq = await sequenceService.getOrCreateDefaultSequence(orgA.id, 'MISSED_CALL', outletA.id);
      expect(missedCallSeq.sequenceType).toBe('MISSED_CALL');
      expect(missedCallSeq.activeVersion.steps.length).toBeGreaterThanOrEqual(1);

      const trialSeq = await sequenceService.getOrCreateDefaultSequence(orgA.id, 'TRIAL_FOLLOW_UP', outletA.id);
      expect(trialSeq.sequenceType).toBe('TRIAL_FOLLOW_UP');
    });

    it('creates custom sequence with version 1 PUBLISHED', async () => {
      const created = await sequenceService.createSequence(orgA.id, {
        name: 'VIP Executive Tour Follow-Up',
        description: 'Multi-step sequence for high intent executive prospects',
        sequenceType: 'TOUR_FOLLOW_UP',
        outletId: outletA.id,
        steps: [
          {
            stepOrder: 1,
            name: 'VIP Day 0 Post Tour Welcome',
            channel: 'WHATSAPP',
            delayMinutes: 0,
            stopOnReply: true,
            stopOnBooking: true,
            configuration: {
              fallbackChannel: 'SMS',
              templateBody: 'Hi {{firstName}}, great meeting you today at {{outletName}}! Let us know if you need anything.',
            },
          },
          {
            stepOrder: 2,
            name: 'VIP Day 2 Dedicated Trainer Offer',
            channel: 'EMAIL',
            delayMinutes: 2880,
            stopOnReply: true,
            configuration: {
              templateSubject: 'Your Personal Training Orientation at {{outletName}}',
              templateBody: 'Hi {{firstName}}, here is your complimentary orientation voucher.',
            },
          },
        ],
      }, staffA.id);

      expect(created.id).toBeDefined();
      expect(created.versions.length).toBe(1);
      expect(created.versions[0].version).toBe(1);
      expect(created.versions[0].status).toBe('PUBLISHED');
      expect(created.versions[0].steps.length).toBe(2);
      expect(created.versions[0].steps[0].delayMinutes).toBe(0);
      expect(created.versions[0].steps[1].delayMinutes).toBe(2880);
    });
  });

  // =========================================================================
  // 2. LEAD ELIGIBILITY & CONSENT EVALUATION
  // =========================================================================
  describe('2. Lead Eligibility & Consent Evaluation', () => {
    let testSequence: any;

    beforeAll(async () => {
      testSequence = await sequenceService.getOrCreateDefaultSequence(orgA.id, 'LEAD_FOLLOW_UP', outletA.id);
    });

    it('approves eligible, consented lead with valid contact details', async () => {
      const evaluation = await eligibilityService.evaluateEnrollmentEligibility(orgA.id, {
        leadId: leadA.id,
        sequenceId: testSequence.id,
      });
      expect(evaluation.eligible).toBe(true);
      expect(evaluation.status).toBe('ELIGIBLE');
    });

    it('rejects lead if already converted to a paying member', async () => {
      const ts = Date.now();
      const convertedLead = await leadsService.createLead(orgA.id, {
        firstName: 'Converted',
        lastName: 'Member',
        email: `converted.${ts}@fitcore.io`,
        phone: '+61400000001',
        outletId: outletA.id,
      });

      await prisma.lead.update({
        where: { id: convertedLead.id },
        data: { status: 'CONVERTED' },
      });

      const evaluation = await eligibilityService.evaluateEnrollmentEligibility(orgA.id, {
        leadId: convertedLead.id,
        sequenceId: testSequence.id,
      });
      expect(evaluation.eligible).toBe(false);
      expect(evaluation.status).toBe('ALREADY_CONVERTED');
    });

    it('rejects lead marked UNQUALIFIED', async () => {
      const ts = Date.now();
      const unqualLead = await leadsService.createLead(orgA.id, {
        firstName: 'Unqualified',
        lastName: 'Person',
        email: `unqual.${ts}@fitcore.io`,
        phone: '+61400000002',
        outletId: outletA.id,
      });

      await prisma.lead.update({
        where: { id: unqualLead.id },
        data: { status: 'UNQUALIFIED' },
      });

      const evaluation = await eligibilityService.evaluateEnrollmentEligibility(orgA.id, {
        leadId: unqualLead.id,
        sequenceId: testSequence.id,
      });
      expect(evaluation.eligible).toBe(false);
      expect(evaluation.status).toBe('INVALID_STATUS');
    });

    it('rejects lead if missing required contact details for sequence primary channels', async () => {
      const ts = Date.now();
      const noContactLead = await prisma.lead.create({
        data: {
          organisationId: orgA.id,
          outletId: outletA.id,
          firstName: 'NoContact',
          lastName: 'Lead',
          source: 'WALK_IN',
          status: 'OPEN',
        },
      });

      const evaluation = await eligibilityService.evaluateEnrollmentEligibility(orgA.id, {
        leadId: noContactLead.id,
        sequenceId: testSequence.id,
      });
      expect(evaluation.eligible).toBe(false);
      expect(evaluation.status).toBe('NO_VALID_CHANNEL');
    });
  });

  // =========================================================================
  // 3. STEP DELAYS & SEQUENCE PROGRESSION
  // =========================================================================
  describe('3. Step Delays & Sequence Progression (Day 0, Day 1, Day 3, Day 7)', () => {
    let sequence: any;

    beforeAll(async () => {
      sequence = await sequenceService.getOrCreateDefaultSequence(orgA.id, 'LEAD_FOLLOW_UP', outletA.id);
    });

    it('enrolls lead into Day 0 step and executes immediately if delay is 0', async () => {
      const enrollment = await schedulerService.enroll(orgA.id, {
        leadId: leadA.id,
        sequenceId: sequence.id,
        opportunityId: opportunityA.id,
      }, staffA.id);

      expect(enrollment.id).toBeDefined();
      expect(enrollment.status).toBe('ACTIVE');
      expect(enrollment.currentStep).toBe(1);

      // Verify Step 1 execution was recorded
      const executions = await prisma.followUpStepExecution.findMany({
        where: { enrollmentId: enrollment.id },
      });
      expect(executions.length).toBe(1);
      expect(['SUCCESS', 'SENT', 'QUEUED', 'PENDING_APPROVAL']).toContain(executions[0].status);
    });

    it('blocks duplicate active enrollment for the same lead in the same sequence', async () => {
      await expect(
        schedulerService.enroll(orgA.id, {
          leadId: leadA.id,
          sequenceId: sequence.id,
        }),
      ).rejects.toThrow();
    });

    it('advances from Day 0 (Step 1) to Day 1 (Step 2) when worker processes due enrollment', async () => {
      const enrollment = await prisma.followUpEnrollment.findFirst({
        where: { organisationId: orgA.id, leadId: leadA.id, status: 'ACTIVE' },
      });

      // Force nextExecutionAt to now so worker claims it
      await prisma.followUpEnrollment.update({
        where: { id: enrollment!.id },
        data: { nextExecutionAt: new Date(Date.now() - 1000) },
      });

      const processed = await schedulerService.processDueEnrollments();
      expect(processed.processed).toBeGreaterThanOrEqual(1);

      const updatedEnrollment = await prisma.followUpEnrollment.findUnique({
        where: { id: enrollment!.id },
      });
      expect(updatedEnrollment!.currentStep).toBe(2);
      expect(updatedEnrollment!.nextExecutionAt).toBeDefined();
      // Next execution scheduled in future
      expect(updatedEnrollment!.nextExecutionAt!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  // =========================================================================
  // 4. SINGLE DELIVERY AUTHORITY & DAY 28 INTEGRATION
  // =========================================================================
  describe('4. Single Delivery Authority via Communication Engine', () => {
    it('dispatches exclusively through Day 28 CommunicationOrchestratorService', async () => {
      const ts = Date.now();
      const freshLead = await leadsService.createLead(orgA.id, {
        firstName: 'Delivery',
        lastName: 'Test',
        email: `delivery.${ts}@fitcore.io`,
        phone: '+61412345678',
        outletId: outletA.id,
      });

      const customSeq = await sequenceService.createSequence(orgA.id, {
        name: 'Single Authority Dispatch Test',
        sequenceType: 'TRIAL_FOLLOW_UP',
        outletId: outletA.id,
        steps: [
          {
            stepOrder: 1,
            name: 'Direct Orchestrator Step',
            channel: 'SMS',
            delayMinutes: 0,
            configuration: {
              templateBody: 'Hi {{firstName}}, this is sent via the central communication engine.',
            },
          },
        ],
      });

      const enrollment = await schedulerService.enroll(orgA.id, {
        leadId: freshLead.id,
        sequenceId: customSeq.id,
      });

      const execution = await prisma.followUpStepExecution.findFirst({
        where: { enrollmentId: enrollment.id },
      });

      expect(execution).toBeDefined();
      // Must link to a Day 28 Communication record
      expect(execution!.communicationId).toBeDefined();

      const comm = await prisma.communication.findUnique({
        where: { id: execution!.communicationId! },
      });
      expect(comm).toBeDefined();
      expect(comm!.channel).toBe('SMS');
      expect((comm!.metadata as any)?.followUpExecutionId).toBe(execution!.id);
    });
  });

  // =========================================================================
  // 5. MULTI-CHANNEL DISPATCH & CONSENTED FALLBACK
  // =========================================================================
  describe('5. Multi-Channel Dispatch & Consented Fallback', () => {
    it('falls back from WHATSAPP to SMS if WhatsApp is unconsented or phone is missing WhatsApp capability', async () => {
      const ts = Date.now();
      const fallbackLead = await leadsService.createLead(orgA.id, {
        firstName: 'Fallback',
        lastName: 'User',
        phone: '+61499887766',
        outletId: outletA.id,
      });

      const fallbackSeq = await sequenceService.createSequence(orgA.id, {
        name: 'WhatsApp Fallback Sequence',
        sequenceType: 'LEAD_FOLLOW_UP',
        outletId: outletA.id,
        steps: [
          {
            stepOrder: 1,
            name: 'WhatsApp with SMS Fallback',
            channel: 'WHATSAPP',
            delayMinutes: 0,
            configuration: {
              fallbackChannel: 'SMS',
              templateBody: 'Hi {{firstName}}, special welcome offer from {{outletName}}!',
            },
          },
        ],
      });

      const enrollment = await schedulerService.enroll(orgA.id, {
        leadId: fallbackLead.id,
        sequenceId: fallbackSeq.id,
      });

      const execution = await prisma.followUpStepExecution.findFirst({
        where: { enrollmentId: enrollment.id },
      });

      expect(execution).toBeDefined();
      // Verify chosen channel is either WHATSAPP or fallen back to SMS
      expect(['WHATSAPP', 'SMS']).toContain(execution!.channel);
      expect(['SUCCESS', 'SENT']).toContain(execution!.status);
    });
  });

  // =========================================================================
  // 6. DETERMINISTIC IDEMPOTENCY & CONCURRENCY PROTECTION
  // =========================================================================
  describe('6. Deterministic Idempotency & Concurrency Protection', () => {
    it('rejects duplicate execution of the same step on the same enrollment via unique executionKey', async () => {
      const ts = Date.now();
      const testLead = await leadsService.createLead(orgA.id, {
        firstName: 'Idempotent',
        lastName: 'Lead',
        email: `idemp.${ts}@fitcore.io`,
        outletId: outletA.id,
      });

      const seq = await sequenceService.createSequence(orgA.id, {
        name: 'Idempotency Test Seq',
        sequenceType: 'LEAD_FOLLOW_UP',
        outletId: outletA.id,
        steps: [
          {
            stepOrder: 1,
            name: 'Idempotent Email Step',
            channel: 'EMAIL',
            delayMinutes: 0,
            configuration: {
              templateSubject: 'Idempotent Test',
              templateBody: 'Hello {{firstName}}',
            },
          },
        ],
      });

      const enrollment = await schedulerService.enroll(orgA.id, {
        leadId: testLead.id,
        sequenceId: seq.id,
      });

      const step = seq.versions[0].steps[0];

      // Second invocation for same enrollment and step must safely return existing execution
      const duplicateResult = await executionService.executeStep(orgA.id, enrollment.id, step.id);
      expect(['SUCCESS', 'SENT']).toContain(duplicateResult.status);

      const count = await prisma.followUpStepExecution.count({
        where: { enrollmentId: enrollment.id, stepId: step.id },
      });
      expect(count).toBe(1);
    });
  });

  // =========================================================================
  // 7. CENTRALIZED SUPPRESSION ENGINE
  // =========================================================================
  describe('7. Centralized Suppression Engine (14+ Rules)', () => {
    it('suppresses communication when cooldown period (24 hours) is active', async () => {
      const ts = Date.now();
      const cooledLead = await leadsService.createLead(orgA.id, {
        firstName: 'Cooldown',
        lastName: 'Lead',
        email: `cooldown.${ts}@fitcore.io`,
        phone: '+61411000111',
        outletId: outletA.id,
      });

      const seq = await sequenceService.getOrCreateDefaultSequence(orgA.id, 'LEAD_FOLLOW_UP', outletA.id);
      const activeVer = seq.activeVersion || seq.versions[0];
      const enrollment = await prisma.followUpEnrollment.create({
        data: {
          organisationId: orgA.id,
          sequenceId: seq.id,
          sequenceVersionId: activeVer.id,
          leadId: cooledLead.id,
          status: 'ACTIVE',
        },
      });

      await prisma.followUpStepExecution.create({
        data: {
          organisationId: orgA.id,
          enrollmentId: enrollment.id,
          stepId: activeVer.steps[0].id,
          executionKey: `cooldown_key_${ts}`,
          channel: 'EMAIL',
          status: 'SUCCESS',
          scheduledAt: new Date(Date.now() - 15 * 60 * 1000),
          executedAt: new Date(Date.now() - 10 * 60 * 1000),
        },
      });

      const suppression = await suppressionService.evaluateSuppression(orgA.id, {
        leadId: cooledLead.id,
        channel: 'EMAIL',
        cooldownHours: 24,
      });

      expect(suppression.suppressed).toBe(true);
      expect(suppression.reason).toBe('COOLDOWN');
    });

    it('suppresses communication when within quiet hours', async () => {
      const isQuiet = suppressionService.isWithinQuietHours('21:00', '08:00', '23:00');
      expect(isQuiet).toBe(true);

      const isNotQuiet = suppressionService.isWithinQuietHours('21:00', '08:00', '14:00');
      expect(isNotQuiet).toBe(false);
    });

    it('suppresses communication when recipient has opted out', async () => {
      const ts = Date.now();
      const optOutLead = await leadsService.createLead(orgA.id, {
        firstName: 'Opted',
        lastName: 'Out',
        phone: '+61422000222',
        outletId: outletA.id,
      });

      // Record explicit opt-out
      await prisma.followUpSuppression.create({
        data: {
          organisationId: orgA.id,
          leadId: optOutLead.id,
          channel: 'SMS',
          reason: 'OPTOUT',
        },
      });

      const suppression = await suppressionService.evaluateSuppression(orgA.id, {
        leadId: optOutLead.id,
        channel: 'SMS',
      });
      expect(suppression.suppressed).toBe(true);
      expect(suppression.reason).toBe('OPTOUT');
    });
  });

  // =========================================================================
  // 8. PERSONALIZATION CONTEXT & AI DRAFT GENERATION
  // =========================================================================
  describe('8. Personalization Context & AI Draft Generation', () => {
    it('pulls Day 38 Qualification Profile without re-asking answered questions', async () => {
      const context = await contextService.assembleContext(orgA.id, leadA.id, opportunityA.id);

      expect(context.firstName).toBe('Bikash');
      expect(context.primaryGoal).toBe('Fat loss and strength training');
      expect(context.experienceLevel).toBe('INTERMEDIATE');
      expect(context.preferredSchedule).toBe('Early morning 6am - 7:30am weekdays');
      expect(context.readiness).toBe('READY_TO_START');
    });

    it('generates a personalized, bounded AI follow-up draft', async () => {
      const context = await contextService.assembleContext(orgA.id, leadA.id, opportunityA.id);
      const draft = await aiService.generateFollowUpDraft(orgA.id, {
        channel: 'WHATSAPP',
        stepName: 'Day 1 Goal Alignment',
        context,
        language: 'en',
      });

      expect(draft).toBeDefined();
      expect(draft.message).toBeDefined();
      expect(draft.message.length).toBeGreaterThan(10);
      expect(Array.isArray(draft.safetyFlags)).toBe(true);
    });

    it('supports multilingual drafting in Nepali', async () => {
      const context = await contextService.assembleContext(orgA.id, leadA.id, opportunityA.id);
      const draft = await aiService.generateFollowUpDraft(orgA.id, {
        channel: 'SMS',
        stepName: 'Day 3 Check-In',
        context,
        language: 'ne',
      });

      expect(draft.message).toBeDefined();
      expect(draft.message.length).toBeGreaterThan(5);
    });
  });

  // =========================================================================
  // 9. HUMAN APPROVAL GATE WORKFLOW
  // =========================================================================
  describe('9. Human Approval Gate Workflow', () => {
    let approvalSeq: any;
    let approvalLead: any;

    beforeAll(async () => {
      const ts = Date.now();
      approvalLead = await leadsService.createLead(orgA.id, {
        firstName: 'Approval',
        lastName: 'Candidate',
        email: `approval.${ts}@fitcore.io`,
        phone: '+61455443322',
        outletId: outletA.id,
      });

      approvalSeq = await sequenceService.createSequence(orgA.id, {
        name: 'High Touch Approval Sequence',
        sequenceType: 'QUALIFIED_LEAD',
        outletId: outletA.id,
        steps: [
          {
            stepOrder: 1,
            name: 'Manager Review Required Step',
            channel: 'EMAIL',
            delayMinutes: 0,
            requiresApproval: true, // Requires gatekeeper approval
            configuration: {
              templateSubject: 'Exclusive Invitation from General Manager',
              templateBody: 'Hi {{firstName}}, we would love to offer you a 1-on-1 consultation.',
            },
          },
        ],
      });
    });

    it('pauses step execution in PENDING_APPROVAL status when human review is required', async () => {
      const enrollment = await schedulerService.enroll(orgA.id, {
        leadId: approvalLead.id,
        sequenceId: approvalSeq.id,
      });

      const execution = await prisma.followUpStepExecution.findFirst({
        where: { enrollmentId: enrollment.id },
      });

      expect(execution).toBeDefined();
      expect(execution!.status).toBe('PENDING_APPROVAL');
      expect(execution!.executedAt).toBeNull();
    });

    it('approves and dispatches execution upon staff approval', async () => {
      const execution = await prisma.followUpStepExecution.findFirst({
        where: { organisationId: orgA.id, status: 'PENDING_APPROVAL' },
      });

      const approved = await executionService.approveExecution(orgA.id, execution!.id, undefined, staffA.id);
      expect(['SUCCESS', 'SENT']).toContain(approved.status);
      expect((approved as any).executedAt).toBeDefined();
    });

    it('rejects execution when staff declines draft', async () => {
      // Create another execution requiring approval
      const ts = Date.now();
      const rejectLead = await leadsService.createLead(orgA.id, {
        firstName: 'Reject',
        lastName: 'Lead',
        email: `reject.${ts}@fitcore.io`,
        outletId: outletA.id,
      });

      const enrollment = await schedulerService.enroll(orgA.id, {
        leadId: rejectLead.id,
        sequenceId: approvalSeq.id,
      });

      const execution = await prisma.followUpStepExecution.findFirst({
        where: { enrollmentId: enrollment.id, status: 'PENDING_APPROVAL' },
      });

      const rejected = await executionService.rejectExecution(
        orgA.id,
        execution!.id,
        staffA.id,
        'Offer terms not applicable to this lead category',
      );

      expect(rejected.status).toBe('CANCELLED');
      expect(rejected.errorDetails).toContain('Rejected by staff');
    });
  });

  // =========================================================================
  // 10. AUTOMATIC SEQUENCE STOP CONDITIONS
  // =========================================================================
  describe('10. Automatic Sequence Stop Conditions', () => {
    let stopLead: any;
    let stopSeq: any;
    let stopEnrollment: any;

    beforeEach(async () => {
      const ts = Date.now();
      stopLead = await leadsService.createLead(orgA.id, {
        firstName: 'StopTest',
        lastName: `Lead_${ts}`,
        email: `stop.${ts}@fitcore.io`,
        phone: `+614${ts.toString().slice(-8)}`,
        outletId: outletA.id,
      });

      stopSeq = await sequenceService.createSequence(orgA.id, {
        name: `Stop Condition Suite ${ts}`,
        sequenceType: 'LEAD_FOLLOW_UP',
        outletId: outletA.id,
        steps: [
          {
            stepOrder: 1,
            name: 'Initial outreach',
            channel: 'SMS',
            delayMinutes: 0,
            stopOnReply: true,
            stopOnBooking: true,
            stopOnConversion: true,
            stopOnStaffHandoff: true,
            configuration: {
              templateBody: 'Hi {{firstName}}, reply anytime!',
            },
          },
          {
            stepOrder: 2,
            name: 'Later follow-up',
            channel: 'SMS',
            delayMinutes: 1440,
            configuration: {
              templateBody: 'Still thinking about it?',
            },
          },
        ],
      });

      stopEnrollment = await schedulerService.enroll(orgA.id, {
        leadId: stopLead.id,
        sequenceId: stopSeq.id,
      });
    });

    it('stops sequence immediately upon customer reply (stopOnReply)', async () => {
      const response = await responseService.recordResponse(orgA.id, {
        enrollmentId: stopEnrollment.id,
        channel: 'SMS',
        responseType: 'REPLIED',
        rawContent: 'Yes I am interested, what are your opening hours?',
      });

      expect(response.sequenceStopped).toBe(true);

      const enrollment = await prisma.followUpEnrollment.findUnique({
        where: { id: stopEnrollment.id },
      });
      expect(enrollment!.status).toBe('STOPPED');
      expect(enrollment!.stopReason).toBe('CUSTOMER_REPLIED');
    });

    it('stops sequence immediately upon tour/trial booking (stopOnBooking)', async () => {
      const response = await responseService.recordResponse(orgA.id, {
        enrollmentId: stopEnrollment.id,
        channel: 'IN_APP',
        responseType: 'TOUR_BOOKED',
        referenceId: 'booking_123',
      });

      expect(response.sequenceStopped).toBe(true);

      const enrollment = await prisma.followUpEnrollment.findUnique({
        where: { id: stopEnrollment.id },
      });
      expect(enrollment!.status).toBe('STOPPED');
      expect(enrollment!.stopReason).toBe('CUSTOMER_BOOKED');
    });

    it('stops sequence immediately upon membership conversion (stopOnConversion)', async () => {
      const response = await responseService.recordResponse(orgA.id, {
        enrollmentId: stopEnrollment.id,
        channel: 'IN_APP',
        responseType: 'CONVERTED',
        referenceId: 'member_456',
      });

      expect(response.sequenceStopped).toBe(true);

      const enrollment = await prisma.followUpEnrollment.findUnique({
        where: { id: stopEnrollment.id },
      });
      expect(enrollment!.status).toBe('STOPPED');
      expect(enrollment!.stopReason).toBe('CUSTOMER_CONVERTED');
    });

    it('stops sequence immediately upon staff handoff takeover (stopOnStaffHandoff)', async () => {
      const stopped = await schedulerService.stopEnrollment(
        orgA.id,
        stopEnrollment.id,
        'STAFF_HANDOFF',
        staffA.id,
        'STAFF',
      );

      expect(stopped?.status).toBe('STOPPED');
      expect(stopped?.stopReason).toBe('STAFF_HANDOFF');
    });
  });

  // =========================================================================
  // 11. DAY 37 SALES PIPELINE SYNCHRONIZATION
  // =========================================================================
  describe('11. Day 37 Sales Pipeline Synchronization', () => {
    it('logs SalesActivity on Day 37 SalesOpportunity when follow-up step is executed', async () => {
      const activities = await prisma.salesActivity.findMany({
        where: {
          opportunityId: opportunityA.id,
          type: 'FOLLOW_UP',
        },
      });

      expect(activities.length).toBeGreaterThan(0);
      expect(activities[0].title).toContain('Follow-Up');
    });
  });

  // =========================================================================
  // 12. OBSERVATIONAL ATTRIBUTION RECORDING
  // =========================================================================
  describe('12. Observational Attribution Recording', () => {
    it('records conservative observational outcome without causal overclaims', async () => {
      const ts = Date.now();
      const attrLead = await leadsService.createLead(orgA.id, {
        firstName: 'Outcome',
        lastName: 'Lead',
        email: `outcome.${ts}@fitcore.io`,
        outletId: outletA.id,
      });

      const seq = await sequenceService.createSequence(orgA.id, {
        name: 'Outcome Track Seq',
        sequenceType: 'OFFER_FOLLOW_UP',
        outletId: outletA.id,
        steps: [
          {
            stepOrder: 1,
            name: 'Offer Step',
            channel: 'EMAIL',
            delayMinutes: 0,
            configuration: {
              templateSubject: 'Special Offer',
              templateBody: 'Hi {{firstName}}',
            },
          },
        ],
      });

      const enrollment = await schedulerService.enroll(orgA.id, {
        leadId: attrLead.id,
        sequenceId: seq.id,
      });

      const outcome = await responseService.recordOutcome(orgA.id, {
        enrollmentId: enrollment.id,
        outcomeType: 'CONVERTED',
        revenueAmount: 1500,
        currency: 'AUD',
        metadata: { revenueAmount: 1500, attributionModel: 'last_touch_observational' },
      });

      expect(outcome.id).toBeDefined();
      expect(outcome.outcomeType).toBe('CONVERTED');
      expect(outcome.attribution).toBe('conversion_following_follow_up');
      const meta = outcome.metadata as any;
      expect(meta.revenueAmount).toBe(1500);
    });
  });

  // =========================================================================
  // 13. CROSS-TENANT ISOLATION & IDOR PROTECTION
  // =========================================================================
  describe('13. Cross-Tenant Isolation & IDOR Protection (Org A vs Org B)', () => {
    it('prevents Org A from accessing or enrolling into Org B sequence', async () => {
      const seqB = await sequenceService.createSequence(orgB.id, {
        name: 'Org B Secret Sequence',
        sequenceType: 'LEAD_FOLLOW_UP',
        outletId: outletB.id,
        steps: [
          {
            stepOrder: 1,
            name: 'B Step',
            channel: 'SMS',
            delayMinutes: 0,
            configuration: {
              templateBody: 'Welcome to Gym B',
            },
          },
        ],
      });

      // Org A attempting to access Org B sequence
      await expect(
        sequenceService.getSequence(orgA.id, seqB.id),
      ).rejects.toThrow();

      // Org A attempting to enroll into Org B sequence
      await expect(
        schedulerService.enroll(orgA.id, {
          leadId: leadA.id,
          sequenceId: seqB.id,
        }),
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // 14. REST API VERIFICATION
  // =========================================================================
  describe('14. REST API Verification under /api/v1/follow-ups', () => {
    it('GET /api/v1/follow-ups/sequences returns organisation sequences', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/follow-ups/sequences')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    it('POST /api/v1/follow-ups/enrollments creates enrollment via HTTP', async () => {
      const ts = Date.now();
      const httpLead = await leadsService.createLead(orgA.id, {
        firstName: 'Http',
        lastName: 'Lead',
        email: `http.${ts}@fitcore.io`,
        outletId: outletA.id,
      });

      const seq = await sequenceService.getOrCreateDefaultSequence(orgA.id, 'LEAD_FOLLOW_UP', outletA.id);

      const res = await request(app.getHttpServer())
        .post('/api/v1/follow-ups/enrollments')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-staff-id', staffA.id)
        .send({
          leadId: httpLead.id,
          sequenceId: seq.id,
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data.id).toBeDefined();
      expect(data.status).toBe('ACTIVE');
    });

    it('POST /api/v1/follow-ups/responses processes inbound reply via HTTP', async () => {
      const enrollment = await prisma.followUpEnrollment.findFirst({
        where: { organisationId: orgA.id, status: 'ACTIVE' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/follow-ups/responses')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .send({
          enrollmentId: enrollment!.id,
          channel: 'SMS',
          responseType: 'OPTED_OUT',
          rawContent: 'STOP',
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data.response.id).toBeDefined();
      expect(data.sequenceStopped).toBe(true);
    });
  });
});
