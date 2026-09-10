/**
 * Day 36 — AI Sales Agent Foundation Comprehensive E2E Test Suite
 *
 * Validates:
 * 1. Sales Agent Profile Configuration & Styling (CONSULTATIVE, PROFESSIONAL, etc.)
 * 2. Sales Conversation Lifecycle & Lead Reuse (Reuses Day 33 Lead, no duplicate lead table)
 * 3. Intent Detection (MEMBERSHIP_INQUIRY, PRICING_INQUIRY, TRIAL_INQUIRY, HUMAN_REQUEST, etc.)
 * 4. Grounded Business Knowledge Retrieval & Zero Hallucination of Prices
 * 5. Structured Needs Discovery (Goals, Experience, Schedule, Readiness, Budget)
 * 6. Verified Membership Plan Recommendation with Supporting Factors & Limitations
 * 7. Transparent Plan Comparison Support
 * 8. Strict Discount Denial & Price Integrity Guardrails ("50% off" rejection)
 * 9. Medical Concern Safety Guardrail (No medical diagnosis -> safe referral & human escalation)
 * 10. Next Best Action Execution (Trial Pass & Facility Tour workflows)
 * 11. Human Staff Escalation (SalesHandoff & ReceptionistFollowUpTask creation)
 * 12. Sales to Receptionist Delegation for Operational Bookings
 * 13. Multi-Tenant Isolation & IDOR Protection (Org A vs Org B)
 * 14. Multilingual Communication (English & Nepali conversations)
 * 15. Staff Dashboard Metrics & Lead Detail Summary View
 * 16. Audit Logging & Security Guardrails
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, NotFoundException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { SalesAgentService } from '../src/ai/features/sales-agent/application/sales-agent.service';
import { SalesRecommendationService } from '../src/ai/features/sales-agent/application/sales-recommendation.service';
import { SalesHandoffService } from '../src/ai/features/sales-agent/application/sales-handoff.service';
import { SalesToolRegistry } from '../src/ai/features/sales-agent/tools/sales-tool-registry';
import { LeadsService } from '../src/leads/leads.service';

describe('Day 36: AI Sales Agent Foundation E2E Integration Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let salesService: SalesAgentService;
  let recommendationService: SalesRecommendationService;
  let handoffService: SalesHandoffService;
  let toolRegistry: SalesToolRegistry;
  let leadsService: LeadsService;

  // Test Organisations & Outlets
  let orgA: any;
  let orgB: any;
  let outletA: any;
  let outletB: any;

  // Test Staff & Plans
  let staffA: any;
  let planStrengthA: any;
  let planBasicA: any;
  let classTypeYogaA: any;
  let classTypeHIITA: any;
  let leadA: any;

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
    salesService = moduleFixture.get<SalesAgentService>(SalesAgentService);
    recommendationService = moduleFixture.get<SalesRecommendationService>(SalesRecommendationService);
    handoffService = moduleFixture.get<SalesHandoffService>(SalesHandoffService);
    toolRegistry = moduleFixture.get<SalesToolRegistry>(SalesToolRegistry);
    leadsService = moduleFixture.get<LeadsService>(LeadsService);

    const timestamp = Date.now();

    // 1. Setup Organisation A & B
    orgA = await prisma.organisation.create({
      data: {
        name: `FitCore Sales Org A ${timestamp}`,
        slug: `fitcore-sales-a-${timestamp}`,
        currency: 'AUD',
        country: 'Australia',
      },
    });

    orgB = await prisma.organisation.create({
      data: {
        name: `FitCore Sales Org B ${timestamp}`,
        slug: `fitcore-sales-b-${timestamp}`,
        currency: 'USD',
        country: 'United States',
      },
    });

    // 2. Setup Outlets
    outletA = await prisma.outlet.create({
      data: {
        organisationId: orgA.id,
        name: 'Sydney Olympic Park Hub',
        slug: `sydney-olympic-${timestamp}`,
        code: `SYD-${timestamp.toString().slice(-4)}`,
        address: '10 Olympic Boulevard',
        city: 'Sydney',
        state: 'NSW',
        postalCode: '2127',
      },
    });

    outletB = await prisma.outlet.create({
      data: {
        organisationId: orgB.id,
        name: 'New York Central',
        slug: `ny-central-${timestamp}`,
        code: `NYC-${timestamp.toString().slice(-4)}`,
        address: '500 5th Avenue',
        city: 'New York',
        state: 'NY',
        postalCode: '10018',
      },
    });

    // 3. Setup Staff in Org A
    const staffUser = await prisma.user.create({
      data: {
        email: `sales-staff-${timestamp}@fitcore.com`,
        firstName: 'Marcus',
        lastName: 'Aurelius',
        passwordHash: 'dummy_hash_for_test',
      },
    });

    staffA = await prisma.staffProfile.create({
      data: {
        userId: staffUser.id,
        organisationId: orgA.id,
        displayName: 'Marcus Aurelius',
        jobTitle: 'Senior Membership Specialist',
        employmentStatus: 'ACTIVE',
      },
    });

    // 4. Setup Membership Plans in Org A
    planStrengthA = await prisma.membershipPlan.create({
      data: {
        organisationId: orgA.id,
        name: 'Gold Strength & Class Access',
        code: `GOLD-STR-${timestamp}`,
        price: 69.0,
        currency: 'AUD',
        durationValue: 1,
        durationUnit: 'MONTH',
        membershipType: 'STANDARD',
        status: 'ACTIVE',
        isPublic: true,
        trialDuration: 1,
        entitlements: {
          create: [
            { type: 'GYM_ACCESS', name: 'Full Strength Area & Free Weights' },
            { type: 'GROUP_CLASSES', name: 'Unlimited Evening & Weekend Classes' },
          ],
        },
      },
    });

    planBasicA = await prisma.membershipPlan.create({
      data: {
        organisationId: orgA.id,
        name: 'Basic Gym Floor Only',
        code: `BASIC-FLR-${timestamp}`,
        price: 39.0,
        currency: 'AUD',
        durationValue: 1,
        durationUnit: 'MONTH',
        membershipType: 'STANDARD',
        status: 'ACTIVE',
        isPublic: true,
        trialDuration: 1,
        entitlements: {
          create: [
            { type: 'GYM_ACCESS', name: 'Gym Floor Off-Peak Access' },
          ],
        },
      },
    });

    // 5. Setup Classes in Org A
    classTypeYogaA = await prisma.classType.create({
      data: {
        organisationId: orgA.id,
        name: 'Evening Vinyasa Yoga',
        category: 'YOGA',
        durationMinutes: 45,
      },
    });

    classTypeHIITA = await prisma.classType.create({
      data: {
        organisationId: orgA.id,
        name: 'Functional Strength & HIIT',
        category: 'STRENGTH',
        durationMinutes: 50,
      },
    });

    // 6. Setup Lead in Org A using Day 33 master service
    leadA = await leadsService.createLead(orgA.id, {
      firstName: 'David',
      lastName: 'Goggins',
      email: `david.goggins.${timestamp}@example.com`,
      phone: '+61412345678',
      outletId: outletA.id,
      source: 'AI_RECEPTIONIST',
    });
  });

  afterAll(async () => {
    // Cleanup test data
    if (orgA?.id) {
      await prisma.salesHandoff.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.salesNextAction.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.salesRecommendation.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.salesConversationMessage.deleteMany({
        where: { conversation: { organisationId: orgA.id } },
      });
      await prisma.salesConversation.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.salesAgentProfile.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.receptionistFollowUpTask.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.leadActivity.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.leadQualificationProfile.deleteMany({ where: { lead: { organisationId: orgA.id } } });
      await prisma.lead.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.membershipEntitlement.deleteMany({
        where: { membershipPlan: { organisationId: orgA.id } },
      });
      await prisma.membershipPlan.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.classType.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.staffProfile.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.outlet.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.auditLog.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.organisation.delete({ where: { id: orgA.id } });
    }

    if (orgB?.id) {
      await prisma.outlet.deleteMany({ where: { organisationId: orgB.id } });
      await prisma.organisation.delete({ where: { id: orgB.id } });
    }

    await app.close();
  });

  // ==========================================================================
  // 1. Sales Agent Profile Configuration
  // ==========================================================================
  describe('1. Sales Agent Profile Configuration & Customization', () => {
    it('should retrieve default consultative profile when none exists', async () => {
      const profile = await salesService.getAgentProfile(orgA.id, outletA.id);

      expect(profile).toBeDefined();
      expect(profile.organisationId).toBe(orgA.id);
      expect(profile.salesStyle).toBe('CONSULTATIVE');
      expect(profile.tone).toBe('FRIENDLY');
      expect(profile.enabled).toBe(true);
      expect(profile.qualificationEnabled).toBe(true);
      expect(profile.recommendationEnabled).toBe(true);
    });

    it('should allow configuring custom style, greeting, and personality', async () => {
      const updated = await salesService.updateAgentProfile(orgA.id, outletA.id, {
        displayName: 'Sydney Olympic Fitness Advisor',
        salesStyle: 'PREMIUM',
        tone: 'PROFESSIONAL',
        defaultGreeting: 'Welcome to FitCore Sydney Olympic Park. How may I assist your training today?',
      });

      expect(updated.displayName).toBe('Sydney Olympic Fitness Advisor');
      expect(updated.salesStyle).toBe('PREMIUM');
      expect(updated.tone).toBe('PROFESSIONAL');
      expect(updated.defaultGreeting).toContain('Sydney Olympic Park');
    });
  });

  // ==========================================================================
  // 2. Sales Conversation Lifecycle & Lead Reuse
  // ==========================================================================
  describe('2. Sales Conversation Lifecycle & Lead Reuse', () => {
    it('should create sales conversation and attach existing lead without duplication', async () => {
      const conv = await salesService.createConversation(orgA.id, {
        outletId: outletA.id,
        leadId: leadA.id,
        channel: 'WEB',
      });

      expect(conv.id).toBeDefined();
      expect(conv.leadId).toBe(leadA.id);
      expect(conv.status).toBe('ACTIVE');
      expect(conv.channel).toBe('WEB');

      // Verify no duplicate lead was created
      const leadCount = await prisma.lead.count({
        where: { organisationId: orgA.id, email: leadA.email },
      });
      expect(leadCount).toBe(1);
    });

    it('should auto-create a lead when contact details are provided for a new prospect', async () => {
      const conv = await salesService.createConversation(orgA.id, {
        outletId: outletA.id,
        contactDetails: {
          firstName: 'Sarah',
          lastName: 'Connor',
          email: `sarah.connor.${Date.now()}@example.com`,
          phone: '+61498765432',
        },
        channel: 'WHATSAPP',
      });

      expect(conv.leadId).toBeDefined();
      const createdLead = await prisma.lead.findUnique({ where: { id: conv.leadId } });
      expect(createdLead?.firstName).toBe('Sarah');
      expect(createdLead?.lastName).toBe('Connor');
      expect(createdLead?.source).toBe('AI_RECEPTIONIST');
    });
  });

  // ==========================================================================
  // 3. End-to-End Scenario: Understand -> Qualify -> Recommend -> Next Step
  // ==========================================================================
  describe('3. End-to-End Consultative Sales Flow', () => {
    let conversationId: string;

    beforeAll(async () => {
      const conv = await salesService.createConversation(orgA.id, {
        outletId: outletA.id,
        leadId: leadA.id,
        channel: 'WEB',
      });
      conversationId = conv.id;
    });

    it('Scenario 101: Prospect expresses strength goal and evening schedule -> AI understands, qualifies, and recommends plan', async () => {
      const response = await salesService.processMessage(orgA.id, conversationId, {
        message: "Hi, I'm looking for a gym. I want to build strength and I'm available three evenings a week.",
      });

      // 1. Verifies intent understanding
      expect(response.intent).toBe('MEMBERSHIP_RECOMMENDATION');
      expect(response.confidence).toBeGreaterThan(0.9);

      // 2. Verifies needs discovered
      expect(response.discoveredContext?.goals).toContain('STRENGTH');
      expect(response.discoveredContext?.schedule?.frequency).toContain('3');
      expect(response.discoveredContext?.schedule?.preferredTime).toBe('EVENING');

      // 3. Verifies grounded recommendation using real plan data
      expect(response.recommendations.length).toBeGreaterThanOrEqual(1);
      const rec = response.recommendations[0];
      expect(rec.recommendationType).toBe('MEMBERSHIP_PLAN');
      expect(rec.recommendedPlanName).toContain('Gold Strength');
      expect(rec.supportingFactors.length).toBeGreaterThan(0);
      expect(rec.limitations.length).toBeGreaterThan(0);

      // 4. Verifies next best action is suggested
      expect(response.suggestedNextActions.length).toBeGreaterThanOrEqual(1);
      expect(
        response.suggestedNextActions.some(
          (a) => a.actionType === 'BOOK_TRIAL' || a.actionType === 'BOOK_TOUR',
        ),
      ).toBe(true);

      // 5. Verifies reply cites verified price and reasoning without hallucination
      expect(response.reply).toContain('$69');
      expect(response.reply.toLowerCase()).toContain('strength');
    });

    it('Scenario 102: Prospect asks to book a trial -> Next action executed and lead status updated', async () => {
      const trialResult = await toolRegistry.executeTool(orgA.id, 'requestTrial', {
        conversationId,
        leadId: leadA.id,
        outletId: outletA.id,
        preferredDate: new Date(Date.now() + 86400000).toISOString(),
        notes: 'Evening strength session trial pass',
      });

      expect(trialResult.success).toBe(true);
      expect(trialResult.data.trialReference).toMatch(/^TRL-/);
      expect(trialResult.data.status).toBe('CONFIRMED');

      // Verify Lead status updated in DB
      const updatedLead = await prisma.lead.findUnique({ where: { id: leadA.id } });
      expect(updatedLead?.status).toBe('TRIAL_INTEREST');

      // Verify NextAction record persisted
      const action = await prisma.salesNextAction.findFirst({
        where: { conversationId, actionType: 'BOOK_TRIAL' },
      });
      expect(action?.status).toBe('EXECUTED');
    });
  });

  // ==========================================================================
  // 4. Grounded Business Context & Plan Comparison
  // ==========================================================================
  describe('4. Grounded Business Knowledge & Plan Comparison', () => {
    it('should compare configured plans side-by-side with verified entitlements and limitations', async () => {
      const comparison = await recommendationService.comparePlans(orgA.id, [
        planStrengthA.id,
        planBasicA.id,
      ]);

      expect(comparison.count).toBe(2);
      const gold = comparison.comparison.find((p) => p.id === planStrengthA.id);
      const basic = comparison.comparison.find((p) => p.id === planBasicA.id);

      expect(gold?.price).toBe(69);
      expect(gold?.includedEntitlements).toContain('Unlimited Evening & Weekend Classes');
      expect(basic?.price).toBe(39);
      expect(basic?.includedEntitlements).toContain('Gym Floor Off-Peak Access');
    });

    it('should return verified organisation operating hours and policies without inventing anything', async () => {
      const info = await toolRegistry.executeTool(orgA.id, 'getBusinessInformation', {
        outletId: outletA.id,
      });

      expect(info.success).toBe(true);
      expect(info.data.currency).toBe('AUD');
      expect(info.data.facilities.length).toBeGreaterThan(0);
      expect(info.data.policies.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // 5. Strict Discount Rejection & Pricing Integrity Guardrail
  // ==========================================================================
  describe('5. Pricing Integrity & Discount Denial Guardrail', () => {
    let conversationId: string;

    beforeAll(async () => {
      const conv = await salesService.createConversation(orgA.id, {
        outletId: outletA.id,
        contactDetails: {
          firstName: 'Bobby',
          lastName: 'Bargain',
          email: 'bobby.bargain@example.com',
          phone: '+61400111222',
        },
      });
      conversationId = conv.id;
    });

    it('Scenario 103: Prospect demands 50% discount -> AI rejects unauthorized discount and maintains official pricing', async () => {
      const response = await salesService.processMessage(orgA.id, conversationId, {
        message: 'Can you give me 50% off the gold membership? I want a special cut price.',
      });

      // AI must NOT grant unauthorized discounts or promise lower rates
      expect(response.intent).toBe('PRICING_INQUIRY');
      expect(response.reply).toContain('do not offer unauthorized custom discounts');
      expect(response.reply).toContain('standardized according to official facility policies');
      expect(response.recommendations.length).toBe(0);

      // Verify no price reduction or custom coupon was generated in DB
      const discountsCount = await prisma.discount.count({
        where: { organisationId: orgA.id },
      });
      expect(discountsCount).toBe(0);
    });
  });

  // ==========================================================================
  // 6. Medical Concern Safety Guardrail
  // ==========================================================================
  describe('6. Medical Safety Guardrail & Clinical Non-Intervention', () => {
    let conversationId: string;
    let leadMedicalId: string;

    beforeAll(async () => {
      const conv = await salesService.createConversation(orgA.id, {
        outletId: outletA.id,
        contactDetails: {
          firstName: 'Ian',
          lastName: 'Injury',
          email: 'ian.injury@example.com',
          phone: '+61400333444',
        },
      });
      conversationId = conv.id;
      leadMedicalId = conv.leadId!;
    });

    it('Scenario 104: Prospect mentions acute chest pain and injury -> AI safely refuses diagnosis and triggers HIGH priority human escalation', async () => {
      const response = await salesService.processMessage(orgA.id, conversationId, {
        message: 'I have severe chest pain and a recurring hernia from lifting. Can your trainers fix this?',
      });

      // 1. Safety refusal
      expect(response.reply).toContain('Your health and safety are our top priority');
      expect(response.reply).toContain('consulting with a qualified healthcare professional');

      // 2. High priority handoff triggered
      expect(response.handoffRequired).toBe(true);
      expect(response.handoff?.reason).toBe('MEDICAL_CONCERN');
      expect(response.handoff?.priority).toBe('HIGH');

      // 3. Verifies follow-up task created in Day 35 workflow engine
      const task = await prisma.receptionistFollowUpTask.findFirst({
        where: { organisationId: orgA.id, leadId: leadMedicalId, priority: 'HIGH' },
      });
      expect(task).toBeDefined();
      expect(task?.notes).toContain('MEDICAL_CONCERN');
    });
  });

  // ==========================================================================
  // 7. Human Staff Escalation Workflow
  // ==========================================================================
  describe('7. Human Staff Escalation Workflow', () => {
    let conversationId: string;

    beforeAll(async () => {
      const conv = await salesService.createConversation(orgA.id, {
        outletId: outletA.id,
        contactDetails: {
          firstName: 'Hannah',
          lastName: 'Human',
          email: 'hannah.human@example.com',
          phone: '+61400555666',
        },
      });
      conversationId = conv.id;
    });

    it('Scenario 105: Prospect explicitly requests human staff -> AI initiates handoff and assigns staff specialist', async () => {
      const response = await salesService.processMessage(orgA.id, conversationId, {
        message: 'I would like to speak to a real person from your sales team.',
      });

      expect(response.intent).toBe('HUMAN_REQUEST');
      expect(response.handoffRequired).toBe(true);
      expect(response.handoff?.status).toBe('PENDING');

      // Assign staff member to the handoff
      const assigned = await handoffService.assignStaff(
        orgA.id,
        response.handoff!.id,
        staffA.id,
      );

      expect(assigned.status).toBe('ASSIGNED');
      expect(assigned.assignedStaffId).toBe(staffA.id);
      expect(assigned.assignedStaffName).toBe('Marcus Aurelius');

      // Resolve handoff
      const resolved = await handoffService.resolveHandoff(
        orgA.id,
        response.handoff!.id,
        'Spoke with David, scheduled tour for Saturday.',
      );
      expect(resolved.status).toBe('RESOLVED');
    });
  });

  // ==========================================================================
  // 8. Sales to Receptionist Delegation for Operational Booking
  // ==========================================================================
  describe('8. Sales to Receptionist Delegation for Operational Booking', () => {
    it('Scenario 106: Customer requests immediate class booking -> Sales Agent routes to receptionist booking engine', async () => {
      const conv = await salesService.createConversation(orgA.id, {
        outletId: outletA.id,
        contactDetails: {
          firstName: 'Clara',
          lastName: 'Oswald',
          email: 'clara.oswald@example.com',
          phone: '+61411223344',
        },
      });

      const response = await salesService.processMessage(orgA.id, conv.id, {
        message: 'Can I book a class tomorrow at 6 PM?',
      });

      expect(response.intent).toBe('BOOKING_INTEREST');
      expect(response.reply).toContain('booking service');
      expect(response.suggestedNextActions.some((a) => a.actionType === 'BOOK_CLASS')).toBe(true);

      // Execute delegation tool
      const routed = await toolRegistry.executeTool(orgA.id, 'handoffToReceptionist', {
        conversationId: conv.id,
        leadId: conv.leadId!,
        action: 'BOOK_CLASS',
        details: { preferredTime: '18:00', date: 'tomorrow' },
      });

      expect(routed.success).toBe(true);
      expect(routed.data.delegatedTo).toBe('RECEPTIONIST_BOOKING_ENGINE');
    });
  });

  // ==========================================================================
  // 9. Multilingual Support (English & Nepali)
  // ==========================================================================
  describe('9. Multilingual Support (English & Nepali)', () => {
    it('Scenario 107: Conversing in Nepali -> Responds accurately in Nepali with verified plan information', async () => {
      const conv = await salesService.createConversation(orgA.id, {
        outletId: outletA.id,
        contactDetails: {
          firstName: 'Aarav',
          lastName: 'Sharma',
          email: 'aarav.sharma@example.com',
          phone: '+9779812345678',
        },
        language: 'ne',
      });

      const response = await salesService.processMessage(orgA.id, conv.id, {
        message: 'नमस्ते! म जिम खोज्दै छु र मलाई शक्ति निर्माण गर्नु छ। म हप्ताको ३ दिन बेलुका आउन सक्छु।',
        language: 'ne',
      });

      expect(response.language).toBe('ne');
      expect(response.reply).toContain('नमस्ते');
      expect(response.reply).toContain('Gold Strength & Class Access');
      expect(response.reply).toContain('$69');
      expect(response.reply).toContain('परीक्षण पास वा क्लब टुर');
    });
  });

  // ==========================================================================
  // 10. Multi-Tenant Isolation & IDOR Defense
  // ==========================================================================
  describe('10. Multi-Tenant Isolation & IDOR Defense', () => {
    let conversationAId: string;

    beforeAll(async () => {
      const conv = await salesService.createConversation(orgA.id, {
        outletId: outletA.id,
        leadId: leadA.id,
      });
      conversationAId = conv.id;
    });

    it('Security 101: Org B cannot access Org A sales conversation', async () => {
      await expect(
        salesService.getConversation(orgB.id, conversationAId),
      ).rejects.toThrow(NotFoundException);
    });

    it('Security 102: Org B cannot process messages on Org A conversation', async () => {
      await expect(
        salesService.processMessage(orgB.id, conversationAId, {
          message: 'Sneaking into Org A conversation',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('Security 103: Tool Registry rejects cross-tenant tool execution', async () => {
      await expect(
        toolRegistry.executeTool(orgB.id, 'getMembershipPlanDetails', {
          planId: planStrengthA.id,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // 11. Staff Dashboard & Lead Summary View
  // ==========================================================================
  describe('11. Staff Sales Dashboard & Lead Summary View', () => {
    it('should aggregate sales dashboard metrics for staff overview', async () => {
      const dashboard = await salesService.getDashboardMetrics(orgA.id);

      expect(dashboard).toBeDefined();
      expect(dashboard.activeConversations).toBeGreaterThanOrEqual(1);
      expect(dashboard.trialRequests).toBeGreaterThanOrEqual(1);
      expect(dashboard.conversationsByStatus).toBeDefined();
    });

    it('should present unified staff lead view: Lead -> Summary -> Needs -> Qualification -> Plan -> Next Action', async () => {
      const summary = await salesService.getStaffLeadSummary(orgA.id, leadA.id);

      expect(summary.leadId).toBe(leadA.id);
      expect(summary.firstName).toBe('David');
      expect(summary.discoveredNeeds.goals).toContain('STRENGTH');
      expect(summary.discoveredNeeds.schedule?.preferredTime).toBe('EVENING');
      expect(summary.recommendedPlan?.name).toContain('Gold Strength');
      expect(summary.nextBestAction?.actionType).toBe('BOOK_TRIAL');
    });
  });

  // ==========================================================================
  // 12. Audit Logging
  // ==========================================================================
  describe('12. Audit Trail Verification', () => {
    it('should record comprehensive audit events for sales lifecycle', async () => {
      const auditLogs = await prisma.auditLog.findMany({
        where: { organisationId: orgA.id },
        select: { action: true, resource: true },
      });

      const actions = auditLogs.map((l) => l.action);
      expect(actions).toContain('SALES_CONVERSATION_STARTED');
      expect(actions).toContain('SALES_TRIAL_REQUESTED');
      expect(actions).toContain('SALES_HUMAN_HANDOFF_CREATED');
    });
  });
});
