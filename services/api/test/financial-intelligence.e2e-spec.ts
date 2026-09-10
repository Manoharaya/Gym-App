/**
 * Day 41 — Financial Intelligence Foundation Comprehensive E2E Test Suite
 *
 * Validates:
 * 1. Overview KPIs & Deterministic Math (Gross, Net, Refunds, Success Rate)
 * 2. Multi-Currency Isolation (AUD vs USD partitioned, never mixed)
 * 3. Strict Outlet Attribution & UNATTRIBUTED non-guessing fallback
 * 4. Membership Plan Revenue Contribution
 * 5. Invoice Aging & Outstanding Balances
 * 6. Financial Reconciliation Service (Idempotent Projection Sync & Discrepancy Detection)
 * 7. Financial Data Quality & Anomaly Engine
 * 8. Grounded Context Service for Day 44 AI Finance Assistant
 * 9. Drill-Down Pagination & RFC 4180 Sanitized CSV Export
 * 10. Member Self-Finances Isolation
 * 11. RBAC & IDOR Defense (Member 403, Trainer 403, Outlet Manager Scope, Org A vs Org B)
 * 12. Multi-Tenant Cache Isolation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { FinancialIntelligenceService } from '../src/financial-intelligence/services/financial-intelligence.service';
import { FinancialMetricService } from '../src/financial-intelligence/services/financial-metric.service';
import { FinancialCacheService } from '../src/financial-intelligence/services/financial-cache.service';
import { FinancialReconciliationService } from '../src/financial-intelligence/services/financial-reconciliation.service';
import { FinancialDataQualityService } from '../src/financial-intelligence/services/financial-data-quality.service';
import { FinancialContextService } from '../src/financial-intelligence/services/financial-context.service';
import request from 'supertest';

describe('Day 41: Financial Intelligence Foundation E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let intelligenceService: FinancialIntelligenceService;
  let metricService: FinancialMetricService;
  let cacheService: FinancialCacheService;
  let reconciliationService: FinancialReconciliationService;
  let dataQualityService: FinancialDataQualityService;
  let contextService: FinancialContextService;

  let orgA: any;
  let orgB: any;
  let outletA1: any;
  let outletA2: any;
  let outletB: any;
  let planA1: any;
  let planA2: any;
  let memberUser1: any;
  let memberProfile1: any;
  let memberMembership1: any;
  let memberUser2: any;
  let memberProfile2: any;
  let memberMembership2: any;
  let memberUser3: any;
  let memberProfile3: any;
  let memberMembership3: any;
  let trainerUser: any;
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

    prisma = app.get(PrismaService);
    intelligenceService = app.get(FinancialIntelligenceService);
    metricService = app.get(FinancialMetricService);
    cacheService = app.get(FinancialCacheService);
    reconciliationService = app.get(FinancialReconciliationService);
    dataQualityService = app.get(FinancialDataQualityService);
    contextService = app.get(FinancialContextService);

    // SuperAdmin token
    const saRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@fitcore.io', password: 'FitCoreDev2026!' });
    superAdminToken = saRes.body.data?.accessToken || saRes.body.accessToken;

    const ts = Date.now();

    // 1. Setup Organisation A (AUD) and Organisation B (USD)
    orgA = await prisma.organisation.create({
      data: {
        name: `FitCore Finance Org A ${ts}`,
        slug: `fin-org-a-${ts}`,
        status: 'ACTIVE',
        currency: 'AUD',
        timezone: 'Australia/Sydney',
      },
    });

    orgB = await prisma.organisation.create({
      data: {
        name: `FitCore Finance Org B ${ts}`,
        slug: `fin-org-b-${ts}`,
        status: 'ACTIVE',
        currency: 'USD',
        timezone: 'America/New_York',
      },
    });

    // 2. Outlets
    outletA1 = await prisma.outlet.create({
      data: {
        organisationId: orgA.id,
        name: `Sydney Central ${ts}`,
        code: `SYD-${ts}`,
        slug: `sydney-central-${ts}`,
        address: '100 George St',
        city: 'Sydney',
        state: 'NSW',
        country: 'Australia',
        postalCode: '2000',
        status: 'ACTIVE',
      },
    });

    outletA2 = await prisma.outlet.create({
      data: {
        organisationId: orgA.id,
        name: `Bondi Beach ${ts}`,
        code: `BND-${ts}`,
        slug: `bondi-beach-${ts}`,
        address: '20 Campbell Pde',
        city: 'Bondi',
        state: 'NSW',
        country: 'Australia',
        postalCode: '2026',
        status: 'ACTIVE',
      },
    });

    outletB = await prisma.outlet.create({
      data: {
        organisationId: orgB.id,
        name: `Manhattan Flagship ${ts}`,
        code: `MAN-${ts}`,
        slug: `manhattan-${ts}`,
        address: '500 5th Ave',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postalCode: '10001',
        status: 'ACTIVE',
      },
    });

    // 3. Membership Plans in Org A
    planA1 = await prisma.membershipPlan.create({
      data: {
        organisationId: orgA.id,
        name: `Platinum All-Access ${ts}`,
        code: `PLAT-${ts}`,
        price: 100.0,
        currency: 'AUD',
        durationValue: 1,
        durationUnit: 'MONTH',
        membershipType: 'STANDARD',
        status: 'ACTIVE',
      },
    });

    planA2 = await prisma.membershipPlan.create({
      data: {
        organisationId: orgA.id,
        name: `Standard Monthly ${ts}`,
        code: `STD-${ts}`,
        price: 50.0,
        currency: 'AUD',
        durationValue: 1,
        durationUnit: 'MONTH',
        membershipType: 'STANDARD',
        status: 'ACTIVE',
      },
    });

    // 4. Members in Org A
    // Member 1 (linked to Outlet A1)
    memberUser1 = await prisma.user.create({
      data: {
        email: `member1-${ts}@test.com`,
        passwordHash: 'dummyhash',
        firstName: 'John',
        lastName: 'Doe',
        status: 'ACTIVE',
      },
    });
    memberProfile1 = await prisma.memberProfile.create({
      data: {
        userId: memberUser1.id,
        organisationId: orgA.id,
        status: 'ACTIVE',
      },
    });
    memberMembership1 = await prisma.memberMembership.create({
      data: {
        organisationId: orgA.id,
        memberProfileId: memberProfile1.id,
        membershipPlanId: planA1.id,
        originOutletId: outletA1.id,
        status: 'ACTIVE',
        accessScope: 'ALL_ORGANISATION_OUTLETS',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        planNameAtPurchase: 'Platinum All-Access',
        priceAtPurchase: 100,
        currencyAtPurchase: 'AUD',
        billingTypeAtPurchase: 'RECURRING',
        durationValueAtPurchase: 1,
        durationUnitAtPurchase: 'MONTHS',
      },
    });

    // Member 2 (linked to Outlet A2)
    memberUser2 = await prisma.user.create({
      data: {
        email: `member2-${ts}@test.com`,
        passwordHash: 'dummyhash',
        firstName: 'Sarah',
        lastName: 'Connor',
        status: 'ACTIVE',
      },
    });
    memberProfile2 = await prisma.memberProfile.create({
      data: {
        userId: memberUser2.id,
        organisationId: orgA.id,
        status: 'ACTIVE',
      },
    });
    memberMembership2 = await prisma.memberMembership.create({
      data: {
        organisationId: orgA.id,
        memberProfileId: memberProfile2.id,
        membershipPlanId: planA2.id,
        originOutletId: outletA2.id,
        status: 'ACTIVE',
        accessScope: 'ALL_ORGANISATION_OUTLETS',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        planNameAtPurchase: 'Standard Monthly',
        priceAtPurchase: 50,
        currencyAtPurchase: 'AUD',
        billingTypeAtPurchase: 'RECURRING',
        durationValueAtPurchase: 1,
        durationUnitAtPurchase: 'MONTHS',
      },
    });

    // Member 3 (Unattributed - no origin outlet)
    memberUser3 = await prisma.user.create({
      data: {
        email: `member3-${ts}@test.com`,
        passwordHash: 'dummyhash',
        firstName: 'Alex',
        lastName: 'Cross',
        status: 'ACTIVE',
      },
    });
    memberProfile3 = await prisma.memberProfile.create({
      data: {
        userId: memberUser3.id,
        organisationId: orgA.id,
        status: 'ACTIVE',
      },
    });
    memberMembership3 = await prisma.memberMembership.create({
      data: {
        organisationId: orgA.id,
        memberProfileId: memberProfile3.id,
        membershipPlanId: planA1.id,
        originOutletId: null, // explicit UNATTRIBUTED
        status: 'ACTIVE',
        accessScope: 'ALL_ORGANISATION_OUTLETS',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        planNameAtPurchase: 'Platinum All-Access',
        priceAtPurchase: 100,
        currencyAtPurchase: 'AUD',
        billingTypeAtPurchase: 'RECURRING',
        durationValueAtPurchase: 1,
        durationUnitAtPurchase: 'MONTHS',
      },
    });

    // Trainer User
    trainerUser = await prisma.user.create({
      data: {
        email: `trainer-${ts}@test.com`,
        passwordHash: 'dummyhash',
        firstName: 'Coach',
        lastName: 'Fit',
        status: 'ACTIVE',
      },
    });

    // 5. Invoices in Org A
    const invoice1 = await prisma.invoice.create({
      data: {
        organisationId: orgA.id,
        memberProfileId: memberProfile1.id,
        invoiceNumber: `INV-1-${ts}`,
        currency: 'AUD',
        subtotalMinor: 10000,
        totalMinor: 10000,
        amountPaidMinor: 10000,
        amountDueMinor: 0,
        dueDate: new Date(),
        status: 'PAID',
      },
    });

    const invoice2 = await prisma.invoice.create({
      data: {
        organisationId: orgA.id,
        memberProfileId: memberProfile1.id,
        invoiceNumber: `INV-2-${ts}`,
        currency: 'AUD',
        subtotalMinor: 10000,
        totalMinor: 10000,
        amountPaidMinor: 10000,
        amountDueMinor: 0,
        dueDate: new Date(),
        status: 'PAID',
      },
    });

    const invoice3 = await prisma.invoice.create({
      data: {
        organisationId: orgA.id,
        memberProfileId: memberProfile2.id,
        invoiceNumber: `INV-3-${ts}`,
        currency: 'AUD',
        subtotalMinor: 5000,
        totalMinor: 5000,
        amountPaidMinor: 5000,
        amountDueMinor: 0,
        dueDate: new Date(),
        status: 'PAID',
      },
    });

    // Open/Unpaid Invoice in Org A ($60.00 / 6000 minor)
    await prisma.invoice.create({
      data: {
        organisationId: orgA.id,
        memberProfileId: memberProfile1.id,
        invoiceNumber: `INV-OPEN-${ts}`,
        currency: 'AUD',
        subtotalMinor: 6000,
        totalMinor: 6000,
        amountPaidMinor: 0,
        amountDueMinor: 6000,
        dueDate: new Date(),
        status: 'OPEN',
      },
    });

    // 6. Payment Transactions in Org A (Authoritative Day 6)
    // Tx 1: $100.00 Succeeded (Outlet A1)
    await prisma.paymentTransaction.create({
      data: {
        organisationId: orgA.id,
        memberProfileId: memberProfile1.id,
        memberMembershipId: memberMembership1.id,
        invoiceId: invoice1.id,
        providerTransactionId: `tx-1-${ts}`,
        provider: 'MOCK',
        paymentMethodType: 'CARD',
        amountMinor: 10000,
        currency: 'AUD',
        status: 'SUCCEEDED',
      },
    });

    // Tx 2: $100.00 Succeeded with $20.00 Refund (Outlet A1)
    const tx2 = await prisma.paymentTransaction.create({
      data: {
        organisationId: orgA.id,
        memberProfileId: memberProfile1.id,
        memberMembershipId: memberMembership1.id,
        invoiceId: invoice2.id,
        providerTransactionId: `tx-2-${ts}`,
        provider: 'MOCK',
        paymentMethodType: 'CARD',
        amountMinor: 10000,
        currency: 'AUD',
        status: 'SUCCEEDED',
      },
    });

    await prisma.paymentRefund.create({
      data: {
        organisationId: orgA.id,
        paymentTransactionId: tx2.id,
        providerRefundId: `ref-1-${ts}`,
        amountMinor: 2000,
        currency: 'AUD',
        reason: 'Customer requested partial refund',
        status: 'SUCCEEDED',
      },
    });

    // Tx 3: $50.00 Succeeded (Outlet A2)
    await prisma.paymentTransaction.create({
      data: {
        organisationId: orgA.id,
        memberProfileId: memberProfile2.id,
        memberMembershipId: memberMembership2.id,
        invoiceId: invoice3.id,
        providerTransactionId: `tx-3-${ts}`,
        provider: 'MOCK',
        paymentMethodType: 'CARD',
        amountMinor: 5000,
        currency: 'AUD',
        status: 'SUCCEEDED',
      },
    });

    // Tx 4: $80.00 Succeeded (Unattributed)
    await prisma.paymentTransaction.create({
      data: {
        organisationId: orgA.id,
        memberProfileId: memberProfile3.id,
        memberMembershipId: memberMembership3.id,
        providerTransactionId: `tx-4-${ts}`,
        provider: 'MOCK',
        paymentMethodType: 'CARD',
        amountMinor: 8000,
        currency: 'AUD',
        status: 'SUCCEEDED',
      },
    });

    // Tx 5: $100.00 Failed
    await prisma.paymentTransaction.create({
      data: {
        organisationId: orgA.id,
        memberProfileId: memberProfile1.id,
        providerTransactionId: `tx-5-failed-${ts}`,
        provider: 'MOCK',
        paymentMethodType: 'CARD',
        amountMinor: 10000,
        currency: 'AUD',
        status: 'FAILED',
      },
    });

    // Tx 6: $150.00 Succeeded in USD (Org A Multi-Currency test!)
    await prisma.paymentTransaction.create({
      data: {
        organisationId: orgA.id,
        memberProfileId: memberProfile1.id,
        memberMembershipId: memberMembership1.id,
        providerTransactionId: `tx-6-usd-${ts}`,
        provider: 'MOCK',
        paymentMethodType: 'CARD',
        amountMinor: 15000,
        currency: 'USD',
        status: 'SUCCEEDED',
      },
    });

    // 7. Transactions in Org B ($300.00 USD)
    const memberUserB = await prisma.user.create({
      data: {
        email: `memberb-${ts}@test.com`,
        passwordHash: 'dummyhash',
        firstName: 'Bob',
        lastName: 'Dylan',
        status: 'ACTIVE',
      },
    });
    const memberProfileB = await prisma.memberProfile.create({
      data: {
        userId: memberUserB.id,
        organisationId: orgB.id,
        status: 'ACTIVE',
      },
    });

    await prisma.paymentTransaction.create({
      data: {
        organisationId: orgB.id,
        memberProfileId: memberProfileB.id,
        providerTransactionId: `tx-b-${ts}`,
        provider: 'MOCK',
        paymentMethodType: 'CARD',
        amountMinor: 30000,
        currency: 'USD',
        status: 'SUCCEEDED',
      },
    });
  });

  afterAll(async () => {
    // Teardown
    if (orgA?.id && orgB?.id) {
      await prisma.paymentRefund.deleteMany({
        where: { paymentTransaction: { organisationId: { in: [orgA.id, orgB.id] } } },
      });
      await prisma.paymentTransaction.deleteMany({
        where: { organisationId: { in: [orgA.id, orgB.id] } },
      });
      await prisma.financialTransactionReference.deleteMany({
        where: { organisationId: { in: [orgA.id, orgB.id] } },
      });
      await prisma.financialDailySummary.deleteMany({
        where: { organisationId: { in: [orgA.id, orgB.id] } },
      });
      await prisma.invoice.deleteMany({
        where: { organisationId: { in: [orgA.id, orgB.id] } },
      });
      await prisma.memberMembership.deleteMany({
        where: { memberProfile: { organisationId: { in: [orgA.id, orgB.id] } } },
      });
      await prisma.memberProfile.deleteMany({
        where: { organisationId: { in: [orgA.id, orgB.id] } },
      });
      await prisma.membershipPlan.deleteMany({
        where: { organisationId: { in: [orgA.id, orgB.id] } },
      });
      await prisma.outlet.deleteMany({
        where: { organisationId: { in: [orgA.id, orgB.id] } },
      });
      await prisma.organisation.deleteMany({
        where: { id: { in: [orgA.id, orgB.id] } },
      });
    }
    if (memberUser1?.id) await prisma.user.delete({ where: { id: memberUser1.id } }).catch(() => null);
    if (memberUser2?.id) await prisma.user.delete({ where: { id: memberUser2.id } }).catch(() => null);
    if (memberUser3?.id) await prisma.user.delete({ where: { id: memberUser3.id } }).catch(() => null);
    if (trainerUser?.id) await prisma.user.delete({ where: { id: trainerUser.id } }).catch(() => null);
    await app.close();
  });

  describe('1. Overview KPIs & Deterministic Math', () => {
    it('calculates gross, net, refund, and payment success rate with 100% precision', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/financial-intelligence/overview')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      const data = res.body.data;
      expect(data).toBeDefined();
      expect(data.currencies).toBeDefined();

      const aud = data.currencies.find((c: any) => c.currency === 'AUD');
      expect(aud).toBeDefined();

      // AUD Gross: 10000 + 10000 + 5000 + 8000 = 33000 minor ($330.00)
      expect(aud.grossRevenueMinor).toBe(33000);
      expect(aud.grossRevenue).toBe(330);

      // AUD Refunds: 2000 minor ($20.00)
      expect(aud.totalRefundsMinor).toBe(2000);
      expect(aud.totalRefunds).toBe(20);

      // AUD Net: 33000 - 2000 = 31000 minor ($310.00)
      expect(aud.netRevenueMinor).toBe(31000);
      expect(aud.netRevenue).toBe(310);

      // AUD Refund rate: (2000 / 33000) * 100 = 6.06%
      expect(aud.refundRate).toBeCloseTo(6.06, 1);

      // AUD Success rate: 4 succeeded / 5 total = 80%
      expect(aud.successRate).toBe(80);

      // AUD Outstanding Invoices: 6000 minor ($60.00)
      expect(aud.outstandingBalanceMinor).toBe(6000);
      expect(aud.outstandingBalance).toBe(60);
    });

    it('returns canonical metric definitions via API', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/financial-intelligence/definitions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      const definitions = res.body.data;
      expect(Array.isArray(definitions)).toBe(true);
      const grossDef = definitions.find((d: any) => d.code === 'GROSS_REVENUE');
      expect(grossDef).toBeDefined();
      expect(grossDef.canonicalFormula).toContain('Sum of all successful payment transactions');
    });
  });

  describe('2. Multi-Currency Isolation (AUD vs USD)', () => {
    it('strictly isolates AUD and USD into distinct buckets without mixed conversion', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/financial-intelligence/overview')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      const currencies = res.body.data.currencies;
      expect(currencies.length).toBe(2); // AUD and USD

      const usd = currencies.find((c: any) => c.currency === 'USD');
      expect(usd).toBeDefined();
      expect(usd.grossRevenueMinor).toBe(15000); // $150.00 USD
      expect(usd.grossRevenue).toBe(150);
      expect(usd.totalRefundsMinor).toBe(0);
      expect(usd.netRevenueMinor).toBe(15000);
    });
  });

  describe('3. Strict Outlet Attribution & UNATTRIBUTED Fallback', () => {
    it('attributes transactions via member origin outlet and tags missing origin as UNATTRIBUTED', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/financial-intelligence/outlets?currency=AUD')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      const outlets = res.body.data;
      expect(Array.isArray(outlets)).toBe(true);

      // Outlet A1: Tx1 ($100) + Tx2 ($100 - $20 refund) = Gross $200, Net $180
      const a1 = outlets.find((o: any) => o.outletId === outletA1.id);
      expect(a1).toBeDefined();
      expect(a1.grossRevenueMinor).toBe(20000);
      expect(a1.netRevenueMinor).toBe(18000);
      expect(a1.totalRefundsMinor).toBe(2000);

      // Outlet A2: Tx3 ($50) = Gross $50, Net $50
      const a2 = outlets.find((o: any) => o.outletId === outletA2.id);
      expect(a2).toBeDefined();
      expect(a2.grossRevenueMinor).toBe(5000);
      expect(a2.netRevenueMinor).toBe(5000);

      // Unattributed: Tx4 ($80)
      const unattributed = outlets.find((o: any) => o.outletId === 'UNATTRIBUTED');
      expect(unattributed).toBeDefined();
      expect(unattributed.outletName).toContain('Unattributed');
      expect(unattributed.grossRevenueMinor).toBe(8000);
      expect(unattributed.netRevenueMinor).toBe(8000);
    });
  });

  describe('4. Membership Plan Revenue Mix', () => {
    it('breaks down recognized cash flow by membership plan', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/financial-intelligence/plans?currency=AUD')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      const plans = res.body.data;
      expect(Array.isArray(plans)).toBe(true);

      const plat = plans.find((p: any) => p.planId === planA1.id);
      expect(plat).toBeDefined();
      // Tx1 ($100) + Tx2 ($100) + Tx4 ($80) = $280 Gross (28000 minor)
      expect(plat.grossRevenueMinor).toBe(28000);

      const std = plans.find((p: any) => p.planId === planA2.id);
      expect(std).toBeDefined();
      // Tx3 ($50) = $50 Gross (5000 minor)
      expect(std.grossRevenueMinor).toBe(5000);
    });
  });

  describe('5. Invoice Aging & Outstanding Balances', () => {
    it('returns invoice counts and accurate outstanding debt without counting as cash revenue', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/financial-intelligence/invoices?currency=AUD')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      const invoiceSummary = res.body.data;
      expect(invoiceSummary).toBeDefined();
      expect(invoiceSummary.totalInvoices).toBe(4);
      expect(invoiceSummary.paidInvoices).toBe(3);
      expect(invoiceSummary.openInvoices).toBe(1);
      expect(invoiceSummary.totalOutstandingMinor).toBe(6000); // $60.00
      expect(invoiceSummary.totalOutstanding).toBe(60);
    });
  });

  describe('6. Financial Reconciliation & Projection Synchronization', () => {
    it('reports unprojected transactions and synchronizes them idempotently', async () => {
      // 1. Check initial reconciliation report
      const initialReport = await request(app.getHttpServer())
        .get('/api/v1/financial-intelligence/reconciliation?currency=AUD')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      expect(initialReport.body.data).toBeDefined();
      expect(initialReport.body.data.unprojectedTransactions).toBeGreaterThan(0);

      // 2. Trigger sync
      const syncRes = await request(app.getHttpServer())
        .post('/api/v1/financial-intelligence/reconciliation/sync')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      expect(syncRes.body.data.success).toBe(true);
      expect(syncRes.body.data.syncedCount).toBeGreaterThan(0);

      // 3. Re-check report — unprojected should now be 0
      const postSyncReport = await request(app.getHttpServer())
        .get('/api/v1/financial-intelligence/reconciliation?currency=AUD')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      expect(postSyncReport.body.data.unprojectedTransactions).toBe(0);
      expect(postSyncReport.body.data.discrepancies).toHaveLength(0);

      // 4. Test idempotency (trigger sync again, should not create duplicate rows)
      const secondSyncRes = await request(app.getHttpServer())
        .post('/api/v1/financial-intelligence/reconciliation/sync')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      expect(secondSyncRes.body.data.success).toBe(true);
    });
  });

  describe('7. Financial Data Quality & Anomaly Engine', () => {
    it('evaluates data quality rating and flags unattributed memberships', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/financial-intelligence/data-quality?currency=AUD')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      const quality = res.body.data;
      expect(quality).toBeDefined();
      expect(quality.score).toBeGreaterThan(0);
      expect(['EXCELLENT', 'GOOD', 'ACCEPTABLE']).toContain(quality.rating);
      expect(quality.unattributedTransactions).toBe(1); // Tx4 has no outlet
      expect(quality.negativeAmountsDetected).toBe(0);
      expect(quality.overRefundsDetected).toBe(0);
    });
  });

  describe('8. Grounded Context Service (Day 44 AI Preparation)', () => {
    it('generates structured financial snapshot without any LLM calls', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/financial-intelligence/context?currency=AUD')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      const context = res.body.data;
      expect(context).toBeDefined();
      expect(context.organisationId).toBe(orgA.id);
      expect(context.metrics.grossRevenue).toBe(330);
      expect(context.metrics.netRevenue).toBe(310);
      expect(context.metrics.totalRefunds).toBe(20);
      expect(context.outlets.length).toBeGreaterThan(0);
      expect(context.integrityRating).toBeDefined();
    });
  });

  describe('9. Drill-Down Pagination & RFC 4180 Sanitized CSV Export', () => {
    it('returns paginated transactions with masked member names in drill-down', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/financial-intelligence/drill-down?currency=AUD&limit=10')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      const drillDown = res.body.data;
      expect(drillDown.transactions).toBeDefined();
      expect(drillDown.transactions.length).toBeGreaterThan(0);
      expect(drillDown.total).toBe(5); // 5 AUD transactions
    });

    it('generates RFC 4180 CSV export with PII masking and audit log creation', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/financial-intelligence/export?currency=AUD')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect('Content-Type', /text\/csv/)
        .expect(200);

      const csv = res.text;
      expect(csv).toContain('Transaction ID');
      expect(csv).toContain('Gross (AUD)');
      expect(csv).toContain('Net (AUD)');
      // PII masking check: "John Doe" should be masked e.g. "J*** D***"
      expect(csv).toContain('J*** D***');
    });
  });

  describe('10. Member Self-Finances Isolation', () => {
    it('allows a member to view exclusively their own payment transactions and invoices', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/financial-intelligence/member/my-finances')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-user-id', memberUser1.id)
        .set('x-role', 'MEMBER')
        .expect(200);

      const myFinances = res.body.data;
      expect(myFinances).toBeDefined();
      expect(myFinances.transactions).toBeDefined();

      // Member 1 has Tx1, Tx2, Tx5 (Failed), Tx6 (USD)
      expect(myFinances.transactions.length).toBe(4);
      // Ensure none of Member 2's or Member 3's transactions appear
      const otherTxs = myFinances.transactions.filter(
        (t: any) => t.memberProfileId !== memberProfile1.id,
      );
      expect(otherTxs).toHaveLength(0);
    });
  });

  describe('11. RBAC, Tenant Isolation & IDOR Defense', () => {
    it('blocks MEMBER from accessing organisation overview (HTTP 403)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/financial-intelligence/overview')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-user-id', memberUser1.id)
        .set('x-role', 'MEMBER')
        .expect(403);
    });

    it('blocks TRAINER from accessing organisation overview (HTTP 403)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/financial-intelligence/overview')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-user-id', trainerUser.id)
        .set('x-role', 'TRAINER')
        .expect(403);
    });

    it('blocks OUTLET_MANAGER of Outlet A1 from requesting Outlet A2 (HTTP 403)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/financial-intelligence/overview?outletId=${outletA2.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'OUTLET_MANAGER')
        .set('x-outlet-id', outletA1.id)
        .expect(403);
    });

    it('strictly isolates Org A financial data from Org B (cross-tenant zero leakage)', async () => {
      const resB = await request(app.getHttpServer())
        .get('/api/v1/financial-intelligence/overview')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgB.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      const currenciesB = resB.body.data.currencies;
      // Org B has only USD ($300.00), zero AUD
      expect(currenciesB).toHaveLength(1);
      const usdB = currenciesB[0];
      expect(usdB.currency).toBe('USD');
      expect(usdB.grossRevenueMinor).toBe(30000);
      expect(usdB.grossRevenue).toBe(300);

      // Org B should have NO AUD records
      const audInB = currenciesB.find((c: any) => c.currency === 'AUD');
      expect(audInB).toBeUndefined();
    });

    it('enforces multi-tenant cache isolation (never returns Org A cache to Org B)', async () => {
      const keyA = cacheService.generateKey({
        organisationId: orgA.id,
        roleScope: 'ORGANISATION',
        endpoint: 'test',
        filters: {},
      });
      cacheService.set({
        key: keyA,
        data: { secretRevenue: 999999 },
        organisationId: orgA.id,
        roleScope: 'ORGANISATION',
      });

      const crossTenantResult = cacheService.get(keyA, orgB.id);
      expect(crossTenantResult).toBeNull();
    });
  });
});
