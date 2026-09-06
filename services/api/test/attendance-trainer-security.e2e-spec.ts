import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { TrainerOperationsService } from '../src/attendance/services/trainer-operations.service';
import { CheckInService } from '../src/attendance/services/check-in.service';
import { RosterService } from '../src/attendance/services/roster.service';

describe('Trainer Attendance, Substitution & Tenant Security (Day 10 E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let trainerOperations: TrainerOperationsService;
  let checkInService: CheckInService;
  let rosterService: RosterService;

  let orgA: any;
  let orgB: any;
  let outletA: any;
  let outletB: any;
  let classTypeA: any;

  let trainerA1: any;
  let trainerA2: any;
  let memberA: any, profileA: any;
  let memberB: any, profileB: any;

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
    trainerOperations = app.get(TrainerOperationsService);
    checkInService = app.get(CheckInService);
    rosterService = app.get(RosterService);

    // Organization A (Second Wind)
    orgA = await prisma.organisation.findFirstOrThrow({
      where: { slug: 'second-wind' },
    });
    outletA = await prisma.outlet.findFirstOrThrow({
      where: { organisationId: orgA.id, code: 'SW-PERTH-CBD' },
    });
    classTypeA = await prisma.classType.findFirstOrThrow({
      where: { organisationId: orgA.id, category: 'HIIT' },
    });

    // Organization B (Apex Strength)
    orgB = await prisma.organisation.findFirstOrThrow({
      where: { slug: 'apex-strength' },
    });
    outletB = await prisma.outlet.findFirstOrThrow({
      where: { organisationId: orgB.id },
    });

    // Trainer Role
    const trainerRole = await prisma.role.findFirstOrThrow({
      where: { name: 'TRAINER' },
    });

    // Helper to create trainer in org
    async function createTrainer(orgId: string, name: string) {
      const u = await prisma.user.create({
        data: {
          email: `${name.toLowerCase()}.${Date.now()}@fitness.com`,
          passwordHash: 'dummy',
          firstName: name,
          lastName: 'Coach',
          status: 'ACTIVE',
        },
      });

      await prisma.userRole.create({
        data: {
          userId: u.id,
          roleId: trainerRole.id,
          organisationId: orgId,
        },
      });

      return u;
    }

    trainerA1 = await createTrainer(orgA.id, 'TrainerPrimary');
    trainerA2 = await createTrainer(orgA.id, 'TrainerSub');

    // Create member in org A
    const uA = await prisma.user.create({
      data: {
        email: `memberA.${Date.now()}@secondwind.com.au`,
        passwordHash: 'dummy',
        firstName: 'MemberA',
        lastName: 'OrgA',
        status: 'ACTIVE',
      },
    });
    profileA = await prisma.memberProfile.create({
      data: { userId: uA.id, organisationId: orgA.id, status: 'ACTIVE' },
    });

    // Create member in org B
    const uB = await prisma.user.create({
      data: {
        email: `memberB.${Date.now()}@apex.com.au`,
        passwordHash: 'dummy',
        firstName: 'MemberB',
        lastName: 'OrgB',
        status: 'ACTIVE',
      },
    });
    profileB = await prisma.memberProfile.create({
      data: { userId: uB.id, organisationId: orgB.id, status: 'ACTIVE' },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('records trainer check-in and check-out on a session instance', async () => {
    const session = await prisma.classSession.create({
      data: {
        organisationId: orgA.id,
        outletId: outletA.id,
        classTypeId: classTypeA.id,
        trainerId: trainerA1.id,
        startsAt: new Date(Date.now() + 10 * 60 * 1000),
        endsAt: new Date(Date.now() + 55 * 60 * 1000),
        capacity: 10,
        status: 'PUBLISHED',
      },
    });

    // 1. Trainer check-in
    const checkedInSession = await trainerOperations.trainerCheckIn(
      session.id,
      orgA.id,
      trainerA1.id,
    );
    expect(checkedInSession.trainerAttendanceStatus).toBe('CHECKED_IN');
    expect(checkedInSession.trainerCheckedInAt).toBeDefined();

    // 2. Trainer check-out
    const checkedOutSession = await trainerOperations.trainerCheckOut(
      session.id,
      orgA.id,
      trainerA1.id,
    );
    expect(checkedOutSession.trainerAttendanceStatus).toBe('COMPLETED');
    expect(checkedOutSession.trainerCheckedOutAt).toBeDefined();
  });

  it('substitutes a trainer on an individual session without altering parent recurring schedule', async () => {
    // 1. Create or find classTemplate
    let template = await prisma.classTemplate.findFirst({
      where: { organisationId: orgA.id },
    });
    if (!template) {
      template = await prisma.classTemplate.create({
        data: {
          organisationId: orgA.id,
          classTypeId: classTypeA.id,
          name: 'Recurring HIIT Template',
          durationMinutes: 60,
          defaultCapacity: 15,
        },
      });
    }

    // 2. Create a parent recurring schedule
    const recurringSchedule = await prisma.recurringSchedule.create({
      data: {
        organisationId: orgA.id,
        outletId: outletA.id,
        classTemplateId: template.id,
        trainerId: trainerA1.id,
        dayOfWeek: 1, // Monday
        startTime: '09:00',
        durationMinutes: 60,
        startDate: new Date(),
        isActive: true,
      },
    });

    // 2. Create session linked to template
    const session = await prisma.classSession.create({
      data: {
        organisationId: orgA.id,
        outletId: outletA.id,
        classTypeId: classTypeA.id,
        trainerId: trainerA1.id,
        recurringScheduleId: recurringSchedule.id,
        startsAt: new Date(Date.now() + 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 120 * 60 * 1000),
        capacity: 15,
        status: 'PUBLISHED',
      },
    });

    // 3. Substitute trainer on this session
    const substitutedSession = await trainerOperations.substituteTrainer(
      session.id,
      orgA.id,
      {
        substituteTrainerId: trainerA2.id,
        reason: 'Trainer unwell; cover approved by head coach',
      },
      trainerA1.id,
    );

    // Verify session updated
    expect(substitutedSession.trainerId).toBe(trainerA1.id); // Original trainer preserved
    expect(substitutedSession.substituteTrainerId).toBe(trainerA2.id);
    expect(substitutedSession.trainerAttendanceStatus).toBe('SUBSTITUTE');

    // STRICT INVARIANT: Verify parent recurring schedule was NOT mutated
    const scheduleAfter = await prisma.recurringSchedule.findUniqueOrThrow({
      where: { id: recurringSchedule.id },
    });
    expect(scheduleAfter.trainerId).toBe(trainerA1.id); // Must remain original trainer!
  });

  it('strictly rejects cross-tenant attendance check-in and roster access (IDOR / Tenancy Protection)', async () => {
    // Session belonging to Organization A
    const sessionOrgA = await prisma.classSession.create({
      data: {
        organisationId: orgA.id,
        outletId: outletA.id,
        classTypeId: classTypeA.id,
        startsAt: new Date(Date.now() + 10 * 60 * 1000),
        endsAt: new Date(Date.now() + 55 * 60 * 1000),
        capacity: 10,
        status: 'PUBLISHED',
      },
    });

    // Member B (belongs to Org B) tries to check in to Org A's session -> must throw ORGANISATION_MISMATCH
    await expect(
      checkInService.checkInBookedMember(sessionOrgA.id, profileB.id, 'MEMBER_SELF_SERVICE'),
    ).rejects.toThrow('Member and session belong to different organisations');

    // User in Org B tries to view Org A's roster -> must throw SESSION_NOT_FOUND
    await expect(
      rosterService.getSessionRoster(sessionOrgA.id, orgB.id),
    ).rejects.toThrow('Class session not found in this organisation');
  });
});
