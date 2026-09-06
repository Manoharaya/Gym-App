import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { WalkInService } from '../src/attendance/services/walk-in.service';
import { RosterService } from '../src/attendance/services/roster.service';
import { BookingService } from '../src/bookings/services/booking.service';

describe('Walk-In Attendance & Concurrency-Safe Capacity (Day 10 E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let walkInService: WalkInService;
  let rosterService: RosterService;
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
    walkInService = app.get(WalkInService);
    rosterService = app.get(RosterService);
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
        email: `staff.walkin.${Date.now()}@secondwind.com.au`,
        passwordHash: 'dummy',
        firstName: 'Staff',
        lastName: 'WalkIn',
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('records walk-in member attendance without prior reservation, preserving bookingId = null', async () => {
    const { profile: walkInProfile } = await createTestMember('WalkIn1');

    const session = await prisma.classSession.create({
      data: {
        organisationId,
        outletId,
        classTypeId,
        startsAt: new Date(Date.now() + 10 * 60 * 1000),
        endsAt: new Date(Date.now() + 55 * 60 * 1000),
        capacity: 5,
        status: 'PUBLISHED',
      },
    });

    const walkInRecord = await walkInService.recordWalkIn(
      organisationId,
      outletId,
      session.id,
      {
        memberProfileId: walkInProfile.id,
      },
      staffUser.id,
    );

    expect(walkInRecord.status).toBe('CHECKED_IN');
    expect(walkInRecord.bookingId).toBeNull(); // Strictly null for walk-ins
    expect(walkInRecord.checkInMethod).toBe('STAFF');
    expect(walkInRecord.markedByUserId).toBe(staffUser.id);

    // Verify in operational roster
    const rosterView = await rosterService.getSessionRoster(session.id, organisationId);
    expect(rosterView.summary.walkInsCount).toBe(1);
    expect(rosterView.summary.totalOccupied).toBe(1);
    expect(rosterView.summary.spotsRemaining).toBe(4);
    expect(rosterView.walkIns.length).toBe(1);
    expect(rosterView.walkIns[0].isWalkIn).toBe(true);
  });

  it('strictly enforces capacity limits when session is at capacity', async () => {
    const { profile: bookedProfile } = await createTestMember('BookedMember2');
    const { profile: walkInProfile } = await createTestMember('WalkInMember2');

    // Session with tiny capacity = 1
    const tinySession = await prisma.classSession.create({
      data: {
        organisationId,
        outletId,
        classTypeId,
        startsAt: new Date(Date.now() + 70 * 60 * 1000),
        endsAt: new Date(Date.now() + 115 * 60 * 1000),
        capacity: 1,
        status: 'PUBLISHED',
      },
    });

    // Member reserves the only spot
    await bookingService.bookSession(organisationId, bookedProfile.id, tinySession.id);

    // Walk-in attempt without override -> must fail
    await expect(
      walkInService.recordWalkIn(
        organisationId,
        outletId,
        tinySession.id,
        {
          memberProfileId: walkInProfile.id,
        },
        staffUser.id,
      ),
    ).rejects.toThrow('Class capacity (1) is full');
  });

  it('requires an explicit overrideReason when staff overrides class capacity', async () => {
    const { profile: bookedProfile } = await createTestMember('BookedMember3');
    const { profile: walkInProfile } = await createTestMember('WalkInMember3');

    const tinySession = await prisma.classSession.create({
      data: {
        organisationId,
        outletId,
        classTypeId,
        startsAt: new Date(Date.now() + 130 * 60 * 1000),
        endsAt: new Date(Date.now() + 175 * 60 * 1000),
        capacity: 1,
        status: 'PUBLISHED',
      },
    });

    await bookingService.bookSession(organisationId, bookedProfile.id, tinySession.id);

    // Walk-in with allowCapacityOverride = true but NO overrideReason -> must fail
    await expect(
      walkInService.recordWalkIn(
        organisationId,
        outletId,
        tinySession.id,
        {
          memberProfileId: walkInProfile.id,
          allowCapacityOverride: true,
        },
        staffUser.id,
      ),
    ).rejects.toThrow('An explicit override reason is mandatory when exceeding class capacity');

    // Walk-in with explicit overrideReason -> succeeds
    const overrideRecord = await walkInService.recordWalkIn(
      organisationId,
      outletId,
      tinySession.id,
      {
        memberProfileId: walkInProfile.id,
        allowCapacityOverride: true,
        overrideReason: 'VIP Guest admitted with GM approval',
      },
      staffUser.id,
    );

    expect(overrideRecord.isOverride).toBe(true);
    expect(overrideRecord.overrideReason).toBe('VIP Guest admitted with GM approval');

    // Verify roster reflects both booked member and walk-in
    const roster = await rosterService.getSessionRoster(tinySession.id, organisationId);
    expect(roster.summary.capacity).toBe(1);
    expect(roster.summary.confirmedBookingsCount).toBe(1);
    expect(roster.summary.walkInsCount).toBe(1);
    expect(roster.summary.totalOccupied).toBe(2); // Exceeded capacity via staff override
    expect(roster.summary.spotsRemaining).toBe(0);
  });
});
