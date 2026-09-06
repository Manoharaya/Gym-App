import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { RecurringScheduleService, ClassSessionService } from '../src/bookings';

describe('Recurring Schedules, Generation Idempotency & Overrides (Day 9 E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let recurringService: RecurringScheduleService;
  let sessionService: ClassSessionService;

  let organisationId: string;
  let outletId: string;
  let classTypeId: string;
  let templateId: string;
  let trainerUser: any;
  let createdScheduleIds: string[] = [];
  let testMember: any;

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
    recurringService = app.get(RecurringScheduleService);
    sessionService = app.get(ClassSessionService);

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

    // Create a dedicated ClassTemplate for testing
    const template = await prisma.classTemplate.create({
      data: {
        organisationId,
        classTypeId,
        name: 'Day 9 HIIT Template',
        description: 'Test template for Day 9 recurring schedules',
        durationMinutes: 45,
        defaultCapacity: 10,
      },
    });
    templateId = template.id;

    // Find or create a trainer
    trainerUser = await prisma.user.findFirst({
      where: { email: 'sarah.connor@secondwind.com.au' },
    });
    if (!trainerUser) {
      trainerUser = await prisma.user.create({
        data: {
          email: `trainer.d9.${Date.now()}@secondwind.com.au`,
          passwordHash: 'dummy',
          firstName: 'Sarah',
          lastName: 'Connor',
        },
      });
    }

    // Create a test member profile for booking floor checks
    const u = await prisma.user.create({
      data: {
        email: `member.d9.override.${Date.now()}@secondwind.com.au`,
        passwordHash: 'dummy',
        firstName: 'Floor',
        lastName: 'Tester',
      },
    });
    testMember = await prisma.memberProfile.create({
      data: {
        userId: u.id,
        organisationId,
      },
    });
  });

  afterAll(async () => {
    // Cleanup generated sessions and recurring schedules
    for (const schedId of createdScheduleIds) {
      await prisma.booking.deleteMany({
        where: { classSession: { recurringScheduleId: schedId } },
      });
      await prisma.waitlistEntry.deleteMany({
        where: { classSession: { recurringScheduleId: schedId } },
      });
      await prisma.classSession.deleteMany({
        where: { recurringScheduleId: schedId },
      });
      await prisma.recurringSchedule.delete({
        where: { id: schedId },
      }).catch(() => null);
    }

    if (templateId) {
      await prisma.classTemplate.delete({ where: { id: templateId } }).catch(() => null);
    }

    if (testMember?.id) {
      await prisma.booking.deleteMany({ where: { memberProfileId: testMember.id } });
      await prisma.memberProfile.delete({ where: { id: testMember.id } }).catch(() => null);
      await prisma.user.delete({ where: { id: testMember.userId } }).catch(() => null);
    }

    await app.close();
  });

  it('1. Creates a WEEKLY recurring schedule and previews occurrences', async () => {
    const schedule = await recurringService.createSchedule(organisationId, {
      outletId,
      classTemplateId: templateId,
      frequency: 'WEEKLY',
      dayOfWeek: 1, // Monday
      daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
      startTime: '06:30',
      durationMinutes: 45,
      customCapacity: 8,
      trainerId: trainerUser.id,
      startDate: new Date('2026-10-05T00:00:00Z'),
      endDate: new Date('2026-10-18T23:59:59Z'), // 2 weeks
    });

    expect(schedule.id).toBeDefined();
    expect(schedule.frequency).toBe('WEEKLY');
    expect(schedule.daysOfWeek).toEqual([1, 3, 5]);
    createdScheduleIds.push(schedule.id);

    // Preview occurrences
    const preview = await recurringService.previewOccurrences(
      schedule.id,
      new Date('2026-10-05T00:00:00Z'),
      new Date('2026-10-18T23:59:59Z')
    );

    expect(preview.slotsCount).toBe(6);
    expect(preview.slots.length).toBe(6);
    for (const slot of preview.slots) {
      expect(slot.startsAt).toBeDefined();
      expect(new Date(slot.endsAt).getTime()).toBeGreaterThan(new Date(slot.startsAt).getTime());
    }
  });

  it('2. Generates concrete ClassSessions from recurring schedule', async () => {
    const scheduleId = createdScheduleIds[0];

    const createdSessions = await recurringService.generateSessionsForSchedule(
      scheduleId,
      new Date('2026-10-05T00:00:00Z'),
      new Date('2026-10-18T23:59:59Z')
    );

    expect(createdSessions.length).toBe(6); // 3 days/week * 2 weeks = 6 sessions

    // Verify concrete records in DB
    const sessions = await prisma.classSession.findMany({
      where: { recurringScheduleId: scheduleId },
      orderBy: { startsAt: 'asc' },
    });
    expect(sessions.length).toBe(6);
    expect(sessions[0].capacity).toBe(8);
    expect(sessions[0].isOverride).toBe(false);
    expect(sessions[0].status).toBe('OPEN');
  });

  it('3. Generating sessions is IDEMPOTENT: Re-running produces 0 duplicates', async () => {
    const scheduleId = createdScheduleIds[0];

    const rerunSessions = await recurringService.generateSessionsForSchedule(
      scheduleId,
      new Date('2026-10-05T00:00:00Z'),
      new Date('2026-10-18T23:59:59Z')
    );

    expect(rerunSessions.length).toBe(0); // 0 duplicates created

    // Total count in database remains strictly 6!
    const totalCount = await prisma.classSession.count({
      where: { recurringScheduleId: scheduleId },
    });
    expect(totalCount).toBe(6);
  });

  it('4. Single session override modifies individual occurrence without altering parent template or sibling sessions', async () => {
    const scheduleId = createdScheduleIds[0];
    const sessions = await prisma.classSession.findMany({
      where: { recurringScheduleId: scheduleId },
      orderBy: { startsAt: 'asc' },
    });

    const targetSession = sessions[0];
    const originalStartsAt = targetSession.startsAt;
    const newStartsAt = new Date(originalStartsAt.getTime() + 30 * 60000); // 30 mins later
    const newEndsAt = new Date(newStartsAt.getTime() + 60 * 60000); // 60 mins duration

    const updated = await sessionService.updateSession(
      targetSession.id,
      {
        name: 'Special Morning HIIT Edition',
        startsAt: newStartsAt.toISOString(),
        endsAt: newEndsAt.toISOString(),
        capacity: 12,
      }
    );

    expect(updated.id).toBe(targetSession.id);
    expect(updated.isOverride).toBe(true);
    expect(updated.originalStartsAt).toBeDefined();
    expect(updated.name).toBe('Special Morning HIIT Edition');
    expect(updated.capacity).toBe(12);

    // Check sibling session: sibling session is UNTOUCHED
    const siblingSession = await prisma.classSession.findUniqueOrThrow({
      where: { id: sessions[1].id },
    });
    expect(siblingSession.isOverride).toBe(false);
    expect(siblingSession.name).toBe('Day 9 HIIT Template');
    expect(siblingSession.capacity).toBe(8);

    // Re-running generation STILL preserves the override and does NOT overwrite it
    const regenSessions = await recurringService.generateSessionsForSchedule(
      scheduleId,
      new Date('2026-10-05T00:00:00Z'),
      new Date('2026-10-18T23:59:59Z')
    );
    expect(regenSessions.length).toBe(0);

    const overriddenCheck = await prisma.classSession.findUniqueOrThrow({
      where: { id: targetSession.id },
    });
    expect(overriddenCheck.isOverride).toBe(true);
    expect(overriddenCheck.capacity).toBe(12);
  });

  it('5. Enforces capacity floor: Cannot reduce session capacity below confirmed bookings count', async () => {
    const scheduleId = createdScheduleIds[0];
    const sessions = await prisma.classSession.findMany({
      where: { recurringScheduleId: scheduleId, isOverride: false },
      orderBy: { startsAt: 'asc' },
    });
    const targetSession = sessions[0]; // has capacity = 8

    // Create 1 confirmed booking on targetSession
    await prisma.booking.create({
      data: {
        organisationId,
        outletId,
        classSessionId: targetSession.id,
        memberProfileId: testMember.id,
        status: 'CONFIRMED',
      },
    });

    // Attempting to update capacity to 0 should be rejected with 400
    await expect(
      sessionService.updateSession(targetSession.id, {
        capacity: 0,
      })
    ).rejects.toThrow('Cannot reduce capacity to 0');

    // Updating capacity to 5 (which is >= 1 confirmed booking) should succeed
    const validUpdate = await sessionService.updateSession(
      targetSession.id,
      { capacity: 5 }
    );
    expect(validUpdate.capacity).toBe(5);
  });

  it('6. Generates BIWEEKLY schedule correctly', async () => {
    const biweeklySchedule = await recurringService.createSchedule(organisationId, {
      outletId,
      classTemplateId: templateId,
      frequency: 'BIWEEKLY',
      dayOfWeek: 6, // Saturday
      daysOfWeek: [6],
      startTime: '09:00',
      durationMinutes: 90,
      customCapacity: 15,
      startDate: new Date('2026-10-01T00:00:00Z'),
      endDate: new Date('2026-10-31T23:59:59Z'), // 1 month
    });

    createdScheduleIds.push(biweeklySchedule.id);

    const sessions = await recurringService.generateSessionsForSchedule(
      biweeklySchedule.id,
      new Date('2026-10-01T00:00:00Z'),
      new Date('2026-10-31T23:59:59Z')
    );

    // Across Oct 2026, biweekly on Saturday generates 2 or 3 sessions
    expect(sessions.length).toBeGreaterThanOrEqual(2);
    expect(sessions.length).toBeLessThanOrEqual(3);
  });
});
