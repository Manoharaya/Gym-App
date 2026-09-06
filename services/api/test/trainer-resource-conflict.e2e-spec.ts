import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { ResourceService, TrainerAvailabilityService, ClassSessionService } from '../src/bookings';

describe('Resource Double-Booking & Trainer Conflict Engine (Day 9 E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let resourceService: ResourceService;
  let trainerAvailabilityService: TrainerAvailabilityService;
  let sessionService: ClassSessionService;

  let orgA: any;
  let orgB: any;
  let outletA: any;
  let outletB: any;
  let classTypeA: any;
  let trainerUser: any;
  let staffUser: any;

  let resource1: any;
  let createdSessionIds: string[] = [];
  let createdResourceIds: string[] = [];
  let createdAvailabilityIds: string[] = [];

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
    resourceService = app.get(ResourceService);
    trainerAvailabilityService = app.get(TrainerAvailabilityService);
    sessionService = app.get(ClassSessionService);

    // Primary Org A
    orgA = await prisma.organisation.findFirstOrThrow({
      where: { slug: 'second-wind' },
    });
    outletA = await prisma.outlet.findFirstOrThrow({
      where: { organisationId: orgA.id, code: 'SW-PERTH-CBD' },
    });
    classTypeA = await prisma.classType.findFirstOrThrow({
      where: { organisationId: orgA.id, category: 'HIIT' },
    });

    // Secondary Org B
    orgB = await prisma.organisation.findFirst({
      where: { slug: 'iron-haven' },
    });
    if (!orgB) {
      orgB = await prisma.organisation.create({
        data: {
          name: 'Iron Haven Fitness',
          slug: 'iron-haven',
          status: 'ACTIVE',
        },
      });
    }
    outletB = await prisma.outlet.findFirst({
      where: { organisationId: orgB.id },
    });
    if (!outletB) {
      outletB = await prisma.outlet.create({
        data: {
          organisationId: orgB.id,
          name: 'Iron Haven Downtown',
          slug: 'iron-haven-downtown',
          code: 'IH-DOWN',
          timezone: 'Australia/Perth',
          address: '100 Iron St',
          city: 'Perth',
          state: 'WA',
          postalCode: '6000',
          country: 'AU',
          status: 'ACTIVE',
        },
      });
    }

    // Find or create trainer
    trainerUser = await prisma.user.findFirst({
      where: { email: 'trainer.conflict.test@secondwind.com.au' },
    });
    if (!trainerUser) {
      trainerUser = await prisma.user.create({
        data: {
          email: 'trainer.conflict.test@secondwind.com.au',
          passwordHash: 'dummy',
          firstName: 'Marcus',
          lastName: 'Trainer',
        },
      });
    }

    // Find or create staff user
    staffUser = await prisma.user.findFirst({
      where: { email: 'staff.conflict.test@secondwind.com.au' },
    });
    if (!staffUser) {
      staffUser = await prisma.user.create({
        data: {
          email: 'staff.conflict.test@secondwind.com.au',
          passwordHash: 'dummy',
          firstName: 'Alex',
          lastName: 'Manager',
        },
      });
    }

    // Create a dedicated Resource in Outlet A
    resource1 = await resourceService.createResource(orgA.id, {
      outletId: outletA.id,
      name: 'Studio Alpha',
      type: 'STUDIO',
      capacity: 25,
    });
    createdResourceIds.push(resource1.id);
  });

  afterAll(async () => {
    for (const sid of createdSessionIds) {
      await prisma.booking.deleteMany({ where: { classSessionId: sid } });
      await prisma.waitlistEntry.deleteMany({ where: { classSessionId: sid } });
      await prisma.classSession.delete({ where: { id: sid } }).catch(() => null);
    }
    for (const rid of createdResourceIds) {
      await prisma.resource.delete({ where: { id: rid } }).catch(() => null);
    }
    for (const aid of createdAvailabilityIds) {
      await prisma.trainerAvailability.delete({ where: { id: aid } }).catch(() => null);
    }
    await app.close();
  });

  it('1. Creates physical resource and confirms it appears in outlet timetable', async () => {
    const list = await resourceService.listResources(orgA.id, outletA.id);
    expect(list.some((r: any) => r.id === resource1.id)).toBe(true);

    const timetable = await resourceService.getResourceTimetable(
      resource1.id,
      new Date('2026-11-01T00:00:00Z'),
      new Date('2026-11-07T23:59:59Z')
    );
    expect(timetable.resource.id).toBe(resource1.id);
    expect(timetable.sessions).toEqual([]);
  });

  it('2. Prevents resource double-booking (RESOURCE_SCHEDULE_CONFLICT)', async () => {
    const s1Start = new Date(Date.now() + 15 * 86400000);
    s1Start.setHours(10, 0, 0, 0);
    const s1End = new Date(s1Start.getTime() + 60 * 60000); // 10:00 - 11:00

    // Session 1 books Studio Alpha
    const session1 = await sessionService.createSession(orgA.id, {
      outletId: outletA.id,
      classTypeId: classTypeA.id,
      resourceId: resource1.id,
      name: 'Studio Alpha HIIT 1',
      startsAt: s1Start.toISOString(),
      endsAt: s1End.toISOString(),
      capacity: 20,
    });
    createdSessionIds.push(session1.id);

    // Attempting to book Session 2 in Studio Alpha during overlapping time (10:30 - 11:30)
    const s2Start = new Date(s1Start.getTime() + 30 * 60000);
    const s2End = new Date(s1Start.getTime() + 90 * 60000);

    await expect(
      sessionService.createSession(orgA.id, {
        outletId: outletA.id,
        classTypeId: classTypeA.id,
        resourceId: resource1.id,
        name: 'Studio Alpha HIIT 2 (Conflict)',
        startsAt: s2Start.toISOString(),
        endsAt: s2End.toISOString(),
        capacity: 20,
      })
    ).rejects.toThrow('already booked by session');

    // Non-overlapping session right after Session 1 (11:00 - 12:00) should SUCCEED
    const session3 = await sessionService.createSession(orgA.id, {
      outletId: outletA.id,
      classTypeId: classTypeA.id,
      resourceId: resource1.id,
      name: 'Studio Alpha HIIT 3 (After)',
      startsAt: s1End.toISOString(),
      endsAt: new Date(s1End.getTime() + 60 * 60000).toISOString(),
      capacity: 20,
    });
    expect(session3.id).toBeDefined();
    createdSessionIds.push(session3.id);
  });

  it('3. Records trainer unavailability and blocks scheduling during holiday/leave', async () => {
    const leaveStart = new Date(Date.now() + 20 * 86400000);
    leaveStart.setHours(0, 0, 0, 0);
    const leaveEnd = new Date(leaveStart.getTime() + 2 * 86400000); // 2 full days

    const leave = await trainerAvailabilityService.recordUnavailability(
      orgA.id,
      {
        trainerId: trainerUser.id,
        startDate: leaveStart.toISOString(),
        endDate: leaveEnd.toISOString(),
        reason: 'Annual Leave / Vacation',
      },
      staffUser.id
    );
    createdAvailabilityIds.push(leave.id);

    // Trainer is checked as unavailable during this leave
    const check = await trainerAvailabilityService.isTrainerAvailable(
      trainerUser.id,
      new Date(leaveStart.getTime() + 10 * 3600000), // Day 1 at 10:00
      new Date(leaveStart.getTime() + 11 * 3600000)
    );
    expect(check.available).toBe(false);
    expect(check.reason).toContain('Annual Leave / Vacation');

    // Attempting to create a session for this trainer during leave throws TRAINER_SCHEDULE_CONFLICT
    await expect(
      sessionService.createSession(orgA.id, {
        outletId: outletA.id,
        classTypeId: classTypeA.id,
        trainerId: trainerUser.id,
        name: 'Vacation HIIT Attempt',
        startsAt: new Date(leaveStart.getTime() + 10 * 3600000).toISOString(),
        endsAt: new Date(leaveStart.getTime() + 11 * 3600000).toISOString(),
        capacity: 15,
      })
    ).rejects.toThrow('Trainer unavailable: Annual Leave / Vacation');
  });

  it('4. Multi-tenant isolation: Org B cannot access or mutate Org A resources', async () => {
    // Org B listing resources does NOT return Studio Alpha from Org A
    const orgBResources = await resourceService.listResources(orgB.id);
    expect(orgBResources.some((r: any) => r.id === resource1.id)).toBe(false);

    // Attempting to create resource in Org B using Org A outletId throws 404
    await expect(
      resourceService.createResource(orgB.id, {
        outletId: outletA.id, // Org A's outlet!
        name: 'Illegitimate Resource',
        type: 'STUDIO',
        capacity: 10,
      })
    ).rejects.toThrow('Outlet not found in this organisation');
  });
});
