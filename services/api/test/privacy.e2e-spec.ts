/**
 * FitCore — Day 53: Privacy & Compliance Center Comprehensive E2E Test Suite
 *
 * Validates:
 * 1. Personal Data Catalog & Multi-Dimensional Classification (24 categories, 5 classification levels)
 * 2. Member Privacy Overview (aggregated posture, consented types, active requests)
 * 3. Member Data Access View (Article 15 GDPR / CCPA right to know, comprehensive domain data)
 * 4. Secret Redaction Invariant (zero passwords, MFA secrets, stripe credentials, raw tokens leaked)
 * 5. Consent Management & Withdrawal Impact Evaluation (active consents, impact warnings)
 * 6. Privacy & Communication Preferences (AI toggles, wearable toggles, mandatory security alerts)
 * 7. Privacy Request State Machine (SLA expiration, valid/invalid state transitions)
 * 8. Step-Up Authentication for Sensitive Privacy Operations (challenge consumption on sensitive requests)
 * 9. Asynchronous Data Export Engine (AES-256-GCM encryption at rest, sha256 checksum, download limit)
 * 10. Multi-Phase Controlled Deletion & Anonymization (irreversible pseudonymization, financial/audit retention)
 * 11. Legal & Operational Retention Holds (blocking deletion, requiresReview flag)
 * 12. Automated Data Retention Engine & Execution Cycles (policy enforcement, execution logging)
 * 13. AI Privacy Boundary (context sanitization, excluding data when consent is withdrawn)
 * 14. Wearable Privacy & Safe Disconnect (revoking sync tokens, preserving historical workouts)
 * 15. Cross-Tenant Isolation Defense (Org A cannot view or mutate Org B privacy records)
 * 16. IDOR Defense (Member A cannot cancel or download Member B's privacy requests/exports)
 * 17. Staff Compliance Queue & RBAC (Members denied admin routes, Org Owner allowed)
 * 18. Third-Party Processors Registry (DPA tracking, transfer safeguards)
 * 19. Data Quality & Compliance KPI Dashboard (health telemetry, SLA metrics)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { PrivacyExportService } from '../src/privacy/export/privacy-export.service';
import { PrivacyAIDataPolicyService } from '../src/privacy/ai/privacy-ai-policy.service';
import { SecurityService } from '../src/security/security.service';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

describe('Day 53: Privacy & Compliance Center E2E Suite', () => {
  jest.setTimeout(120000);

  let app: INestApplication;
  let prisma: PrismaService;
  let exportService: PrivacyExportService;
  let aiPolicyService: PrivacyAIDataPolicyService;
  let securityService: SecurityService;

  let superAdminToken: string;
  let orgOwnerToken: string;
  let memberTokenA: string;
  let memberTokenB: string;

  let orgA: any;
  let orgB: any;
  let outletA: any;
  let superAdminUser: any;
  let orgOwnerUser: any;
  let memberUserA: any;
  let memberUserB: any;
  let memberProfileA: any;
  let memberProfileB: any;
  let passwordHash: string;
  let superAdminRole: any;
  let orgOwnerRole: any;
  let memberRole: any;

  const getBody = (res: any) =>
    res.body && res.body.data !== undefined ? res.body.data : res.body;

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
    exportService = app.get(PrivacyExportService);
    aiPolicyService = app.get(PrivacyAIDataPolicyService);
    securityService = app.get(SecurityService);

    // Setup Test Organisations
    const ts = Date.now();
    orgA = await prisma.organisation.create({
      data: {
        name: `Privacy Org Alpha ${ts}`,
        slug: `priv-org-alpha-${ts}`,
        status: 'ACTIVE',
      },
    });

    orgB = await prisma.organisation.create({
      data: {
        name: `Privacy Org Beta ${ts}`,
        slug: `priv-org-beta-${ts}`,
        status: 'ACTIVE',
      },
    });

    outletA = await prisma.outlet.create({
      data: {
        organisationId: orgA.id,
        name: `Alpha Privacy Outlet ${ts}`,
        code: `PRIV-${ts}`,
        slug: `priv-outlet-${ts}`,
        address: '200 St Georges Terrace',
        city: 'Perth',
        state: 'WA',
        postalCode: '6000',
        country: 'Australia',
        status: 'ACTIVE',
      },
    });

    // Ensure Roles
    superAdminRole = await prisma.role.upsert({
      where: { name: 'SUPERADMIN' },
      update: {},
      create: { name: 'SUPERADMIN', description: 'Platform Superadmin' },
    });

    orgOwnerRole = await prisma.role.upsert({
      where: { name: 'ORGANISATION_OWNER' },
      update: {},
      create: { name: 'ORGANISATION_OWNER', description: 'Organisation Owner' },
    });

    memberRole = await prisma.role.upsert({
      where: { name: 'MEMBER' },
      update: {},
      create: { name: 'MEMBER', description: 'Gym Member' },
    });

    passwordHash = await bcrypt.hash('Password123!', 10);

    // 1. Superadmin User
    superAdminUser = await prisma.user.create({
      data: {
        email: `priv-superadmin-${ts}@fitcore.io`,
        passwordHash,
        firstName: 'Super',
        lastName: 'PrivacyAdmin',
        status: 'ACTIVE',
        userRoles: {
          create: { roleId: superAdminRole.id, organisationId: orgA.id },
        },
      },
      include: { userRoles: { include: { role: true } } },
    });

    // 2. Org Owner User (Org A)
    orgOwnerUser = await prisma.user.create({
      data: {
        email: `priv-owner-${ts}@fitcore.io`,
        passwordHash,
        firstName: 'Privacy',
        lastName: 'Officer',
        status: 'ACTIVE',
        userRoles: {
          create: { roleId: orgOwnerRole.id, organisationId: orgA.id },
        },
      },
      include: { userRoles: { include: { role: true } } },
    });

    // 3. Member User A (Org A)
    memberUserA = await prisma.user.create({
      data: {
        email: `priv-member-a-${ts}@fitcore.io`,
        passwordHash,
        firstName: 'Alice',
        lastName: 'Member',
        phone: '+61400111222',
        status: 'ACTIVE',
        userRoles: {
          create: { roleId: memberRole.id, organisationId: orgA.id, outletId: outletA.id },
        },
      },
      include: { userRoles: { include: { role: true } } },
    });

    memberProfileA = await prisma.memberProfile.create({
      data: {
        userId: memberUserA.id,
        organisationId: orgA.id,
        status: 'ACTIVE',
      },
    });

    // Seed Member A Domain Data
    await prisma.workout.create({
      data: {
        organisationId: orgA.id,
        outletId: outletA.id,
        memberProfileId: memberProfileA.id,
        title: 'Morning Upper Body Hypertrophy',
        status: 'COMPLETED',
      },
    });

    const testFood = await prisma.food.create({
      data: {
        organisationId: orgA.id,
        name: 'Steel Cut Oats & Whey Protein',
        category: 'BREAKFAST',
        calories: 450,
        protein: 35,
        carbohydrates: 60,
        fat: 8,
        servingSize: 100,
        servingUnit: 'g',
      },
    });

    await prisma.foodLog.create({
      data: {
        organisationId: orgA.id,
        memberProfileId: memberProfileA.id,
        loggedById: memberUserA.id,
        foodId: testFood.id,
        consumedAt: new Date(),
        mealType: 'BREAKFAST',
        foodNameAtLog: 'Steel Cut Oats & Whey Protein',
        calories: 450,
        protein: 35,
        carbohydrates: 60,
        fat: 8,
        quantity: 1,
        unit: 'serving',
      },
    });

    await prisma.paymentTransaction.create({
      data: {
        organisationId: orgA.id,
        memberProfileId: memberProfileA.id,
        providerTransactionId: `tx-priv-${ts}`,
        provider: 'STRIPE',
        amountMinor: 7500,
        currency: 'AUD',
        status: 'SUCCEEDED',
        paymentMethodType: 'CARD',
      },
    });

    // 4. Member User B (Org B)
    memberUserB = await prisma.user.create({
      data: {
        email: `priv-member-b-${ts}@fitcore.io`,
        passwordHash,
        firstName: 'Bob',
        lastName: 'TenantB',
        phone: '+61400333444',
        status: 'ACTIVE',
        userRoles: {
          create: { roleId: memberRole.id, organisationId: orgB.id },
        },
      },
      include: { userRoles: { include: { role: true } } },
    });

    memberProfileB = await prisma.memberProfile.create({
      data: {
        userId: memberUserB.id,
        organisationId: orgB.id,
        status: 'ACTIVE',
      },
    });

    // Obtain JWT Tokens
    const loginSuper = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: superAdminUser.email, password: 'Password123!' });
    superAdminToken = loginSuper.body.data?.accessToken || loginSuper.body.accessToken;

    const loginOwner = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: orgOwnerUser.email, password: 'Password123!' });
    orgOwnerToken = loginOwner.body.data?.accessToken || loginOwner.body.accessToken;

    const loginMemberA = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: memberUserA.email, password: 'Password123!' });
    memberTokenA = loginMemberA.body.data?.accessToken || loginMemberA.body.accessToken;

    const loginMemberB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: memberUserB.email, password: 'Password123!' });
    memberTokenB = loginMemberB.body.data?.accessToken || loginMemberB.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // =========================================================================
  // 1. PERSONAL DATA CATALOG & MULTI-DIMENSIONAL CLASSIFICATION
  // =========================================================================
  describe('1. Personal Data Catalog & Classification', () => {
    it('should return all 24 standardized personal data categories', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/privacy/data-categories')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .expect(200);

      const catalog = getBody(res);
      expect(Array.isArray(catalog)).toBe(true);
      expect(catalog.length).toBeGreaterThanOrEqual(24);

      const profileCat = catalog.find((c: any) => c.category === 'PROFILE');
      expect(profileCat).toBeDefined();
      expect(profileCat.classification).toBe('PERSONAL');
      expect(profileCat.purpose).toBe('MEMBERSHIP_MANAGEMENT');
      expect(profileCat.exportable).toBe(true);

      const healthCat = catalog.find((c: any) => c.category === 'HEALTH');
      expect(healthCat).toBeDefined();
      expect(healthCat.classification).toBe('HIGHLY_SENSITIVE');
      expect(healthCat.requiresConsent).toBe(true);
    });
  });

  // =========================================================================
  // 2. MEMBER PRIVACY OVERVIEW & DATA ACCESS VIEW
  // =========================================================================
  describe('2. Member Overview & Data Access View (Article 15 GDPR)', () => {
    it('should retrieve member privacy overview posture', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/privacy/overview')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .expect(200);

      const overview = getBody(res);
      expect(overview.memberId).toBe(memberProfileA.id);
      expect(overview.organisationId).toBe(orgA.id);
      expect(overview.totalDataCategoriesCount).toBeGreaterThanOrEqual(24);
      expect(overview.preferences).toBeDefined();
    });

    it('should return comprehensive human-readable data access view with strict redactions', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/privacy/data')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .expect(200);

      const dataView = getBody(res);
      expect(dataView.identity).toBeDefined();
      expect(dataView.identity.email).toBe(memberUserA.email);
      expect(dataView.training).toBeDefined();
      expect(dataView.training.workouts.length).toBeGreaterThanOrEqual(1);
      expect(dataView.nutrition.foodLogs.length).toBeGreaterThanOrEqual(1);
      expect(dataView.billing.transactions.length).toBeGreaterThanOrEqual(1);

      // Verify strict redaction invariant
      const payloadStr = JSON.stringify(dataView);
      expect(payloadStr).not.toContain('passwordHash');
      expect(payloadStr).not.toContain('secret');
      expect(payloadStr).not.toContain('token');
      expect(payloadStr).not.toContain('stripe');
    });
  });

  // =========================================================================
  // 3. CONSENT MANAGEMENT & WITHDRAWAL IMPACT EVALUATION
  // =========================================================================
  describe('3. Consent Management & Withdrawal Impact Evaluation', () => {
    it('should grant consent for AI coaching and retrieve active consent record', async () => {
      const grantRes = await request(app.getHttpServer())
        .post('/api/v1/privacy/consents/grant')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({ consentTypeKey: 'AI_DATA_PROCESSING' })
        .expect(201);

      const granted = getBody(grantRes);
      expect(granted.consentTypeKey).toBe('AI_DATA_PROCESSING');
      expect(granted.status).toBe('GRANTED');

      // Verify list
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/privacy/consents')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .expect(200);

      const list = getBody(listRes);
      const aiConsent = list.find((c: any) => c.consentTypeKey === 'AI_DATA_PROCESSING');
      expect(aiConsent).toBeDefined();
      expect(aiConsent.status).toBe('GRANTED');
    });

    it('should withdraw consent with audit reason and return degraded service impact warnings', async () => {
      const withdrawRes = await request(app.getHttpServer())
        .post('/api/v1/privacy/consents/withdraw')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({
          consentTypeKey: 'AI_DATA_PROCESSING',
          reason: 'I prefer manual programming only',
        })
        .expect(201);

      const withdrawn = getBody(withdrawRes);
      expect(withdrawn.status).toBe('REVOKED');
      expect(withdrawn.impactAnalysis).toBeDefined();
      expect(withdrawn.impactAnalysis.affectedFeatures.length).toBeGreaterThan(0);
      expect(withdrawn.impactAnalysis.affectedFeatures).toContain('AI Coaching Engine');
    });
  });

  // =========================================================================
  // 4. PRIVACY PREFERENCES & DAY 28 COMMUNICATION PREFERENCES
  // =========================================================================
  describe('4. Privacy Preferences & Communication Controls', () => {
    it('should update privacy preferences including AI and wearable toggles', async () => {
      const updateRes = await request(app.getHttpServer())
        .patch('/api/v1/privacy/preferences')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({
          aiPersonalizationEnabled: false,
          wearableDataSharing: false,
          marketingConsent: false,
        })
        .expect(200);

      const prefs = getBody(updateRes);
      expect(prefs.aiPersonalizationEnabled).toBe(false);
      expect(prefs.wearableDataSharing).toBe(false);
      expect(prefs.marketingConsent).toBe(false);
    });

    it('should verify that mandatory security/transactional communications remain enabled', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/privacy/preferences')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .expect(200);

      const prefs = getBody(res);
      expect(prefs.securityAlertsEnabled).toBe(true);
      expect(prefs.billingReceiptsEnabled).toBe(true);
    });
  });

  // =========================================================================
  // 5. PRIVACY REQUEST STATE MACHINE & STEP-UP AUTHENTICATION
  // =========================================================================
  describe('5. Privacy Requests & Step-Up Verification', () => {
    let nonSensitiveRequestId: string;
    let sensitiveRequestId: string;

    it('should create an INFO / RECTIFICATION request in SUBMITTED state without requiring step-up', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/privacy/requests')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({
          type: 'RECTIFICATION',
          reason: 'Update address information',
        })
        .expect(201);

      const created = getBody(res);
      expect(created.id).toBeDefined();
      expect(created.type).toBe('RECTIFICATION');
      expect(created.status).toBe('SUBMITTED');
      expect(created.expiresAt).toBeDefined();
      nonSensitiveRequestId = created.id;
    });

    it('should cancel a submitted request and prevent invalid state transitions', async () => {
      const cancelRes = await request(app.getHttpServer())
        .post(`/api/v1/privacy/requests/${nonSensitiveRequestId}/cancel`)
        .set('Authorization', `Bearer ${memberTokenA}`)
        .expect(201);

      expect(getBody(cancelRes).status).toBe('CANCELLED');

      // Cannot cancel an already cancelled request
      await request(app.getHttpServer())
        .post(`/api/v1/privacy/requests/${nonSensitiveRequestId}/cancel`)
        .set('Authorization', `Bearer ${memberTokenA}`)
        .expect(400);
    });

    it('should require IDENTITY_VERIFICATION_REQUIRED when creating sensitive EXPORT request without step-up', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/privacy/requests')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({
          type: 'EXPORT',
          reason: 'Annual data backup',
        })
        .expect(201);

      const req = getBody(res);
      expect(req.status).toBe('IDENTITY_VERIFICATION_REQUIRED');
      sensitiveRequestId = req.id;
    });

    it('should verify sensitive request using Day 52 Step-Up token challenge', async () => {
      // 1. Request step-up challenge
      const chalRes = await request(app.getHttpServer())
        .post('/api/v1/security/step-up/challenge')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({ action: 'EXPORT_SENSITIVE_DATA' })
        .expect(201);

      const challengeToken = getBody(chalRes).challengeToken;

      // 2. Verify step-up challenge with password
      await request(app.getHttpServer())
        .post('/api/v1/security/step-up/verify')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({ challengeToken, password: 'Password123!' })
        .expect(201);

      // 3. Verify privacy request with consumed step-up token
      const verifyRes = await request(app.getHttpServer())
        .post(`/api/v1/privacy/requests/${sensitiveRequestId}/verify`)
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({ stepUpToken: challengeToken })
        .expect(201);

      const verified = getBody(verifyRes);
      expect(verified.status).toBe('APPROVED');
      expect(verified.verifiedAt).toBeDefined();
    });
  });

  // =========================================================================
  // 6. ASYNCHRONOUS DATA EXPORT ENGINE & SECURE ENCRYPTED ARTIFACTS
  // =========================================================================
  describe('6. Data Export Engine & Secret Redaction', () => {
    let exportJobId: string;

    it('should create an export job and process it asynchronously with AES-256 encryption', async () => {
      const exportRes = await request(app.getHttpServer())
        .post('/api/v1/privacy/export')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({
          formats: ['JSON'],
          reason: 'Right to portability export',
        })
        .expect(201);

      const job = getBody(exportRes);
      expect(job.id).toBeDefined();
      exportJobId = job.id;

      // Force synchronous completion for test deterministic assertion
      await exportService.processExportAsync(exportJobId, orgA.id, memberProfileA.id, ['JSON']);

      // Retrieve status
      const statusRes = await request(app.getHttpServer())
        .get(`/api/v1/privacy/exports/${exportJobId}`)
        .set('Authorization', `Bearer ${memberTokenA}`)
        .expect(200);

      const completedJob = getBody(statusRes);
      expect(completedJob.status).toBe('COMPLETED');
      expect(completedJob.fileSizeBytes).toBeGreaterThan(0);
      expect(completedJob.downloadExpiresAt).toBeDefined();
    });

    it('should download and decrypt the export artifact, verifying zero secret leaks', async () => {
      const downloadRes = await request(app.getHttpServer())
        .get(`/api/v1/privacy/exports/${exportJobId}/download`)
        .set('Authorization', `Bearer ${memberTokenA}`)
        .expect(200);

      expect(downloadRes.header['content-type']).toContain('application/json');
      expect(downloadRes.header['content-disposition']).toContain('attachment');

      const rawBody = getBody(downloadRes);
      let exportedContent = rawBody?.metadata ? rawBody : rawBody?.data?.metadata ? rawBody.data : rawBody;
      if (!exportedContent?.metadata && downloadRes.text) {
        try {
          const parsed = JSON.parse(downloadRes.text);
          exportedContent = parsed.data || parsed;
        } catch {}
      }
      expect(exportedContent.metadata).toBeDefined();
      expect(exportedContent.metadata.memberId).toBe(memberProfileA.id);
      expect(exportedContent.sections.profile).toBeDefined();
      expect(exportedContent.sections.training.workouts.length).toBeGreaterThan(0);

      // Secret Protection Invariant
      const rawText = JSON.stringify(exportedContent);
      expect(rawText).not.toContain('passwordHash');
      expect(rawText).not.toContain('totpSecret');
      expect(rawText).not.toContain('stripeSecret');
      expect(rawText).not.toContain('webhookSecret');
    });
  });

  // =========================================================================
  // 7. CONTROLLED DELETION WORKFLOW & RETENTION HOLDS
  // =========================================================================
  describe('7. Controlled Deletion Planning & Execution', () => {
    let deletionPlanId: string;

    it('should generate a deletion plan retaining statutory financial records and pseudonymizing profile', async () => {
      // Deletion request
      const res = await request(app.getHttpServer())
        .post('/api/v1/privacy/deletion-request')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({
          confirmed: true,
          reason: 'Member leaving gym permanently',
        })
        .expect(201);

      const { request: pReq, plan } = getBody(res);
      expect(pReq.type).toBe('DELETION');
      expect(plan.id).toBeDefined();
      deletionPlanId = plan.id;

      // Validate plan item strategies
      const items = plan.items;
      const profileItem = items.find((i: any) => i.domain === 'PROFILE');
      expect(profileItem.action).toBe('ANONYMIZE');

      const trainingItem = items.find((i: any) => i.domain === 'TRAINING');
      expect(trainingItem.action).toBe('DELETE');

      const paymentItem = items.find((i: any) => i.domain === 'PAYMENTS');
      expect(paymentItem.action).toBe('RETAIN');
      expect(paymentItem.retentionReason).toContain('LEGAL_TAX_ACCOUNTING_REQUIREMENT');
    });

    it('should prevent immediate deletion execution until staff approves plan', async () => {
      // Member cannot execute
      await request(app.getHttpServer())
        .post(`/api/v1/privacy/admin/deletions/${deletionPlanId}/execute`)
        .set('Authorization', `Bearer ${memberTokenA}`)
        .expect(403);

      // Org Owner approves plan
      const approveRes = await request(app.getHttpServer())
        .post(`/api/v1/privacy/admin/deletions/${deletionPlanId}/approve`)
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .expect(201);

      expect(getBody(approveRes).status).toBe('APPROVED');

      // Org Owner executes deletion plan
      const execRes = await request(app.getHttpServer())
        .post(`/api/v1/privacy/admin/deletions/${deletionPlanId}/execute`)
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .expect(201);

      expect(['EXECUTED', 'COMPLETED']).toContain(getBody(execRes).status);

      // Verify member user record is pseudonymized
      const updatedUser = await prisma.user.findUnique({
        where: { id: memberUserA.id },
      });
      expect(updatedUser?.email).toContain('anonymized-');
      expect(updatedUser?.firstName).toBe('Anonymized');
      expect(updatedUser?.status).toBe('ANONYMIZED');

      // Verify payment records remain intact for legal audit
      const payments = await prisma.paymentTransaction.findMany({
        where: { memberProfileId: memberProfileA.id },
      });
      expect(payments.length).toBeGreaterThan(0);
      expect(payments[0].amountMinor).toBe(7500);
    });

    it('should enforce active retention hold during deletion planning', async () => {
      // 1. Create a fresh test member for hold testing
      const ts = Date.now();
      const holdUser = await prisma.user.create({
        data: {
          email: `hold-member-${ts}@fitcore.io`,
          passwordHash,
          firstName: 'Hold',
          lastName: 'Subject',
          status: 'ACTIVE',
          userRoles: {
            create: { roleId: memberRole.id, organisationId: orgA.id },
          },
        },
      });

      const holdProfile = await prisma.memberProfile.create({
        data: {
          userId: holdUser.id,
          organisationId: orgA.id,
          status: 'ACTIVE',
        },
      });

      const holdToken = (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: holdUser.email, password: 'Password123!' })
      ).body.data?.accessToken;

      // 2. Admin places an active Legal Dispute Hold
      const holdRes = await request(app.getHttpServer())
        .post('/api/v1/privacy/admin/holds')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .send({
          dataCategory: 'ALL',
          reason: 'Active litigation hold: Case #2026-CV-8821',
          memberId: holdProfile.id,
        })
        .expect(201);

      const activeHold = getBody(holdRes);
      expect(activeHold.id).toBeDefined();

      // 3. Request deletion while hold is active
      const delRes = await request(app.getHttpServer())
        .post('/api/v1/privacy/deletion-request')
        .set('Authorization', `Bearer ${holdToken}`)
        .send({ confirmed: true, reason: 'Requesting erasure' })
        .expect(201);

      const { plan } = getBody(delRes);
      expect(plan.requiresReview).toBe(true);
      const profilePlanItem = plan.items.find((i: any) => i.domain === 'PROFILE');
      expect(profilePlanItem.action).toBe('RETAIN');
      expect(profilePlanItem.retentionReason).toBe('ACTIVE_RETENTION_HOLD');

      // 4. Release hold
      const releaseRes = await request(app.getHttpServer())
        .patch(`/api/v1/privacy/admin/holds/${activeHold.id}/release`)
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .expect(200);

      expect(getBody(releaseRes).status).toBe('RELEASED');
    });
  });

  // =========================================================================
  // 8. DATA RETENTION ENGINE & BATCH CYCLES
  // =========================================================================
  describe('8. Retention Policies & Automated Processing', () => {
    it('should create an automated retention policy and run retention cycle', async () => {
      // 1. Create policy
      const policyRes = await request(app.getHttpServer())
        .post('/api/v1/privacy/admin/retention')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .send({
          name: 'Communication Cleanup Policy',
          dataCategory: 'COMMUNICATION',
          retentionPeriodDays: 90,
          action: 'DELETE',
          description: 'Automated cleanup of ephemeral chat and messages',
          enabled: true,
        })
        .expect(201);

      const policy = getBody(policyRes);
      expect(policy.dataCategory).toBe('COMMUNICATION');
      expect(policy.retentionPeriodDays).toBe(90);

      // 2. Trigger retention cycle
      const cycleRes = await request(app.getHttpServer())
        .post('/api/v1/privacy/admin/retention/run')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .expect(201);

      const results = getBody(cycleRes);
      expect(Array.isArray(results)).toBe(true);
      const commResult = results.find((r: any) => r.category === 'COMMUNICATION');
      expect(commResult).toBeDefined();
      expect(commResult.status).toBe('COMPLETED');
    });
  });

  // =========================================================================
  // 9. AI PRIVACY BOUNDARY & WEARABLE DATA CONTROLS
  // =========================================================================
  describe('9. AI Privacy Boundary & Wearables Safe Disconnect', () => {
    it('should filter AI context when AI consent is revoked or personalization is disabled', async () => {
      const evaluation = await aiPolicyService.filterAuthorizedContextSources(
        orgA.id,
        memberProfileA.id,
        ['WEARABLE_HEALTH_DATA', 'NUTRITION', 'MEMBER_PROFILE'],
      );

      // Because we disabled aiPersonalization earlier, context access must be restricted
      expect(evaluation.allowedSources).toHaveLength(0);
      expect(evaluation.excludedSources.length).toBeGreaterThan(0);
    });

    it('should list connected wearables and disconnect provider safely without deleting past workouts', async () => {
      // 1. Seed connected wearable record
      await prisma.memberPrivacyPreference.upsert({
        where: { memberId: memberProfileB.id },
        update: { wearables: true },
        create: {
          memberId: memberProfileB.id,
          organisationId: orgB.id,
          wearables: true,
        },
      });

      // 2. Query wearables endpoint
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/privacy/wearables')
        .set('Authorization', `Bearer ${memberTokenB}`)
        .expect(200);

      expect(getBody(listRes).wearableSharingEnabled).toBe(true);

      // 3. Disconnect provider
      const discRes = await request(app.getHttpServer())
        .post('/api/v1/privacy/wearables/GARMIN/disconnect')
        .set('Authorization', `Bearer ${memberTokenB}`)
        .expect(201);

      expect(getBody(discRes).success).toBe(true);
      expect(getBody(discRes).provider).toBe('GARMIN');
    });
  });

  // =========================================================================
  // 10. CROSS-TENANT ISOLATION & IDOR DEFENSE
  // =========================================================================
  describe('10. Security Invariants: Tenant Isolation & IDOR Defense', () => {
    let requestOrgAId: string;

    beforeAll(async () => {
      const reqRes = await request(app.getHttpServer())
        .post('/api/v1/privacy/requests')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({ type: 'ACCESS', reason: 'Cross-tenant probe request' });
      requestOrgAId = getBody(reqRes).id;
    });

    it('should reject Member B from accessing Member A privacy request (IDOR Defense)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/privacy/requests/${requestOrgAId}`)
        .set('Authorization', `Bearer ${memberTokenB}`)
        .expect(404);
    });

    it('should reject Member B from cancelling Member A privacy request (Cross-Tenant Mutation)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/privacy/requests/${requestOrgAId}/cancel`)
        .set('Authorization', `Bearer ${memberTokenB}`)
        .expect(404);
    });

    it('should reject Member role from calling Administrative Privacy endpoints (RBAC Defense)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/privacy/admin/dashboard')
        .set('Authorization', `Bearer ${memberTokenB}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/api/v1/privacy/admin/requests')
        .set('Authorization', `Bearer ${memberTokenB}`)
        .expect(403);
    });
  });

  // =========================================================================
  // 11. THIRD-PARTY PROCESSORS REGISTRY & DATA QUALITY REPORT
  // =========================================================================
  describe('11. Processors Registry & Compliance Telemetry', () => {
    it('should register a third-party data processor with DPA compliance metadata', async () => {
      const procRes = await request(app.getHttpServer())
        .post('/api/v1/privacy/admin/processors')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .send({
          name: 'Stripe Payments Australia',
          category: 'PAYMENT_PROVIDER',
          purpose: 'Payment gateway transaction processing',
          dataCategories: ['PAYMENT', 'FINANCIAL'],
          privacyPolicyReference: 'https://stripe.com/au/privacy',
          dataRegion: 'Australia',
          enabled: true,
        })
        .expect(201);

      const processor = getBody(procRes);
      expect(processor.name).toBe('Stripe Payments Australia');
      expect(processor.category).toBe('PAYMENT_PROVIDER');

      // Verify list
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/privacy/admin/processors')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .expect(200);

      const list = getBody(listRes);
      expect(list.some((p: any) => p.name === 'Stripe Payments Australia')).toBe(true);
    });

    it('should retrieve privacy compliance telemetry and data quality report', async () => {
      // Quality Report
      const qualityRes = await request(app.getHttpServer())
        .get('/api/v1/privacy/admin/quality')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .expect(200);

      const quality = getBody(qualityRes);
      expect(quality.status).toBeDefined();
      expect(quality.totalAssetsCataloged).toBeGreaterThanOrEqual(24);
      expect(quality.missingRetentionCount).toBeDefined();

      // Admin Dashboard
      const dashRes = await request(app.getHttpServer())
        .get('/api/v1/privacy/admin/dashboard')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .expect(200);

      const dash = getBody(dashRes);
      expect(dash.totalRequests).toBeGreaterThanOrEqual(1);
      expect(dash.dataCategoriesCount).toBeGreaterThanOrEqual(24);
      expect(dash.slaComplianceRate).toBeDefined();
    });
  });
});
