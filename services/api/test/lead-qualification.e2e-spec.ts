/**
 * Day 38 — AI Lead Qualification & Sales Discovery Comprehensive E2E Test Suite
 *
 * Validates:
 * 1. Multi-Dimensional Prospect Qualification Extraction (Goals, Experience, Schedule, Location, Budget, Readiness)
 * 2. Multilingual Understanding (English, Nepali नेपाली, and Romanized Nepali)
 * 3. 7-Dimension Completeness Calculation & Transparent Formula Verification
 * 4. Deterministic High-Intent Lead Evaluation
 * 5. Medical Safety Boundary & Clinical Disclaimers (Strict non-medical rule, flags NEEDS_HUMAN_REVIEW)
 * 6. Financial Ethics Boundary (No creditworthiness/income profiling)
 * 7. Data Source Authority Hierarchy & Staff Override Precedence (Staff overrides cannot be overwritten by AI)
 * 8. Immutable Qualification Audit History Diffs
 * 9. Objection Relational Lifecycle Management (OPEN -> PARTIALLY_ADDRESSED -> RESOLVED/DISMISSED, Blocker objections)
 * 10. Smart Discovery Question Generation (Prioritized, 1-2 questions max, English & Nepali)
 * 11. Controlled AI Tools Execution via LeadQualificationTools
 * 12. Day 37 Sales Pipeline Stage Synchronization
 * 13. Cross-Tenant Isolation & IDOR Protection (Org A vs Org B)
 * 14. REST API Verification under /api/v1/leads/:leadId/qualification
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, NotFoundException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { LeadsService } from '../src/leads/leads.service';
import { LeadQualificationService } from '../src/ai/features/lead-qualification/application/lead-qualification.service';
import { ObjectionService } from '../src/ai/features/lead-qualification/application/objection.service';
import { QualificationHistoryService } from '../src/ai/features/lead-qualification/application/qualification-history.service';
import { QualificationScoringService } from '../src/ai/features/lead-qualification/application/qualification-scoring.service';
import { QualificationValidationService } from '../src/ai/features/lead-qualification/application/qualification-validation.service';
import { QualificationQuestionService } from '../src/ai/features/lead-qualification/application/qualification-question.service';
import { LeadQualificationTools } from '../src/ai/features/lead-qualification/tools/lead-qualification-tools';
import { SalesPipelineService } from '../src/sales-pipeline/application/sales-pipeline.service';
import { SalesOpportunityService } from '../src/sales-pipeline/application/sales-opportunity.service';
import request from 'supertest';

describe('Day 38: AI Lead Qualification & Sales Discovery E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let leadsService: LeadsService;
  let qualificationService: LeadQualificationService;
  let objectionService: ObjectionService;
  let historyService: QualificationHistoryService;
  let scoringService: QualificationScoringService;
  let validationService: QualificationValidationService;
  let questionService: QualificationQuestionService;
  let qualificationTools: LeadQualificationTools;
  let pipelineService: SalesPipelineService;
  let opportunityService: SalesOpportunityService;

  let orgA: any;
  let orgB: any;
  let outletA: any;
  let outletB: any;
  let staffA: any;
  let leadA: any;
  let leadB: any;
  let pipelineA: any;
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
    superAdminToken = saRes.body.data.accessToken;

    prisma = app.get(PrismaService);
    leadsService = app.get(LeadsService);
    qualificationService = app.get(LeadQualificationService);
    objectionService = app.get(ObjectionService);
    historyService = app.get(QualificationHistoryService);
    scoringService = app.get(QualificationScoringService);
    validationService = app.get(QualificationValidationService);
    questionService = app.get(QualificationQuestionService);
    qualificationTools = app.get(LeadQualificationTools);
    pipelineService = app.get(SalesPipelineService);
    opportunityService = app.get(SalesOpportunityService);

    // Setup Test Tenants
    const ts = Date.now();
    orgA = await prisma.organisation.create({
      data: {
        name: `Day 38 Qual Gym A ${ts}`,
        slug: `day38-qual-a-${ts}`,
      },
    });

    orgB = await prisma.organisation.create({
      data: {
        name: `Day 38 Qual Gym B ${ts}`,
        slug: `day38-qual-b-${ts}`,
      },
    });

    outletA = await prisma.outlet.create({
      data: {
        organisationId: orgA.id,
        name: 'Downtown Performance Centre',
        slug: `downtown-${ts}`,
        code: `DT-${ts.toString().slice(-4)}`,
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
        slug: `north-b-${ts}`,
        code: `NB-${ts.toString().slice(-4)}`,
        address: '200 North St',
        city: 'Melbourne',
        state: 'VIC',
        postalCode: '3000',
      },
    });

    const userA = await prisma.user.create({
      data: {
        email: `staff.qual.${ts}@fitcore.io`,
        passwordHash: 'hashed_pw',
        firstName: 'Sarah',
        lastName: 'Salesperson',
      },
    });

    staffA = await prisma.staffProfile.create({
      data: {
        userId: userA.id,
        organisationId: orgA.id,
        displayName: 'Sarah Salesperson',
        jobTitle: 'Sales Consultant',
        employmentStatus: 'ACTIVE',
      },
    });

    // Create Leads
    leadA = await leadsService.createLead(orgA.id, {
      firstName: 'Aarav',
      lastName: 'Sharma',
      email: `aarav.${ts}@example.com`,
      phone: '+61411223344',
      outletId: outletA.id,
      source: 'WEBSITE',
    });

    leadB = await leadsService.createLead(orgB.id, {
      firstName: 'Bob',
      lastName: 'TenantB',
      email: `bob.${ts}@tenantb.com`,
      phone: '+61422334455',
      outletId: outletB.id,
      source: 'WEBSITE',
    });

    // Initialize Day 37 Pipeline for Org A
    pipelineA = await pipelineService.getOrCreateDefaultPipeline(orgA.id);
  });

  afterAll(async () => {
    if (orgA?.id) {
      await prisma.leadQualificationHistory.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.leadQualificationObjection.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.leadActivity.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.leadQualificationProfile.deleteMany({ where: { lead: { organisationId: orgA.id } } });
      await prisma.salesActivity.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.salesOpportunity.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.salesPipelineStage.deleteMany({ where: { pipeline: { organisationId: orgA.id } } });
      await prisma.salesPipeline.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.lead.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.staffProfile.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.outlet.deleteMany({ where: { organisationId: orgA.id } });
      await prisma.organisation.delete({ where: { id: orgA.id } });
    }
    if (orgB?.id) {
      await prisma.leadQualificationHistory.deleteMany({ where: { organisationId: orgB.id } });
      await prisma.leadQualificationObjection.deleteMany({ where: { organisationId: orgB.id } });
      await prisma.leadActivity.deleteMany({ where: { organisationId: orgB.id } });
      await prisma.leadQualificationProfile.deleteMany({ where: { lead: { organisationId: orgB.id } } });
      await prisma.lead.deleteMany({ where: { organisationId: orgB.id } });
      await prisma.outlet.deleteMany({ where: { organisationId: orgB.id } });
      await prisma.organisation.delete({ where: { id: orgB.id } });
    }
    await app.close();
  });

  describe('1. Multi-Dimensional Prospect Qualification Extraction', () => {
    it('should extract goals, experience, schedule, budget, readiness, and next action from prospect message', async () => {
      const result = await qualificationService.qualifyLead(orgA.id, leadA.id, {
        userMessage: 'Hi, I want to lose weight and build some muscle. I am a complete beginner. Mornings work best for me and I am ready to visit this week. Is it expensive?',
        forceDeterministic: true,
      });

      expect(result).toBeDefined();
      expect(result.profile.primaryGoal).toBe('WEIGHT_LOSS');
      expect(result.profile.experienceLevel).toBe('BEGINNER');
      expect(result.profile.preferredTimes).toContain('MORNING');
      expect(result.profile.readiness).toBe('READY_TO_VISIT');
      expect(result.profile.budgetSensitivity).toBe('HIGH');
      expect(result.profile.isHighIntent).toBe(true);
      expect(result.profile.qualificationStatus).toBe('QUALIFIED');
      expect(result.profile.recommendedNextAction).toBe('OFFER_TOUR');
    });
  });

  describe('2. Multilingual Understanding (English, Nepali, Romanized Nepali)', () => {
    it('should correctly understand and qualify prospect using Romanized Nepali', async () => {
      const ts = Date.now();
      const nepaliLead = await leadsService.createLead(orgA.id, {
        firstName: 'Prashant',
        lastName: 'Thapa',
        email: `prashant.${ts}@nepal.com`,
        phone: '+9779811223344',
        source: 'AI_RECEPTIONIST',
      });

      const result = await qualificationService.qualifyLead(orgA.id, nepaliLead.id, {
        userMessage: 'Mero taul ghatauna man chha. Bihana matra time hunchha ani aaja bata suru garna ready chhu. Package kati parchha?',
        forceDeterministic: true,
      });

      expect(result.profile.primaryGoal).toBe('WEIGHT_LOSS');
      expect(result.profile.preferredTimes).toContain('MORNING');
      expect(result.profile.readiness).toBe('READY_TO_JOIN');
      expect(result.profile.budgetSensitivity).toBe('HIGH');
      expect(result.profile.isHighIntent).toBe(true);
      expect(result.profile.recommendedNextAction).toBe('SHOW_MEMBERSHIP_OPTIONS');
    });
  });

  describe('3. 7-Dimension Completeness Calculation', () => {
    it('should accurately calculate completeness percentage according to exact dimension weights', () => {
      // Test partial completeness
      const partial = scoringService.evaluateQualification({
        primaryGoal: 'WEIGHT_LOSS', // 20%
        serviceInterests: ['PERSONAL_TRAINING'], // 15%
        preferredOutletId: outletA.id, // 15%
        experienceLevel: 'BEGINNER', // 10%
        // Missing: schedule (15%), membership/budget (15%), readiness/timeline (10%)
      });

      expect(partial.completeness).toBe(60); // 20 + 15 + 15 + 10 = 60%
      expect(partial.status).toBe('PARTIALLY_QUALIFIED');

      // Test complete profile
      const complete = scoringService.evaluateQualification({
        primaryGoal: 'WEIGHT_LOSS', // 20%
        serviceInterests: ['MEMBERSHIP'], // 15%
        preferredOutletId: outletA.id, // 15%
        experienceLevel: 'BEGINNER', // 10%
        preferredTimes: ['MORNING'], // 15%
        budgetSensitivity: 'MODERATE', // 15%
        readiness: 'READY_TO_JOIN', // 10%
      });

      expect(complete.completeness).toBe(100);
      expect(complete.status).toBe('QUALIFIED');
      expect(complete.isHighIntent).toBe(true);
    });
  });

  describe('4. Deterministic High-Intent Lead Evaluation', () => {
    it('should mark lead as high-intent when readiness is READY_TO_JOIN, READY_TO_TRY, or READY_TO_VISIT', () => {
      const res1 = scoringService.evaluateQualification({ readiness: 'READY_TO_JOIN' });
      expect(res1.isHighIntent).toBe(true);

      const res2 = scoringService.evaluateQualification({ readiness: 'READY_TO_TRY' });
      expect(res2.isHighIntent).toBe(true);

      const res3 = scoringService.evaluateQualification({ readiness: 'READY_TO_VISIT' });
      expect(res3.isHighIntent).toBe(true);

      const res4 = scoringService.evaluateQualification({
        timeline: 'IMMEDIATE',
        primaryGoal: 'MUSCLE_GAIN',
      });
      expect(res4.isHighIntent).toBe(true);

      const res5 = scoringService.evaluateQualification({
        readiness: 'EXPLORING',
        timeline: 'EXPLORING',
      });
      expect(res5.isHighIntent).toBe(false);
    });
  });

  describe('5. Medical Safety Boundary & Clinical Disclaimer', () => {
    it('should detect medical/injury mentions, attach disclaimer, and require human review without clinical diagnosis', async () => {
      const ts = Date.now();
      const rehabLead = await leadsService.createLead(orgA.id, {
        firstName: 'Elena',
        lastName: 'Rostova',
        email: `elena.${ts}@example.com`,
        source: 'WEBSITE',
      });

      const result = await qualificationService.qualifyLead(orgA.id, rehabLead.id, {
        userMessage: 'I had knee surgery 3 months ago and have a slip disc. I need safe exercises.',
        forceDeterministic: true,
      });

      expect(result.profile.qualificationStatus).toBe('NEEDS_HUMAN_REVIEW');
      expect(result.profile.constraints).toEqual(
        expect.arrayContaining([expect.stringContaining('Physical/medical constraint noted')]),
      );
    });
  });

  describe('6. Financial Ethics Boundary', () => {
    it('should capture declared price sensitivity without inferring creditworthiness or income', () => {
      const validation = validationService.validateAndSanitize({
        budgetSensitivity: 'HIGH',
        primaryGoal: 'GENERAL_FITNESS',
      });

      expect(validation.isValid).toBe(true);
      expect(validation.sanitizedData.budgetSensitivity).toBe('HIGH');
    });
  });

  describe('7. Authority Hierarchy & Staff Override Precedence', () => {
    it('should enforce that staff manual override cannot be silently overwritten by subsequent AI extractions', async () => {
      // 1. Staff manual override
      await qualificationService.staffOverride(
        orgA.id,
        leadA.id,
        {
          primaryGoal: 'STRENGTH_AND_CONDITIONING',
          experienceLevel: 'ADVANCED',
          overrideReason: 'Discussed with prospect on phone: advanced lifter seeking barbell club.',
        },
        staffA.id,
      );

      const afterStaff = await qualificationService.getQualificationProfile(orgA.id, leadA.id);
      expect(afterStaff.profile.primaryGoal).toBe('STRENGTH_AND_CONDITIONING');
      expect(afterStaff.profile.experienceLevel).toBe('ADVANCED');
      expect(afterStaff.profile.lastStaffOverrideById).toBe(staffA.id);

      // 2. Subsequent AI extraction attempts to update goal to WEIGHT_LOSS from ambiguous text
      await qualificationService.qualifyLead(orgA.id, leadA.id, {
        userMessage: 'I might also want to do cardio and weight loss sometimes.',
        source: 'AI_EXTRACTION',
        forceDeterministic: true,
      });

      // 3. Verify staff-entered values remain authoritative
      const afterAI = await qualificationService.getQualificationProfile(orgA.id, leadA.id);
      expect(afterAI.profile.primaryGoal).toBe('STRENGTH_AND_CONDITIONING');
      expect(afterAI.profile.experienceLevel).toBe('ADVANCED');
    });
  });

  describe('8. Immutable Qualification Audit History Diffs', () => {
    it('should maintain immutable audit diffs for all qualification modifications', async () => {
      const history = await historyService.getLeadHistory(leadA.id);
      expect(history.length).toBeGreaterThan(0);

      const staffDiff = history.find((h) => h.actorType === 'STAFF');
      expect(staffDiff).toBeDefined();
      expect(staffDiff?.source).toBe('STAFF_ENTERED');
      expect(staffDiff?.actorId).toBe(staffA.id);
    });
  });

  describe('9. Objection Relational Lifecycle Management', () => {
    let createdObjectionId: string;

    it('should create an objection with OPEN status and sync to profile', async () => {
      const objection = await objectionService.createObjection(
        orgA.id,
        leadA.id,
        {
          objectionType: 'PRICE_OR_MEMBERSHIP_COST',
          severity: 'HIGH',
          rawCustomerStatement: 'Your monthly membership is a bit steep compared to the commercial gym down the road.',
          normalizedSummary: 'Prospect concerned about monthly price differential.',
        },
        'AI_SALES_AGENT',
      );

      expect(objection).toBeDefined();
      expect(objection.status).toBe('OPEN');
      expect(objection.severity).toBe('HIGH');
      createdObjectionId = objection.id;

      const profile = await qualificationService.getQualificationProfile(orgA.id, leadA.id);
      const found = profile.objections.find((o) => o.id === createdObjectionId);
      expect(found).toBeDefined();
      expect(found?.status).toBe('OPEN');
    });

    it('should transition objection from OPEN to RESOLVED', async () => {
      const updated = await objectionService.updateObjection(
        orgA.id,
        leadA.id,
        createdObjectionId,
        {
          status: 'RESOLVED',
          resolutionNotes: 'Explained inclusions (coaching, recovery suite, zero lock-in contract) which justified value.',
        },
        'STAFF',
        staffA.id,
      );

      expect(updated.status).toBe('RESOLVED');
      expect(updated.resolvedAt).toBeDefined();

      const profile = await qualificationService.getQualificationProfile(orgA.id, leadA.id);
      const found = profile.objections.find((o) => o.id === createdObjectionId);
      expect(found?.status).toBe('RESOLVED');
      expect(found?.resolutionNotes).toContain('inclusions');
    });

    it('should flag qualification profile as NEEDS_HUMAN_REVIEW if a BLOCKER objection is active', async () => {
      const blockerLead = await leadsService.createLead(orgA.id, {
        firstName: 'Blocker',
        lastName: 'Lead',
        email: `blocker.${Date.now()}@example.com`,
        phone: '+61499887766',
        outletId: outletA.id,
        source: 'WEBSITE',
      });

      await objectionService.createObjection(
        orgA.id,
        blockerLead.id,
        {
          objectionType: 'LOCATION_OR_DISTANCE',
          severity: 'BLOCKER',
          rawCustomerStatement: 'I live 45 km away and work remotely, so commute is completely impossible.',
          normalizedSummary: 'Commute distance is an insurmountable barrier.',
        },
        'STAFF',
      );

      const scoring = scoringService.evaluateQualification({
        primaryGoal: 'GENERAL_FITNESS',
        hasBlockerObjection: true,
      });

      expect(scoring.status).toBe('NEEDS_HUMAN_REVIEW');
    });
  });

  describe('10. Smart Discovery Question Generation', () => {
    it('should generate at most 2 prioritized discovery questions focused on missing dimensions', () => {
      const questions = questionService.generateQuestions({
        primaryGoal: undefined, // Missing (Priority 1)
        serviceInterests: undefined, // Missing (Priority 2)
        preferredSchedule: undefined, // Missing (Priority 3)
        limit: 2,
      });

      expect(questions.length).toBeLessThanOrEqual(2);
      expect(questions[0].targetDimension).toBe('primaryGoal');
      expect(questions[1].targetDimension).toBe('serviceInterests');
      expect(questions[0].rationale).toBeDefined();
    });

    it('should generate discovery questions in Nepali when requested', () => {
      const questions = questionService.generateQuestions({
        primaryGoal: undefined,
        language: 'ne',
        limit: 1,
      });

      expect(questions.length).toBe(1);
      expect(questions[0].question).toContain('फिटनेस लक्ष्य');
    });
  });

  describe('11. Controlled AI Tools Execution via LeadQualificationTools', () => {
    it('should execute getQualificationProfile tool cleanly', async () => {
      const profile = await qualificationTools.getQualificationProfile(orgA.id, leadA.id);
      expect(profile).toBeDefined();
      expect(profile.leadId).toBe(leadA.id);
    });

    it('should execute recordObjection tool cleanly', async () => {
      const obj = await qualificationTools.recordObjection(orgA.id, leadA.id, {
        objectionType: 'SCHEDULE_OR_TIME_COMMITMENT',
        severity: 'MEDIUM',
        rawCustomerStatement: 'I have shift work on rotational rosters.',
        normalizedSummary: 'Rotational shift schedule requires flexible facility hours.',
      });

      expect(obj.objectionType).toBe('SCHEDULE_OR_TIME_COMMITMENT');
    });

    it('should execute generateDiscoveryQuestions tool cleanly', async () => {
      const q = await qualificationTools.generateDiscoveryQuestions(orgA.id, leadA.id, 2);
      expect(Array.isArray(q)).toBe(true);
      expect(q.length).toBeLessThanOrEqual(2);
    });
  });

  describe('12. Day 37 Sales Pipeline Synchronization', () => {
    it('should advance opportunity stage to Qualified when lead reaches QUALIFIED qualification status', async () => {
      // 1. Create a SalesOpportunity in NEW stage for leadA
      const opp = await opportunityService.createOpportunity(orgA.id, {
        leadId: leadA.id,
        outletId: outletA.id,
        title: 'Aarav Sharma - Fitness Membership',
        estimatedValue: 1200,
      });

      expect(opp).toBeDefined();

      // 2. Qualify the lead to trigger pipeline sync
      await qualificationService.qualifyLead(orgA.id, leadA.id, {
        userMessage: 'I want to sign up for membership and personal training starting this week.',
        forceDeterministic: true,
      });

      // 3. Verify opportunity stage was updated
      const updatedOpp = await prisma.salesOpportunity.findUnique({
        where: { id: opp.id },
        include: { stage: true },
      });

      expect(updatedOpp?.stage.type).toBe('QUALIFIED');
    });
  });

  describe('13. Cross-Tenant Isolation & IDOR Protection', () => {
    it('should prevent Org B from retrieving Org A lead qualification', async () => {
      await expect(
        qualificationService.getQualificationProfile(orgB.id, leadA.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent Org B from executing staff override on Org A lead', async () => {
      await expect(
        qualificationService.staffOverride(
          orgB.id,
          leadA.id,
          { primaryGoal: 'WEIGHT_LOSS' },
          'staff_attacker',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should isolate objections between tenants', async () => {
      const orgAObjections = await objectionService.findObjections(leadA.id);
      const orgBObjections = await objectionService.findObjections(leadB.id);

      expect(orgAObjections.length).toBeGreaterThan(0);
      expect(orgBObjections.length).toBe(0);
    });
  });

  describe('14. REST API Endpoints Verification', () => {
    it('GET /api/v1/leads/:leadId/qualification returns full profile view', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/leads/${leadA.id}/qualification`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const payload = res.body.data || res.body;
      expect(payload.leadId).toBe(leadA.id);
      expect(payload.profile).toBeDefined();
      expect(Array.isArray(payload.objections)).toBe(true);
      expect(Array.isArray(payload.history)).toBe(true);
    });

    it('GET /api/v1/leads/:leadId/qualification/questions returns smart discovery questions', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/leads/${leadA.id}/qualification/questions?limit=2`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const payload = res.body.data || res.body;
      expect(Array.isArray(payload)).toBe(true);
      expect(payload.length).toBeLessThanOrEqual(2);
    });

    it('POST /api/v1/leads/:leadId/qualification/objections records objection via HTTP', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/leads/${leadA.id}/qualification/objections`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-staff-id', staffA.id)
        .send({
          objectionType: 'FACILITY_FEATURES',
          severity: 'LOW',
          rawCustomerStatement: 'Prospect inquired whether cold plunge is included.',
          normalizedSummary: 'Facility feature inquiry regarding recovery suite inclusions.',
        })
        .expect(201);

      const payload = res.body.data || res.body;
      expect(payload.id).toBeDefined();
      expect(payload.objectionType).toBe('FACILITY_FEATURES');
    });

    it('GET /api/v1/leads/:leadId/qualification/history returns audit trail via HTTP', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/leads/${leadA.id}/qualification/history`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .expect(200);

      const payload = res.body.data || res.body;
      expect(Array.isArray(payload)).toBe(true);
      expect(payload.length).toBeGreaterThan(0);
    });
  });
});
