import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { BookingService, WaitlistService } from '../src/bookings';

describe('Booking Capacity, Concurrency & Waitlist FIFO Lifecycle (Day 8 E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let bookingService: BookingService;
  let waitlistService: WaitlistService;

  let organisationId: string;
  let outletId: string;
  let classTypeId: string;
  let smallSession: any;

  // Test members
  let user1: any, profile1: any;
  let user2: any, profile2: any;
  let user3: any, profile3: any;
  let user4: any, profile4: any;

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
    bookingService = app.get(BookingService);
    waitlistService = app.get(WaitlistService);

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

    // Helper to create test member with active plan
    async function createMemberWithMembership(suffix: string) {
      const u = await prisma.user.create({
        data: {
          email: `test.booker.${suffix}.${Date.now()}@secondwind.com.au`,
          passwordHash: 'dummy',
          firstName: 'Booker',
          lastName: suffix,
        },
      });

      const p = await prisma.memberProfile.create({
        data: {
          userId: u.id,
          organisationId,
        },
      });

      const plan = await prisma.membershipPlan.findFirstOrThrow({
        where: { organisationId, code: 'SW-PREM-M' },
      });

      const now = new Date();
      const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const m = await prisma.memberMembership.create({
        data: {
          organisationId,
          memberProfileId: p.id,
          membershipPlanId: plan.id,
          status: 'ACTIVE',
          accessScope: 'ALL_ORGANISATION_OUTLETS',
          originOutletId: outletId,
          startDate: now,
          endDate: in30,
          planNameAtPurchase: plan.name,
          priceAtPurchase: plan.price,
          currencyAtPurchase: plan.currency,
          billingTypeAtPurchase: plan.billingType,
          durationValueAtPurchase: plan.durationValue,
          durationUnitAtPurchase: plan.durationUnit,
        },
      });

      return { user: u, profile: p, membership: m };
    }

    const m1 = await createMemberWithMembership('One');
    user1 = m1.user;
    profile1 = m1.profile;

    const m2 = await createMemberWithMembership('Two');
    user2 = m2.user;
    profile2 = m2.profile;

    const m3 = await createMemberWithMembership('Three');
    user3 = m3.user;
    profile3 = m3.profile;

    const m4 = await createMemberWithMembership('Four');
    user4 = m4.user;
    profile4 = m4.profile;

    // Create session with capacity = 2
    const sessionStart = new Date(Date.now() + 86400000 * 2); // 2 days ahead
    sessionStart.setHours(14, 0, 0, 0);
    const sessionEnd = new Date(sessionStart.getTime() + 45 * 60000);

    smallSession = await prisma.classSession.create({
      data: {
        organisationId,
        outletId,
        classTypeId,
        name: 'Small Capacity Test Class',
        startsAt: sessionStart,
        endsAt: sessionEnd,
        capacity: 2,
        status: 'SCHEDULED',
      },
    });
  });

  afterAll(async () => {
    if (smallSession?.id) {
      await prisma.booking.deleteMany({ where: { classSessionId: smallSession.id } });
      await prisma.waitlistEntry.deleteMany({ where: { classSessionId: smallSession.id } });
      await prisma.classSession.delete({ where: { id: smallSession.id } }).catch(() => null);
    }
    for (const p of [profile1, profile2, profile3, profile4]) {
      if (p?.id) {
        await prisma.memberMembership.deleteMany({ where: { memberProfileId: p.id } });
        await prisma.memberProfile.delete({ where: { id: p.id } }).catch(() => null);
      }
    }
    for (const u of [user1, user2, user3, user4]) {
      if (u?.id) {
        await prisma.user.delete({ where: { id: u.id } }).catch(() => null);
      }
    }
    await app.close();
  });

  it('1. First 2 bookings consume capacity and are CONFIRMED', async () => {
    const b1 = await bookingService.bookSession(
      organisationId,
      profile1.id,
      smallSession.id,
      { idempotencyKey: 'idem-b1-test' },
    );
    expect(b1.status).toBe('CONFIRMED');

    const b2 = await bookingService.bookSession(
      organisationId,
      profile2.id,
      smallSession.id,
    );
    expect(b2.status).toBe('CONFIRMED');

    // Verify database count
    const confirmedCount = await prisma.booking.count({
      where: { classSessionId: smallSession.id, status: 'CONFIRMED' },
    });
    expect(confirmedCount).toBe(2);
  });

  it('2. Idempotency Key Replay does not duplicate booking or exceed capacity', async () => {
    // Replay with exact same idempotency key used in booking 1
    const replay = await bookingService.bookSession(
      organisationId,
      profile1.id,
      smallSession.id,
      { idempotencyKey: 'idem-b1-test' },
    );

    expect(replay.status).toBe('CONFIRMED');
    expect((replay as any)._isIdempotentReplay).toBe(true);

    // Total confirmed in database remains strictly 2!
    const totalCount = await prisma.booking.count({
      where: { classSessionId: smallSession.id, status: 'CONFIRMED' },
    });
    expect(totalCount).toBe(2);
  });

  it('3. 3rd and 4th bookings automatically join Waitlist in FIFO order', async () => {
    // 3rd booking: class is full (2/2), joins waitlist
    const b3 = await bookingService.bookSession(
      organisationId,
      profile3.id,
      smallSession.id,
    );
    expect(b3.status).toBe('WAITLISTED');

    const wl3 = await prisma.waitlistEntry.findFirst({
      where: { bookingId: b3.id },
    });
    expect(wl3?.position).toBe(1);

    // 4th booking: joins waitlist at position 2
    const b4 = await bookingService.bookSession(
      organisationId,
      profile4.id,
      smallSession.id,
    );
    expect(b4.status).toBe('WAITLISTED');

    const wl4 = await prisma.waitlistEntry.findFirst({
      where: { bookingId: b4.id },
    });
    expect(wl4?.position).toBe(2);

    // Waitlist count in DB
    const waitlistCount = await prisma.waitlistEntry.count({
      where: { classSessionId: smallSession.id, status: 'PENDING' },
    });
    expect(waitlistCount).toBe(2);
  });

  it('4. When a confirmed booking is cancelled, Waitlist #1 is automatically promoted to CONFIRMED', async () => {
    // Find member 1's confirmed booking
    const booking1 = await prisma.booking.findFirstOrThrow({
      where: { classSessionId: smallSession.id, memberProfileId: profile1.id, status: 'CONFIRMED' },
    });

    // Cancel member 1's booking
    const cancelRes = await bookingService.cancelBooking(
      booking1.id,
      profile1.id,
      { reason: 'Schedule conflict' },
    );

    expect(cancelRes.status).toBe('CANCELLED');

    // Waitlist entry 1 (profile3) should now be PROMOTED
    const waitlist3 = await prisma.waitlistEntry.findFirstOrThrow({
      where: { classSessionId: smallSession.id, memberProfileId: profile3.id },
    });
    expect(waitlist3.status).toBe('PROMOTED');

    // Member 3 should now have a CONFIRMED booking!
    const booking3 = await prisma.booking.findFirstOrThrow({
      where: { classSessionId: smallSession.id, memberProfileId: profile3.id },
    });
    expect(booking3.status).toBe('CONFIRMED');

    // Total confirmed bookings remains exactly 2 (profile2 and profile3)
    const confirmedCount = await prisma.booking.count({
      where: { classSessionId: smallSession.id, status: 'CONFIRMED' },
    });
    expect(confirmedCount).toBe(2);

    // Member 4 is now at front of queue (waitlist position 1)
    const waitlist4 = await prisma.waitlistEntry.findFirstOrThrow({
      where: { classSessionId: smallSession.id, memberProfileId: profile4.id },
    });
    expect(waitlist4.position).toBe(1);
    expect(waitlist4.status).toBe('PENDING');
  });

  it('5. Ineligible waitlisted member is skipped, promoting the next eligible member in queue', async () => {
    // Re-join member 1 (class is full, so joins waitlist as #2)
    const b1Rejoin = await bookingService.bookSession(
      organisationId,
      profile1.id,
      smallSession.id,
    );
    expect(b1Rejoin.status).toBe('WAITLISTED');

    const wl1Rejoin = await prisma.waitlistEntry.findFirst({
      where: { bookingId: b1Rejoin.id },
    });
    expect(wl1Rejoin?.position).toBe(2);

    // Now expire member 4's membership so they become INELIGIBLE
    await prisma.memberMembership.updateMany({
      where: { memberProfileId: profile4.id },
      data: { status: 'EXPIRED' },
    });

    // Cancel member 2's booking to trigger waitlist promotion
    const booking2 = await prisma.booking.findFirstOrThrow({
      where: { classSessionId: smallSession.id, memberProfileId: profile2.id, status: 'CONFIRMED' },
    });

    await bookingService.cancelBooking(booking2.id, profile2.id, { reason: 'Sick' });

    // Member 4 (ineligible) should have been SKIPPED / EXPIRED
    const waitlist4Updated = await prisma.waitlistEntry.findFirstOrThrow({
      where: { classSessionId: smallSession.id, memberProfileId: profile4.id },
    });
    expect(waitlist4Updated.status).toBe('EXPIRED');

    // Member 1 (eligible at position 2) was promoted instead!
    const waitlist1Updated = await prisma.waitlistEntry.findFirstOrThrow({
      where: { classSessionId: smallSession.id, memberProfileId: profile1.id },
    });
    expect(waitlist1Updated.status).toBe('PROMOTED');

    const booking1New = await prisma.booking.findFirstOrThrow({
      where: { classSessionId: smallSession.id, memberProfileId: profile1.id, status: 'CONFIRMED' },
    });
    expect(booking1New.status).toBe('CONFIRMED');

    // Total confirmed bookings remains strictly 2!
    const confirmedCount = await prisma.booking.count({
      where: { classSessionId: smallSession.id, status: 'CONFIRMED' },
    });
    expect(confirmedCount).toBe(2);
  });
});
