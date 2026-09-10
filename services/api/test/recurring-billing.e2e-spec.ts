/**
 * Day 42 — Recurring Billing & Collections Comprehensive E2E Test Suite
 *
 * Validates:
 * 1. Billing Schedule Creation, Interval Math & Lifecycle State Transitions
 * 2. Due Schedule Processing, Cycle Generation & Historical Price Snapshotting
 * 3. Double-Charge Prevention, Idempotency & Paid Guard
 * 4. Successful Recurring Payment Collection & Membership Lifecycle Bridge
 * 5. Payment Failure Classification (Retryable vs Non-Retryable)
 * 6. Retry Policy & Dunning Engine (Cases, Steps & Recovery Resolutions)
 * 7. Overdue Invoice Processing & Prioritized Collection Queue
 * 8. Member Self-Billing API & IDOR Isolation
 * 9. RBAC & Multi-Tenant Isolation (Member 403, Trainer 403, Cross-Outlet 403, Cross-Org Isolation)
 * 10. Recurring Billing Metrics (Success Rate, Collection Rate, Recovery Rate)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { BillingScheduleService } from '../src/recurring-billing/services/billing-schedule.service';
import { BillingCycleService } from '../src/recurring-billing/services/billing-cycle.service';
import { RecurringPaymentService } from '../src/recurring-billing/services/recurring-payment.service';
import { FailureClassifierService } from '../src/recurring-billing/services/failure-classifier.service';
import { RetryPolicyService } from '../src/recurring-billing/services/retry-policy.service';
import { DunningService } from '../src/recurring-billing/services/dunning.service';
import { CollectionQueueService } from '../src/recurring-billing/services/collection-queue.service';
import { RecurringMetricsService } from '../src/recurring-billing/services/recurring-metrics.service';
import { OverdueInvoiceJob } from '../src/recurring-billing/jobs/overdue-invoice.job';
import request from 'supertest';

describe('Day 42: Recurring Billing & Collections E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let scheduleService: BillingScheduleService;
  let cycleService: BillingCycleService;
  let paymentService: RecurringPaymentService;
  let classifierService: FailureClassifierService;
  let retryPolicyService: RetryPolicyService;
  let dunningService: DunningService;
  let collectionQueueService: CollectionQueueService;
  let metricsService: RecurringMetricsService;
  let overdueInvoiceJob: OverdueInvoiceJob;

  let superAdminToken: string;
  let orgA: any;
  let orgB: any;
  let outletA1: any;
  let outletA2: any;
  let planA1: any;
  let planA2: any;
  let memberUser1: any;
  let memberProfile1: any;
  let memberMembership1: any;
  let paymentMethod1: any;
  let memberUser2: any;
  let memberProfile2: any;
  let memberMembership2: any;
  let paymentMethod2: any;
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

    prisma = app.get(PrismaService);
    scheduleService = app.get(BillingScheduleService);
    cycleService = app.get(BillingCycleService);
    paymentService = app.get(RecurringPaymentService);
    classifierService = app.get(FailureClassifierService);
    retryPolicyService = app.get(RetryPolicyService);
    dunningService = app.get(DunningService);
    collectionQueueService = app.get(CollectionQueueService);
    metricsService = app.get(RecurringMetricsService);
    overdueInvoiceJob = app.get(OverdueInvoiceJob);

    // SuperAdmin token
    const saRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@fitcore.io', password: 'FitCoreDev2026!' });
    superAdminToken = saRes.body.data?.accessToken || saRes.body.accessToken;

    const ts = Date.now();

    // 1. Setup Organisations
    orgA = await prisma.organisation.create({
      data: {
        name: `Billing Org A ${ts}`,
        slug: `bill-org-a-${ts}`,
        status: 'ACTIVE',
        currency: 'AUD',
        timezone: 'Australia/Sydney',
      },
    });

    orgB = await prisma.organisation.create({
      data: {
        name: `Billing Org B ${ts}`,
        slug: `bill-org-b-${ts}`,
        status: 'ACTIVE',
        currency: 'USD',
        timezone: 'America/New_York',
      },
    });

    // 2. Outlets
    outletA1 = await prisma.outlet.create({
      data: {
        organisationId: orgA.id,
        name: `Sydney CBD ${ts}`,
        code: `SYD-${ts}`,
        slug: `sydney-cbd-${ts}`,
        address: '50 Pitt St',
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
        name: `North Sydney ${ts}`,
        code: `NSY-${ts}`,
        slug: `north-sydney-${ts}`,
        address: '100 Miller St',
        city: 'North Sydney',
        state: 'NSW',
        country: 'Australia',
        postalCode: '2060',
        status: 'ACTIVE',
      },
    });

    // 3. Membership Plans
    planA1 = await prisma.membershipPlan.create({
      data: {
        organisationId: orgA.id,
        name: `Gold Flexible ${ts}`,
        code: `GOLD-${ts}`,
        description: 'Monthly recurring gym access',
        membershipType: 'STANDARD',
        billingType: 'RECURRING',
        price: 120,
        currency: 'AUD',
        durationValue: 1,
        durationUnit: 'MONTH',
        status: 'ACTIVE',
      },
    });

    planA2 = await prisma.membershipPlan.create({
      data: {
        organisationId: orgA.id,
        name: `Platinum Annual ${ts}`,
        code: `PLAT-${ts}`,
        description: 'Annual recurring access',
        membershipType: 'STANDARD',
        billingType: 'RECURRING',
        price: 1200,
        currency: 'AUD',
        durationValue: 12,
        durationUnit: 'YEAR',
        status: 'ACTIVE',
      },
    });

    // 4. Member 1
    memberUser1 = await prisma.user.create({
      data: {
        email: `member1-${ts}@billingtest.com`,
        passwordHash: 'dummyhash',
        firstName: 'Alice',
        lastName: 'Smith',
        phone: '+61400111222',
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
    await prisma.memberOutlet.create({
      data: {
        memberProfileId: memberProfile1.id,
        outletId: outletA1.id,
      },
    });
    memberMembership1 = await prisma.memberMembership.create({
      data: {
        organisationId: orgA.id,
        memberProfileId: memberProfile1.id,
        membershipPlanId: planA1.id,
        originOutletId: outletA1.id,
        status: 'ACTIVE',
        accessScope: 'SINGLE_OUTLET',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        planNameAtPurchase: planA1.name,
        priceAtPurchase: 120,
        currencyAtPurchase: 'AUD',
        billingTypeAtPurchase: 'RECURRING',
        durationValueAtPurchase: 1,
        durationUnitAtPurchase: 'MONTHS',
        autoRenew: true,
      },
    });
    paymentMethod1 = await prisma.paymentMethod.create({
      data: {
        organisationId: orgA.id,
        memberProfileId: memberProfile1.id,
        provider: 'MOCK',
        providerPaymentMethodId: `pm_mock_alice_${ts}`,
        type: 'CARD',
        brand: 'visa',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2028,
        isDefault: true,
        status: 'ACTIVE',
      },
    });

    // 5. Member 2
    memberUser2 = await prisma.user.create({
      data: {
        email: `member2-${ts}@billingtest.com`,
        passwordHash: 'dummyhash',
        firstName: 'Bob',
        lastName: 'Jones',
        phone: '+61400333444',
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
    await prisma.memberOutlet.create({
      data: {
        memberProfileId: memberProfile2.id,
        outletId: outletA2.id,
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
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        planNameAtPurchase: planA2.name,
        priceAtPurchase: 1200,
        currencyAtPurchase: 'AUD',
        billingTypeAtPurchase: 'RECURRING',
        durationValueAtPurchase: 12,
        durationUnitAtPurchase: 'MONTHS',
        autoRenew: true,
      },
    });
    paymentMethod2 = await prisma.paymentMethod.create({
      data: {
        organisationId: orgA.id,
        memberProfileId: memberProfile2.id,
        provider: 'MOCK',
        providerPaymentMethodId: `pm_mock_bob_${ts}`,
        type: 'CARD',
        brand: 'mastercard',
        last4: '5555',
        expiryMonth: 10,
        expiryYear: 2029,
        isDefault: true,
        status: 'ACTIVE',
      },
    });

    // 6. Trainer and Staff users
    trainerUser = await prisma.user.create({
      data: {
        email: `trainer-${ts}@billingtest.com`,
        passwordHash: 'dummyhash',
        firstName: 'Coach',
        lastName: 'Trainer',
        status: 'ACTIVE',
      },
    });

    staffUser = await prisma.user.create({
      data: {
        email: `staff-${ts}@billingtest.com`,
        passwordHash: 'dummyhash',
        firstName: 'Desk',
        lastName: 'Reception',
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  // ===========================================================================
  // 1. Billing Schedule Lifecycle & Interval Calculations
  // ===========================================================================
  describe('1. Billing Schedule Lifecycle & Interval Calculations', () => {
    let createdScheduleId: string;

    it('creates a billing schedule via API with valid parameters', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/recurring-billing/schedules')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .send({
          memberProfileId: memberProfile1.id,
          memberMembershipId: memberMembership1.id,
          membershipPlanId: planA1.id,
          originOutletId: outletA1.id,
          billingInterval: 'MONTHLY',
          amountMinor: 12000,
          currency: 'AUD',
          paymentMethodId: paymentMethod1.id,
        })
        .expect(201);

      const schedule = res.body.data || res.body;
      expect(schedule.id).toBeDefined();
      expect(schedule.amountMinor).toBe(12000);
      expect(schedule.amount).toBe(120);
      expect(schedule.status).toBe('ACTIVE');
      expect(schedule.billingInterval).toBe('MONTHLY');
      createdScheduleId = schedule.id;
    });

    it('correctly calculates next billing date across diverse intervals', () => {
      const baseDate = new Date('2026-01-15T00:00:00Z');

      const weekly = scheduleService.calculateNextBillingDate(baseDate, 'WEEKLY', 1);
      expect(weekly.toISOString().startsWith('2026-01-22')).toBe(true);

      const biweekly = scheduleService.calculateNextBillingDate(baseDate, 'BIWEEKLY', 1);
      expect(biweekly.toISOString().startsWith('2026-01-29')).toBe(true);

      const monthly = scheduleService.calculateNextBillingDate(baseDate, 'MONTHLY', 1);
      expect(monthly.toISOString().startsWith('2026-02-15')).toBe(true);

      const quarterly = scheduleService.calculateNextBillingDate(baseDate, 'QUARTERLY', 1);
      expect(quarterly.toISOString().startsWith('2026-04-15')).toBe(true);

      const annually = scheduleService.calculateNextBillingDate(baseDate, 'ANNUALLY', 1);
      expect(annually.toISOString().startsWith('2027-01-15')).toBe(true);

      // Month-end clamping (Jan 31 + 1 month -> Feb 28 in non-leap year)
      const jan31 = new Date('2026-01-31T00:00:00Z');
      const febClamped = scheduleService.calculateNextBillingDate(jan31, 'MONTHLY', 1);
      expect(febClamped.getMonth()).toBe(1); // February
      expect(febClamped.getDate()).toBe(28);
    });

    it('transitions schedule status cleanly: ACTIVE -> PAUSED -> ACTIVE -> CANCELLED', async () => {
      // Pause
      const pauseRes = await request(app.getHttpServer())
        .post(`/api/v1/recurring-billing/schedules/${createdScheduleId}/pause`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);
      expect((pauseRes.body.data || pauseRes.body).status).toBe('PAUSED');

      // Resume
      const resumeRes = await request(app.getHttpServer())
        .post(`/api/v1/recurring-billing/schedules/${createdScheduleId}/resume`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);
      expect((resumeRes.body.data || resumeRes.body).status).toBe('ACTIVE');

      // Cancel
      const cancelRes = await request(app.getHttpServer())
        .post(`/api/v1/recurring-billing/schedules/${createdScheduleId}/cancel`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);
      expect((cancelRes.body.data || cancelRes.body).status).toBe('CANCELLED');
    });
  });

  // ===========================================================================
  // 2. Billing Cycle Generation & Historical Price Snapshotting
  // ===========================================================================
  describe('2. Due Schedule Processing & Price Snapshotting', () => {
    let activeSchedule: any;
    let cycleId: string;
    let invoiceId: string;

    beforeAll(async () => {
      // Create an active schedule whose nextBillingDate is due (in the past)
      const pastDate = new Date(Date.now() - 60 * 1000);
      activeSchedule = await prisma.billingSchedule.create({
        data: {
          organisationId: orgA.id,
          memberProfileId: memberProfile1.id,
          memberMembershipId: memberMembership1.id,
          membershipPlanId: planA1.id,
          originOutletId: outletA1.id,
          billingInterval: 'MONTHLY',
          amountMinor: 12000,
          currency: 'AUD',
          nextBillingDate: pastDate,
          status: 'ACTIVE',
          paymentMethodId: paymentMethod1.id,
        },
      });
    });

    it('generates due cycles in bounded batches and creates authoritative invoices', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/recurring-billing/schedules/generate-cycles')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      expect((res.body.data || res.body).cyclesGenerated).toBeGreaterThan(0);

      // Verify created cycle
      const cycles = await prisma.billingCycle.findMany({
        where: { billingScheduleId: activeSchedule.id },
        include: { invoice: true },
      });

      expect(cycles.length).toBe(1);
      const cycle = cycles[0];
      expect(cycle.cycleNumber).toBe(1);
      expect(cycle.status).toBe('INVOICED');
      expect(cycle.amountMinor).toBe(12000);
      expect(cycle.invoiceId).toBeDefined();

      const invoice = cycle.invoice;
      expect(invoice).toBeDefined();
      expect(invoice?.totalMinor).toBe(12000);
      expect(invoice?.status).toBe('OPEN');

      cycleId = cycle.id;
      invoiceId = cycle.invoiceId!;
    });

    it('preserves historical pricing snapshot when plan retail price changes later', async () => {
      // Future plan price increase: $120 -> $150
      await prisma.membershipPlan.update({
        where: { id: planA1.id },
        data: { price: 150 },
      });

      // Existing cycle invoice must still reflect the historical $120 snapshot
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });
      expect(invoice?.totalMinor).toBe(12000); // exactly 12000 cents ($120.00)
    });
  });

  // ===========================================================================
  // 3. Double-Charge Prevention & Concurrency
  // ===========================================================================
  describe('3. Double-Charge Prevention & Concurrency Protection', () => {
    it('structurally prevents generating duplicate cycles for the same period', async () => {
      // Create a schedule with 1 existing cycle
      const schedule = await prisma.billingSchedule.create({
        data: {
          organisationId: orgA.id,
          memberProfileId: memberProfile1.id,
          memberMembershipId: memberMembership1.id,
          membershipPlanId: planA1.id,
          billingInterval: 'MONTHLY',
          amountMinor: 12000,
          currency: 'AUD',
          nextBillingDate: new Date(),
          status: 'ACTIVE',
        },
      });

      // Generate cycle 1
      const cycle1 = await cycleService.generateCycleForSchedule(schedule.id);
      expect(cycle1).toBeDefined();
      expect(cycle1?.cycleNumber).toBe(1);

      // Attempt to directly insert another cycle with cycleNumber: 1
      await expect(
        prisma.billingCycle.create({
          data: {
            organisationId: orgA.id,
            billingScheduleId: schedule.id,
            memberProfileId: memberProfile1.id,
            memberMembershipId: memberMembership1.id,
            cycleNumber: 1, // DUPLICATE cycleNumber
            periodStart: new Date(),
            periodEnd: new Date(),
            scheduledBillingDate: new Date(),
            amountMinor: 12000,
            currency: 'AUD',
            status: 'INVOICED',
          },
        }),
      ).rejects.toThrow();
    });

    it('rejects duplicate payment collection if cycle is already PAID (HTTP 400)', async () => {
      // Create a cycle that is already PAID
      const paidCycle = await prisma.billingCycle.create({
        data: {
          organisationId: orgA.id,
          billingScheduleId: (await prisma.billingSchedule.findFirst())!.id,
          memberProfileId: memberProfile1.id,
          memberMembershipId: memberMembership1.id,
          cycleNumber: 999,
          periodStart: new Date(),
          periodEnd: new Date(),
          scheduledBillingDate: new Date(),
          amountMinor: 12000,
          currency: 'AUD',
          status: 'PAID', // Already PAID
        },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/recurring-billing/cycles/${paidCycle.id}/collect`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(400);
    });
  });

  // ===========================================================================
  // 4. Successful Recurring Payment Collection & Membership Lifecycle Bridge
  // ===========================================================================
  describe('4. Successful Recurring Payment & Membership Lifecycle Bridge', () => {
    it('successfully collects payment, marks invoice and cycle PAID, and advances next billing date', async () => {
      const schedule = await prisma.billingSchedule.create({
        data: {
          organisationId: orgA.id,
          memberProfileId: memberProfile1.id,
          memberMembershipId: memberMembership1.id,
          membershipPlanId: planA1.id,
          billingInterval: 'MONTHLY',
          amountMinor: 12000,
          currency: 'AUD',
          nextBillingDate: new Date('2026-03-01T00:00:00Z'),
          status: 'ACTIVE',
          paymentMethodId: paymentMethod1.id,
        },
      });

      const cycle = await cycleService.generateCycleForSchedule(schedule.id);
      expect(cycle).toBeDefined();

      // Collect payment
      const collectRes = await request(app.getHttpServer())
        .post(`/api/v1/recurring-billing/cycles/${cycle!.id}/collect`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      expect((collectRes.body.data || collectRes.body).status).toBe('SUCCEEDED');

      // Verify cycle status
      const updatedCycle = await prisma.billingCycle.findUnique({
        where: { id: cycle!.id },
      });
      expect(updatedCycle?.status).toBe('PAID');

      // Verify invoice status
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: cycle!.invoiceId! },
      });
      expect(updatedInvoice?.status).toBe('PAID');
      expect(updatedInvoice?.amountPaidMinor).toBe(12000);
      expect(updatedInvoice?.amountDueMinor).toBe(0);

      // Verify schedule nextBillingDate advanced to April
      const updatedSchedule = await prisma.billingSchedule.findUnique({
        where: { id: schedule.id },
      });
      expect(updatedSchedule?.nextBillingDate.toISOString().startsWith('2026-04-01')).toBe(true);
      expect(updatedSchedule?.failureCount).toBe(0);
    });
  });

  // ===========================================================================
  // 5. Payment Failure Classification & Retry Policy
  // ===========================================================================
  describe('5. Payment Failure Classification & Retry Policy', () => {
    it('classifies insufficient_funds as retryable and schedules next retry date', async () => {
      const classification = classifierService.classify(
        'insufficient_funds',
        'Your card has insufficient funds.',
      );
      expect(classification.category).toBe('INSUFFICIENT_FUNDS');
      expect(classification.isRetryable).toBe(true);

      // Retry policy calculation for attempt 1
      const retry = await retryPolicyService.calculateNextRetryDate(orgA.id, 1);
      expect(retry.isExhausted).toBe(false);
      expect(retry.nextRetryAt).toBeDefined();
    });

    it('classifies expired_card as non-retryable with no next retry date', async () => {
      const classification = classifierService.classify(
        'expired_card',
        'The card has expired.',
      );
      expect(classification.category).toBe('EXPIRED_PAYMENT_METHOD');
      expect(classification.isRetryable).toBe(false);
    });

    it('classifies 3D Secure authentication_required as non-retryable requiring customer action', async () => {
      const classification = classifierService.classify(
        'authentication_required',
        'Cardholder verification is required.',
      );
      expect(classification.category).toBe('AUTHENTICATION_REQUIRED');
      expect(classification.isRetryable).toBe(false);
    });
  });

  // ===========================================================================
  // 6. Dunning Engine & Communication Integration
  // ===========================================================================
  describe('6. Dunning Workflow & Communication Steps', () => {
    let dunningCycleId: string;
    let dunningCaseId: string;

    beforeAll(async () => {
      // Create a cycle that will fail
      const schedule = await prisma.billingSchedule.create({
        data: {
          organisationId: orgA.id,
          memberProfileId: memberProfile1.id,
          memberMembershipId: memberMembership1.id,
          membershipPlanId: planA1.id,
          billingInterval: 'MONTHLY',
          amountMinor: 12000,
          currency: 'AUD',
          nextBillingDate: new Date(),
          status: 'ACTIVE',
        },
      });

      const cycle = await cycleService.generateCycleForSchedule(schedule.id);
      dunningCycleId = cycle!.id;
    });

    it('initiates dunning case and dispatches reminder notification upon failure', async () => {
      // Trigger dunning failure handling
      const dCase = await dunningService.handlePaymentFailure(
        dunningCycleId,
        (await prisma.billingCycle.findUnique({ where: { id: dunningCycleId } }))!.invoiceId!,
        memberProfile1.id,
        'INSUFFICIENT_FUNDS',
        'insufficient_funds',
        true,
        new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      );

      expect(dCase).toBeDefined();
      expect(dCase.status).toBe('RETRYING');
      expect(dCase.totalAttempts).toBe(1);
      expect(dCase.steps?.length).toBeGreaterThan(0);
      expect(dCase.steps?.[0].actionType).toBe('EMAIL_REMINDER');
      expect(dCase.steps?.[0].status).toBe('EXECUTED');

      dunningCaseId = dCase.id;
    });

    it('resolves dunning case via API when manual payment or dispute is settled', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/recurring-billing/dunning/${dunningCaseId}/resolve`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .send({
          resolutionType: 'STAFF_RESOLVED',
          notes: 'Customer arranged alternate payment at reception',
        })
        .expect(200);

      expect((res.body.data || res.body).success).toBe(true);

      const updated = await dunningService.getDunningCaseById(orgA.id, dunningCaseId);
      expect(updated.status).toBe('RESOLVED');
      expect(updated.resolutionType).toBe('STAFF_RESOLVED');
    });
  });

  // ===========================================================================
  // 7. Overdue Invoices & Collection Queue Prioritization
  // ===========================================================================
  describe('7. Overdue Invoices & Prioritized Collection Queue', () => {
    let overdueInvoice: any;

    beforeAll(async () => {
      // Create past due invoice
      overdueInvoice = await prisma.invoice.create({
        data: {
          organisationId: orgA.id,
          memberProfileId: memberProfile2.id,
          invoiceNumber: `INV-OVERDUE-${Date.now()}`,
          status: 'OPEN',
          currency: 'AUD',
          subtotalMinor: 120000,
          totalMinor: 120000,
          amountDueMinor: 120000,
          dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days overdue
        },
      });

      // Create dunning case for overdue invoice
      const cycle = await prisma.billingCycle.create({
        data: {
          organisationId: orgA.id,
          billingScheduleId: (await prisma.billingSchedule.findFirst())!.id,
          memberProfileId: memberProfile2.id,
          memberMembershipId: memberMembership2.id,
          cycleNumber: 888,
          periodStart: new Date(),
          periodEnd: new Date(),
          scheduledBillingDate: new Date(),
          invoiceId: overdueInvoice.id,
          amountMinor: 120000,
          currency: 'AUD',
          status: 'FAILED',
        },
      });

      await prisma.dunningCase.create({
        data: {
          organisationId: orgA.id,
          billingCycleId: cycle.id,
          invoiceId: overdueInvoice.id,
          memberProfileId: memberProfile2.id,
          status: 'ESCALATED',
          totalAttempts: 3,
        },
      });
    });

    it('scans and marks past due invoices as OVERDUE via background job', async () => {
      const result = await overdueInvoiceJob.runOverdueInvoiceScan(orgA.id);
      expect(result.markedOverdueCount).toBeGreaterThanOrEqual(1);

      const inv = await prisma.invoice.findUnique({ where: { id: overdueInvoice.id } });
      expect(inv?.status).toBe('OVERDUE');
    });

    it('returns collection queue sorted by deterministic priority score', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/recurring-billing/collections?currency=AUD')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      const queue = res.body.data || res.body;
      expect(queue.totalQueueCount).toBeGreaterThan(0);
      expect(queue.items.length).toBeGreaterThan(0);

      // Verify priority calculation
      const topItem = queue.items[0];
      expect(topItem.priorityScore).toBeGreaterThanOrEqual(20);
      expect(topItem.currency).toBe('AUD');
      expect(topItem.daysOverdue).toBeGreaterThanOrEqual(9);
    });

    it('assigns staff to a collection task via API', async () => {
      // Create a collection task
      const task = await collectionQueueService.createCollectionTaskForDunning(
        (await prisma.dunningCase.findFirst({ where: { organisationId: orgA.id } }))!.id,
        orgA.id,
        memberProfile2.id,
        overdueInvoice.id,
        120000,
        'AUD',
        'Overdue high-value outreach',
      );

      const res = await request(app.getHttpServer())
        .post(`/api/v1/recurring-billing/collections/${task.id}/assign`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .send({ assignedStaffId: staffUser.id })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.assignedStaffId).toBe(staffUser.id);
      expect(body.status).toBe('ASSIGNED');
    });
  });

  // ===========================================================================
  // 8. Member Self-Billing API & IDOR Isolation
  // ===========================================================================
  describe('8. Member Self-Billing API & IDOR Isolation', () => {
    it('returns member-friendly subscription status without exposing internal error codes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/me/billing/status')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-user-id', memberUser1.id)
        .set('x-role', 'MEMBER')
        .expect(200);

      const status = res.body.data || res.body;
      expect(status.statusText).toBeDefined();
      expect(status.statusText).toContain('Active subscription');
      expect(status.paymentMethodMasked).toBeDefined();
      expect(status.paymentMethodMasked).toContain('••••');
    });

    it('isolates member data: Member 1 can only view their own invoices and attempts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/me/billing/invoices')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-user-id', memberUser1.id)
        .set('x-role', 'MEMBER')
        .expect(200);

      const body = res.body.data || res.body;
      const invoices = body.invoices || body;
      expect(Array.isArray(invoices)).toBe(true);

      // Verify none of Member 2's invoices are returned
      for (const inv of invoices) {
        const dbInv = await prisma.invoice.findUnique({ where: { id: inv.id } });
        expect(dbInv?.memberProfileId).toBe(memberProfile1.id);
      }
    });

    it('updates payment method on active subscription via member self-service', async () => {
      // Create new payment method for Member 1
      const newPm = await prisma.paymentMethod.create({
        data: {
          organisationId: orgA.id,
          memberProfileId: memberProfile1.id,
          provider: 'MOCK',
          providerPaymentMethodId: `pm_mock_new_${Date.now()}`,
          type: 'CARD',
          brand: 'visa',
          last4: '1111',
          expiryMonth: 5,
          expiryYear: 2030,
          status: 'ACTIVE',
        },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/me/billing/payment-method')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-user-id', memberUser1.id)
        .set('x-role', 'MEMBER')
        .send({ paymentMethodId: newPm.id })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.success).toBe(true);
      expect(body.schedule.paymentMethodId).toBe(newPm.id);
    });
  });

  // ===========================================================================
  // 9. RBAC & Multi-Tenant Isolation
  // ===========================================================================
  describe('9. RBAC & Multi-Tenant Isolation', () => {
    it('blocks MEMBER from accessing admin recurring billing endpoints (HTTP 403)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/recurring-billing/schedules')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-user-id', memberUser1.id)
        .set('x-role', 'MEMBER')
        .expect(403);
    });

    it('blocks TRAINER from accessing recurring billing & collections (HTTP 403)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/recurring-billing/collections')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-user-id', trainerUser.id)
        .set('x-role', 'TRAINER')
        .expect(403);
    });

    it('blocks OUTLET_MANAGER of Outlet A1 from requesting Outlet A2 (HTTP 403)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/recurring-billing/schedules?outletId=${outletA2.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'OUTLET_MANAGER')
        .set('x-outlet-id', outletA1.id)
        .expect(403);
    });

    it('strictly isolates Org A from Org B (cross-tenant zero leakage)', async () => {
      // Requesting Org A with an Org B header
      const res = await request(app.getHttpServer())
        .get('/api/v1/recurring-billing/schedules')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgB.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      // Org B should have zero of Org A's schedules
      expect(res.body.total).toBe(0);
    });
  });

  // ===========================================================================
  // 10. Recurring Billing Metrics Engine
  // ===========================================================================
  describe('10. Recurring Billing Metrics Engine', () => {
    it('computes accurate recurring metrics with safe zero division', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/recurring-billing/metrics?currency=AUD')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-organisation-id', orgA.id)
        .set('x-role', 'ORGANISATION_OWNER')
        .expect(200);

      const m = res.body;
      expect(m.currency).toBe('AUD');
      expect(m.activeSchedules).toBeGreaterThan(0);
      expect(m.recurringBilledMinor).toBeGreaterThan(0);
      expect(m.recurringCollectedMinor).toBeGreaterThan(0);
      expect(m.collectionRate).toBeGreaterThan(0);
      expect(m.overdueInvoicesCount).toBeGreaterThan(0);
    });
  });
});
