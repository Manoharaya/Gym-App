import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { CheckInService } from '../src/attendance/services/check-in.service';
import { BookingService } from '../src/bookings/services/booking.service';

describe('Attendance Check-In Lifecycle (Day 10 E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let checkInService: CheckInService;
  let bookingService: BookingService;

  let organisationId: string;
  let outletId: string;
  let classTypeId: string;
  let staffUser: any;

  // Helper to create active member
  async function createTestMember(name: string) {
    const u = await prisma.user.create({
      data: {
        email: `${name.toLowerCase()}.${Date.now()}.${Math.random()}@secondwind.com.au`,
        passwordHash: 'dummy',
        firstName: name,
        lastName: 'Tester',
        status: 'ACTIVE',
      },
    });

    const p = await prisma.memberProfile.create({
      data: {
        userId: u.id,
        organisationId,
        status: 'ACTIVE',
      },
    });

    const plan = await prisma.membershipPlan.findFirstOrThrow({
      where: { organisationId, code: 'SW-PREM-M' },
    });

    await prisma.memberMembership.create({
      data: {
        organisationId,
        memberProfileId: p.id,
        membershipPlanId: plan.id,
        status: 'ACTIVE',
        accessScope: 'ALL_ORGANISATION_OUTLETS',
        originOutletId: outletId,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        planNameAtPurchase: plan.name,
        priceAtPurchase: plan.price,
        currencyAtPurchase: plan.currency,
        billingTypeAtPurchase: plan.billingType,
        durationValueAtPurchase: plan.durationValue,
        durationUnitAtPurchase: plan.durationUnit,
      },
    });

    return { user: u, profile: p };
  }

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
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();
    prisma = app.get(PrismaService);
    checkInService = app.get(CheckInService);
    bookingService = app.get(BookingService);

    const org = await prisma.organisation.findFirstOrThrow({
      where: { slug: 'second-wind' },
    });
    organisationId = org.id;

    const outlet = await prisma.outlet.findFirstOrThrow({
      where: { organisationId, code: 'SW-PERTH-CBD' },
    });
    outletId = outlet.id;

    const classType = await prisma.classType.findFirstOrThrow({
      where: { organisationId, category: 'HIIT' },
    });
    classTypeId = classType.id;

    // Create staff user
    staffUser = await prisma.user.create({
      data: {
        email: `staff.checkin.${Date.now()}@secondwind.com.au`,
        passwordHash: 'dummy',
        firstName: 'Staff',
        lastName: 'Operator',
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects check-in before the check-in window opens (-30m)', async () => {
    const { profile } = await createTestMember('TooEarly');

    // Session starting 2 hours in the future
    const futureStartsAt = new Date(Date.now() + 120 * 60 * 1000);
    const futureEndsAt = new Date(Date.now() + 165 * 60 * 1000);

    const session = await prisma.classSession.create({
      data: {
        organisationId,
        outletId,
        classTypeId,
        startsAt: futureStartsAt,
        endsAt: futureEndsAt,
        capacity: 10,
        status: 'PUBLISHED',
      },
    });

    // Book member
    await bookingService.bookSession(organisationId, profile.id, session.id);

    // Attempt self check-in
    await expect(
      checkInService.checkInBookedMember(session.id, profile.id, 'MEMBER_SELF_SERVICE'),
    ).rejects.toThrow('Check-in opens 30 minutes before class');
  });

  it('allows check-in within window (-30m to +15m) and updates status to CHECKED_IN', async () => {
    const { profile } = await createTestMember('InWindow');

    // Session starting in 10 minutes (within 30m window)
    const openStartsAt = new Date(Date.now() + 10 * 60 * 1000);
    const openEndsAt = new Date(Date.now() + 55 * 60 * 1000);

    const session = await prisma.classSession.create({
      data: {
        organisationId,
        outletId,
        classTypeId,
        startsAt: openStartsAt,
        endsAt: openEndsAt,
        capacity: 10,
        status: 'PUBLISHED',
      },
    });

    await bookingService.bookSession(organisationId, profile.id, session.id);

    const record = await checkInService.checkInBookedMember(
      session.id,
      profile.id,
      'MEMBER_SELF_SERVICE',
    );

    expect(record.status).toBe('CHECKED_IN');
    expect(record.lateMinutes).toBe(0);
    expect(record.checkInMethod).toBe('MEMBER_SELF_SERVICE');
    expect(record.checkedInAt).toBeDefined();

    // Verify booking status was synchronized
    const booking = await prisma.booking.findFirstOrThrow({
      where: { classSessionId: session.id, memberProfileId: profile.id },
    });
    expect(booking.status).toBe('CHECKED_IN');
    expect(booking.checkedInAt).toBeDefined();
  });

  it('detects late arrival when checking in after class has started', async () => {
    const { profile } = await createTestMember('LateArrival');

    // Session started 5 minutes ago (within +15m grace window)
    const lateStartsAt = new Date(Date.now() - 5 * 60 * 1000);
    const lateEndsAt = new Date(Date.now() + 40 * 60 * 1000);

    const session = await prisma.classSession.create({
      data: {
        organisationId,
        outletId,
        classTypeId,
        startsAt: lateStartsAt,
        endsAt: lateEndsAt,
        capacity: 10,
        status: 'PUBLISHED',
      },
    });

    await bookingService.bookSession(organisationId, profile.id, session.id);

    const record = await checkInService.checkInBookedMember(
      session.id,
      profile.id,
      'MEMBER_SELF_SERVICE',
    );

    expect(record.status).toBe('LATE');
    expect(record.lateMinutes).toBeGreaterThanOrEqual(4);
  });

  it('rejects check-in after window has closed (+15m) without staff override', async () => {
    const { profile } = await createTestMember('TooLate');

    // Session started 20 minutes ago (past +15m window)
    const expiredStartsAt = new Date(Date.now() - 20 * 60 * 1000);
    const expiredEndsAt = new Date(Date.now() + 25 * 60 * 1000);

    const session = await prisma.classSession.create({
      data: {
        organisationId,
        outletId,
        classTypeId,
        startsAt: expiredStartsAt,
        endsAt: expiredEndsAt,
        capacity: 10,
        status: 'PUBLISHED',
      },
    });

    await bookingService.bookSession(organisationId, profile.id, session.id);

    // Normal check-in must fail
    await expect(
      checkInService.checkInBookedMember(session.id, profile.id, 'MEMBER_SELF_SERVICE'),
    ).rejects.toThrow('Check-in closed 15 minutes after class started');

    // Staff override must succeed
    const overrideRecord = await checkInService.checkInBookedMember(
      session.id,
      profile.id,
      'STAFF',
      {
        staffUserId: staffUser.id,
        allowWindowOverride: true,
        notes: 'Member was delayed by traffic; approved by staff',
      },
    );

    expect(overrideRecord.isOverride).toBe(true);
    expect(overrideRecord.overrideReason).toBe('Staff override of check-in window');
    expect(overrideRecord.status).toBe('LATE');
  });

  it('rejects duplicate check-in if member is already checked in', async () => {
    const { profile } = await createTestMember('Duplicate');

    const startsAt = new Date(Date.now() + 5 * 60 * 1000);
    const endsAt = new Date(Date.now() + 50 * 60 * 1000);

    const session = await prisma.classSession.create({
      data: {
        organisationId,
        outletId,
        classTypeId,
        startsAt,
        endsAt,
        capacity: 10,
        status: 'PUBLISHED',
      },
    });

    await bookingService.bookSession(organisationId, profile.id, session.id);

    // First check-in succeeds
    await checkInService.checkInBookedMember(session.id, profile.id, 'MEMBER_SELF_SERVICE');

    // Second check-in must throw ConflictException
    await expect(
      checkInService.checkInBookedMember(session.id, profile.id, 'MEMBER_SELF_SERVICE'),
    ).rejects.toThrow('Member is already checked in to this class session');
  });

  it('computes duration and assigns status on member check-out', async () => {
    const { profile } = await createTestMember('CheckOut');

    const startsAt = new Date(Date.now() - 40 * 60 * 1000);
    const endsAt = new Date(Date.now() - 5 * 60 * 1000); // Class finished 5m ago

    const session = await prisma.classSession.create({
      data: {
        organisationId,
        outletId,
        classTypeId,
        startsAt,
        endsAt,
        capacity: 10,
        status: 'PUBLISHED',
      },
    });

    await bookingService.bookSession(organisationId, profile.id, session.id);

    // Create checked in attendance
    await checkInService.checkInBookedMember(session.id, profile.id, 'STAFF', {
      allowWindowOverride: true,
    });

    // Check-out
    const checkOutRecord = await checkInService.checkOutMember(
      session.id,
      profile.id,
      'MEMBER_SELF_SERVICE',
    );

    expect(checkOutRecord.status).toBe('COMPLETED');
    expect(checkOutRecord.checkedOutAt).toBeDefined();
    expect(checkOutRecord.durationMinutes).toBeGreaterThanOrEqual(1);

    // Verify history retrieval
    const history = await checkInService.getMemberAttendanceHistory(profile.id);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history.some((h) => h.classSessionId === session.id)).toBe(true);
  });
});
