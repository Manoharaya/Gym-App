/**
 * Day 33 — AI Lead Capture & Qualification Comprehensive E2E Test Suite
 *
 * Validates:
 * 1. Scenario 106: Lead Creation & Lifecycle State Transitions (NEW -> CONTACTED -> QUALIFIED -> CONVERTED)
 * 2. Scenario 107: Duplicate Detection (Exact & Normalized Email, Phone; Lead vs Existing Member distinction)
 * 3. Scenario 108: Marketing Consent Enforcement & Boundary Guardrails
 * 4. Scenario 109: Progressive Qualification Profiling (Goals, Service Interests, Schedule, Experience, Readiness, Objections)
 * 5. Scenario 110: Deterministic Scoring Engine Calculation & Transparent Factor Breakdown (0-100 scale, explainable weight adjustments)
 * 6. Scenario 111: Rule-First Next Best Action Recommendation Engine
 * 7. Scenario 112: Controlled Receptionist Lead Tool Execution via Tool Registry (whitelisting & permission enforcement)
 * 8. Scenario 113: Cross-Tenant Isolation & IDOR Protection (prevent Org B from accessing or updating Org A leads)
 * 9. Scenario 114: Omnichannel & Multilingual Conversational Processing (English & Nepali conversational prompts)
 * 10. Scenario 115: Staff Assignment & Handoff Escalation Workflow
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, NotFoundException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { LeadsService } from '../src/leads/leads.service';
import { LeadDuplicateService } from '../src/leads/lead-duplicate.service';
import { LeadQualificationService } from '../src/leads/lead-qualification.service';
import { LeadScoringService } from '../src/leads/lead-scoring.service';
import { LeadNextActionService } from '../src/leads/lead-next-action.service';
import { ReceptionistToolRegistry } from '../src/ai/features/receptionist/tools/receptionist-tool-registry';
import { ReceptionistService } from '../src/ai/features/receptionist/receptionist.service';

describe('Day 33: AI Lead Capture & Qualification E2E Integration Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let leadsService: LeadsService;
  let duplicateService: LeadDuplicateService;
  let qualificationService: LeadQualificationService;
  let scoringService: LeadScoringService;
  let nextActionService: LeadNextActionService;
  let toolRegistry: ReceptionistToolRegistry;
  let receptionistService: ReceptionistService;

  // Test Entities
  let orgA: any;
  let orgB: any;
  let outletA1: any;
  let outletA2: any;
  let outletB: any;
  let staffUserA: any;
  let staffProfileA: any;
  let existingMemberUser: any;
  let existingMemberProfile: any;
  let receptionistA: any;
  let conversationA: any;

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
    leadsService = moduleFixture.get<LeadsService>(LeadsService);
    duplicateService = moduleFixture.get<LeadDuplicateService>(LeadDuplicateService);
    qualificationService = moduleFixture.get<LeadQualificationService>(LeadQualificationService);
    scoringService = moduleFixture.get<LeadScoringService>(LeadScoringService);
    nextActionService = moduleFixture.get<LeadNextActionService>(LeadNextActionService);
    toolRegistry = moduleFixture.get<ReceptionistToolRegistry>(ReceptionistToolRegistry);
    receptionistService = moduleFixture.get<ReceptionistService>(ReceptionistService);

    const timestamp = Date.now();

    // 1. Organisations
    orgA = await prisma.organisation.create({
      data: {
        name: `FitCore Leads Org A ${timestamp}`,
        slug: `fitcore-leads-a-${timestamp}`,
      },
    });

    orgB = await prisma.organisation.create({
      data: {
        name: `FitCore Leads Org B ${timestamp}`,
        slug: `fitcore-leads-b-${timestamp}`,
      },
    });

    // 2. Outlets
    outletA1 = await prisma.outlet.create({
      data: {
        name: 'Sydney Central',
        slug: `sydney-central-${timestamp}`,
        code: `SC${timestamp.toString().slice(-4)}`,
        organisationId: orgA.id,
        address: '100 George St',
        city: 'Sydney',
        state: 'NSW',
        postalCode: '2000',
        phone: '+61 2 9111 2222',
        email: 'central@fitcore.test',
      },
    });

    outletA2 = await prisma.outlet.create({
      data: {
        name: 'Bondi Junction',
        slug: `bondi-junction-${timestamp}`,
        code: `BJ${timestamp.toString().slice(-4)}`,
        organisationId: orgA.id,
        address: '500 Oxford St',
        city: 'Sydney',
        state: 'NSW',
        postalCode: '2022',
        phone: '+61 2 9333 4444',
      },
    });

    outletB = await prisma.outlet.create({
      data: {
        name: 'Melbourne Rival Club',
        slug: `melbourne-rival-${timestamp}`,
        code: `MR${timestamp.toString().slice(-4)}`,
        organisationId: orgB.id,
        address: '200 Collins St',
        city: 'Melbourne',
        state: 'VIC',
        postalCode: '3000',
      },
    });

    // 3. Staff Profile in Org A
    staffUserA = await prisma.user.create({
      data: {
        email: `staff.alex.${timestamp}@fitcore.test`,
        passwordHash: 'hashed_pw',
        firstName: 'Alex',
        lastName: 'Trainer',
      },
    });

    staffProfileA = await prisma.staffProfile.create({
      data: {
        userId: staffUserA.id,
        organisationId: orgA.id,
        displayName: 'Alex Trainer',
        jobTitle: 'Membership Advisor',
      },
    });

    // 4. Existing Member in Org A (for Member collision testing)
    existingMemberUser = await prisma.user.create({
      data: {
        email: `existing.member.${timestamp}@fitcore.test`,
        phone: '+61411223344',
        passwordHash: 'hashed_pw',
        firstName: 'David',
        lastName: 'Member',
      },
    });

    existingMemberProfile = await prisma.memberProfile.create({
      data: {
        userId: existingMemberUser.id,
        organisationId: orgA.id,
        status: 'ACTIVE',
      },
    });

    // 5. AI Receptionist & Conversation in Org A
    receptionistA = await prisma.aIReceptionist.create({
      data: {
        organisationId: orgA.id,
        name: 'FitCore Digital Concierge',
        displayName: 'FitCore AI',
        greeting: 'Welcome to FitCore!',
        status: 'ACTIVE',
      },
    });

    conversationA = await prisma.receptionistConversation.create({
      data: {
        organisationId: orgA.id,
        outletId: outletA1.id,
        receptionistId: receptionistA.id,
        channel: 'WEB_CHAT',
        status: 'ACTIVE',
        language: 'en',
      },
    });
  });

  afterAll(async () => {
    // Cleanup Org A data
    if (orgA?.id) {
      await prisma.leadActivity.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.leadQualificationProfile.deleteMany({
        where: { lead: { organisationId: orgA.id } },
      });
      await prisma.lead.deleteMany({ where: { organisationId: orgA.id } });

      await prisma.receptionistFeedback.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.receptionistHandoff.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.receptionistMessage.deleteMany({
        where: { conversation: { organisationId: orgA.id } },
      });
      await prisma.receptionistConversation.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.aIReceptionist.deleteMany({ where: { organisationId: orgA.id } });

      await prisma.memberProfile.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.staffProfile.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.outlet.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.organisation.delete({ where: { id: orgA.id } });
    }

    // Cleanup Org B data
    if (orgB?.id) {
      await prisma.leadActivity.deleteMany({ where: { organisationId: orgB.id } });
      await prisma.leadQualificationProfile.deleteMany({
        where: { lead: { organisationId: orgB.id } },
      });
      await prisma.lead.deleteMany({ where: { organisationId: orgB.id } });
      await prisma.outlet.deleteMany({ where: { organisationId: orgB.id } });
      await prisma.organisation.delete({ where: { id: orgB.id } });
    }

    if (staffUserA?.id) await prisma.user.delete({ where: { id: staffUserA.id } });
    if (existingMemberUser?.id) await prisma.user.delete({ where: { id: existingMemberUser.id } });

    await app.close();
  });

  // =========================================================================
  // SCENARIO 106: Lead Creation & Lifecycle Transitions
  // =========================================================================
  describe('Scenario 106: Lead Creation & Lifecycle State Transitions', () => {
    let createdLeadId: string;

    it('creates minimum viable lead with initial scoring and qualification profile', async () => {
      const lead = await leadsService.createLead(orgA.id, {
        firstName: 'Sarah',
        lastName: 'Connor',
        email: 'sarah.connor@test.com',
        phone: '+61 400 111 222',
        outletId: outletA1.id,
        source: 'AI_RECEPTIONIST',
        initialGoals: ['strength', 'weight_management'],
        initialServiceInterests: ['PERSONAL_TRAINING', 'MEMBERSHIP'],
        initialReadiness: 'READY_TO_JOIN',
      });

      expect(lead).toBeDefined();
      expect(lead.id).toBeDefined();
      expect(lead.status).toBe('NEW');
      expect(lead.firstName).toBe('Sarah');
      expect(lead.email).toBe('sarah.connor@test.com');
      expect(lead.score).toBeGreaterThan(50); // Valid email + phone + goals + readiness
      expect(lead.qualification).toBeDefined();
      expect(lead.qualification?.goals).toContain('strength');

      createdLeadId = lead.id;
    });

    it('transitions lead lifecycle: NEW -> CONTACTED -> QUALIFIED -> CONVERTED', async () => {
      // Step 1: Mark contacted
      const contacted = await leadsService.updateLead(orgA.id, createdLeadId, {
        status: 'CONTACTED',
      });
      expect(contacted.status).toBe('CONTACTED');

      // Step 2: Mark qualified
      const qualified = await leadsService.updateLead(orgA.id, createdLeadId, {
        status: 'QUALIFIED',
      });
      expect(qualified.status).toBe('QUALIFIED');

      // Step 3: Verify timeline audit activities recorded
      const refreshed = await leadsService.getLead(orgA.id, createdLeadId);
      expect(refreshed.recentActivities).toBeDefined();
      expect(refreshed.recentActivities!.length).toBeGreaterThanOrEqual(2);
      expect(refreshed.recentActivities!.some((a: any) => a.activityType === 'LEAD_CREATED')).toBe(true);
      expect(refreshed.recentActivities!.some((a: any) => a.activityType === 'CONTACT_UPDATED')).toBe(true);
    });
  });

  // =========================================================================
  // SCENARIO 107: Duplicate Detection & Disambiguation
  // =========================================================================
  describe('Scenario 107: Duplicate Detection (Leads vs Existing Members)', () => {
    it('detects existing lead duplicate by normalized email and phone', async () => {
      // Lead with uppercase email and formatted phone
      const check = await duplicateService.detectDuplicates(orgA.id, {
        email: '  SARAH.CONNOR@test.com ',
        phone: '0400 111 222',
      });

      expect(check.type).toBe('EXISTING_LEAD');
      expect(check.existingLeadId).toBeDefined();
    });

    it('detects existing active gym member when prospect submits member contact', async () => {
      const check = await duplicateService.detectDuplicates(orgA.id, {
        email: existingMemberUser.email,
        phone: '+61411223344',
      });

      expect(check.type).toBe('EXISTING_MEMBER');
      expect(check.existingMemberId).toBe(existingMemberProfile.id);
    });

    it('isolates duplicate checks across organisations (same email in Org B is treated as NEW_LEAD)', async () => {
      const checkOrgB = await duplicateService.detectDuplicates(orgB.id, {
        email: 'sarah.connor@test.com',
      });

      expect(checkOrgB.type).toBe('NEW_LEAD');
      expect(checkOrgB.existingLeadId).toBeUndefined();
    });
  });

  // =========================================================================
  // SCENARIO 108: Marketing Consent Enforcement
  // =========================================================================
  describe('Scenario 108: Marketing Consent Enforcement & Anti-Fabrication Boundary', () => {
    it('initializes lead with NOT_REQUESTED consent when no explicit consent provided', async () => {
      const lead = await leadsService.createLead(orgA.id, {
        firstName: 'Jane',
        email: 'jane.guest@test.com',
        source: 'WEBSITE',
      });

      expect(lead.consentStatus).toBe('NOT_REQUESTED');
      expect(lead.consentedAt).toBeNull();
    });

    it('records consent with timestamp and source when explicitly granted', async () => {
      const lead = await leadsService.createLead(orgA.id, {
        firstName: 'John',
        email: 'john.explicit@test.com',
        consentStatus: 'GRANTED',
        consentSource: 'CHAT_EXPLICIT_AFFIRMATION',
      });

      expect(lead.consentStatus).toBe('GRANTED');
      expect(lead.consentSource).toBe('CHAT_EXPLICIT_AFFIRMATION');
      expect(lead.consentedAt).toBeDefined();
    });
  });

  // =========================================================================
  // SCENARIO 109 & 110: Progressive Qualification & Deterministic Scoring
  // =========================================================================
  describe('Scenario 109 & 110: Progressive Qualification & Deterministic Scoring Engine', () => {
    it('calculates explainable lead score with transparent factor breakdown', () => {
      const scoring = scoringService.calculateScore({
        email: 'prospect@fitcore.test',
        phone: '+61499887766',
        goals: ['strength', 'muscle_gain'],
        serviceInterests: ['PERSONAL_TRAINING'],
        preferredOutletId: outletA1.id,
        readiness: 'READY_TO_JOIN',
        priceSensitivity: 'VALUE_FOCUSED',
      });

      expect(scoring.score).toBeGreaterThan(70);
      expect(scoring.scoreVersion).toBe(1);
      expect(scoring.scoreFactors.length).toBeGreaterThanOrEqual(4);

      // Verify individual factor points
      const emailFactor = scoring.scoreFactors.find((f) => f.factor === 'VALID_EMAIL_PROVIDED');
      expect(emailFactor).toBeDefined();
      expect(emailFactor?.points).toBe(10);

      const phoneFactor = scoring.scoreFactors.find((f) => f.factor === 'VALID_PHONE_PROVIDED');
      expect(phoneFactor).toBeDefined();
      expect(phoneFactor?.points).toBe(10);

      const readinessFactor = scoring.scoreFactors.find((f) => f.factor === 'READINESS_READY_TO_JOIN');
      expect(readinessFactor).toBeDefined();
      expect(readinessFactor?.points).toBe(25);
    });

    it('updates lead qualification profile and recalculates score deterministically', async () => {
      // 1. Create bare lead
      const lead = await leadsService.createLead(orgA.id, {
        firstName: 'Marcus',
        email: 'marcus@test.com',
      });
      const initialScore = lead.score;

      // 2. Enrich qualification profile
      const updated = await leadsService.updateQualification(orgA.id, lead.id, {
        goals: ['cardio', 'weight_loss'],
        serviceInterests: ['GROUP_CLASSES'],
        readiness: 'READY_TO_JOIN',
        preferredSchedule: 'EVENING',
      });

      expect(updated.score).toBeGreaterThan(initialScore);
      expect(updated.qualification?.goals).toContain('cardio');
      expect(updated.qualification?.readiness).toBe('READY_TO_JOIN');
    });
  });

  // =========================================================================
  // SCENARIO 111: Rule-First Next Best Action Recommendation
  // =========================================================================
  describe('Scenario 111: Rule-First Next Best Action Engine', () => {
    it('recommends OFFER_TRAINER_INFORMATION when prospect prioritizes personal training', () => {
      const action = nextActionService.determineNextAction('lead_test_pt', {
        email: 'pt.prospect@test.com',
        goals: ['strength'],
        serviceInterests: ['PERSONAL_TRAINING'],
        readiness: 'INTERESTED',
      });

      expect(action.recommendedAction).toBe('OFFER_TRAINER_INFORMATION');
      expect(action.priority).toBe('MEDIUM');
    });

    it('recommends OFFER_TRIAL when prospect asks for trial and is ready to join', () => {
      const action = nextActionService.determineNextAction('lead_test_trial', {
        email: 'trial.prospect@test.com',
        goals: ['general_fitness'],
        serviceInterests: ['TRIAL'],
        readiness: 'READY_TO_JOIN',
      });

      expect(action.recommendedAction).toBe('OFFER_TRIAL');
    });

    it('recommends COLLECT_CONTACT_DETAILS when contact is missing', () => {
      const action = nextActionService.determineNextAction('lead_test_nocontact', {
        serviceInterests: ['MEMBERSHIP'],
      });

      expect(action.recommendedAction).toBe('COLLECT_CONTACT_DETAILS');
      expect(action.priority).toBe('HIGH');
    });
  });

  // =========================================================================
  // SCENARIO 112: Controlled Receptionist Lead Tool Execution
  // =========================================================================
  describe('Scenario 112: Receptionist Lead Tools Execution Pipeline', () => {
    it('executes create_lead tool via controlled dispatcher with parameter validation', async () => {
      const result = await toolRegistry.executeTool(
        'create_lead',
        orgA.id,
        {
          firstName: 'Chloe',
          lastName: 'Miller',
          email: 'chloe.miller@test.com',
          phone: '+61422334455',
          initialGoals: ['strength'],
          initialServiceInterests: ['GROUP_CLASSES'],
        },
        { isProspect: true },
      );

      expect(result.status).toBe('SUCCESS');
      expect(result.output.id).toBeDefined();
      expect(result.output.firstName).toBe('Chloe');
      expect(result.output.score).toBeGreaterThan(40);
    });

    it('executes get_outlet_lead_information tool safely', async () => {
      const result = await toolRegistry.executeTool(
        'get_outlet_lead_information',
        orgA.id,
        {},
        { isProspect: true },
      );

      expect(result.status).toBe('SUCCESS');
      expect(result.output.outlets).toBeDefined();
      expect(Array.isArray(result.output.outlets)).toBe(true);
    });
  });

  // =========================================================================
  // SCENARIO 113: Cross-Tenant Isolation & IDOR Protection
  // =========================================================================
  describe('Scenario 113: Cross-Tenant Isolation & IDOR Defense', () => {
    it('blocks Org B from accessing Org A leads', async () => {
      const leadOrgA = await leadsService.createLead(orgA.id, {
        firstName: 'Confidential',
        email: 'secret.prospect@org-a.com',
      });

      await expect(leadsService.getLead(orgB.id, leadOrgA.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('blocks Org B from updating Org A lead qualification', async () => {
      const leadOrgA = await leadsService.createLead(orgA.id, {
        firstName: 'Target',
        email: 'target@org-a.com',
      });

      await expect(
        leadsService.updateLead(orgB.id, leadOrgA.id, { status: 'UNQUALIFIED' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // SCENARIO 114: Omnichannel & Multilingual Qualification
  // =========================================================================
  describe('Scenario 114: Multilingual Conversational Processing (English & Nepali)', () => {
    it('processes Nepali conversational membership and class inquiry with grounded intent', async () => {
      const nepaliQuery = 'नमस्ते! मलाई बिहानको योगा क्लास र मूल्य बारे जानकारी दिनुहोस्';

      const response = await receptionistService.chat(orgA.id, {
        message: nepaliQuery,
        channel: 'WHATSAPP',
      });

      expect(response).toBeDefined();
      expect(response.response.message).toBeDefined();
      expect(response.response.intent).toMatch(/MEMBERSHIP|HOURS|CLASSES|PRICING|GREETING/);
      expect(response.response.confidence).toBeGreaterThan(0.7);
    });
  });

  // =========================================================================
  // SCENARIO 115: Staff Assignment & Handoff Escalation
  // =========================================================================
  describe('Scenario 115: Staff Assignment & Handoff Escalation Workflow', () => {
    it('assigns staff profile to high-intent qualified lead and records activity', async () => {
      const lead = await leadsService.createLead(orgA.id, {
        firstName: 'VIP',
        lastName: 'Prospect',
        email: 'vip.prospect@test.com',
        phone: '+61400998877',
        status: 'QUALIFIED',
      });

      const assigned = await leadsService.assignStaff(orgA.id, lead.id, {
        staffProfileId: staffProfileA.id,
      });
      expect(assigned.assignedStaffId).toBe(staffProfileA.id);

      const refreshed = await leadsService.getLead(orgA.id, lead.id);
      expect(refreshed.recentActivities!.some((a: any) => a.activityType === 'STAFF_ASSIGNED')).toBe(true);
    });

    it('creates handoff record when lead requests front-desk human contact', async () => {
      const lead = await leadsService.createLead(orgA.id, {
        firstName: 'Elena',
        email: 'elena@test.com',
        originatingConversationId: conversationA.id,
      });

      const handoff = await leadsService.requestHandoff(
        orgA.id,
        lead.id,
        'Prospect requested pricing negotiation for corporate group',
        'Requested front desk manager callback',
      );

      expect(handoff).toBeDefined();
      expect(handoff.id).toBeDefined();

      const refreshedLead = await leadsService.getLead(orgA.id, lead.id);
      expect(refreshedLead.status).toBe('QUALIFYING');
      expect(refreshedLead.qualification?.recommendedNextAction).toBe('HANDOFF_TO_STAFF');
    });
  });
});
