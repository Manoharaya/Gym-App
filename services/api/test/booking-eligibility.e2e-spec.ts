import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { BookingEligibilityService } from '../src/bookings';

describe('Booking Eligibility & Membership Boundary (Day 8 E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let eligibilityService: BookingEligibilityService;
  const defaultPassword = 'FitCoreDev2026!';

  let activeMemberToken: string;
  let activeMemberProfileId: string;
  let singleOutletMemberToken: string;
  let singleOutletMemberProfileId: string;
  let singleOutletMembershipId: string;

  let organisationId: string;
  let perthOutletId: string;
  let freoOutletId: string;
  let testClassTypeId: string;
  let testSessionPerth: any;
  let testSessionFreo: any;

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
    eligibilityService = app.get(BookingEligibilityService);

    // 1. Authenticate Active Member (has ALL_ORGANISATION_OUTLETS access + GROUP_CLASSES)
    const activeMemberRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'active.member@secondwind.com.au', password: defaultPassword });
    activeMemberToken = activeMemberRes.body.data.accessToken;
    const activeUser = activeMemberRes.body.data.user;
    const activeProfile = await prisma.memberProfile.findUnique({
      where: { userId: activeUser.id },
    });
    activeMemberProfileId = activeProfile!.id;

    // 2. Query Org and Outlets
    const org = await prisma.organisation.findFirstOrThrow({
      where: { slug: 'second-wind' },
    });
    organisationId = org.id;

    const perthOutlet = await prisma.outlet.findFirstOrThrow({
      where: { organisationId, code: 'SW-PERTH-CBD' },
    });
    perthOutletId = perthOutlet.id;

    const freoOutlet = await prisma.outlet.findFirstOrThrow({
      where: { organisationId, code: 'SW-FREMANTLE' },
    });
    freoOutletId = freoOutlet.id;

    // 3. Setup Single-Outlet Member with GROUP_CLASSES entitlement for Perth CBD only
    const parqMemberRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'parq.member@secondwind.com.au', password: defaultPassword });
    singleOutletMemberToken = parqMemberRes.body.data.accessToken;
    const parqUser = parqMemberRes.body.data.user;
    const parqProfile = await prisma.memberProfile.findUnique({
      where: { userId: parqUser.id },
    });
    singleOutletMemberProfileId = parqProfile!.id;

    // Clean up any stale single outlet plan
    await prisma.membershipEntitlement.deleteMany({
      where: { membershipPlan: { code: 'SW-SINGLE-OUTLET-CLASSES' } },
    });
    await prisma.memberMembership.deleteMany({
      where: { membershipPlan: { code: 'SW-SINGLE-OUTLET-CLASSES' } },
    });
    await prisma.membershipPlan.deleteMany({
      where: { code: 'SW-SINGLE-OUTLET-CLASSES' },
    });

    const singlePlan = await prisma.membershipPlan.create({
      data: {
        organisationId,
        name: 'Perth CBD Classes Only',
        code: 'SW-SINGLE-OUTLET-CLASSES',
        price: 49.0,
        currency: 'AUD',
        billingType: 'RECURRING',
        durationValue: 1,
        durationUnit: 'MONTH',
        entitlements: {
          create: [
            { type: 'GYM_ACCESS', name: 'Gym Floor' },
            { type: 'GROUP_CLASSES', name: 'Group Classes' },
          ],
        },
      },
      include: { entitlements: true },
    });

    // Assign single outlet membership to parq.member
    const now = new Date();
    const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const m = await prisma.memberMembership.create({
      data: {
        organisationId,
        memberProfileId: singleOutletMemberProfileId,
        membershipPlanId: singlePlan.id,
        status: 'ACTIVE',
        accessScope: 'SINGLE_OUTLET',
        originOutletId: perthOutletId,
        startDate: now,
        endDate: in30,
        planNameAtPurchase: singlePlan.name,
        priceAtPurchase: singlePlan.price,
        currencyAtPurchase: singlePlan.currency,
        billingTypeAtPurchase: singlePlan.billingType,
        durationValueAtPurchase: singlePlan.durationValue,
        durationUnitAtPurchase: singlePlan.durationUnit,
        accessOutlets: {
          create: [{ outletId: perthOutletId }],
        },
      },
    });
    singleOutletMembershipId = m.id;

    // Class type
    const classType = await prisma.classType.findFirstOrThrow({
      where: { organisationId, category: 'HIIT' },
    });
    testClassTypeId = classType.id;

    // Create scheduled sessions for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(11, 0, 0, 0);

    testSessionPerth = await prisma.classSession.create({
      data: {
        organisationId,
        outletId: perthOutletId,
        classTypeId: testClassTypeId,
        name: 'Perth Test Session',
        startsAt: tomorrow,
        endsAt: tomorrowEnd,
        capacity: 10,
        status: 'SCHEDULED',
      },
    });

    testSessionFreo = await prisma.classSession.create({
      data: {
        organisationId,
        outletId: freoOutletId,
        classTypeId: testClassTypeId,
        name: 'Fremantle Test Session',
        startsAt: tomorrow,
        endsAt: tomorrowEnd,
        capacity: 10,
        status: 'SCHEDULED',
      },
    });
  });

  afterAll(async () => {
    if (testSessionPerth?.id) {
      await prisma.booking.deleteMany({ where: { classSessionId: testSessionPerth.id } });
      await prisma.waitlistEntry.deleteMany({ where: { classSessionId: testSessionPerth.id } });
      await prisma.classSession.delete({ where: { id: testSessionPerth.id } }).catch(() => null);
    }
    if (testSessionFreo?.id) {
      await prisma.booking.deleteMany({ where: { classSessionId: testSessionFreo.id } });
      await prisma.waitlistEntry.deleteMany({ where: { classSessionId: testSessionFreo.id } });
      await prisma.classSession.delete({ where: { id: testSessionFreo.id } }).catch(() => null);
    }
    if (singleOutletMembershipId) {
      await prisma.memberMembershipOutlet.deleteMany({ where: { memberMembershipId: singleOutletMembershipId } });
      await prisma.memberMembership.delete({ where: { id: singleOutletMembershipId } }).catch(() => null);
    }
    await app.close();
  });

  it('1. Active member with valid membership and GROUP_CLASSES entitlement should successfully book', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/class-sessions/${testSessionPerth.id}/book`)
      .set('Authorization', `Bearer ${activeMemberToken}`)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CONFIRMED');
    expect(res.body.data.classSessionId).toBe(testSessionPerth.id);
  });

  it('2. Member with expired membership should be denied booking with 403 / MEMBERSHIP_EXPIRED', async () => {
    // Temporarily set membership to EXPIRED
    await prisma.memberMembership.update({
      where: { id: singleOutletMembershipId },
      data: { status: 'EXPIRED' },
    });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/class-sessions/${testSessionPerth.id}/book`)
      .set('Authorization', `Bearer ${singleOutletMemberToken}`)
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/MEMBERSHIP_INACTIVE|MEMBERSHIP_EXPIRED|membership/i);

    // Restore status
    await prisma.memberMembership.update({
      where: { id: singleOutletMembershipId },
      data: { status: 'ACTIVE' },
    });
  });

  it('3. Member with suspended membership should be denied booking with 403 / MEMBERSHIP_SUSPENDED', async () => {
    await prisma.memberMembership.update({
      where: { id: singleOutletMembershipId },
      data: { status: 'SUSPENDED' },
    });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/class-sessions/${testSessionPerth.id}/book`)
      .set('Authorization', `Bearer ${singleOutletMemberToken}`)
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/MEMBERSHIP_SUSPENDED|membership/i);

    // Restore
    await prisma.memberMembership.update({
      where: { id: singleOutletMembershipId },
      data: { status: 'ACTIVE' },
    });
  });

  it('4. Member cannot book two overlapping sessions simultaneously (Double-Booking Conflict)', async () => {
    // Active member is already booked for testSessionPerth at tomorrow 10:00-11:00
    // Attempting to book testSessionFreo at the exact same time:
    const res = await request(app.getHttpServer())
      .post(`/api/v1/class-sessions/${testSessionFreo.id}/book`)
      .set('Authorization', `Bearer ${activeMemberToken}`)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/CONFLICTING_SESSION|conflict/i);
  });

  it('5. Single-outlet member cannot book a session at a different outlet (Scope Enforcement)', async () => {
    // parq.member only has SINGLE_OUTLET access to Perth CBD
    // Attempting to book Fremantle session:
    const res = await request(app.getHttpServer())
      .post(`/api/v1/class-sessions/${testSessionFreo.id}/book`)
      .set('Authorization', `Bearer ${singleOutletMemberToken}`)
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/OUTLET_NOT_AUTHORIZED|OUTLET_NOT_INCLUDED|outlet/i);
  });

  it('6. Invariant Proof: MemberOutlet does NOT grant booking eligibility', async () => {
    // Member has MemberOutlet record for Fremantle, but their active membership only allows Perth CBD
    const existingMO = await prisma.memberOutlet.findFirst({
      where: { memberProfileId: singleOutletMemberProfileId, outletId: freoOutletId },
    });

    let tempMO: any;
    if (!existingMO) {
      tempMO = await prisma.memberOutlet.create({
        data: {
          memberProfileId: singleOutletMemberProfileId,
          outletId: freoOutletId,
          status: 'ACTIVE',
        },
      });
    }

    // Evaluate eligibility for Fremantle class session
    const eligibility = await eligibilityService.checkEligibility(
      singleOutletMemberProfileId,
      testSessionFreo.id,
    );

    // Even with active MemberOutlet at Fremantle, eligibility is strictly derived from
    // the commercial membership scope (SINGLE_OUTLET: Perth CBD), so Fremantle is rejected!
    expect(eligibility.eligible).toBe(false);
    expect(['OUTLET_NOT_AUTHORIZED', 'OUTLET_NOT_IN_SCOPE', 'MEMBERSHIP_REQUIRED']).toContain(
      eligibility.reason,
    );

    // Clean up temporary MemberOutlet
    if (tempMO) {
      await prisma.memberOutlet.delete({ where: { id: tempMO.id } });
    }
  });
});
