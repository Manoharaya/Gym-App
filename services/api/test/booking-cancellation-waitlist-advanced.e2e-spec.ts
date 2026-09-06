import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { BookingService, WaitlistService } from '../src/bookings';

describe('Advanced Cancellation, Late Policies, Daily Limits & Overlaps (Day 9 E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let bookingService: BookingService;
  let waitlistService: WaitlistService;

  let organisationId: string;
  let outletId: string;
  let classTypeId: string;

  // Test members
  let user1: any, profile1: any;
  let user2: any, profile2: any;
  let createdSessionIds: string[] = [];
  let defaultPolicy: any;

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

    // Fetch or create default booking policy for organisation
    defaultPolicy = await prisma.bookingPolicy.findFirst({
      where: { organisationId, isDefault: true },
    });
    if (!defaultPolicy) {
      defaultPolicy = await prisma.bookingPolicy.create({
        data: {
          organisationId,
          name: 'Default Policy',
          minimumCancellationNoticeHours: 2,
          allowLateCancellation: true,
          lateCancellationWindowHours: 2,
          recordLateCancellation: true,
          isDefault: true,
        },
      });
    }

    // Helper to create test member with active membership
    async function createMember(suffix: string) {
      const u = await prisma.user.create({
        data: {
          email: `test.adv.${suffix}.${Date.now()}@secondwind.com.au`,
          passwordHash: 'dummy',
          firstName: 'Advanced',
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

    const m1 = await createMember('Alpha');
    user1 = m1.user;
    profile1 = m1.profile;

    const m2 = await createMember('Beta');
    user2 = m2.user;
    profile2 = m2.profile;
  });

  afterAll(async () => {
    // Restore original policy
    if (defaultPolicy?.id) {
      await prisma.bookingPolicy.update({
        where: { id: defaultPolicy.id },
        data: {
          allowLateCancellation: defaultPolicy.allowLateCancellation ?? true,
          lateCancellationWindowHours: defaultPolicy.lateCancellationWindowHours ?? 2,
          recordLateCancellation: defaultPolicy.recordLateCancellation ?? true,
          maxBookingsPerDay: defaultPolicy.maxBookingsPerDay ?? null,
        },
      });
    }

    for (const sid of createdSessionIds) {
      await prisma.booking.deleteMany({ where: { classSessionId: sid } });
      await prisma.waitlistEntry.deleteMany({ where: { classSessionId: sid } });
      await prisma.classSession.delete({ where: { id: sid } }).catch(() => null);
    }

    for (const p of [profile1, profile2]) {
      if (p?.id) {
        await prisma.memberMembership.deleteMany({ where: { memberProfileId: p.id } });
        await prisma.memberProfile.delete({ where: { id: p.id } }).catch(() => null);
      }
    }
    for (const u of [user1, user2]) {
      if (u?.id) {
        await prisma.user.delete({ where: { id: u.id } }).catch(() => null);
      }
    }

    await app.close();
  });

  it('1. Rejects late cancellation when allowLateCancellation = false', async () => {
    // Set policy: disallow late cancellation
    await prisma.bookingPolicy.update({
      where: { id: defaultPolicy.id },
      data: {
        allowLateCancellation: false,
        lateCancellationWindowHours: 3,
      },
    });

    // Create session starting in 1 hour with cancellationClosesAt in the past
    const startsAt = new Date(Date.now() + 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 45 * 60 * 1000);
    const cancellationClosesAt = new Date(Date.now() - 10 * 60 * 1000); // 10 mins ago

    const session = await prisma.classSession.create({
      data: {
        organisationId,
        outletId,
        classTypeId,
        name: 'Strict Policy Class',
        startsAt,
        endsAt,
        cancellationClosesAt,
        capacity: 10,
        status: 'SCHEDULED',
      },
    });
    createdSessionIds.push(session.id);

    // Book session directly
    const booking = await prisma.booking.create({
      data: {
        organisationId,
        outletId,
        classSessionId: session.id,
        memberProfileId: profile1.id,
        status: 'CONFIRMED',
      },
    });

    // Try to cancel: should be rejected
    await expect(
      bookingService.cancelBooking(booking.id, profile1.id, { reason: 'Cannot make it' })
    ).rejects.toThrow('Cancellation deadline has passed');
  });

  it('2. Permits late cancellation and flags isLateCancellation = true when allowLateCancellation = true', async () => {
    // Update policy: allow late cancellation
    await prisma.bookingPolicy.update({
      where: { id: defaultPolicy.id },
      data: {
        allowLateCancellation: true,
        lateCancellationWindowHours: 3,
        recordLateCancellation: true,
      },
    });

    const startsAt = new Date(Date.now() + 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 45 * 60 * 1000);
    const cancellationClosesAt = new Date(Date.now() - 10 * 60 * 1000); // 10 mins ago

    const session = await prisma.classSession.create({
      data: {
        organisationId,
        outletId,
        classTypeId,
        name: 'Forgiving Late Policy Class',
        startsAt,
        endsAt,
        cancellationClosesAt,
        capacity: 10,
        status: 'SCHEDULED',
      },
    });
    createdSessionIds.push(session.id);

    const booking = await prisma.booking.create({
      data: {
        organisationId,
        outletId,
        classSessionId: session.id,
        memberProfileId: profile1.id,
        status: 'CONFIRMED',
      },
    });

    const cancelled = await bookingService.cancelBooking(
      booking.id,
      profile1.id,
      { reason: 'Car broke down' }
    );

    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.isLateCancellation).toBe(true);

    const dbBooking = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(dbBooking.isLateCancellation).toBe(true);
  });

  it('3. Enforces maxBookingsPerDay policy limit', async () => {
    // Set policy to max 1 booking per day
    await prisma.bookingPolicy.update({
      where: { id: defaultPolicy.id },
      data: {
        maxBookingsPerDay: 1,
      },
    });

    // Create 2 sessions on the same future day (e.g. 5 days from now)
    const baseDate = new Date(Date.now() + 5 * 86400000);
    baseDate.setHours(9, 0, 0, 0);

    const session1 = await prisma.classSession.create({
      data: {
        organisationId,
        outletId,
        classTypeId,
        name: 'Morning Session',
        startsAt: baseDate,
        endsAt: new Date(baseDate.getTime() + 45 * 60000),
        capacity: 10,
        status: 'SCHEDULED',
      },
    });
    createdSessionIds.push(session1.id);

    const laterDate = new Date(baseDate.getTime() + 4 * 3600000); // 4 hours later same day
    const session2 = await prisma.classSession.create({
      data: {
        organisationId,
        outletId,
        classTypeId,
        name: 'Afternoon Session',
        startsAt: laterDate,
        endsAt: new Date(laterDate.getTime() + 45 * 60000),
        capacity: 10,
        status: 'SCHEDULED',
      },
    });
    createdSessionIds.push(session2.id);

    // First booking succeeds
    const b1 = await bookingService.bookSession(organisationId, profile2.id, session1.id);
    expect(b1.status).toBe('CONFIRMED');

    // Second booking on same day should throw DAILY_BOOKING_LIMIT_REACHED
    await expect(
      bookingService.bookSession(organisationId, profile2.id, session2.id)
    ).rejects.toThrow('Daily booking limit reached');
  });

  it('4. Rejects overlapping session bookings with BOOKING_TIME_CONFLICT', async () => {
    // Remove daily limit so we isolate time conflict
    await prisma.bookingPolicy.update({
      where: { id: defaultPolicy.id },
      data: {
        maxBookingsPerDay: null,
      },
    });

    const conflictStart = new Date(Date.now() + 7 * 86400000);
    conflictStart.setHours(10, 0, 0, 0);

    const s1 = await prisma.classSession.create({
      data: {
        organisationId,
        outletId,
        classTypeId,
        name: 'Overlapping Session 1',
        startsAt: conflictStart,
        endsAt: new Date(conflictStart.getTime() + 60 * 60000), // 10:00 - 11:00
        capacity: 10,
        status: 'SCHEDULED',
      },
    });
    createdSessionIds.push(s1.id);

    const s2 = await prisma.classSession.create({
      data: {
        organisationId,
        outletId,
        classTypeId,
        name: 'Overlapping Session 2',
        startsAt: new Date(conflictStart.getTime() + 30 * 60000), // 10:30 - 11:30 (overlaps!)
        endsAt: new Date(conflictStart.getTime() + 90 * 60000),
        capacity: 10,
        status: 'SCHEDULED',
      },
    });
    createdSessionIds.push(s2.id);

    // First booking succeeds
    await bookingService.bookSession(organisationId, profile1.id, s1.id);

    // Second booking overlaps with the first
    await expect(
      bookingService.bookSession(organisationId, profile1.id, s2.id)
    ).rejects.toThrow('Time conflict with existing booking');
  });

  it('5. Waitlist offer expiration marks expired entries and promotes next in queue', async () => {
    const sFuture = new Date(Date.now() + 10 * 86400000);
    const session = await prisma.classSession.create({
      data: {
        organisationId,
        outletId,
        classTypeId,
        name: 'Waitlist Expiry Test Class',
        startsAt: sFuture,
        endsAt: new Date(sFuture.getTime() + 45 * 60000),
        capacity: 1,
        status: 'SCHEDULED',
      },
    });
    createdSessionIds.push(session.id);

    // Member 1 has OFFERED entry whose offer expired 10 minutes ago
    const b1 = await prisma.booking.create({
      data: {
        organisationId,
        outletId,
        classSessionId: session.id,
        memberProfileId: profile1.id,
        status: 'WAITLISTED',
      },
    });
    const wl1 = await prisma.waitlistEntry.create({
      data: {
        organisationId,
        outletId,
        classSessionId: session.id,
        memberProfileId: profile1.id,
        bookingId: b1.id,
        position: 1,
        status: 'OFFERED',
        offerExpiresAt: new Date(Date.now() - 10 * 60000), // 10 mins ago
      },
    });

    // Member 2 has PENDING entry at position 2
    const b2 = await prisma.booking.create({
      data: {
        organisationId,
        outletId,
        classSessionId: session.id,
        memberProfileId: profile2.id,
        status: 'WAITLISTED',
      },
    });
    const wl2 = await prisma.waitlistEntry.create({
      data: {
        organisationId,
        outletId,
        classSessionId: session.id,
        memberProfileId: profile2.id,
        bookingId: b2.id,
        position: 2,
        status: 'PENDING',
      },
    });

    // Run expiration routine
    const expiredResults = await waitlistService.expireWaitlistOffers();
    expect(expiredResults.length).toBeGreaterThanOrEqual(1);

    // Member 1 should now be EXPIRED
    const updatedWl1 = await prisma.waitlistEntry.findUniqueOrThrow({
      where: { id: wl1.id },
    });
    expect(updatedWl1.status).toBe('EXPIRED');

    // Member 2 should now be promoted!
    const updatedWl2 = await prisma.waitlistEntry.findUniqueOrThrow({
      where: { id: wl2.id },
    });
    expect(updatedWl2.status).toBe('PROMOTED');

    const updatedB2 = await prisma.booking.findUniqueOrThrow({
      where: { id: b2.id },
    });
    expect(updatedB2.status).toBe('CONFIRMED');
  });
});
