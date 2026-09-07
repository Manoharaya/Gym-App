import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { TrainingProgramService } from '../src/personal-training/services/training-program.service';
import { TrainingGoalService } from '../src/personal-training/services/training-goal.service';
import { TrainerNoteService } from '../src/personal-training/services/trainer-note.service';
import { PersonalTrainingSessionService } from '../src/personal-training/services/personal-training-session.service';
import { PersonalTrainingProcessor } from '../src/personal-training/processors/personal-training.processor';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Personal Training & Coaching Lifecycle Management (Day 12 E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let programService: TrainingProgramService;
  let goalService: TrainingGoalService;
  let noteService: TrainerNoteService;
  let ptSessionService: PersonalTrainingSessionService;
  let ptProcessor: PersonalTrainingProcessor;

  let orgA: any;
  let orgB: any;
  let outletA: any;
  let outletB: any;

  let marcusTrainer: any;
  let mikeTrainer: any;
  let alexMember: any;
  let alexMemberUser: any;
  let marcusTrainerUser: any;
  let mikeTrainerUser: any;
  let orgBOwnerUser: any;

  let actorOwner: AuthenticatedUser;
  let actorMarcusTrainer: AuthenticatedUser;
  let actorMikeTrainer: AuthenticatedUser;
  let actorAlexMember: AuthenticatedUser;
  let actorOrgBOwner: AuthenticatedUser;

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

    await app.init();
    prisma = app.get(PrismaService);
    programService = app.get(TrainingProgramService);
    goalService = app.get(TrainingGoalService);
    noteService = app.get(TrainerNoteService);
    ptSessionService = app.get(PersonalTrainingSessionService);
    ptProcessor = app.get(PersonalTrainingProcessor);

    orgA = await prisma.organisation.findFirstOrThrow({ where: { slug: 'second-wind' } });
    orgB = await prisma.organisation.findFirstOrThrow({ where: { slug: 'apex-strength' } });
    outletA = await prisma.outlet.findFirstOrThrow({ where: { organisationId: orgA.id, code: 'SW-PERTH-CBD' } });
    outletB = await prisma.outlet.findFirstOrThrow({ where: { organisationId: orgB.id } });

    // Seed users
    const ownerUser = await prisma.user.findFirstOrThrow({ where: { email: 'owner@secondwind.com.au' } });
    actorOwner = {
      id: ownerUser.id,
      email: ownerUser.email,
      firstName: ownerUser.firstName,
      lastName: ownerUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'ORGANISATION_OWNER', organisationId: orgA.id }],
      permissions: [{ resource: '*', action: 'MANAGE', scope: 'ORGANISATION' }],
    };

    marcusTrainerUser = await prisma.user.findFirstOrThrow({ where: { email: 'trainer@secondwind.com.au' } });
    marcusTrainer = await prisma.trainerProfile.findFirstOrThrow({
      where: { professionalName: 'Marcus Vance' },
    });

    actorMarcusTrainer = {
      id: marcusTrainerUser.id,
      email: marcusTrainerUser.email,
      firstName: marcusTrainerUser.firstName,
      lastName: marcusTrainerUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'TRAINER', organisationId: orgA.id }],
      permissions: [
        { resource: 'training_programs', action: 'CREATE', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'training_programs', action: 'READ', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'training_programs', action: 'UPDATE', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'training_goals', action: 'CREATE', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'training_goals', action: 'READ', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'training_goals', action: 'UPDATE', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'trainer_notes', action: 'CREATE', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'trainer_notes', action: 'READ', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'trainer_notes', action: 'UPDATE', scope: 'SELF' },
        { resource: 'trainer_notes', action: 'DELETE', scope: 'SELF' },
        { resource: 'pt_sessions', action: 'CREATE', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'pt_sessions', action: 'READ', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'pt_sessions', action: 'UPDATE', scope: 'ASSIGNED_CLIENTS' },
      ],
    };

    mikeTrainerUser = await prisma.user.findFirstOrThrow({ where: { email: 'trainer.mike@secondwind.com.au' } });
    mikeTrainer = await prisma.trainerProfile.findFirstOrThrow({
      where: { professionalName: 'Mike Ross' },
    });

    actorMikeTrainer = {
      id: mikeTrainerUser.id,
      email: mikeTrainerUser.email,
      firstName: mikeTrainerUser.firstName,
      lastName: mikeTrainerUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'TRAINER', organisationId: orgA.id }],
      permissions: [
        { resource: 'training_programs', action: 'CREATE', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'training_programs', action: 'READ', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'training_programs', action: 'UPDATE', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'training_goals', action: 'CREATE', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'training_goals', action: 'READ', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'training_goals', action: 'UPDATE', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'trainer_notes', action: 'CREATE', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'trainer_notes', action: 'READ', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'pt_sessions', action: 'CREATE', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'pt_sessions', action: 'READ', scope: 'ASSIGNED_CLIENTS' },
      ],
    };

    alexMemberUser = await prisma.user.findFirstOrThrow({ where: { email: 'member@secondwind.com.au' } });
    alexMember = await prisma.memberProfile.findFirstOrThrow({
      where: { userId: alexMemberUser.id, organisationId: orgA.id },
    });

    actorAlexMember = {
      id: alexMemberUser.id,
      email: alexMemberUser.email,
      firstName: alexMemberUser.firstName,
      lastName: alexMemberUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'MEMBER', organisationId: orgA.id }],
      permissions: [
        { resource: 'training_programs', action: 'READ', scope: 'SELF' },
        { resource: 'training_goals', action: 'CREATE', scope: 'SELF' },
        { resource: 'training_goals', action: 'READ', scope: 'SELF' },
        { resource: 'training_goals', action: 'UPDATE', scope: 'SELF' },
        { resource: 'training_goals', action: 'MANAGE', scope: 'SELF' },
        { resource: 'trainer_notes', action: 'READ', scope: 'SELF' },
        { resource: 'pt_sessions', action: 'READ', scope: 'SELF' },
      ],
    };

    orgBOwnerUser = await prisma.user.findFirstOrThrow({ where: { email: 'owner@apexstrength.com.au' } });
    actorOrgBOwner = {
      id: orgBOwnerUser.id,
      email: orgBOwnerUser.email,
      firstName: orgBOwnerUser.firstName,
      lastName: orgBOwnerUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'ORGANISATION_OWNER', organisationId: orgB.id }],
      permissions: [{ resource: '*', action: 'MANAGE', scope: 'ORGANISATION' }],
    };
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Training Program Lifecycle & State Transitions', () => {
    let program: any;

    it('creates a new training program in DRAFT state', async () => {
      program = await programService.createProgram(
        orgA.id,
        alexMember.id,
        {
          name: 'Hypertrophy Block A',
          description: 'Upper / lower split focusing on chest and back density',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          outletId: outletA.id,
        },
        actorMarcusTrainer,
      );

      expect(program).toBeDefined();
      expect(program.status).toBe('DRAFT');
      expect(program.name).toBe('Hypertrophy Block A');
      expect(program.memberProfileId).toBe(alexMember.id);
      expect(program.trainerProfileId).toBe(marcusTrainer.id);
    });

    it('transitions DRAFT -> ACTIVE', async () => {
      const active = await programService.activateProgram(
        orgA.id,
        program.id,
        actorMarcusTrainer,
      );

      expect(active.status).toBe('ACTIVE');
      expect(active.activatedAt).toBeDefined();
    });

    it('transitions ACTIVE -> PAUSED', async () => {
      const paused = await programService.pauseProgram(
        orgA.id,
        program.id,
        actorMarcusTrainer,
      );

      expect(paused.status).toBe('PAUSED');
    });

    it('transitions PAUSED -> ACTIVE', async () => {
      const resumed = await programService.activateProgram(
        orgA.id,
        program.id,
        actorMarcusTrainer,
      );

      expect(resumed.status).toBe('ACTIVE');
    });

    it('transitions ACTIVE -> COMPLETED', async () => {
      const completed = await programService.completeProgram(
        orgA.id,
        program.id,
        actorMarcusTrainer,
      );

      expect(completed.status).toBe('COMPLETED');
      expect(completed.completedAt).toBeDefined();
    });

    it('rejects invalid activation from COMPLETED program', async () => {
      await expect(
        programService.activateProgram(
          orgA.id,
          program.id,
          actorMarcusTrainer,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('requires a reason when cancelling a program', async () => {
      // Create a fresh draft program to cancel
      const tempProg = await programService.createProgram(
        orgA.id,
        alexMember.id,
        {
          name: 'Temporary Program',
          startDate: new Date().toISOString(),
        },
        actorMarcusTrainer,
      );

      // Attempt cancellation without reason (empty string or missing)
      await expect(
        programService.cancelProgram(
          orgA.id,
          tempProg.id,
          { reason: '' },
          actorMarcusTrainer,
        ),
      ).rejects.toThrow(BadRequestException);

      // Cancel with valid reason
      const cancelled = await programService.cancelProgram(
        orgA.id,
        tempProg.id,
        { reason: 'Client changed goals to endurance' },
        actorMarcusTrainer,
      );
      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.cancellationReason).toBe('Client changed goals to endurance');
    });
  });

  describe('2. Trainer-Client Authorization & IDOR Security', () => {
    it('unassigned trainer (Mike Ross) CANNOT create program for Marcus client (Alex Mercer)', async () => {
      await expect(
        programService.createProgram(
          orgA.id,
          alexMember.id,
          {
            name: 'Unauthorized Program',
            startDate: new Date().toISOString(),
          },
          actorMikeTrainer,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('unassigned trainer (Mike Ross) CANNOT read Marcus client programs', async () => {
      await expect(
        programService.findProgramById(
          orgA.id,
          'prog_alex_strength_001',
          actorMikeTrainer,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('cross-tenant owner (Org B) CANNOT access Org A member training program', async () => {
      await expect(
        programService.findProgramById(
          orgA.id,
          'prog_alex_strength_001',
          actorOrgBOwner,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('3. Member-Owned Goals & Goal History Preservation', () => {
    let createdGoal: any;

    it('member can create their own goal', async () => {
      createdGoal = await goalService.createGoal(
        orgA.id,
        alexMember.id,
        {
          title: 'Conventional Deadlift 180kg',
          category: 'STRENGTH',
          targetValue: 180,
          baselineValue: 140,
          unit: 'kg',
          priority: 1,
        },
        actorAlexMember,
      );

      expect(createdGoal).toBeDefined();
      expect(createdGoal.title).toBe('Conventional Deadlift 180kg');
      expect(createdGoal.currentValue).toBe(140);
      expect(createdGoal.targetValue).toBe(180);
      expect(createdGoal.memberProfileId).toBe(alexMember.id);
    });

    it('assigned trainer updates goal progress and creates GoalHistory milestone', async () => {
      const updated = await goalService.recordProgress(
        orgA.id,
        createdGoal.id,
        {
          currentValue: 165,
          notes: 'Hit 165kg for 3 reps cleanly off the floor',
        },
        actorMarcusTrainer,
      );

      expect(updated.currentValue).toBe(165);

      // Verify goal history preservation via findGoalById
      const goalWithHistory = await goalService.findGoalById(
        orgA.id,
        createdGoal.id,
        actorMarcusTrainer,
      );

      expect(goalWithHistory.history.length).toBeGreaterThanOrEqual(1);
      const latest = goalWithHistory.history[0];
      expect(latest.previousValue).toBe(140);
      expect(latest.newValue).toBe(165);
      expect(latest.actorId).toBe(actorMarcusTrainer.id);
      expect(latest.notes).toBe('Hit 165kg for 3 reps cleanly off the floor');
    });

    it('completing a goal records completion status and history', async () => {
      const completed = await goalService.recordProgress(
        orgA.id,
        createdGoal.id,
        {
          status: 'COMPLETED',
          currentValue: 180,
          notes: 'Goal reached! 180kg 1RM achieved.',
        },
        actorMarcusTrainer,
      );

      expect(completed.status).toBe('COMPLETED');
      expect(completed.completedAt).toBeDefined();
    });

    it('member retains ownership of all goals independently', async () => {
      const memberGoals = await goalService.findMemberGoals(
        orgA.id,
        alexMember.id,
        actorAlexMember,
      );

      expect(memberGoals.length).toBeGreaterThanOrEqual(2);
      expect(memberGoals.some((g: any) => g.id === createdGoal.id)).toBe(true);
    });
  });

  describe('4. Private Trainer Notes & Visibility Boundaries', () => {
    let privateNote: any;
    let staffNote: any;
    let memberVisibleNote: any;

    it('defaults new notes to PRIVATE visibility', async () => {
      privateNote = await noteService.createNote(
        orgA.id,
        alexMember.id,
        {
          noteType: 'GENERAL',
          content: 'Confidential trainer note regarding mental resilience under fatigue',
          // visibility omitted to test default
        },
        actorMarcusTrainer,
      );

      expect(privateNote.visibility).toBe('PRIVATE');
      expect(privateNote.content).toContain('Confidential');
    });

    it('creates STAFF and MEMBER_VISIBLE notes successfully', async () => {
      staffNote = await noteService.createNote(
        orgA.id,
        alexMember.id,
        {
          noteType: 'SESSION',
          content: 'Staff note: Hamstring tight on right side. Foam roll before squatting.',
          visibility: 'STAFF',
        },
        actorMarcusTrainer,
      );

      memberVisibleNote = await noteService.createNote(
        orgA.id,
        alexMember.id,
        {
          noteType: 'COACHING',
          content: 'Great job today Alex! Keep driving the knees out on the ascent.',
          visibility: 'MEMBER_VISIBLE',
        },
        actorMarcusTrainer,
      );

      expect(staffNote.visibility).toBe('STAFF');
      expect(memberVisibleNote.visibility).toBe('MEMBER_VISIBLE');
    });

    it('member ONLY sees MEMBER_VISIBLE notes and cannot see PRIVATE or STAFF notes', async () => {
      const memberNotes = await noteService.findMemberNotes(
        orgA.id,
        alexMember.id,
        actorAlexMember,
      );

      // Verify all returned notes have MEMBER_VISIBLE visibility
      for (const note of memberNotes) {
        expect(note.visibility).toBe('MEMBER_VISIBLE');
      }

      // Verify private and staff note IDs are NOT present
      const noteIds = memberNotes.map((n: any) => n.id);
      expect(noteIds).toContain(memberVisibleNote.id);
      expect(noteIds).not.toContain(privateNote.id);
      expect(noteIds).not.toContain(staffNote.id);
    });

    it('trainer author can update their own note', async () => {
      const updated = await noteService.updateNote(
        orgA.id,
        privateNote.id,
        {
          content: 'Updated private observations regarding recovery protocols',
        },
        actorMarcusTrainer,
      );

      expect(updated.content).toBe('Updated private observations regarding recovery protocols');
    });

    it('different trainer (Mike Ross) CANNOT edit or delete Marcus note', async () => {
      await expect(
        noteService.updateNote(
          orgA.id,
          privateNote.id,
          { content: 'Hacked note content' },
          actorMikeTrainer,
        ),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        noteService.deleteNote(
          orgA.id,
          privateNote.id,
          actorMikeTrainer,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('5. Dedicated Personal Training Sessions & Conflict Detection', () => {
    let scheduledSession: any;
    const baseTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead
    baseTime.setHours(10, 0, 0, 0);
    const endTime = new Date(baseTime.getTime() + 60 * 60 * 1000); // 11:00

    it('schedules a PT session with assigned trainer', async () => {
      scheduledSession = await ptSessionService.scheduleSession(
        orgA.id,
        {
          outletId: outletA.id,
          memberProfileId: alexMember.id,
          trainerProfileId: marcusTrainer.id,
          sessionType: 'ONE_ON_ONE',
          scheduledStart: baseTime.toISOString(),
          scheduledEnd: endTime.toISOString(),
          location: 'Squat Rack 1',
          notes: 'Technique assessment on heavy singles',
        },
        actorMarcusTrainer,
      );

      expect(scheduledSession).toBeDefined();
      expect(scheduledSession.status).toBe('SCHEDULED');
      expect(scheduledSession.trainerProfileId).toBe(marcusTrainer.id);
      expect(scheduledSession.memberProfileId).toBe(alexMember.id);
    });

    it('detects trainer schedule conflict on overlapping booking (TRAINING_SESSION_CONFLICT)', async () => {
      // Another client overlaps Marcus's scheduled time
      const overlapStart = new Date(baseTime.getTime() + 30 * 60 * 1000); // 10:30 (overlaps 10:00-11:00)
      const overlapEnd = new Date(overlapStart.getTime() + 60 * 60 * 1000); // 11:30

      await expect(
        ptSessionService.scheduleSession(
          orgA.id,
          {
            outletId: outletA.id,
            memberProfileId: alexMember.id,
            trainerProfileId: marcusTrainer.id,
            scheduledStart: overlapStart.toISOString(),
            scheduledEnd: overlapEnd.toISOString(),
          },
          actorMarcusTrainer,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('detects member schedule conflict on overlapping booking (TRAINING_SESSION_CONFLICT)', async () => {
      // Same member with a different trainer overlapping the same slot
      await expect(
        ptSessionService.scheduleSession(
          orgA.id,
          {
            outletId: outletA.id,
            memberProfileId: alexMember.id,
            trainerProfileId: mikeTrainer.id,
            scheduledStart: baseTime.toISOString(),
            scheduledEnd: endTime.toISOString(),
          },
          actorOwner,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('completes a session and automatically creates linked AttendanceRecord', async () => {
      // Start session
      const started = await ptSessionService.startSession(
        orgA.id,
        scheduledSession.id,
        actorMarcusTrainer,
      );
      expect(started.status).toBe('IN_PROGRESS');
      expect(started.actualStart).toBeDefined();

      // Complete session
      const completed = await ptSessionService.completeSession(
        orgA.id,
        scheduledSession.id,
        actorMarcusTrainer,
      );

      expect(completed.status).toBe('COMPLETED');
      expect(completed.actualEnd).toBeDefined();
      expect(completed.attendanceRecordId).toBeDefined();

      // Verify attendance record exists and links correctly
      if (completed.attendanceRecordId) {
        const attRecord = await prisma.attendanceRecord.findUnique({
          where: { id: completed.attendanceRecordId },
        });

        expect(attRecord).toBeDefined();
        expect(attRecord?.memberProfileId).toBe(alexMember.id);
        expect(attRecord?.status).toBe('COMPLETED');
        expect(attRecord?.checkInMethod).toBe('STAFF');
      }
    });

    it('cancelling a session records reason and updates status', async () => {
      // Schedule a session for tomorrow
      const cancelSlotStart = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      cancelSlotStart.setHours(14, 0, 0, 0);
      const cancelSlotEnd = new Date(cancelSlotStart.getTime() + 60 * 60 * 1000);

      const toCancel = await ptSessionService.scheduleSession(
        orgA.id,
        {
          outletId: outletA.id,
          memberProfileId: alexMember.id,
          trainerProfileId: marcusTrainer.id,
          scheduledStart: cancelSlotStart.toISOString(),
          scheduledEnd: cancelSlotEnd.toISOString(),
        },
        actorMarcusTrainer,
      );

      const cancelled = await ptSessionService.cancelSession(
        orgA.id,
        toCancel.id,
        {
          reason: 'Member feeling under the weather',
        },
        actorMarcusTrainer,
      );

      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.cancellationReason).toBe('Member feeling under the weather');
      expect(cancelled.cancelledAt).toBeDefined();
    });
  });

  describe('6. Background Processor & Automated Expirations', () => {
    it('detects and transitions expired active programs idempotently', async () => {
      // Create a past active program
      const pastStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const pastEnd = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // Ended 2 days ago

      const expiredProg = await prisma.trainingProgram.create({
        data: {
          organisationId: orgA.id,
          outletId: outletA.id,
          memberProfileId: alexMember.id,
          trainerProfileId: marcusTrainer.id,
          name: 'Past Season Strength',
          status: 'ACTIVE',
          startDate: pastStart,
          endDate: pastEnd,
        },
      });

      // Run processor
      const summary = await ptProcessor.processCoachingLifecycle(orgA.id);
      expect(summary.expiredProgramsCount).toBeGreaterThanOrEqual(1);
      expect(summary.expiredProgramIds).toContain(expiredProg.id);

      // Verify program is marked COMPLETED
      const updated = await prisma.trainingProgram.findUnique({
        where: { id: expiredProg.id },
      });
      expect(updated?.status).toBe('COMPLETED');

      // Idempotency: Second run should not re-process the program
      const secondRun = await ptProcessor.processCoachingLifecycle(orgA.id);
      expect(secondRun.expiredProgramIds).not.toContain(expiredProg.id);
    });
  });
});
