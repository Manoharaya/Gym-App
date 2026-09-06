import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { NoShowProcessorService } from '../src/attendance/services/no-show-processor.service';
import { CheckInService } from '../src/attendance/services/check-in.service';
import { RosterService } from '../src/attendance/services/roster.service';
import { BookingService } from '../src/bookings/services/booking.service';
import { AttendanceStatusEnum } from '../src/attendance/dto/correct-attendance.dto';

describe('No-Show Processing & Invariant Protection (Day 10 E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let noShowProcessor: NoShowProcessorService;
  let checkInService: CheckInService;
  let rosterService: RosterService;
  let bookingService: BookingService;

  let organisationId: string;
  let outletId: string;
  let classTypeId: string;
  let staffUser: any;

  let m1: any, p1: any; // Checked-in member
  let m2: any, p2: any; // Unattended confirmed member -> Should become NO_SHOW
  let m3: any, p3: any; // Cancelled member -> Should NOT become NO_SHOW
  let m4: any, p4: any; // Waitlisted member -> Should NOT become NO_SHOW
  let m5: any, p5: any; // Manually EXCUSED by staff -> Should NOT be overwritten

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
    noShowProcessor = app.get(NoShowProcessorService);
    checkInService = app.get(CheckInService);
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

    staffUser = await prisma.user.create({
      data: {
        email: `staff.noshow.${Date.now()}@secondwind.com.au`,
        passwordHash: 'dummy',
        firstName: 'Staff',
        lastName: 'Auditor',
      },
    });

    async function createTestMember(name: string) {
      const u = await prisma.user.create({
        data: {
          email: `${name.toLowerCase()}.${Date.now()}@secondwind.com.au`,
          passwordHash: 'dummy',
          firstName: name,
          lastName: 'Tester',
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

    const t1 = await createTestMember('Attending');
    m1 = t1.user;
    p1 = t1.profile;

    const t2 = await createTestMember('NoShow');
    m2 = t2.user;
    p2 = t2.profile;

    const t3 = await createTestMember('Cancelled');
    m3 = t3.user;
    p3 = t3.profile;

    const t4 = await createTestMember('Waitlist');
    m4 = t4.user;
    p4 = t4.profile;

    const t5 = await createTestMember('Excused');
    m5 = t5.user;
    p5 = t5.profile;
  });

  afterAll(async () => {
    await app.close();
  });

  it('correctly marks unattended confirmed reservations as NO_SHOW while protecting all invariants', async () => {
    // Past session: started 60 mins ago, ended 15 mins ago
    const startsAt = new Date(Date.now() - 60 * 60 * 1000);
    const endsAt = new Date(Date.now() - 15 * 60 * 1000);

    const session = await prisma.classSession.create({
      data: {
        organisationId,
        outletId,
        classTypeId,
        startsAt,
        endsAt,
        capacity: 3,
        status: 'PUBLISHED',
      },
    });

    // 1. Member 1 books and checks in
    await bookingService.bookSession(organisationId, p1.id, session.id);
    await checkInService.checkInBookedMember(session.id, p1.id, 'STAFF', {
      allowWindowOverride: true,
    });

    // 2. Member 2 books and DOES NOT show up (unattended confirmed booking)
    await bookingService.bookSession(organisationId, p2.id, session.id);

    // 3. Member 3 has a cancelled booking
    await prisma.booking.create({
      data: {
        organisationId,
        outletId,
        classSessionId: session.id,
        memberProfileId: p3.id,
        status: 'CANCELLED',
        cancellationReason: 'Injured',
      },
    });

    // 4. Member 4 has a waitlisted booking
    await prisma.booking.create({
      data: {
        organisationId,
        outletId,
        classSessionId: session.id,
        memberProfileId: p4.id,
        status: 'WAITLISTED',
        waitlistPosition: 1,
      },
    });

    // 5. Member 5 books, and is manually excused by staff before processing
    await prisma.booking.create({
      data: {
        organisationId,
        outletId,
        classSessionId: session.id,
        memberProfileId: p5.id,
        status: 'CONFIRMED',
      },
    });
    await prisma.attendanceRecord.create({
      data: {
        organisationId,
        outletId,
        classSessionId: session.id,
        memberProfileId: p5.id,
        status: 'EXCUSED',
        checkInMethod: 'STAFF',
        isOverride: true,
        overrideReason: 'Medical certificate submitted to front desk',
      },
    });

    // Run no-show processing with 15-minute grace period
    const result = await noShowProcessor.processSessionNoShows(session.id, 15);
    expect(result.processedCount).toBe(1); // ONLY member 2!

    // Verify Member 2: Marked NO_SHOW on both booking and attendance record
    const b2Updated = await prisma.booking.findFirstOrThrow({
      where: { classSessionId: session.id, memberProfileId: p2.id },
    });
    expect(b2Updated.status).toBe('NO_SHOW');

    const att2 = await prisma.attendanceRecord.findUniqueOrThrow({
      where: {
        classSessionId_memberProfileId: {
          classSessionId: session.id,
          memberProfileId: p2.id,
        },
      },
    });
    expect(att2.status).toBe('NO_SHOW');
    expect(att2.checkInMethod).toBe('SYSTEM');

    // INVARIANT 1: Member 1 (Checked-in) was NOT touched
    const b1 = await prisma.booking.findFirstOrThrow({
      where: { classSessionId: session.id, memberProfileId: p1.id },
    });
    expect(b1.status).toBe('CHECKED_IN');

    // INVARIANT 2: Member 3 (Cancelled) was NOT touched
    const b3Updated = await prisma.booking.findFirstOrThrow({
      where: { classSessionId: session.id, memberProfileId: p3.id },
    });
    expect(b3Updated.status).toBe('CANCELLED');

    // INVARIANT 3: Member 4 (Waitlist) was NOT marked NO_SHOW
    const b4Updated = await prisma.booking.findFirstOrThrow({
      where: { classSessionId: session.id, memberProfileId: p4.id },
    });
    expect(b4Updated.status).toBe('WAITLISTED');

    // INVARIANT 4: Member 5 (Staff EXCUSED manual override) was NOT overwritten
    const att5 = await prisma.attendanceRecord.findUniqueOrThrow({
      where: {
        classSessionId_memberProfileId: {
          classSessionId: session.id,
          memberProfileId: p5.id,
        },
      },
    });
    expect(att5.status).toBe('EXCUSED');
    expect(att5.isOverride).toBe(true);

    // IDEMPOTENCY: Re-running no-show processor produces 0 new processed records
    const secondRun = await noShowProcessor.processSessionNoShows(session.id, 15);
    expect(secondRun.processedCount).toBe(0);
  });
});
