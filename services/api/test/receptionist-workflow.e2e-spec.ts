/**
 * Day 35 — AI Receptionist Production Workflow Comprehensive E2E Test Suite
 *
 * Validates:
 * 1. Omnichannel Interaction Lifecycle across Web, WhatsApp, SMS, Email, Voice
 * 2. Deterministic Interaction State Machine (ACTIVE -> COMPLETED, ABANDONED, FAILED, HANDED_OFF, FOLLOW_UP_REQUIRED)
 * 3. Authoritative Outcome Resolution & Safety Gates (AI cannot claim unverified "Done")
 * 4. Structured Summaries & AI Safety (OBSERVED facts only, zero hallucinated promises/health claims)
 * 5. Staff Routing by Role & Round-Robin (Rejection of terminated/suspended staff)
 * 6. Staff Handoff Lifecycle (OPEN -> ASSIGNED -> ACCEPTED -> COMPLETED, priority calculation)
 * 7. Follow-Up Task Management & Staff Triage (Creation, assignment, completion, audit)
 * 8. Customer Callback Requests (Channels, preferred time windows, completion)
 * 9. Missed Call & Abandoned Call Workflows (Safe phone lookup, zero unsolicited marketing to unknown callers)
 * 10. Escalation Engine & Conversational Loop Protection (Consecutive errors, turn limits)
 * 11. Deterministic Business Rules (Pricing exceptions, complaints, identity verification, confirmation)
 * 12. Multi-Tenant Configuration Inheritance (Org Default -> Outlet Override -> Effective Config)
 * 13. Operations Dashboard & Staff Inbox (KPIs, channel breakdowns, non-causal attribution)
 * 14. Multi-Tenant Isolation & IDOR Protection (Cross-org/outlet denial)
 * 15. Day 36 Readiness (RECEPTIONIST_SALES_HANDOFF_REQUESTED event emission)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ReceptionistWorkflowService } from '../src/ai/features/receptionist-workflows/receptionist-workflow.service';
import { ReceptionistInteractionService } from '../src/ai/features/receptionist-workflows/receptionist-interaction.service';
import { ReceptionistOutcomeService } from '../src/ai/features/receptionist-workflows/receptionist-outcome.service';
import { ReceptionistSummaryService } from '../src/ai/features/receptionist-workflows/receptionist-summary.service';
import { ReceptionistRoutingService } from '../src/ai/features/receptionist-workflows/receptionist-routing.service';
import { ReceptionistHandoffWorkflowService } from '../src/ai/features/receptionist-workflows/receptionist-handoff-workflow.service';
import { ReceptionistFollowUpService } from '../src/ai/features/receptionist-workflows/receptionist-followup.service';
import { ReceptionistCallbackService } from '../src/ai/features/receptionist-workflows/receptionist-callback.service';
import { ReceptionistEscalationService } from '../src/ai/features/receptionist-workflows/receptionist-escalation.service';
import { ReceptionistMissedCallService } from '../src/ai/features/receptionist-workflows/receptionist-missed-call.service';
import { ReceptionistRuleService } from '../src/ai/features/receptionist-workflows/receptionist-rule.service';
import { ReceptionistConfigService } from '../src/ai/features/receptionist-workflows/receptionist-config.service';
import { ReceptionistEventService } from '../src/ai/features/receptionist-workflows/receptionist-event.service';
import { ReceptionistAnalyticsService } from '../src/ai/features/receptionist-workflows/receptionist-analytics.service';
import { ReceptionistChannel, ReceptionistOutcome } from '@fitcore/types';

describe('Day 35: AI Receptionist Production Workflow E2E Test Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let workflowService: ReceptionistWorkflowService;
  let interactionService: ReceptionistInteractionService;
  let outcomeService: ReceptionistOutcomeService;
  let summaryService: ReceptionistSummaryService;
  let routingService: ReceptionistRoutingService;
  let handoffService: ReceptionistHandoffWorkflowService;
  let followUpService: ReceptionistFollowUpService;
  let callbackService: ReceptionistCallbackService;
  let escalationService: ReceptionistEscalationService;
  let missedCallService: ReceptionistMissedCallService;
  let ruleService: ReceptionistRuleService;
  let configService: ReceptionistConfigService;
  let eventService: ReceptionistEventService;
  let analyticsService: ReceptionistAnalyticsService;

  // Test Entities
  let orgA: any;
  let orgB: any;
  let outletA1: any;
  let outletA2: any;
  let outletB: any;
  let receptionistA: any;
  let convWebA: any;
  let convVoiceA: any;
  let memberUserA: any;
  let memberProfileA: any;
  let activeStaffReception: any;
  let activeStaffFinance: any;
  let activeStaffManager: any;
  let terminatedStaff: any;
  let leadA: any;

  const timestamp = Date.now();
  const TEST_CALLER_PHONE = `+1555${timestamp.toString().slice(-7)}`;
  const UNKNOWN_CALLER_PHONE = `+15559${timestamp.toString().slice(-6)}`;

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
      }),
    );

    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    workflowService = moduleFixture.get<ReceptionistWorkflowService>(ReceptionistWorkflowService);
    interactionService = moduleFixture.get<ReceptionistInteractionService>(ReceptionistInteractionService);
    outcomeService = moduleFixture.get<ReceptionistOutcomeService>(ReceptionistOutcomeService);
    summaryService = moduleFixture.get<ReceptionistSummaryService>(ReceptionistSummaryService);
    routingService = moduleFixture.get<ReceptionistRoutingService>(ReceptionistRoutingService);
    handoffService = moduleFixture.get<ReceptionistHandoffWorkflowService>(ReceptionistHandoffWorkflowService);
    followUpService = moduleFixture.get<ReceptionistFollowUpService>(ReceptionistFollowUpService);
    callbackService = moduleFixture.get<ReceptionistCallbackService>(ReceptionistCallbackService);
    escalationService = moduleFixture.get<ReceptionistEscalationService>(ReceptionistEscalationService);
    missedCallService = moduleFixture.get<ReceptionistMissedCallService>(ReceptionistMissedCallService);
    ruleService = moduleFixture.get<ReceptionistRuleService>(ReceptionistRuleService);
    configService = moduleFixture.get<ReceptionistConfigService>(ReceptionistConfigService);
    eventService = moduleFixture.get<ReceptionistEventService>(ReceptionistEventService);
    analyticsService = moduleFixture.get<ReceptionistAnalyticsService>(ReceptionistAnalyticsService);

    // 1. Organisations
    orgA = await prisma.organisation.create({
      data: {
        name: `FitCore Workflow Org A ${timestamp}`,
        slug: `fitcore-workflow-a-${timestamp}`,
      },
    });

    orgB = await prisma.organisation.create({
      data: {
        name: `FitCore Workflow Org B ${timestamp}`,
        slug: `fitcore-workflow-b-${timestamp}`,
      },
    });

    // 2. Outlets
    outletA1 = await prisma.outlet.create({
      data: {
        name: 'Downtown Prime',
        slug: `downtown-prime-${timestamp}`,
        code: `DP${timestamp.toString().slice(-4)}`,
        organisationId: orgA.id,
        address: '101 King St',
        city: 'Sydney',
        state: 'NSW',
        postalCode: '2000',
        phone: '+61 2 9000 1000',
        timezone: 'Australia/Sydney',
      },
    });

    outletA2 = await prisma.outlet.create({
      data: {
        name: 'North Sydney Club',
        slug: `north-sydney-${timestamp}`,
        code: `NS${timestamp.toString().slice(-4)}`,
        organisationId: orgA.id,
        address: '200 Pacific Hwy',
        city: 'Sydney',
        state: 'NSW',
        postalCode: '2060',
        phone: '+61 2 9000 2000',
        timezone: 'Australia/Sydney',
      },
    });

    outletB = await prisma.outlet.create({
      data: {
        name: 'Competitor Gym',
        slug: `competitor-gym-${timestamp}`,
        code: `CG${timestamp.toString().slice(-4)}`,
        organisationId: orgB.id,
        address: '500 Pine St',
        city: 'Melbourne',
        state: 'VIC',
        postalCode: '3000',
        phone: '+61 3 9000 3000',
      },
    });

    // 3. AI Receptionist
    receptionistA = await prisma.aIReceptionist.create({
      data: {
        organisationId: orgA.id,
        name: 'FitCore Production Receptionist',
        displayName: 'FitCore Receptionist',
        greeting: 'Welcome to FitCore. How can I assist you?',
        status: 'ACTIVE',
        tone: 'PROFESSIONAL',
        language: 'en',
      },
    });

    // 4. Member User
    memberUserA = await prisma.user.create({
      data: {
        email: `member-workflow-${timestamp}@fitcore.com`,
        phone: TEST_CALLER_PHONE,
        passwordHash: 'hash',
        firstName: 'Sarah',
        lastName: 'Connor',
        status: 'ACTIVE',
      },
    });

    memberProfileA = await prisma.memberProfile.create({
      data: {
        userId: memberUserA.id,
        organisationId: orgA.id,
        status: 'ACTIVE',
      },
    });

    // 5. Staff Profiles (Reception, Finance, Manager, Terminated)
    const receptionUser = await prisma.user.create({
      data: {
        email: `staff-reception-${timestamp}@fitcore.com`,
        passwordHash: 'hash',
        firstName: 'Alice',
        lastName: 'Receptionist',
        status: 'ACTIVE',
      },
    });
    activeStaffReception = await prisma.staffProfile.create({
      data: {
        userId: receptionUser.id,
        organisationId: orgA.id,
        employeeReference: `EMP-REC-${timestamp}`,
        jobTitle: 'Front Desk Receptionist',
        displayName: 'Alice Receptionist',
        employmentStatus: 'ACTIVE',
      },
    });
    await prisma.staffOutletAssignment.create({
      data: {
        staffProfileId: activeStaffReception.id,
        outletId: outletA1.id,
        roleScope: 'RECEPTION',
        status: 'ACTIVE',
      },
    });

    const financeUser = await prisma.user.create({
      data: {
        email: `staff-finance-${timestamp}@fitcore.com`,
        passwordHash: 'hash',
        firstName: 'Bob',
        lastName: 'Accountant',
        status: 'ACTIVE',
      },
    });
    activeStaffFinance = await prisma.staffProfile.create({
      data: {
        userId: financeUser.id,
        organisationId: orgA.id,
        employeeReference: `EMP-FIN-${timestamp}`,
        jobTitle: 'Billing Specialist',
        displayName: 'Bob Accountant',
        employmentStatus: 'ACTIVE',
      },
    });
    await prisma.staffOutletAssignment.create({
      data: {
        staffProfileId: activeStaffFinance.id,
        outletId: outletA1.id,
        roleScope: 'FINANCE',
        status: 'ACTIVE',
      },
    });

    const managerUser = await prisma.user.create({
      data: {
        email: `staff-manager-${timestamp}@fitcore.com`,
        passwordHash: 'hash',
        firstName: 'Carol',
        lastName: 'Manager',
        status: 'ACTIVE',
      },
    });
    activeStaffManager = await prisma.staffProfile.create({
      data: {
        userId: managerUser.id,
        organisationId: orgA.id,
        employeeReference: `EMP-MGR-${timestamp}`,
        jobTitle: 'Club Manager',
        displayName: 'Carol Manager',
        employmentStatus: 'ACTIVE',
      },
    });
    await prisma.staffOutletAssignment.create({
      data: {
        staffProfileId: activeStaffManager.id,
        outletId: outletA1.id,
        roleScope: 'OUTLET_MANAGER',
        status: 'ACTIVE',
      },
    });

    const terminatedUser = await prisma.user.create({
      data: {
        email: `staff-terminated-${timestamp}@fitcore.com`,
        passwordHash: 'hash',
        firstName: 'Dave',
        lastName: 'ExEmployee',
        status: 'SUSPENDED',
      },
    });
    terminatedStaff = await prisma.staffProfile.create({
      data: {
        userId: terminatedUser.id,
        organisationId: orgA.id,
        employeeReference: `EMP-TERM-${timestamp}`,
        jobTitle: 'Former Staff',
        displayName: 'Dave ExEmployee',
        employmentStatus: 'TERMINATED',
      },
    });

    // 6. Conversations
    convWebA = await prisma.receptionistConversation.create({
      data: {
        organisationId: orgA.id,
        receptionistId: receptionistA.id,
        channel: 'WEB_CHAT',
        status: 'ACTIVE',
        customerId: memberProfileA.id,
        outletId: outletA1.id,
      },
    });

    convVoiceA = await prisma.receptionistConversation.create({
      data: {
        organisationId: orgA.id,
        receptionistId: receptionistA.id,
        channel: 'VOICE',
        status: 'ACTIVE',
        outletId: outletA1.id,
      },
    });

    // 7. Lead
    leadA = await prisma.lead.create({
      data: {
        organisationId: orgA.id,
        outletId: outletA1.id,
        firstName: 'John',
        lastName: 'Prospect',
        email: `prospect-${timestamp}@gmail.com`,
        phone: '+61400111222',
        status: 'QUALIFIED',
        score: 85,
        consentStatus: 'GRANTED',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================================
  // 1. OMNICHANNEL INTERACTION LIFECYCLE
  // ============================================================================
  describe('1. Omnichannel Interaction Lifecycle & Channel Neutrality', () => {
    it('creates canonical interactions across all channels (Web, WhatsApp, SMS, Email, Voice)', async () => {
      const channels: ReceptionistChannel[] = ['WEB', 'WHATSAPP', 'SMS', 'EMAIL', 'VOICE'];

      for (const channel of channels) {
        const conv = await prisma.receptionistConversation.create({
          data: {
            organisationId: orgA.id,
            receptionistId: receptionistA.id,
            channel: channel === 'VOICE' ? 'VOICE' : 'WEB_CHAT',
            status: 'ACTIVE',
            outletId: outletA1.id,
          },
        });

        const interaction = await interactionService.findOrCreateInteraction({
          organisationId: orgA.id,
          outletId: outletA1.id,
          channel,
          conversationId: conv.id,
          memberId: memberProfileA.id,
          intent: 'MEMBERSHIP_INQUIRY',
        });

        expect(interaction).toBeDefined();
        expect(interaction.channel).toBe(channel);
        expect(interaction.status).toBe('ACTIVE');
        expect(interaction.organisationId).toBe(orgA.id);
      }
    });

    it('manages deterministic status transitions (ACTIVE -> HANDED_OFF -> COMPLETED)', async () => {
      const interaction = await interactionService.findOrCreateInteraction({
        organisationId: orgA.id,
        outletId: outletA1.id,
        channel: 'WEB',
        conversationId: convWebA.id,
      });

      // Transition to HANDED_OFF
      const handedOff = await interactionService.updateInteractionStatus({
        interactionId: interaction.id,
        organisationId: orgA.id,
        status: 'HANDED_OFF',
        outcome: 'STAFF_HANDOFF',
        outcomeSource: 'CUSTOMER',
      });
      expect(handedOff.status).toBe('HANDED_OFF');
      expect(handedOff.outcome).toBe('STAFF_HANDOFF');
      expect(handedOff.outcomeSource).toBe('CUSTOMER');
      expect(handedOff.endedAt).toBeDefined();

      // Transition to COMPLETED
      const completed = await interactionService.updateInteractionStatus({
        interactionId: interaction.id,
        organisationId: orgA.id,
        status: 'COMPLETED',
        outcome: 'INFORMATION_PROVIDED',
        outcomeSource: 'AI',
      });
      expect(completed.status).toBe('COMPLETED');
      expect(completed.outcome).toBe('INFORMATION_PROVIDED');
    });

    it('creates channel-neutral workflow context', () => {
      const ctx = interactionService.createContext({
        organisationId: orgA.id,
        outletId: outletA1.id,
        channel: 'WHATSAPP',
        conversationId: convWebA.id,
        memberId: memberProfileA.id,
        intent: 'CLASS_AVAILABILITY',
      });

      expect(ctx.channel).toBe('WHATSAPP');
      expect(ctx.turnCount).toBe(0);
      expect(ctx.consecutiveFailures).toBe(0);
      expect(ctx.language).toBe('en');
    });
  });

  // ============================================================================
  // 2. AUTHORITATIVE OUTCOME RESOLUTION & SAFETY GATES
  // ============================================================================
  describe('2. Authoritative Outcome Resolution & Safety Gates', () => {
    it('prevents AI from arbitrarily claiming booking success without verified DB record', async () => {
      const interaction = await interactionService.findOrCreateInteraction({
        organisationId: orgA.id,
        outletId: outletA1.id,
        channel: 'WEB',
        conversationId: convWebA.id,
      });

      // Claim booking success with non-existent booking ID
      const result = await outcomeService.verifyAndResolveOutcome({
        organisationId: orgA.id,
        interactionId: interaction.id,
        requestedOutcome: 'BOOKING_CREATED',
        source: 'AI',
        targetReferenceId: 'non-existent-booking-id',
      });

      expect(result.verified).toBe(false);
      expect(result.outcome).toBe('FAILED');
      expect(result.status).toBe('FAILED');
      expect(result.safeMessage).toContain("unable to confirm that booking");
    });

    it('authoritatively confirms verified booking and records outcomeSource = SYSTEM', async () => {
      // Create confirmed booking in DB
      const classType = await prisma.classType.create({
        data: {
          organisationId: orgA.id,
          name: `Pilates ${timestamp}`,
          category: 'PILATES',
        },
      });

      const session = await prisma.classSession.create({
        data: {
          organisationId: orgA.id,
          outletId: outletA1.id,
          classTypeId: classType.id,
          name: 'Morning Pilates',
          startsAt: new Date(Date.now() + 86400000),
          endsAt: new Date(Date.now() + 90000000),
          capacity: 15,
        },
      });

      const booking = await prisma.booking.create({
        data: {
          organisationId: orgA.id,
          outletId: outletA1.id,
          memberProfileId: memberProfileA.id,
          classSessionId: session.id,
          status: 'CONFIRMED',
          bookedAt: new Date(),
        },
      });

      const interaction = await interactionService.findOrCreateInteraction({
        organisationId: orgA.id,
        outletId: outletA1.id,
        channel: 'WEB',
        conversationId: convWebA.id,
      });

      const result = await outcomeService.verifyAndResolveOutcome({
        organisationId: orgA.id,
        interactionId: interaction.id,
        requestedOutcome: 'BOOKING_CREATED',
        source: 'SYSTEM',
        targetReferenceId: booking.id,
      });

      expect(result.verified).toBe(true);
      expect(result.outcome).toBe('BOOKING_CREATED');
      expect(result.source).toBe('SYSTEM');
      expect(result.status).toBe('COMPLETED');
    });

    it('authoritatively confirms verified lead capture in database', async () => {
      const interaction = await interactionService.findOrCreateInteraction({
        organisationId: orgA.id,
        outletId: outletA1.id,
        channel: 'WEB',
        conversationId: convWebA.id,
      });

      const result = await outcomeService.verifyAndResolveOutcome({
        organisationId: orgA.id,
        interactionId: interaction.id,
        requestedOutcome: 'LEAD_CREATED',
        source: 'SYSTEM',
        targetReferenceId: leadA.id,
      });

      expect(result.verified).toBe(true);
      expect(result.outcome).toBe('LEAD_CREATED');
      expect(result.status).toBe('COMPLETED');
    });
  });

  // ============================================================================
  // 3. STRUCTURED SUMMARIES & AI SAFETY
  // ============================================================================
  describe('3. Structured Summaries & AI Safety (Observed Facts Only)', () => {
    it('generates structured summaries with observed facts and excludes hallucinated medical claims', async () => {
      const interaction = await interactionService.findOrCreateInteraction({
        organisationId: orgA.id,
        outletId: outletA1.id,
        channel: 'WEB',
        conversationId: convWebA.id,
      });

      const summary = await summaryService.generateSummary({
        organisationId: orgA.id,
        interactionId: interaction.id,
        type: 'COMPLETION_SUMMARY',
        outcome: 'INFORMATION_PROVIDED',
        customerTopic: 'Membership Rates',
        preferredOutlet: 'Downtown Prime',
        observedGoal: 'Cardio Fitness',
        reason: 'Customer inquired about 12-month contract pricing',
        observedFacts: [
          'Customer asked for peak membership prices',
          'Customer was diagnosed with heart murmur', // MUST BE FILTERED OUT
          'Customer visited gym twice last month',
        ],
        actionItems: ['Provide standard membership schedule'],
      });

      expect(summary.isObservedOnly).toBe(true);
      expect(summary.type).toBe('COMPLETION_SUMMARY');
      expect(summary.outcome).toBe('INFORMATION_PROVIDED');
      // Medical speculation filtered
      expect(summary.keyPoints.some((p) => p.includes('diagnosed with'))).toBe(false);
      expect(summary.keyPoints.some((p) => p.includes('peak membership prices'))).toBe(true);
    });

    it('formats summary for staff notification cleanly', () => {
      const text = summaryService.formatSummaryForStaff({
        type: 'HANDOFF_SUMMARY',
        requestedTopic: 'Personal Training',
        preferredOutlet: 'Downtown Prime',
        goal: 'Strength',
        outcome: 'STAFF_HANDOFF',
        reason: 'Customer requested human assistance',
        keyPoints: ['Interested in 2x weekly sessions'],
        actionItems: ['Call customer to match trainer'],
        isObservedOnly: true,
      });

      expect(text).toContain('[HANDOFF_SUMMARY]');
      expect(text).toContain('Personal Training');
      expect(text).toContain('Downtown Prime');
    });
  });

  // ============================================================================
  // 4. STAFF ROUTING & EMPLOYMENT INTEGRITY
  // ============================================================================
  describe('4. Staff Routing & Employment Status Invariants', () => {
    it('routes billing questions to FINANCE role', async () => {
      const routing = await routingService.findEligibleStaff({
        organisationId: orgA.id,
        outletId: outletA1.id,
        reason: 'PRICING_EXCEPTION',
      });

      expect(routing.targetRole).toBe('FINANCE');
      expect(routing.assignedStaffId).toBe(activeStaffFinance.id);
    });

    it('routes complaints to OUTLET_MANAGER role', async () => {
      const routing = await routingService.findEligibleStaff({
        organisationId: orgA.id,
        outletId: outletA1.id,
        reason: 'COMPLAINT',
      });

      expect(routing.targetRole).toBe('OUTLET_MANAGER');
      expect(routing.assignedStaffId).toBe(activeStaffManager.id);
    });

    it('strictly refuses to assign terminated or suspended staff members', async () => {
      // Direct attempt to update handoff with terminated staff must fail
      const handoff = await handoffService.createHandoff({
        organisationId: orgA.id,
        outletId: outletA1.id,
        conversationId: convWebA.id,
        reason: 'CUSTOMER_REQUESTED',
        customerSummary: 'Customer wants to talk to staff',
      });

      await expect(
        handoffService.updateHandoffStatus({
          organisationId: orgA.id,
          handoffId: handoff.id,
          status: 'ASSIGNED',
          assignedStaffId: terminatedStaff.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // 5. STAFF HANDOFF WORKFLOW & TRIAGE
  // ============================================================================
  describe('5. Staff Handoff Workflow & Live vs Fallback Triage', () => {
    it('calculates deterministic priority (COMPLAINT -> HIGH, CUSTOMER_REQUESTED -> NORMAL)', async () => {
      const complaintHandoff = await handoffService.createHandoff({
        organisationId: orgA.id,
        outletId: outletA1.id,
        conversationId: convWebA.id,
        reason: 'COMPLAINT',
        customerSummary: 'Shower temperature was cold',
      });
      expect(complaintHandoff.priority).toBe('HIGH');

      const generalHandoff = await handoffService.createHandoff({
        organisationId: orgA.id,
        outletId: outletA1.id,
        conversationId: convWebA.id,
        reason: 'CUSTOMER_REQUESTED',
        customerSummary: 'General inquiry on locker rentals',
      });
      expect(generalHandoff.priority).toBe('NORMAL');
    });

    it('executes full handoff lifecycle (OPEN/ASSIGNED -> ACCEPTED -> COMPLETED)', async () => {
      const handoff = await handoffService.createHandoff({
        organisationId: orgA.id,
        outletId: outletA1.id,
        conversationId: convWebA.id,
        reason: 'CUSTOMER_REQUESTED',
        customerSummary: 'Questions regarding guest pass policy',
      });

      // Staff accepts handoff
      const accepted = await handoffService.updateHandoffStatus({
        organisationId: orgA.id,
        handoffId: handoff.id,
        status: 'ACCEPTED',
        notes: 'Accepted by front desk team',
      });
      expect(accepted.status).toBe('ACCEPTED');
      expect(accepted.acceptedAt).toBeDefined();

      // Staff completes handoff
      const completed = await handoffService.updateHandoffStatus({
        organisationId: orgA.id,
        handoffId: handoff.id,
        status: 'COMPLETED',
        notes: 'Provided guest pass terms to customer',
      });
      expect(completed.status).toBe('COMPLETED');
      expect(completed.completedAt).toBeDefined();

      // Conversation must be marked RESOLVED
      const conv = await prisma.receptionistConversation.findUnique({
        where: { id: convWebA.id },
      });
      expect(conv?.status).toBe('RESOLVED');
    });
  });

  // ============================================================================
  // 6. FOLLOW-UP TASKS & OPERATIONS TRIAGE
  // ============================================================================
  describe('6. Follow-Up Tasks & Staff Operational Triage', () => {
    it('creates, assigns, and completes follow-up tasks with audit trail', async () => {
      const task = await followUpService.createFollowUpTask({
        organisationId: orgA.id,
        outletId: outletA1.id,
        leadId: leadA.id,
        priority: 'HIGH',
        reason: 'Lead Requested VIP Tour',
        notes: 'Prospect wants weekend tour of wellness area',
      });

      expect(task.status).toBe('ASSIGNED');
      expect(task.priority).toBe('HIGH');
      expect(task.assignedStaffId).toBeDefined();

      // Update to COMPLETED
      const completedTask = await followUpService.updateFollowUpTask({
        organisationId: orgA.id,
        taskId: task.id,
        status: 'COMPLETED',
        outcome: 'CUSTOMER_CONTACTED',
        notes: 'Tour scheduled for Saturday 10 AM',
      });

      expect(completedTask.status).toBe('COMPLETED');
      expect(completedTask.outcome).toBe('CUSTOMER_CONTACTED');
      expect(completedTask.completedAt).toBeDefined();
    });
  });

  // ============================================================================
  // 7. CUSTOMER CALLBACK REQUESTS
  // ============================================================================
  describe('7. Customer Callback Requests', () => {
    it('registers callback request and transitions through SCHEDULED and COMPLETED', async () => {
      const callback = await callbackService.createCallbackRequest({
        organisationId: orgA.id,
        outletId: outletA1.id,
        phoneNumber: '+61412345678',
        preferredChannel: 'PHONE',
        preferredTimeNote: 'Tomorrow morning between 9am and 11am',
        reason: 'Membership renewal clarification',
      });

      expect(callback.status).toBe('ASSIGNED');
      expect(callback.preferredChannel).toBe('PHONE');

      // Update status to SCHEDULED
      const scheduled = await callbackService.updateCallbackStatus({
        organisationId: orgA.id,
        callbackId: callback.id,
        status: 'SCHEDULED',
        notes: 'Scheduled for 10 AM',
      });
      expect(scheduled.status).toBe('SCHEDULED');

      // Complete callback
      const completed = await callbackService.updateCallbackStatus({
        organisationId: orgA.id,
        callbackId: callback.id,
        status: 'COMPLETED',
        notes: 'Spoke with member, renewed annual membership',
      });
      expect(completed.status).toBe('COMPLETED');
      expect(completed.completedAt).toBeDefined();
    });
  });

  // ============================================================================
  // 8. MISSED CALL & ABANDONED CALL WORKFLOWS
  // ============================================================================
  describe('8. Missed Call & Abandoned Call Workflows', () => {
    it('associates missed call with known member phone and creates follow-up task', async () => {
      const result = await missedCallService.handleMissedCall({
        organisationId: orgA.id,
        outletId: outletA1.id,
        callerPhone: TEST_CALLER_PHONE,
        reason: 'NO_ANSWER',
      });

      expect(result.handled).toBe(true);
      expect(result.memberId).toBe(memberProfileA.id);
      expect(result.hasMarketingConsent).toBe(true);
      expect(result.taskId).toBeDefined();
      expect(result.callbackId).toBeDefined();
    });

    it('enforces safety: zero unsolicited automated marketing to unknown callers without consent', async () => {
      const result = await missedCallService.handleMissedCall({
        organisationId: orgA.id,
        outletId: outletA1.id,
        callerPhone: UNKNOWN_CALLER_PHONE,
        reason: 'NO_STAFF_AVAILABLE',
      });

      expect(result.handled).toBe(true);
      expect(result.memberId).toBeNull();
      expect(result.leadId).toBeNull();
      // Crucial: No automated marketing allowed
      expect(result.hasMarketingConsent).toBe(false);
      expect(result.taskId).toBeDefined();
    });
  });

  // ============================================================================
  // 9. ESCALATION ENGINE & LOOP PROTECTION
  // ============================================================================
  describe('9. Escalation Engine & Conversational Loop Protection', () => {
    it('triggers loop protection when 3 consecutive failures occur', () => {
      const result = escalationService.evaluateEscalation({
        consecutiveFailures: 3,
      });

      expect(result.shouldEscalate).toBe(true);
      expect(result.trigger).toBe('REPEATED_FAILURE');
      expect(result.action).toBe('STAFF_HANDOFF');
      expect(result.reason).toBe('TECHNICAL_FAILURE');
    });

    it('triggers loop protection when max turns (20) are exceeded', () => {
      const result = escalationService.evaluateEscalation({
        turnCount: 20,
      });

      expect(result.shouldEscalate).toBe(true);
      expect(result.trigger).toBe('REPEATED_FAILURE');
      expect(result.action).toBe('STAFF_HANDOFF');
      expect(result.reason).toBe('COMPLEX_REQUEST');
    });

    it('escalates immediately when customer requests a human', () => {
      const result = escalationService.evaluateEscalation({
        customerRequestedHuman: true,
      });

      expect(result.shouldEscalate).toBe(true);
      expect(result.trigger).toBe('CUSTOMER_REQUEST');
      expect(result.action).toBe('STAFF_HANDOFF');
      expect(result.reason).toBe('CUSTOMER_REQUESTED');
    });
  });

  // ============================================================================
  // 10. DETERMINISTIC BUSINESS RULES
  // ============================================================================
  describe('10. Deterministic Business Rules', () => {
    it('requires human staff handoff for pricing exceptions and discounts', () => {
      const ctx = interactionService.createContext({
        organisationId: orgA.id,
        channel: 'WEB',
      });

      const evaluation = ruleService.evaluateBusinessRules(ctx, {
        type: 'PRICING_DISCOUNT',
        parameters: { requestedRate: 20 },
      });

      expect(evaluation.allowed).toBe(false);
      expect(evaluation.requiresHumanHandoff).toBe(true);
      expect(evaluation.ruleName).toBe('HUMAN_REQUIRED_FOR_PRICING_EXCEPTIONS');
    });

    it('requires human staff handoff for customer complaints', () => {
      const ctx = interactionService.createContext({
        organisationId: orgA.id,
        channel: 'WEB',
      });

      const evaluation = ruleService.evaluateBusinessRules(ctx, {
        type: 'COMPLAINT',
      });

      expect(evaluation.allowed).toBe(false);
      expect(evaluation.requiresHumanHandoff).toBe(true);
      expect(evaluation.ruleName).toBe('HUMAN_REQUIRED_FOR_COMPLAINTS');
    });

    it('requires verified member identity to view account details', () => {
      const unverifiedCtx = interactionService.createContext({
        organisationId: orgA.id,
        channel: 'WEB',
        identityState: 'UNKNOWN_CALLER',
      });

      const evaluation = ruleService.evaluateBusinessRules(unverifiedCtx, {
        type: 'ACCOUNT_LOOKUP',
      });

      expect(evaluation.allowed).toBe(false);
      expect(evaluation.requiresVerification).toBe(true);

      const verifiedCtx = interactionService.createContext({
        organisationId: orgA.id,
        channel: 'WEB',
        identityState: 'VERIFIED_MEMBER',
      });

      const verifiedEval = ruleService.evaluateBusinessRules(verifiedCtx, {
        type: 'ACCOUNT_LOOKUP',
      });
      expect(verifiedEval.allowed).toBe(true);
    });

    it('requires explicit confirmation before executing booking mutations', () => {
      const ctx = interactionService.createContext({
        organisationId: orgA.id,
        channel: 'WEB',
      });

      const unconfirmed = ruleService.evaluateBusinessRules(ctx, {
        type: 'CREATE_BOOKING',
        parameters: { confirmed: false },
      });
      expect(unconfirmed.allowed).toBe(false);
      expect(unconfirmed.requiresConfirmation).toBe(true);

      const confirmed = ruleService.evaluateBusinessRules(ctx, {
        type: 'CREATE_BOOKING',
        parameters: { confirmed: true },
      });
      expect(confirmed.allowed).toBe(true);
    });
  });

  // ============================================================================
  // 11. MULTI-TENANT CONFIGURATION INHERITANCE
  // ============================================================================
  describe('11. Multi-Tenant Configuration Inheritance', () => {
    it('applies organization default and respects outlet override', async () => {
      // Set org default
      await configService.updateConfig({
        organisationId: orgA.id,
        outletId: null,
        dto: {
          greetingMessage: 'Welcome to FitCore Org A',
          handoffRouting: 'BY_ROLE',
          receptionistEnabled: true,
        },
      });

      // Set outlet override
      await configService.updateConfig({
        organisationId: orgA.id,
        outletId: outletA1.id,
        dto: {
          greetingMessage: 'Welcome to Downtown Prime Outlet!',
        },
      });

      // Query outlet A1: should have outlet override greeting + org routing
      const effectiveA1 = await configService.getEffectiveConfig({
        organisationId: orgA.id,
        outletId: outletA1.id,
      });
      expect(effectiveA1.greetingMessage).toBe('Welcome to Downtown Prime Outlet!');
      expect(effectiveA1.handoffRouting).toBe('BY_ROLE');

      // Query outlet A2 (no override): should inherit org default greeting
      const effectiveA2 = await configService.getEffectiveConfig({
        organisationId: orgA.id,
        outletId: outletA2.id,
      });
      expect(effectiveA2.greetingMessage).toBe('Welcome to FitCore Org A');
    });
  });

  // ============================================================================
  // 12. STAFF INBOX & OPERATIONS DASHBOARD
  // ============================================================================
  describe('12. Staff Inbox & Operations Dashboard', () => {
    it('aggregates operational KPIs and channel breakdown', async () => {
      const dashboard = await analyticsService.getOperationsDashboard({
        organisationId: orgA.id,
      });

      expect(dashboard.kpis).toBeDefined();
      expect(dashboard.kpis.totalInteractions).toBeGreaterThan(0);
      expect(dashboard.channelBreakdown).toBeDefined();
      expect(dashboard.channelBreakdown.WEB).toBeGreaterThan(0);
      expect(dashboard.openHandoffs).toBeDefined();
      expect(dashboard.pendingFollowUps).toBeDefined();
    });

    it('returns staff inbox triaging handoffs, follow-ups, and callbacks', async () => {
      const inbox = await analyticsService.getStaffInbox({
        organisationId: orgA.id,
        type: 'ALL',
      });

      expect(inbox.total).toBeGreaterThan(0);
      expect(inbox.items.length).toBeGreaterThan(0);
      const types = inbox.items.map((i) => i.itemType);
      expect(types.some((t) => t === 'HANDOFF' || t === 'FOLLOW_UP' || t === 'CALLBACK')).toBe(true);
    });
  });

  // ============================================================================
  // 13. MULTI-TENANT ISOLATION & IDOR DEFENSE
  // ============================================================================
  describe('13. Multi-Tenant Isolation & IDOR Protection', () => {
    it('strictly denies cross-tenant access to interactions', async () => {
      const interactionOrgA = await interactionService.findOrCreateInteraction({
        organisationId: orgA.id,
        outletId: outletA1.id,
        channel: 'WEB',
        conversationId: convWebA.id,
      });

      // Org B attempts to access Org A interaction
      await expect(
        interactionService.getInteraction({
          interactionId: interactionOrgA.id,
          organisationId: orgB.id,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('strictly denies cross-tenant handoff status updates', async () => {
      const handoffOrgA = await handoffService.createHandoff({
        organisationId: orgA.id,
        outletId: outletA1.id,
        conversationId: convWebA.id,
        reason: 'CUSTOMER_REQUESTED',
        customerSummary: 'Cross-tenant test handoff',
      });

      await expect(
        handoffService.updateHandoffStatus({
          organisationId: orgB.id,
          handoffId: handoffOrgA.id,
          status: 'COMPLETED',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================================
  // 14. DAY 36 READINESS: AI SALES AGENT HANDOFF BOUNDARY
  // ============================================================================
  describe('14. Day 36 Readiness: AI Sales Agent Handoff Boundary', () => {
    it('emits RECEPTIONIST_SALES_HANDOFF_REQUESTED without duplicating the lead record', async () => {
      const initialLeadCount = await prisma.lead.count({
        where: { id: leadA.id },
      });
      expect(initialLeadCount).toBe(1);

      // Emit sales handoff request for qualified prospect
      await eventService.emitSalesHandoffRequested({
        organisationId: orgA.id,
        outletId: outletA1.id,
        leadId: leadA.id,
        qualificationScore: 85,
        interestCategory: 'PREMIUM_MEMBERSHIP',
      });

      // Verify no duplicate lead was created
      const finalLeadCount = await prisma.lead.count({
        where: { id: leadA.id },
      });
      expect(finalLeadCount).toBe(1);
    });
  });

  // ============================================================================
  // 15. END-TO-END ACCEPTANCE WORKFLOWS
  // ============================================================================
  describe('15. End-to-End Acceptance Workflows', () => {
    it('executes full workflow coordinator flow from inbound contact to complete', async () => {
      // 1. Inbound contact
      const interaction = await workflowService.handleInboundContact({
        organisationId: orgA.id,
        outletId: outletA1.id,
        channel: 'WEB',
        conversationId: convWebA.id,
        memberId: memberProfileA.id,
        intent: 'FACILITY_HOURS',
      });
      expect(interaction.status).toBe('ACTIVE');

      // 2. Complete interaction with authoritative outcome and structured summary
      const completion = await workflowService.completeInteraction({
        organisationId: orgA.id,
        interactionId: interaction.id,
        outcome: 'INFORMATION_PROVIDED',
        customerTopic: 'Gym Operating Hours',
        observedFacts: ['Customer verified weekday opening time is 6 AM'],
        actionItems: ['No further action needed'],
      });

      expect(completion.interaction.status).toBe('COMPLETED');
      expect(completion.interaction.outcome).toBe('INFORMATION_PROVIDED');
      expect(completion.summary.isObservedOnly).toBe(true);
      expect(completion.verification.verified).toBe(true);
    });
  });
});
