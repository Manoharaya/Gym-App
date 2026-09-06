import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Membership Security, IDOR & Access Policy (Day 5 E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerToken: string;
  let memberToken: string;
  let apexOwnerToken: string;
  let activeMemberProfileId: string;
  let parqMemberProfileId: string;
  let flaggedMemberProfileId: string;
  let perthOutletId: string;
  let fremantleOutletId: string;
  let secondWindMembershipId: string;
  let apexMemberProfileId: string;
  let apexSydneyOutletId: string;

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

    const defaultPassword = 'FitCoreDev2026!';

    // 1. Second Wind Owner
    const ownerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner@secondwind.com.au', password: defaultPassword });
    ownerToken = ownerRes.body.data.accessToken;

    // 2. Second Wind Active Member
    const memberRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'active.member@secondwind.com.au', password: defaultPassword });
    memberToken = memberRes.body.data.accessToken;

    // 3. Apex Strength Owner (Tenant B)
    const apexRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner@apexstrength.com.au', password: defaultPassword });
    apexOwnerToken = apexRes.body.data.accessToken;

    // Resolve profiles and outlets
    const activeUser = await prisma.user.findUnique({ where: { email: 'active.member@secondwind.com.au' } });
    const parqUser = await prisma.user.findUnique({ where: { email: 'parq.member@secondwind.com.au' } });
    const flaggedUser = await prisma.user.findUnique({ where: { email: 'flagged.member@secondwind.com.au' } });

    const activeProfile = await prisma.memberProfile.findUnique({ where: { userId: activeUser!.id } });
    const parqProfile = await prisma.memberProfile.findUnique({ where: { userId: parqUser!.id } });
    const flaggedProfile = await prisma.memberProfile.findUnique({ where: { userId: flaggedUser!.id } });

    activeMemberProfileId = activeProfile!.id;
    parqMemberProfileId = parqProfile!.id;
    flaggedMemberProfileId = flaggedProfile!.id;

    const perth = await prisma.outlet.findFirst({ where: { slug: 'perth-cbd' } });
    const fremantle = await prisma.outlet.findFirst({ where: { slug: 'fremantle' } });
    perthOutletId = perth!.id;
    fremantleOutletId = fremantle!.id;

    const apexUser = await prisma.user.findUnique({ where: { email: 'member@apexstrength.com.au' } });
    const apexProfile = await prisma.memberProfile.findUnique({ where: { userId: apexUser!.id } });
    apexMemberProfileId = apexProfile!.id;
    const apexOutlet = await prisma.outlet.findFirst({ where: { slug: 'sydney-cbd' } });
    apexSydneyOutletId = apexOutlet!.id;

    const activeMembership = await prisma.memberMembership.findFirst({
      where: { memberProfileId: activeMemberProfileId, status: 'ACTIVE' },
    });
    secondWindMembershipId = activeMembership!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Anti-IDOR - Member cannot view another member\'s membership record directly', async () => {
    // Member tries to query active member's membership using their own token
    const parqLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'parq.member@secondwind.com.au', password: 'FitCoreDev2026!' });
    const parqToken = parqLogin.body.data.accessToken;

    const res = await request(app.getHttpServer())
      .get(`/api/v1/members/me/memberships/${secondWindMembershipId}`)
      .set('Authorization', `Bearer ${parqToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('You do not have permission');
  });

  it('2. Anti-IDOR - Member cannot cancel another member\'s membership', async () => {
    const parqLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'parq.member@secondwind.com.au', password: 'FitCoreDev2026!' });
    const parqToken = parqLogin.body.data.accessToken;

    const res = await request(app.getHttpServer())
      .post(`/api/v1/members/me/memberships/${secondWindMembershipId}/cancel`)
      .set('Authorization', `Bearer ${parqToken}`)
      .send({ reason: 'Malicious cancellation' });

    expect(res.status).toBe(403);
  });

  it('3. Tenant Isolation - Tenant B (Apex Strength) cannot view Tenant A (Second Wind) membership', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/memberships/${secondWindMembershipId}`)
      .set('Authorization', `Bearer ${apexOwnerToken}`);

    // Standardized 404 to avoid leaking existence across tenants
    expect(res.status).toBe(404);
  });

  it('4. RBAC Protection - Member cannot create a membership plan', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/membership-plans')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        name: 'Hacked Free Plan',
        code: 'HACKED-001',
        price: 0,
        durationValue: 10,
        durationUnit: 'YEAR',
      });

    expect(res.status).toBe(403);
  });

  it('5. RBAC Protection - Member cannot assign membership to another member', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/memberships')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        memberProfileId: parqMemberProfileId,
        membershipPlanId: 'mock-plan-id',
      });

    expect(res.status).toBe(403);
  });

  it('6. Access Policy: All-Organisation Member -> ALLOWED at both Perth CBD & Fremantle', async () => {
    // 6a. Perth CBD
    const resPerth = await request(app.getHttpServer())
      .post('/api/v1/memberships/check-access')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        memberProfileId: activeMemberProfileId,
        outletId: perthOutletId,
        entitlementType: 'GYM_ACCESS',
      });

    expect(resPerth.status).toBe(201);
    expect(resPerth.body.data.allowed).toBe(true);
    expect(resPerth.body.data.reason).toBe('ACTIVE_MEMBERSHIP');

    // 6b. Fremantle
    const resFre = await request(app.getHttpServer())
      .post('/api/v1/memberships/check-access')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        memberProfileId: activeMemberProfileId,
        outletId: fremantleOutletId,
        entitlementType: 'GYM_ACCESS',
      });

    expect(resFre.status).toBe(201);
    expect(resFre.body.data.allowed).toBe(true);
    expect(resFre.body.data.reason).toBe('ACTIVE_MEMBERSHIP');
  });

  it('7. Access Policy: Single-Outlet Member -> ALLOWED at Perth CBD, DENIED at Fremantle', async () => {
    // parq.member has a SINGLE_OUTLET trial pass restricted to Perth CBD
    const resPerth = await request(app.getHttpServer())
      .post('/api/v1/memberships/check-access')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        memberProfileId: parqMemberProfileId,
        outletId: perthOutletId,
        entitlementType: 'GYM_ACCESS',
      });

    expect(resPerth.status).toBe(201);
    expect(resPerth.body.data.allowed).toBe(true);
    expect(resPerth.body.data.reason).toBe('ACTIVE_MEMBERSHIP');

    const resFre = await request(app.getHttpServer())
      .post('/api/v1/memberships/check-access')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        memberProfileId: parqMemberProfileId,
        outletId: fremantleOutletId,
        entitlementType: 'GYM_ACCESS',
      });

    expect(resFre.status).toBe(201);
    expect(resFre.body.data.allowed).toBe(false);
    expect(['OUTLET_NOT_INCLUDED', 'OUTLET_NOT_IN_SCOPE']).toContain(resFre.body.data.reason);
  });

  it('8. Access Policy: Pending Membership -> DENIED with MEMBERSHIP_PENDING', async () => {
    // flagged.member has only a PENDING membership
    const res = await request(app.getHttpServer())
      .post('/api/v1/memberships/check-access')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        memberProfileId: flaggedMemberProfileId,
        outletId: perthOutletId,
        entitlementType: 'GYM_ACCESS',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.allowed).toBe(false);
    expect(res.body.data.reason).toBe('MEMBERSHIP_PENDING');
  });

  // =========================================================================
  // SECTION 45 & 46: EXPLICIT MANDATORY OWNERSHIP MODEL & HISTORICAL TESTS
  // =========================================================================

  describe('Section 45: Direct Ownership Model Tests', () => {
    it('Test A: A plan belongs to Organisation A. It cannot be assigned to a member from Organisation B', async () => {
      const basicPlan = await prisma.membershipPlan.findFirst({ where: { code: 'SW-BASIC-M' } });
      const res = await request(app.getHttpServer())
        .post('/api/v1/memberships')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          memberProfileId: apexMemberProfileId,
          membershipPlanId: basicPlan!.id,
        });

      // Must be rejected (404/400) because member does not belong to Organisation A
      expect([400, 404]).toContain(res.status);
      expect(res.body.error.message).toContain('not found in this organization');
    });

    it('Test B: A member belongs to Organisation A. Their membership must belong to Organisation A', async () => {
      const secondWindOrg = await prisma.organisation.findFirst({ where: { slug: 'second-wind' } });
      const membership = await prisma.memberMembership.findUnique({
        where: { id: secondWindMembershipId },
      });

      expect(membership).toBeDefined();
      expect(membership!.organisationId).toBe(secondWindOrg!.id);
    });

    it('Test C: Member has MemberOutlet -> Outlet A. Membership grants Outlet B. Access to Outlet B is ALLOWED even without MemberOutlet -> Outlet B', async () => {
      const secondWindOrg = await prisma.organisation.findFirst({ where: { slug: 'second-wind' } });
      const basicPlan = await prisma.membershipPlan.findFirst({ where: { code: 'SW-BASIC-M' } });

      // Create membership granting access to Fremantle
      const fremantleMembership = await prisma.memberMembership.create({
        data: {
          organisationId: secondWindOrg!.id,
          memberProfileId: flaggedMemberProfileId,
          membershipPlanId: basicPlan!.id,
          status: 'ACTIVE',
          accessScope: 'SINGLE_OUTLET',
          startDate: new Date(Date.now() - 1000),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          planNameAtPurchase: 'Fremantle Test Pass',
          priceAtPurchase: 55.0,
          currencyAtPurchase: 'AUD',
          billingTypeAtPurchase: 'RECURRING',
          durationValueAtPurchase: 1,
          durationUnitAtPurchase: 'MONTH',
          accessOutlets: {
            create: [{ outletId: fremantleOutletId }],
          },
        },
      });

      // Verify member does NOT have MemberOutlet for Fremantle
      const mo = await prisma.memberOutlet.findFirst({
        where: { memberProfileId: flaggedMemberProfileId, outletId: fremantleOutletId },
      });
      expect(mo).toBeNull();

      // Access to Fremantle MUST BE ALLOWED because membership grants it
      const res = await request(app.getHttpServer())
        .post('/api/v1/memberships/check-access')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          memberProfileId: flaggedMemberProfileId,
          outletId: fremantleOutletId,
          entitlementType: 'GYM_ACCESS',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.allowed).toBe(true);
      expect(res.body.data.reason).toBe('ACTIVE_MEMBERSHIP');

      // Cleanup
      await prisma.memberMembershipOutlet.deleteMany({ where: { memberMembershipId: fremantleMembership.id } });
      await prisma.memberMembership.delete({ where: { id: fremantleMembership.id } });
    });

    it('Test D: Member has MemberOutlet -> Outlet A + Outlet B, but membership only grants Outlet A. Access to Outlet B is DENIED', async () => {
      // Temporarily give parq.member a MemberOutlet for Fremantle (they only have a Perth CBD membership)
      const tempMO = await prisma.memberOutlet.create({
        data: {
          memberProfileId: parqMemberProfileId,
          outletId: fremantleOutletId,
          status: 'ACTIVE',
        },
      });

      // Check access to Fremantle -> MUST BE DENIED despite having MemberOutlet relationship!
      const res = await request(app.getHttpServer())
        .post('/api/v1/memberships/check-access')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          memberProfileId: parqMemberProfileId,
          outletId: fremantleOutletId,
          entitlementType: 'GYM_ACCESS',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.allowed).toBe(false);
      expect(['OUTLET_NOT_INCLUDED', 'OUTLET_NOT_IN_SCOPE']).toContain(res.body.data.reason);

      // Cleanup
      await prisma.memberOutlet.delete({ where: { id: tempMO.id } });
    });

    it('Test E: Membership grants ALL_ORGANISATION_OUTLETS. Member can access every eligible outlet in that organisation', async () => {
      // 1. Perth CBD
      const resPerth = await request(app.getHttpServer())
        .post('/api/v1/memberships/check-access')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          memberProfileId: activeMemberProfileId,
          outletId: perthOutletId,
          entitlementType: 'GYM_ACCESS',
        });
      expect(resPerth.status).toBe(201);
      expect(resPerth.body.data.allowed).toBe(true);

      // 2. Fremantle
      const resFre = await request(app.getHttpServer())
        .post('/api/v1/memberships/check-access')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          memberProfileId: activeMemberProfileId,
          outletId: fremantleOutletId,
          entitlementType: 'GYM_ACCESS',
        });
      expect(resFre.status).toBe(201);
      expect(resFre.body.data.allowed).toBe(true);
    });

    it('Test F: A membership from Organisation A must never grant access to an Outlet belonging to Organisation B', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/memberships/check-access')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          memberProfileId: activeMemberProfileId,
          outletId: apexSydneyOutletId,
          entitlementType: 'GYM_ACCESS',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.allowed).toBe(false);
      expect(['ORGANISATION_MISMATCH', 'OUTLET_NOT_INCLUDED', 'OUTLET_NOT_IN_SCOPE']).toContain(res.body.data.reason);
    });
  });

  describe('Section 46: Historical Commercial Data Integrity Test', () => {
    it('Verify historical membership preserves purchase price $100 when catalog plan changes to $120', async () => {
      // 1. Create plan at $100
      const planRes = await request(app.getHttpServer())
        .post('/api/v1/membership-plans')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Historical Commercial Test Plan',
          code: `HIST-PLAN-${Date.now()}`,
          price: 100.0,
          currency: 'AUD',
          durationValue: 1,
          durationUnit: 'MONTH',
          entitlements: [{ type: 'GYM_ACCESS', name: 'Standard Gym Floor Access' }],
        });
      expect(planRes.status).toBe(201);
      const planId = planRes.body.data.id;
      expect(planRes.body.data.price).toBe(100.0);

      // 2. Assign plan to member -> snapshots at $100
      const assignRes = await request(app.getHttpServer())
        .post('/api/v1/memberships')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          memberProfileId: activeMemberProfileId,
          membershipPlanId: planId,
        });
      expect(assignRes.status).toBe(201);
      const testMembershipId = assignRes.body.data.id;
      expect(assignRes.body.data.priceAtPurchase).toBe(100.0);

      // 3. Update plan price to $120
      const updateRes = await request(app.getHttpServer())
        .patch(`/api/v1/membership-plans/${planId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ price: 120.0 });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.price).toBe(120.0);

      // 4. Retrieve the historical membership -> MUST report priceAtPurchase = $100
      const fetchRes = await request(app.getHttpServer())
        .get(`/api/v1/memberships/${testMembershipId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(fetchRes.status).toBe(200);
      expect(fetchRes.body.data.priceAtPurchase).toBe(100.0);
      expect(fetchRes.body.data.membershipPlan.price).toBe(120.0);

      // Cleanup
      await prisma.memberMembershipHistory.deleteMany({ where: { memberMembershipId: testMembershipId } });
      await prisma.memberMembershipOutlet.deleteMany({ where: { memberMembershipId: testMembershipId } });
      await prisma.memberMembership.delete({ where: { id: testMembershipId } });
      await prisma.membershipEntitlement.deleteMany({ where: { membershipPlanId: planId } });
      await prisma.membershipPlan.delete({ where: { id: planId } });
    });
  });
});
