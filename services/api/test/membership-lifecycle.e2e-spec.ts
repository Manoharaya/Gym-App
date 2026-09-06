import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Membership Lifecycle & Commercial Operations (Day 5 E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerToken: string;
  let memberToken: string;
  let activeMemberId: string;
  let activeMemberProfileId: string;
  let createdPlanId: string;
  let assignedMembershipId: string;

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

    // 1. Authenticate Owner
    const ownerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@secondwind.com.au',
        password: defaultPassword,
      });
    ownerToken = ownerRes.body.data.accessToken;

    // 2. Authenticate Member
    const memberRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'active.member@secondwind.com.au',
        password: defaultPassword,
      });
    memberToken = memberRes.body.data.accessToken;
    activeMemberId = memberRes.body.data.user.id;

    const profile = await prisma.memberProfile.findUnique({
      where: { userId: activeMemberId },
    });
    activeMemberProfileId = profile!.id;
  });

  afterAll(async () => {
    // Cleanup created test records
    if (assignedMembershipId) {
      await prisma.memberMembershipHistory.deleteMany({
        where: { memberMembershipId: assignedMembershipId },
      });
      await prisma.memberMembershipOutlet.deleteMany({
        where: { memberMembershipId: assignedMembershipId },
      });
      await prisma.memberMembership.delete({
        where: { id: assignedMembershipId },
      }).catch(() => {});
    }
    if (createdPlanId) {
      await prisma.membershipEntitlement.deleteMany({
        where: { membershipPlanId: createdPlanId },
      });
      await prisma.membershipPlanOutlet.deleteMany({
        where: { membershipPlanId: createdPlanId },
      });
      await prisma.membershipPlan.delete({
        where: { id: createdPlanId },
      }).catch(() => {});
    }
    await app.close();
  });

  it('1. POST /membership-plans - Staff should create a new membership plan with entitlements and outlet mappings', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/membership-plans')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Second Wind Hyrox & Recovery',
        code: `SW-HYROX-${Date.now()}`,
        status: 'ACTIVE',
        membershipType: 'STANDARD',
        billingType: 'RECURRING',
        durationValue: 1,
        durationUnit: 'MONTH',
        price: 139.99,
        currency: 'AUD',
        entitlements: [
          { type: 'GYM_ACCESS', name: 'Full Gym Floor Access' },
          { type: 'GROUP_CLASSES', name: 'Hyrox Conditioning Classes', value: 16 },
          { type: 'SAUNA', name: 'Infrared Recovery Suite' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.name).toBe('Second Wind Hyrox & Recovery');
    expect(res.body.data.price).toBe(139.99);
    expect(res.body.data.entitlements).toHaveLength(3);
    createdPlanId = res.body.data.id;
  });

  it('2. GET /membership-plans - Should list active plans for the organisation', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/membership-plans')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    const found = res.body.data.find((p: any) => p.id === createdPlanId);
    expect(found).toBeDefined();
  });

  it('3. POST /memberships - Should assign membership plan with commercial price snapshot', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/memberships')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        memberProfileId: activeMemberProfileId,
        membershipPlanId: createdPlanId,
        accessScope: 'ALL_ORGANISATION_OUTLETS',
        autoRenew: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.priceAtPurchase).toBe(139.99);
    expect(res.body.data.currencyAtPurchase).toBe('AUD');
    expect(res.body.data.planNameAtPurchase).toBe('Second Wind Hyrox & Recovery');
    assignedMembershipId = res.body.data.id;
  });

  it('4. POST /memberships/:id/pause - Staff should pause active membership', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/memberships/${assignedMembershipId}/pause`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: 'Member requested holiday suspension' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PAUSED');
  });

  it('5. POST /memberships/:id/resume - Staff should resume paused membership', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/memberships/${assignedMembershipId}/resume`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: 'Member returned from holiday' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('6. POST /memberships/:id/suspend - Staff should suspend membership', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/memberships/${assignedMembershipId}/suspend`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: 'Administrative hold' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('SUSPENDED');
  });

  it('7. POST /memberships/:id/activate - Staff should reactivate suspended membership', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/memberships/${assignedMembershipId}/activate`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: 'Administrative hold cleared' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('8. POST /memberships/:id/renew - Should renew membership creating the next term seamlessly', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/memberships/${assignedMembershipId}/renew`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: 'Advance term renewal' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.id).not.toBe(assignedMembershipId);
    expect(res.body.data.planNameAtPurchase).toBe('Second Wind Hyrox & Recovery');

    // Clean up renewed membership record
    await prisma.memberMembershipHistory.deleteMany({
      where: { memberMembershipId: res.body.data.id },
    });
    await prisma.memberMembershipOutlet.deleteMany({
      where: { memberMembershipId: res.body.data.id },
    });
    await prisma.memberMembership.delete({
      where: { id: res.body.data.id },
    });
  });

  it('9. POST /memberships/:id/cancel - Should cancel membership and enter terminal state', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/memberships/${assignedMembershipId}/cancel`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: 'Member relocation' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('CANCELLED');
  });

  it('10. Invalid Transition Rejection - Cancelled membership cannot transition directly to ACTIVE', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/memberships/${assignedMembershipId}/activate`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: 'Illegal reactivation attempt' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Invalid membership state transition');
  });

  it('11. GET /members/me/memberships - Member should view their own membership history', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/members/me/memberships')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    // Preserves cancelled membership in history
    const found = res.body.data.find((m: any) => m.id === assignedMembershipId);
    expect(found).toBeDefined();
    expect(found.status).toBe('CANCELLED');
  });

  it('12. GET /members/me/memberships/active - Should resolve current active membership for member', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/members/me/memberships/active')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    // The active.member seed user has an active Premium All-Access membership seeded
    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data).toHaveProperty('daysRemaining');
  });

  it('13. POST /membership-plans/:id/archive - Staff should archive plan without corrupting memberships', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/membership-plans/${createdPlanId}/archive`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('ARCHIVED');

    // Historical membership still preserves plan name and purchase price
    const hist = await prisma.memberMembership.findUnique({
      where: { id: assignedMembershipId },
    });
    expect(hist!.planNameAtPurchase).toBe('Second Wind Hyrox & Recovery');
    expect(hist!.priceAtPurchase).toBe(139.99);
  });
});
