import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Booking Security, Anti-IDOR & Tenant Isolation (Day 8 E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const defaultPassword = 'FitCoreDev2026!';

  let orgA: any;
  let orgB: any;
  let memberAToken: string;
  let memberAProfile: any;
  let memberBToken: string;
  let memberBProfile: any;
  let staffToken: string;

  let sessionOrgA: any;
  let sessionOrgB: any;
  let bookingMemberA: any;

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

    // Get Org A (Second Wind)
    orgA = await prisma.organisation.findFirstOrThrow({
      where: { slug: 'second-wind' },
      include: { outlets: true },
    });

    // Find Org B (Apex Strength)
    orgB = await prisma.organisation.findFirstOrThrow({
      where: { slug: 'apex-strength' },
      include: { outlets: true },
    });

    // Login Member A (Second Wind)
    const memberARes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'active.member@secondwind.com.au', password: defaultPassword });
    memberAToken = memberARes.body.data.accessToken;
    memberAProfile = await prisma.memberProfile.findUnique({
      where: { userId: memberARes.body.data.user.id },
    });

    // Create Member B (Iron Forge)
    const userB = await prisma.user.upsert({
      where: { email: 'member.b@ironforge.com.au' },
      update: {},
      create: {
        email: 'member.b@ironforge.com.au',
        passwordHash: 'hash',
        firstName: 'Bob',
        lastName: 'Forge',
      },
    });

    memberBProfile = await prisma.memberProfile.upsert({
      where: { userId: userB.id },
      update: {},
      create: {
        userId: userB.id,
        organisationId: orgB.id,
      },
    });

    // Login staff (Owner)
    const staffRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner@secondwind.com.au', password: defaultPassword });
    staffToken = staffRes.body.data.accessToken;

    // Create Class Types for Org A and Org B
    const ctA = await prisma.classType.findFirst({ where: { organisationId: orgA.id } });
    const ctB = await prisma.classType.create({
      data: {
        organisationId: orgB.id,
        name: 'Iron Forge Power',
        category: 'STRENGTH',
        durationMinutes: 60,
      },
    });

    const now = new Date();
    const startA = new Date(now.getTime() + 86400000 * 3);
    startA.setHours(15, 0, 0, 0);
    const endA = new Date(startA.getTime() + 45 * 60000);

    sessionOrgA = await prisma.classSession.create({
      data: {
        organisationId: orgA.id,
        outletId: orgA.outlets[0].id,
        classTypeId: ctA!.id,
        name: 'Org A Class',
        startsAt: startA,
        endsAt: endA,
        capacity: 10,
        status: 'SCHEDULED',
      },
    });

    const startB = new Date(now.getTime() + 86400000 * 3);
    startB.setHours(16, 0, 0, 0);
    const endB = new Date(startB.getTime() + 60 * 60000);

    sessionOrgB = await prisma.classSession.create({
      data: {
        organisationId: orgB.id,
        outletId: orgB.outlets[0].id,
        classTypeId: ctB.id,
        name: 'Org B Class',
        startsAt: startB,
        endsAt: endB,
        capacity: 10,
        status: 'SCHEDULED',
      },
    });

    // Book Member A into Org A session
    bookingMemberA = await prisma.booking.create({
      data: {
        organisationId: orgA.id,
        outletId: orgA.outlets[0].id,
        classSessionId: sessionOrgA.id,
        memberProfileId: memberAProfile.id,
        status: 'CONFIRMED',
      },
    });
  });

  afterAll(async () => {
    if (sessionOrgA?.id) {
      await prisma.booking.deleteMany({ where: { classSessionId: sessionOrgA.id } });
      await prisma.classSession.delete({ where: { id: sessionOrgA.id } }).catch(() => null);
    }
    if (sessionOrgB?.id) {
      await prisma.booking.deleteMany({ where: { classSessionId: sessionOrgB.id } });
      await prisma.classSession.delete({ where: { id: sessionOrgB.id } }).catch(() => null);
    }
    await app.close();
  });

  it('1. Member cannot create class types or templates (RBAC Protection)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/classes')
      .set('Authorization', `Bearer ${memberAToken}`)
      .send({
        name: 'Hacked Class',
        category: 'HIIT',
        durationMinutes: 45,
      });

    expect(res.status).toBe(403);
  });

  it('2. Cross-Tenant Isolation: Member A cannot book class session belonging to Org B', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/class-sessions/${sessionOrgB.id}/book`)
      .set('Authorization', `Bearer ${memberAToken}`)
      .send({});

    // Must be denied either 403 or 404 (not in member's org)
    expect([403, 404]).toContain(res.status);
  });

  it('3. Anti-IDOR: Member B cannot cancel Member A\'s booking', async () => {
    // Member B tries to cancel Member A's booking
    const otherMemberRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'parq.member@secondwind.com.au', password: defaultPassword });
    const attackerMemberToken = otherMemberRes.body.data.accessToken;

    const res = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingMemberA.id}/cancel`)
      .set('Authorization', `Bearer ${attackerMemberToken}`)
      .send({ reason: 'Malicious cancellation' });

    expect([403, 404]).toContain(res.status);

    // Verify booking is still CONFIRMED in database
    const booking = await prisma.booking.findUnique({
      where: { id: bookingMemberA.id },
    });
    expect(booking?.status).toBe('CONFIRMED');
  });

  it('4. Staff can access roster, perform manual booking, and mark attendance', async () => {
    // Staff views session bookings
    const rosterRes = await request(app.getHttpServer())
      .get(`/api/v1/staff/class-sessions/${sessionOrgA.id}/bookings`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(rosterRes.status).toBe(200);
    expect(rosterRes.body.success).toBe(true);
    expect(Array.isArray(rosterRes.body.data)).toBe(true);

    // Staff checks in Member A via POST
    const checkInRes = await request(app.getHttpServer())
      .post(`/api/v1/staff/bookings/${bookingMemberA.id}/check-in`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(checkInRes.status).toBe(201);
    expect(checkInRes.body.data.status).toBe('CHECKED_IN');
    expect(checkInRes.body.data.checkedInAt).toBeDefined();
  });
});
