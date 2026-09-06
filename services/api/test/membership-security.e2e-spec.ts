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
    expect(resFre.body.data.reason).toBe('OUTLET_NOT_IN_SCOPE');
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
});
