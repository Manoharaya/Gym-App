import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AccessDecisionService } from '../src/access/services/access-decision.service';
import { AccessCredentialService } from '../src/access/services/access-credential.service';
import { CheckInService } from '../src/access/services/checkin.service';
import { CheckOutService } from '../src/access/services/checkout.service';
import { AccessOverrideService } from '../src/access/services/access-override.service';

describe('Physical Access, Check-In & Door Control Lifecycle (Day 7 E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let decisionService: AccessDecisionService;
  let credentialService: AccessCredentialService;
  let checkinService: CheckInService;
  let checkoutService: CheckOutService;
  let overrideService: AccessOverrideService;

  let ownerToken: string;
  let memberToken: string;
  let receptionToken: string;

  let orgId: string;
  let outletAId: string;
  let outletBId: string;
  let otherOrgId: string;
  let otherOutletId: string;

  let testMemberProfileId: string;
  let testUserId: string;

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
      })
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();

    prisma = app.get(PrismaService);
    decisionService = app.get(AccessDecisionService);
    credentialService = app.get(AccessCredentialService);
    checkinService = app.get(CheckInService);
    checkoutService = app.get(CheckOutService);
    overrideService = app.get(AccessOverrideService);

    const defaultPassword = 'FitCoreDev2026!';

    // 1. Authenticate Owner
    const ownerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner@secondwind.com.au', password: defaultPassword });
    ownerToken = ownerRes.body.data.accessToken;

    // 2. Authenticate Member
    const memberRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'active.member@secondwind.com.au', password: defaultPassword });
    memberToken = memberRes.body.data.accessToken;

    // 3. Authenticate Reception Staff
    const receptionRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'reception@secondwind.com.au', password: defaultPassword });
    receptionToken = receptionRes.body.data.accessToken;

    // Resolve Organisations and Outlets from Seed
    const secondWind = await prisma.organisation.findFirst({
      where: { slug: 'second-wind' },
      include: { outlets: true },
    });
    orgId = secondWind!.id;
    outletAId = secondWind!.outlets.find((o) => o.code === 'SW-PERTH-CBD')!.id;
    outletBId = secondWind!.outlets.find((o) => o.code === 'SW-FREMANTLE')!.id;

    // Create a secondary isolated Organisation and Outlet for cross-tenant testing
    const otherOrg = await prisma.organisation.upsert({
      where: { slug: 'other-org-access-test' },
      update: {},
      create: {
        id: 'org_other_access_test_001',
        name: 'Metropolitan Athletics',
        slug: 'other-org-access-test',
        currency: 'AUD',
        timezone: 'Australia/Perth',
      },
    });
    otherOrgId = otherOrg.id;

    const otherOutlet = await prisma.outlet.upsert({
      where: { organisationId_code: { organisationId: otherOrgId, code: 'METRO-01' } },
      update: {},
      create: {
        id: 'outlet_other_metro_001',
        organisationId: otherOrgId,
        name: 'Metro City North',
        slug: 'metro-city-north',
        code: 'METRO-01',
        address: '100 North Rd',
        city: 'Perth',
        state: 'WA',
        postalCode: '6000',
      },
    });
    otherOutletId = otherOutlet.id;

    // Create a Dedicated Test Member Profile for reproducible matrix tests
    const testUser = await prisma.user.upsert({
      where: { email: 'access.tester@secondwind.com.au' },
      update: {},
      create: {
        id: 'user_access_tester_001',
        email: 'access.tester@secondwind.com.au',
        firstName: 'Alex',
        lastName: 'AccessTester',
        passwordHash: '$2b$10$xyz',
      },
    });
    testUserId = testUser.id;

    const testProfile = await prisma.memberProfile.upsert({
      where: { userId: testUserId },
      update: { status: 'ACTIVE' },
      create: {
        id: 'member_profile_access_tester_001',
        userId: testUserId,
        organisationId: orgId,
        status: 'ACTIVE',
        onboardingStatus: 'COMPLETED',
      },
    });
    testMemberProfileId = testProfile.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // =========================================================================
  // MANDATORY SECTION 15: EXPLICIT ACCESS TESTS (A through H)
  // =========================================================================

  describe('Prompt Section 15: Exact Tests A through H', () => {
    let testPlanId: string;

    beforeAll(async () => {
      // Find or create test plan with GYM_ACCESS entitlement
      const plan = await prisma.membershipPlan.findFirst({
        where: { organisationId: orgId },
        include: { entitlements: true },
      });
      testPlanId = plan!.id;
    });

    beforeEach(async () => {
      // Clean memberships and MemberOutlet relations for testMemberProfileId
      await prisma.memberMembershipOutlet.deleteMany({
        where: { memberMembership: { memberProfileId: testMemberProfileId } },
      });
      await prisma.checkIn.deleteMany({
        where: { memberProfileId: testMemberProfileId },
      });
      await prisma.memberMembership.deleteMany({
        where: { memberProfileId: testMemberProfileId },
      });
      await prisma.memberOutlet.deleteMany({
        where: { memberProfileId: testMemberProfileId },
      });
      await prisma.accessOverride.deleteMany({
        where: { memberProfileId: testMemberProfileId },
      });
      await prisma.accessCredential.deleteMany({
        where: { memberProfileId: testMemberProfileId },
      });
      await prisma.memberProfile.update({
        where: { id: testMemberProfileId },
        data: { status: 'ACTIVE' },
      });
    });

    const daytime = new Date('2026-09-07T12:00:00+08:00'); // 12:00 PM Perth time (within 06:00 - 22:00)

    it('Test A: MemberOutlet -> A; Membership -> Access A + B => A: ALLOWED, B: ALLOWED', async () => {
      // MemberOutlet -> Outlet A
      await prisma.memberOutlet.create({
        data: {
          memberProfileId: testMemberProfileId,
          outletId: outletAId,
        },
      });

      // Active Membership with MULTI_OUTLET granting access to A and B
      const now = new Date();
      const membership = await prisma.memberMembership.create({
        data: {
          organisationId: orgId,
          memberProfileId: testMemberProfileId,
          membershipPlanId: testPlanId,
          status: 'ACTIVE',
          accessScope: 'MULTI_OUTLET',
          startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          planNameAtPurchase: 'Multi-Club Pass',
          priceAtPurchase: 120,
          currencyAtPurchase: 'AUD',
          billingTypeAtPurchase: 'RECURRING',
          durationValueAtPurchase: 1,
          durationUnitAtPurchase: 'MONTHS',
          accessOutlets: {
            create: [{ outletId: outletAId }, { outletId: outletBId }],
          },
        },
      });

      const decisionA = await decisionService.canAccess({
        memberProfileId: testMemberProfileId,
        outletId: outletAId,
        requestedAt: daytime,
      });
      expect(decisionA.allowed).toBe(true);
      expect(decisionA.reason).toBe('ALLOWED');

      const decisionB = await decisionService.canAccess({
        memberProfileId: testMemberProfileId,
        outletId: outletBId,
        requestedAt: daytime,
      });
      expect(decisionB.allowed).toBe(true);
      expect(decisionB.reason).toBe('ALLOWED');
    });

    it('Test B: MemberOutlet -> A + B; Membership -> Access A only => A: ALLOWED, B: DENIED', async () => {
      // MemberOutlet -> A + B
      await prisma.memberOutlet.createMany({
        data: [
          { memberProfileId: testMemberProfileId, outletId: outletAId },
          { memberProfileId: testMemberProfileId, outletId: outletBId },
        ],
      });

      // Membership grants ONLY Outlet A
      const now = new Date();
      await prisma.memberMembership.create({
        data: {
          organisationId: orgId,
          memberProfileId: testMemberProfileId,
          membershipPlanId: testPlanId,
          status: 'ACTIVE',
          accessScope: 'SINGLE_OUTLET',
          startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          planNameAtPurchase: 'Single Club Pass',
          priceAtPurchase: 80,
          currencyAtPurchase: 'AUD',
          billingTypeAtPurchase: 'RECURRING',
          durationValueAtPurchase: 1,
          durationUnitAtPurchase: 'MONTHS',
          accessOutlets: {
            create: [{ outletId: outletAId }],
          },
        },
      });

      const decisionA = await decisionService.canAccess({
        memberProfileId: testMemberProfileId,
        outletId: outletAId,
        requestedAt: daytime,
      });
      expect(decisionA.allowed).toBe(true);

      const decisionB = await decisionService.canAccess({
        memberProfileId: testMemberProfileId,
        outletId: outletBId,
        requestedAt: daytime,
      });
      expect(decisionB.allowed).toBe(false);
      expect(decisionB.reason).toBe('OUTLET_NOT_AUTHORIZED');
    });

    it('Test C: MemberOutlet -> A; Membership -> Access B only => A: DENIED, B: ALLOWED (Proves MemberOutlet is NOT authority!)', async () => {
      // MemberOutlet -> Outlet A
      await prisma.memberOutlet.create({
        data: {
          memberProfileId: testMemberProfileId,
          outletId: outletAId,
        },
      });

      // Membership grants ONLY Outlet B
      const now = new Date();
      await prisma.memberMembership.create({
        data: {
          organisationId: orgId,
          memberProfileId: testMemberProfileId,
          membershipPlanId: testPlanId,
          status: 'ACTIVE',
          accessScope: 'SINGLE_OUTLET',
          startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          planNameAtPurchase: 'Fremantle Solo Club Pass',
          priceAtPurchase: 80,
          currencyAtPurchase: 'AUD',
          billingTypeAtPurchase: 'RECURRING',
          durationValueAtPurchase: 1,
          durationUnitAtPurchase: 'MONTHS',
          accessOutlets: {
            create: [{ outletId: outletBId }],
          },
        },
      });

      // Outlet A has MemberOutlet relation, but NO membership authorization => MUST BE DENIED!
      const decisionA = await decisionService.canAccess({
        memberProfileId: testMemberProfileId,
        outletId: outletAId,
        requestedAt: daytime,
      });
      expect(decisionA.allowed).toBe(false);
      expect(decisionA.reason).toBe('OUTLET_NOT_AUTHORIZED');

      // Outlet B has NO MemberOutlet relation, but HAS explicit membership authorization => MUST BE ALLOWED!
      const decisionB = await decisionService.canAccess({
        memberProfileId: testMemberProfileId,
        outletId: outletBId,
        requestedAt: daytime,
      });
      expect(decisionB.allowed).toBe(true);
      expect(decisionB.reason).toBe('ALLOWED');
    });

    it('Test D: Organisation A membership requested for Organisation B Outlet => DENIED (ORGANISATION_MISMATCH)', async () => {
      const now = new Date();
      await prisma.memberMembership.create({
        data: {
          organisationId: orgId,
          memberProfileId: testMemberProfileId,
          membershipPlanId: testPlanId,
          status: 'ACTIVE',
          accessScope: 'ALL_ORGANISATION_OUTLETS',
          startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          planNameAtPurchase: 'All-Org Pass',
          priceAtPurchase: 150,
          currencyAtPurchase: 'AUD',
          billingTypeAtPurchase: 'RECURRING',
          durationValueAtPurchase: 1,
          durationUnitAtPurchase: 'MONTHS',
        },
      });

      const decision = await decisionService.canAccess({
        memberProfileId: testMemberProfileId,
        outletId: otherOutletId, // Belongs to otherOrgId
        requestedAt: daytime,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('ORGANISATION_MISMATCH');
    });

    it('Test E: ALL_ORGANISATION_OUTLETS => All eligible outlets in same organisation ALLOWED', async () => {
      const now = new Date();
      await prisma.memberMembership.create({
        data: {
          organisationId: orgId,
          memberProfileId: testMemberProfileId,
          membershipPlanId: testPlanId,
          status: 'ACTIVE',
          accessScope: 'ALL_ORGANISATION_OUTLETS',
          startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          planNameAtPurchase: 'All-Access VIP',
          priceAtPurchase: 200,
          currencyAtPurchase: 'AUD',
          billingTypeAtPurchase: 'RECURRING',
          durationValueAtPurchase: 1,
          durationUnitAtPurchase: 'MONTHS',
        },
      });

      const decisionA = await decisionService.canAccess({
        memberProfileId: testMemberProfileId,
        outletId: outletAId,
        requestedAt: daytime,
      });
      expect(decisionA.allowed).toBe(true);

      const decisionB = await decisionService.canAccess({
        memberProfileId: testMemberProfileId,
        outletId: outletBId,
        requestedAt: daytime,
      });
      expect(decisionB.allowed).toBe(true);
    });

    it('Test F: Expired membership => DENIED (MEMBERSHIP_EXPIRED)', async () => {
      const now = new Date();
      await prisma.memberMembership.create({
        data: {
          organisationId: orgId,
          memberProfileId: testMemberProfileId,
          membershipPlanId: testPlanId,
          status: 'EXPIRED',
          accessScope: 'ALL_ORGANISATION_OUTLETS',
          startDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // Expired 10 days ago
          planNameAtPurchase: 'Expired Plan',
          priceAtPurchase: 100,
          currencyAtPurchase: 'AUD',
          billingTypeAtPurchase: 'RECURRING',
          durationValueAtPurchase: 1,
          durationUnitAtPurchase: 'MONTHS',
        },
      });

      const decision = await decisionService.canAccess({
        memberProfileId: testMemberProfileId,
        outletId: outletAId,
        requestedAt: daytime,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('MEMBERSHIP_EXPIRED');
    });

    it('Test G: Suspended membership => DENIED (MEMBERSHIP_SUSPENDED)', async () => {
      const now = new Date();
      await prisma.memberMembership.create({
        data: {
          organisationId: orgId,
          memberProfileId: testMemberProfileId,
          membershipPlanId: testPlanId,
          status: 'SUSPENDED',
          accessScope: 'ALL_ORGANISATION_OUTLETS',
          startDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
          planNameAtPurchase: 'Suspended Plan',
          priceAtPurchase: 100,
          currencyAtPurchase: 'AUD',
          billingTypeAtPurchase: 'RECURRING',
          durationValueAtPurchase: 1,
          durationUnitAtPurchase: 'MONTHS',
        },
      });

      const decision = await decisionService.canAccess({
        memberProfileId: testMemberProfileId,
        outletId: outletAId,
        requestedAt: daytime,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('MEMBERSHIP_SUSPENDED');
    });

    it('Test H: Revoked credential => DENIED (CREDENTIAL_REVOKED)', async () => {
      const now = new Date();
      // Active membership exists
      await prisma.memberMembership.create({
        data: {
          organisationId: orgId,
          memberProfileId: testMemberProfileId,
          membershipPlanId: testPlanId,
          status: 'ACTIVE',
          accessScope: 'ALL_ORGANISATION_OUTLETS',
          startDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
          planNameAtPurchase: 'Active Plan',
          priceAtPurchase: 100,
          currencyAtPurchase: 'AUD',
          billingTypeAtPurchase: 'RECURRING',
          durationValueAtPurchase: 1,
          durationUnitAtPurchase: 'MONTHS',
        },
      });

      // Register and revoke a credential
      const rawRef = 'RFID_TEST_REVOKED_001';
      const cred = await credentialService.createCredential(orgId, {
        memberProfileId: testMemberProfileId,
        type: 'RFID',
        credentialReference: rawRef,
      });

      await credentialService.revokeCredential(orgId, cred.id);

      const decision = await decisionService.canAccess({
        outletId: outletAId,
        credentialReference: rawRef,
        requestedAt: daytime,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('CREDENTIAL_REVOKED');
    });

    it('Section 11 & 39: Time Policy Test - 03:00 AM entry outside allowed hours (06:00-22:00) => DENIED (OUTSIDE_ALLOWED_HOURS)', async () => {
      const now = new Date();
      await prisma.memberMembership.create({
        data: {
          organisationId: orgId,
          memberProfileId: testMemberProfileId,
          membershipPlanId: testPlanId,
          status: 'ACTIVE',
          accessScope: 'ALL_ORGANISATION_OUTLETS',
          startDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
          planNameAtPurchase: 'Active Pass',
          priceAtPurchase: 100,
          currencyAtPurchase: 'AUD',
          billingTypeAtPurchase: 'RECURRING',
          durationValueAtPurchase: 1,
          durationUnitAtPurchase: 'MONTHS',
        },
      });

      const overnight = new Date('2026-09-07T03:00:00+08:00'); // 3:00 AM Perth time
      const decision = await decisionService.canAccess({
        memberProfileId: testMemberProfileId,
        outletId: outletAId,
        requestedAt: overnight,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('OUTSIDE_ALLOWED_HOURS');
    });
  });

  // =========================================================================
  // SECTION 16 & 51: PAYMENT STATUS VS MEMBERSHIP STATUS SEPARATION
  // =========================================================================

  describe('Section 16 & 51: Payment Separation', () => {
    const daytime = new Date('2026-09-07T12:00:00+08:00');

    it('PaymentTransaction = SUCCEEDED while MemberMembership = PENDING results in DENIED; activation grants ALLOWED', async () => {
      // Create dedicated member with no prior memberships
      const pendingUser = await prisma.user.create({
        data: {
          email: `pending.member.${Date.now()}@secondwind.com.au`,
          passwordHash: 'dummy-hash',
          firstName: 'Pending',
          lastName: 'Member',
          status: 'ACTIVE',
        },
      });
      const pendingProfile = await prisma.memberProfile.create({
        data: {
          userId: pendingUser.id,
          organisationId: orgId,
          status: 'ACTIVE',
        },
      });

      // 1. Create a PENDING membership
      const now = new Date();
      const plan = await prisma.membershipPlan.findFirst({ where: { organisationId: orgId } });
      const pendingMembership = await prisma.memberMembership.create({
        data: {
          organisationId: orgId,
          memberProfileId: pendingProfile.id,
          membershipPlanId: plan!.id,
          status: 'PENDING',
          accessScope: 'ALL_ORGANISATION_OUTLETS',
          startDate: now,
          endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          planNameAtPurchase: 'Pending Membership',
          priceAtPurchase: 100,
          currencyAtPurchase: 'AUD',
          billingTypeAtPurchase: 'RECURRING',
          durationValueAtPurchase: 1,
          durationUnitAtPurchase: 'MONTHS',
        },
      });

      // 2. Create a SUCCEEDED payment transaction linked to it
      await prisma.paymentTransaction.create({
        data: {
          organisationId: orgId,
          memberProfileId: pendingProfile.id,
          memberMembershipId: pendingMembership.id,
          amountMinor: 10000,
          currency: 'AUD',
          status: 'SUCCEEDED',
          provider: 'MOCK',
          providerTransactionId: `tx_proof_paid_${Date.now()}`,
          paymentMethodType: 'CARD',
        },
      });

      // INVARIANT 5: Payment success alone does NOT grant physical access!
      const decisionBefore = await decisionService.canAccess({
        memberProfileId: pendingProfile.id,
        outletId: outletAId,
        requestedAt: daytime,
      });
      expect(decisionBefore.allowed).toBe(false);
      expect(decisionBefore.reason).toBe('MEMBERSHIP_PENDING');

      // 3. Now Membership domain activates the membership
      await prisma.memberMembership.update({
        where: { id: pendingMembership.id },
        data: { status: 'ACTIVE', activatedAt: new Date() },
      });

      const decisionAfter = await decisionService.canAccess({
        memberProfileId: pendingProfile.id,
        outletId: outletAId,
        requestedAt: daytime,
      });
      expect(decisionAfter.allowed).toBe(true);
      expect(decisionAfter.reason).toBe('ALLOWED');
    });
  });

  // =========================================================================
  // SECTION 25 & 26: STAFF ACCESS OVERRIDE
  // =========================================================================

  describe('Section 25 & 26: Staff Access Overrides', () => {
    const daytime = new Date('2026-09-07T12:00:00+08:00');

    it('Suspended member with active staff override is granted entry with ALLOWED_BY_OVERRIDE', async () => {
      // Suspend member profile
      await prisma.memberProfile.update({
        where: { id: testMemberProfileId },
        data: { status: 'SUSPENDED' },
      });

      // Confirm entry denied without override
      const deniedBefore = await decisionService.canAccess({
        memberProfileId: testMemberProfileId,
        outletId: outletAId,
      });
      expect(deniedBefore.allowed).toBe(false);

      // Create staff override via service
      const ownerUser = await prisma.user.findFirst({
        where: { email: 'owner@secondwind.com.au' },
      });
      await overrideService.createOverride(
        orgId,
        {
          memberProfileId: testMemberProfileId,
          outletId: outletAId,
          reason: 'MANAGER_APPROVAL',
          durationHours: 2,
          notes: 'Special guest session approved by club manager',
        },
        ownerUser!.id
      );

      // Verify entry granted by override
      const decision = await decisionService.canAccess({
        memberProfileId: testMemberProfileId,
        outletId: outletAId,
      });
      expect(decision.allowed).toBe(true);
      expect(decision.reason).toBe('ALLOWED_BY_OVERRIDE');
      expect(decision.allowedByOverride).toBe(true);
    });
  });

  // =========================================================================
  // SECTION 21 & 47: CHECK-IN IDEMPOTENCY & DUPLICATE SCAN SUPPRESSION
  // =========================================================================

  describe('Section 21 & 47: Check-In Idempotency', () => {
    it('Identical device event submitted 3 times in rapid succession creates exactly 1 check-in record', async () => {
      // Ensure member has active membership
      await prisma.memberProfile.update({
        where: { id: testMemberProfileId },
        data: { status: 'ACTIVE' },
      });
      const plan = await prisma.membershipPlan.findFirst({ where: { organisationId: orgId } });
      const now = new Date();
      await prisma.memberMembership.create({
        data: {
          organisationId: orgId,
          memberProfileId: testMemberProfileId,
          membershipPlanId: plan!.id,
          status: 'ACTIVE',
          accessScope: 'ALL_ORGANISATION_OUTLETS',
          startDate: now,
          endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          planNameAtPurchase: 'Active Pass',
          priceAtPurchase: 100,
          currencyAtPurchase: 'AUD',
          billingTypeAtPurchase: 'RECURRING',
          durationValueAtPurchase: 1,
          durationUnitAtPurchase: 'MONTHS',
        },
      });

      const device = await prisma.accessDevice.findFirst({ where: { outletId: outletAId } });
      const uniqueEventId = `scan_rapid_tap_${Date.now()}`;

      // Tap 1
      const res1 = await checkinService.checkIn(orgId, {
        outletId: outletAId,
        memberProfileId: testMemberProfileId,
        deviceId: device!.id,
        deviceEventId: uniqueEventId,
      });
      expect(res1.allowed).toBe(true);
      expect(res1.isDuplicate).toBe(false);

      // Tap 2 (immediate duplicate)
      const res2 = await checkinService.checkIn(orgId, {
        outletId: outletAId,
        memberProfileId: testMemberProfileId,
        deviceId: device!.id,
        deviceEventId: uniqueEventId,
      });
      expect(res2.allowed).toBe(true);
      expect(res2.isDuplicate).toBe(true);

      // Tap 3 (immediate duplicate)
      const res3 = await checkinService.checkIn(orgId, {
        outletId: outletAId,
        memberProfileId: testMemberProfileId,
        deviceId: device!.id,
        deviceEventId: uniqueEventId,
      });
      expect(res3.allowed).toBe(true);
      expect(res3.isDuplicate).toBe(true);

      // Verify only 1 CheckIn record exists in database for this event
      const count = await prisma.checkIn.count({
        where: {
          deviceId: device!.id,
          deviceEventId: uniqueEventId,
        },
      });
      expect(count).toBe(1);
    });
  });

  // =========================================================================
  // SECTION 19 & 20: VISIT LIFECYCLE & CHECKOUT
  // =========================================================================

  describe('Section 19 & 20: Visit Lifecycle & Active Visit', () => {
    it('Full visit lifecycle: checkIn -> getActiveVisit -> checkOut', async () => {
      // 1. Initial state: clean visits
      await prisma.checkIn.deleteMany({ where: { memberProfileId: testMemberProfileId } });

      const visitBefore = await checkinService.getActiveVisit(orgId, testMemberProfileId);
      expect(visitBefore).toBeNull();

      // 2. Perform check-in
      const checkInResult = await checkinService.checkIn(orgId, {
        outletId: outletAId,
        memberProfileId: testMemberProfileId,
        method: 'QR',
      });
      expect(checkInResult.allowed).toBe(true);

      // 3. Confirm active visit
      const activeVisit = await checkinService.getActiveVisit(orgId, testMemberProfileId);
      expect(activeVisit).not.toBeNull();
      expect(activeVisit?.checkedOutAt).toBeNull();
      expect(activeVisit?.outletId).toBe(outletAId);

      // 4. Perform check-out
      const checkOutResult = await checkoutService.checkOut(orgId, {
        outletId: outletAId,
        memberProfileId: testMemberProfileId,
      });
      expect(checkOutResult.success).toBe(true);
      expect(checkOutResult.checkIn.checkedOutAt).not.toBeNull();

      // 5. Confirm no longer active
      const visitAfter = await checkinService.getActiveVisit(orgId, testMemberProfileId);
      expect(visitAfter).toBeNull();
    });
  });
});
