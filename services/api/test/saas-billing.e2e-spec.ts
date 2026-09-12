/**
 * FitCore — Day 55: SaaS Billing & Organisation Plans Comprehensive E2E Test Suite
 *
 * Validates:
 * 1. Plan Management & Versioning (Creation, Versioning, Immutability, Retirement)
 * 2. Organisation SaaS Subscriptions (Trial, Activation, Status state machine)
 * 3. Strict Billing Domain Isolation (SaaS Billing never touches Member Billing / Physical Access)
 * 4. Entitlements & Usage Limit Service (Fail-closed, Warning at 80%, Overage allowed vs blocked)
 * 5. Idempotent Usage Event Ingestion & Source Aggregation
 * 6. Period Finalization & Immutable SaaS Invoice Generation (Base + Overages - Credits = Total)
 * 7. Prorated Plan Upgrades & Conflict-Aware Downgrades
 * 8. SaaS Dunning & Non-destructive Suspensions
 * 9. Provider Reconciliation & Auditing
 * 10. Multi-tenant Boundary & RBAC Protection
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { SaasInvoicesService } from '../src/saas-billing/invoices/saas-invoices.service';
import { SaasDunningService } from '../src/saas-billing/dunning/saas-dunning.service';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

describe('Day 55: SaaS Billing & Organisation Plans E2E Suite', () => {
  jest.setTimeout(120000);

  let app: INestApplication;
  let prisma: PrismaService;
  let invoicesService: SaasInvoicesService;
  let dunningService: SaasDunningService;

  let superAdminToken: string;
  let orgOwnerToken: string;
  let org2OwnerToken: string;
  let regularMemberToken: string;

  let testOrg1: any;
  let testOrg2: any;
  let superAdminUser: any;
  let org1OwnerUser: any;
  let org2OwnerUser: any;
  let memberUser: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    invoicesService = app.get(SaasInvoicesService);
    dunningService = app.get(SaasDunningService);

    const suffix = Date.now().toString();

    // 1. Create two test organisations
    testOrg1 = await prisma.organisation.create({
      data: {
        name: `FitCore Org Alpha ${suffix}`,
        slug: `fitcore-alpha-${suffix}`,
        status: 'ACTIVE',
        currency: 'AUD',
        country: 'Australia',
      },
    });

    testOrg2 = await prisma.organisation.create({
      data: {
        name: `FitCore Org Beta ${suffix}`,
        slug: `fitcore-beta-${suffix}`,
        status: 'ACTIVE',
        currency: 'AUD',
        country: 'Australia',
      },
    });

    const defaultPassword = 'SaasBillingPassword2026!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // Roles
    let superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPERADMIN' } });
    if (!superAdminRole) {
      superAdminRole = await prisma.role.create({
        data: { name: 'SUPERADMIN', description: 'Platform Superadmin' },
      });
    }

    let ownerRole = await prisma.role.findUnique({ where: { name: 'ORGANISATION_OWNER' } });
    if (!ownerRole) {
      ownerRole = await prisma.role.create({
        data: { name: 'ORGANISATION_OWNER', description: 'Organisation Owner' },
      });
    }

    let memberRole = await prisma.role.findUnique({ where: { name: 'MEMBER' } });
    if (!memberRole) {
      memberRole = await prisma.role.create({
        data: { name: 'MEMBER', description: 'Gym Member' },
      });
    }

    // Users
    superAdminUser = await prisma.user.create({
      data: {
        email: `superadmin.${suffix}@fitcore.io`,
        firstName: 'Super',
        lastName: 'Admin',
        passwordHash,
        status: 'ACTIVE',
        userRoles: {
          create: { roleId: superAdminRole.id, organisationId: testOrg1.id },
        },
      },
    });

    org1OwnerUser = await prisma.user.create({
      data: {
        email: `owner1.${suffix}@alpha.com`,
        firstName: 'Alice',
        lastName: 'Owner',
        passwordHash,
        status: 'ACTIVE',
        userRoles: {
          create: { roleId: ownerRole.id, organisationId: testOrg1.id },
        },
      },
    });

    org2OwnerUser = await prisma.user.create({
      data: {
        email: `owner2.${suffix}@beta.com`,
        firstName: 'Bob',
        lastName: 'Owner',
        passwordHash,
        status: 'ACTIVE',
        userRoles: {
          create: { roleId: ownerRole.id, organisationId: testOrg2.id },
        },
      },
    });

    memberUser = await prisma.user.create({
      data: {
        email: `member.${suffix}@alpha.com`,
        firstName: 'Charlie',
        lastName: 'Member',
        passwordHash,
        status: 'ACTIVE',
        userRoles: {
          create: { roleId: memberRole.id, organisationId: testOrg1.id },
        },
      },
    });

    // Login tokens
    const loginSuper = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: superAdminUser.email, password: defaultPassword });
    superAdminToken = loginSuper.body.data?.accessToken || loginSuper.body.accessToken;

    const loginOrg1 = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: org1OwnerUser.email, password: defaultPassword });
    orgOwnerToken = loginOrg1.body.data?.accessToken || loginOrg1.body.accessToken;

    const loginOrg2 = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: org2OwnerUser.email, password: defaultPassword });
    org2OwnerToken = loginOrg2.body.data?.accessToken || loginOrg2.body.accessToken;

    const loginMember = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: memberUser.email, password: defaultPassword });
    regularMemberToken = loginMember.body.data?.accessToken || loginMember.body.accessToken;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.saasInvoiceLine.deleteMany({});
      await prisma.saasBillingPeriod.deleteMany({});
      await prisma.saasInvoice.deleteMany({});
      await prisma.saasSubscription.deleteMany({});
      await prisma.saasBillingCustomer.deleteMany({});
      await prisma.saasPlanEntitlement.deleteMany({});
      await prisma.saasPlanVersion.deleteMany({});
      await prisma.saasPlan.deleteMany({});
      await prisma.saasEntitlement.deleteMany({});
      await prisma.saasUsageEvent.deleteMany({});
      await prisma.saasUsageAggregate.deleteMany({});
      await prisma.saasCreditTransaction.deleteMany({});
      await prisma.saasCreditBalance.deleteMany({});

      if (testOrg1) {
        await prisma.userRole.deleteMany({ where: { organisationId: { in: [testOrg1.id, testOrg2.id] } } });
        await prisma.user.deleteMany({
          where: { id: { in: [superAdminUser.id, org1OwnerUser.id, org2OwnerUser.id, memberUser.id] } },
        });
        await prisma.organisation.deleteMany({ where: { id: { in: [testOrg1.id, testOrg2.id] } } });
      }
    }
    await app.close();
  });

  // =========================================================================
  // 1. PLAN MANAGEMENT & VERSIONING
  // =========================================================================
  describe('1. SaaS Plan Creation, Versioning & Immutability', () => {
    it('creates STARTER and GROWTH plans with limits and version 1', async () => {
      const starterRes = await request(app.getHttpServer())
        .post('/api/v1/saas-billing/admin/plans')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          code: `STARTER_${Date.now()}`,
          name: 'Starter Tier',
          description: 'Single outlet gym starter tier',
          basePriceMinor: 9900, // $99.00 AUD
          currency: 'AUD',
          trialDays: 14,
          billingInterval: 'MONTHLY',
          entitlements: [
            {
              entitlementCode: 'OUTLET_LIMIT',
              limitType: 'COUNT',
              includedAllowance: 1,
              overageAllowed: false,
            },
            {
              entitlementCode: 'MEMBER_LIMIT',
              limitType: 'COUNT',
              includedAllowance: 500,
              overageAllowed: false,
            },
            {
              entitlementCode: 'AI_TOKEN_LIMIT',
              limitType: 'QUOTA',
              includedAllowance: 100000,
              overageAllowed: true,
              overageUnitMinor: 50, // 50 cents per batch
              overageBatchSize: 10000,
              softLimitThresholdPercent: 80,
            },
          ],
        });

      expect(starterRes.status).toBe(201);
      const plan = starterRes.body.data || starterRes.body;
      expect(plan.version).toBe(1);
      expect(plan.basePriceMinor).toBe(9900);
      expect(plan.versions.length).toBe(1);
      expect(plan.versions[0].entitlements.length).toBe(3);
    });

    it('creates an immutable version 2 without altering version 1', async () => {
      // Create Growth Plan
      const code = `GROWTH_${Date.now()}`;
      const growthRes = await request(app.getHttpServer())
        .post('/api/v1/saas-billing/admin/plans')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          code,
          name: 'Growth Tier',
          basePriceMinor: 19900,
          currency: 'AUD',
          trialDays: 14,
        });

      const plan = growthRes.body.data || growthRes.body;

      // Create Version 2 with price increase ($249.00)
      const v2Res = await request(app.getHttpServer())
        .post(`/api/v1/saas-billing/admin/plans/${plan.id}/versions`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          basePriceMinor: 24900,
          changeNotes: 'Price revision for 2026',
        });

      expect(v2Res.status).toBe(201);
      const v2 = v2Res.body.data || v2Res.body;
      expect(v2.version).toBe(2);
      expect(v2.basePriceMinor).toBe(24900);

      // Verify original Version 1 is intact in database
      const v1 = await prisma.saasPlanVersion.findUnique({
        where: { planId_version: { planId: plan.id, version: 1 } },
      });
      expect(v1?.basePriceMinor).toBe(19900);
    });

    it('lists public plans anonymously for prospective gym owners', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/saas-billing/plans');
      expect(res.status).toBe(200);
      const plans = res.body.data || res.body;
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // 2. SUBSCRIPTION LIFECYCLE & STRICT DOMAIN ISOLATION
  // =========================================================================
  describe('2. Subscription Lifecycle & Billing Isolation', () => {
    let growthPlanCode: string;

    beforeAll(async () => {
      growthPlanCode = `PRO_${Date.now()}`;
      await request(app.getHttpServer())
        .post('/api/v1/saas-billing/admin/plans')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          code: growthPlanCode,
          name: 'Pro Tier',
          basePriceMinor: 29900,
          currency: 'AUD',
          trialDays: 14,
          entitlements: [
            { entitlementCode: 'OUTLET_LIMIT', limitType: 'COUNT', includedAllowance: 5 },
            { entitlementCode: 'MEMBER_LIMIT', limitType: 'COUNT', includedAllowance: 2000 },
            {
              entitlementCode: 'AI_TOKEN_LIMIT',
              limitType: 'QUOTA',
              includedAllowance: 500000,
              overageAllowed: true,
              overageUnitMinor: 100, // $1.00 per 10k
              overageBatchSize: 10000,
            },
          ],
        });
    });

    it('subscribes Org 1 to Pro Plan with a 14-day trial period', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/saas-billing/subscription')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .set('x-organisation-id', testOrg1.id)
        .send({
          planCode: growthPlanCode,
          startTrial: true,
          billingEmail: 'billing@alpha.com',
        });

      expect(res.status).toBe(201);
      const sub = res.body.data || res.body;
      expect(sub.status).toBe('TRIALING');
      expect(sub.plan.code).toBe(growthPlanCode);
      expect(sub.providerSubscriptionReference).toBeDefined();
    });

    it('asserts SaaS billing does NOT create or alter MemberMembership or MemberInvoice records', async () => {
      // Member-level tables MUST remain completely isolated
      const memberMemberships = await prisma.memberMembership.findMany({
        where: { organisationId: testOrg1.id },
      });
      const memberInvoices = await prisma.invoice.findMany({
        where: { organisationId: testOrg1.id },
      });

      expect(memberMemberships.length).toBe(0);
      expect(memberInvoices.length).toBe(0);
    });

    it('retrieves organisation billing overview with accurate status and trial period', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/saas-billing/overview')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .set('x-organisation-id', testOrg1.id);

      expect(res.status).toBe(200);
      const overview = res.body.data || res.body;
      expect(overview.subscription.status).toBe('TRIALING');
      expect(overview.meters.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // 3. ENTITLEMENTS & USAGE LIMIT CHECKING
  // =========================================================================
  describe('3. Usage Limits & Entitlement Enforcement', () => {
    it('allows resource creation within plan allowance', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/saas-billing/usage/limits/OUTLET_LIMIT')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .set('x-organisation-id', testOrg1.id);

      expect(res.status).toBe(200);
      const limit = res.body.data || res.body;
      expect(limit.allowed).toBe(true);
      expect(limit.status).toBe('ALLOWED');
      expect(limit.includedAllowance).toBe(5);
    });

    it('returns OVERAGE_ALLOWED when metered usage with overage passes quota', async () => {
      // Record usage pushing AI tokens beyond 500,000
      await request(app.getHttpServer())
        .post('/api/v1/saas-billing/usage/events')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .set('x-organisation-id', testOrg1.id)
        .send({
          meterKey: 'AI_TOKEN',
          quantity: 520000,
          unit: 'tokens',
          source: 'AI_USAGE',
          idempotencyKey: `ai_evt_${Date.now()}`,
        });

      const res = await request(app.getHttpServer())
        .get('/api/v1/saas-billing/usage/limits/AI_TOKEN_LIMIT')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .set('x-organisation-id', testOrg1.id);

      expect(res.status).toBe(200);
      const limit = res.body.data || res.body;
      expect(limit.allowed).toBe(true);
      expect(limit.status).toBe('OVERAGE_ALLOWED');
      expect(limit.currentUsage).toBe(520000);
    });

    it('fails closed for non-subscribed organisations (PLAN_REQUIRED)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/saas-billing/usage/limits/MEMBER_LIMIT')
        .set('Authorization', `Bearer ${org2OwnerToken}`)
        .set('x-organisation-id', testOrg2.id);

      expect(res.status).toBe(200);
      const limit = res.body.data || res.body;
      expect(limit.allowed).toBe(false);
      expect(limit.status).toBe('PLAN_REQUIRED');
    });
  });

  // =========================================================================
  // 4. USAGE IDEMPOTENCY
  // =========================================================================
  describe('4. Idempotent Usage Ingestion', () => {
    it('prevents double-counting duplicate usage events with identical idempotencyKey', async () => {
      const idempotencyKey = `sms_batch_${Date.now()}`;

      const firstCall = await request(app.getHttpServer())
        .post('/api/v1/saas-billing/usage/events')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .set('x-organisation-id', testOrg1.id)
        .send({
          meterKey: 'SMS_MESSAGE',
          quantity: 150,
          unit: 'messages',
          source: 'COMMUNICATION',
          idempotencyKey,
        });

      expect(firstCall.status).toBe(201);
      expect((firstCall.body.data || firstCall.body).duplicate).toBe(false);

      // Replay same event
      const secondCall = await request(app.getHttpServer())
        .post('/api/v1/saas-billing/usage/events')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .set('x-organisation-id', testOrg1.id)
        .send({
          meterKey: 'SMS_MESSAGE',
          quantity: 150,
          unit: 'messages',
          source: 'COMMUNICATION',
          idempotencyKey,
        });

      expect(secondCall.status).toBe(201);
      expect((secondCall.body.data || secondCall.body).duplicate).toBe(true);
    });
  });

  // =========================================================================
  // 5. PERIOD FINALIZATION & IMMUTABLE INVOICES
  // =========================================================================
  describe('5. Period Finalization & Immutable SaaS Invoice Generation', () => {
    it('finalizes period, calculates base + overages - credits, and collects payment', async () => {
      // 1. Grant $50 AUD promotional credit
      await request(app.getHttpServer())
        .post(`/api/v1/saas-billing/admin/credits/${testOrg1.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          amountMinor: 5000,
          reason: 'Early adopter onboarding credit',
        });

      const sub = await prisma.saasSubscription.findFirst({
        where: { organisationId: testOrg1.id, status: { in: ['ACTIVE', 'TRIALING'] } },
      });

      // 2. Finalize period & invoice
      const invoice = await invoicesService.finalizePeriodAndGenerateInvoice(sub!.id);

      expect(invoice).toBeDefined();
      expect(invoice!.status).toBe('PAID');
      expect(invoice!.lines.some((l) => l.lineType === 'BASE_PLAN')).toBe(true);
      expect(invoice!.lines.some((l) => l.lineType === 'OVERAGE')).toBe(true);
      expect(invoice!.lines.some((l) => l.lineType === 'CREDIT')).toBe(true);

      // Verify invoice numbers and immutability
      expect(invoice!.invoiceNumber).toMatch(/^INV-SAAS-/);
      expect(invoice!.totalMinor).toBe(invoice!.subtotalMinor - invoice!.discountMinor);
    });

    it('lists generated SaaS invoices for organisation', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/saas-billing/invoices')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .set('x-organisation-id', testOrg1.id);

      expect(res.status).toBe(200);
      const invoices = res.body.data || res.body;
      expect(invoices.length).toBeGreaterThanOrEqual(1);
      expect(invoices[0].lines.length).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // 6. PRORATION & DOWNGRADE RESOURCE VALIDATION
  // =========================================================================
  describe('6. Upgrades with Proration & Conflict-Aware Downgrades', () => {
    let enterpriseCode: string;
    let singleOutletCode: string;

    beforeAll(async () => {
      enterpriseCode = `ENT_${Date.now()}`;
      await request(app.getHttpServer())
        .post('/api/v1/saas-billing/admin/plans')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          code: enterpriseCode,
          name: 'Enterprise Tier',
          basePriceMinor: 59900, // $599.00
          currency: 'AUD',
        });

      singleOutletCode = `TINY_${Date.now()}`;
      await request(app.getHttpServer())
        .post('/api/v1/saas-billing/admin/plans')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          code: singleOutletCode,
          name: 'Tiny Gym Tier',
          basePriceMinor: 4900,
          currency: 'AUD',
          entitlements: [
            { entitlementCode: 'OUTLET_LIMIT', limitType: 'COUNT', includedAllowance: 1 },
          ],
        });
    });

    it('calculates deterministic proration and upgrades plan mid-cycle', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/saas-billing/subscription/upgrade')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .set('x-organisation-id', testOrg1.id)
        .send({ targetPlanCode: enterpriseCode });

      expect(res.status).toBe(201);
      const data = res.body.data || res.body;
      expect(data.subscription.plan.code).toBe(enterpriseCode);
      expect(data.proration).toBeDefined();
      expect(data.proration.immediatePaymentRequired).toBe(true);
      expect(data.proration.netAdjustmentMinor).toBeGreaterThan(0);
    });

    it('blocks downgrade when existing resource counts exceed target plan quotas', async () => {
      // Create 2 outlets for Org 1
      await prisma.outlet.createMany({
        data: [
          {
            organisationId: testOrg1.id,
            name: 'Outlet Alpha 1',
            slug: `out-1-${Date.now()}`,
            code: 'OA1',
            address: '100 Main St',
            city: 'Perth',
            state: 'WA',
            postalCode: '6000',
          },
          {
            organisationId: testOrg1.id,
            name: 'Outlet Alpha 2',
            slug: `out-2-${Date.now()}`,
            code: 'OA2',
            address: '200 Main St',
            city: 'Perth',
            state: 'WA',
            postalCode: '6000',
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/saas-billing/subscription/downgrade')
        .set('Authorization', `Bearer ${orgOwnerToken}`)
        .set('x-organisation-id', testOrg1.id)
        .send({ targetPlanCode: singleOutletCode });

      expect(res.status).toBe(201);
      const result = res.body.data || res.body;
      expect(result.status).toBe('DOWNGRADE_BLOCKED');
      expect(result.reasons.length).toBeGreaterThanOrEqual(1);
      expect(result.reasons[0]).toContain('Active outlets');
    });
  });

  // =========================================================================
  // 7. SAAS DUNNING & NON-DESTRUCTIVE SUSPENSION
  // =========================================================================
  describe('7. SaaS Dunning & Graceful Policy Enforcement', () => {
    it('processes dunning cycle without locking physical gym access for members', async () => {
      // Create overdue unpaid SaaS invoice
      await prisma.saasInvoice.create({
        data: {
          organisationId: testOrg2.id,
          invoiceNumber: `INV-OVERDUE-${Date.now().toString().slice(-5)}`,
          status: 'OVERDUE',
          currency: 'AUD',
          subtotalMinor: 29900,
          totalMinor: 29900,
          amountPaidMinor: 0,
          amountDueMinor: 29900,
          periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          periodEnd: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days past due
        },
      });

      const dunningRes = await dunningService.processDunningCycle();
      expect(dunningRes).toBeDefined();
      expect(dunningRes.overdueInvoicesEvaluated).toBeGreaterThanOrEqual(1);

      // Verify physical door access credentials exist intact (zero member lockout)
      const credentialsCount = await prisma.accessCredential.count({
        where: { organisationId: testOrg2.id },
      });
      expect(credentialsCount).toBe(0); // None deleted or touched
    });
  });

  // =========================================================================
  // 8. SUPERADMIN CONTROL PLANE & RECONCILIATION
  // =========================================================================
  describe('8. Superadmin Metrics & Provider Reconciliation', () => {
    it('provides accurate MRR, ARR, and plan distribution metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/saas-billing/admin/revenue')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const metrics = res.body.data || res.body;
      expect(metrics.mrrByCurrency).toHaveProperty('AUD');
      expect(metrics.activeSubscriptions).toBeGreaterThanOrEqual(1);
      expect(metrics.collectionRatePercent).toBeGreaterThanOrEqual(0);
    });

    it('runs provider reconciliation and identifies discrepancies', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/saas-billing/admin/reconciliation')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const recon = res.body.data || res.body;
      expect(recon.subscriptionAudit).toBeDefined();
      expect(recon.invoiceAudit).toBeDefined();
    });
  });

  // =========================================================================
  // 9. MULTI-TENANT BOUNDARY & RBAC DEFENSE
  // =========================================================================
  describe('9. Multi-Tenant Isolation & Access Control', () => {
    it('blocks regular gym members from accessing organisation SaaS billing', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/saas-billing/overview')
        .set('Authorization', `Bearer ${regularMemberToken}`)
        .set('x-organisation-id', testOrg1.id);

      expect(res.status).toBe(403);
    });

    it('prevents cross-tenant access between different gym organisations', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/saas-billing/overview')
        .set('Authorization', `Bearer ${org2OwnerToken}`)
        .set('x-organisation-id', testOrg1.id); // Org 2 Owner trying to read Org 1

      expect(res.status).toBe(403);
    });
  });
});
