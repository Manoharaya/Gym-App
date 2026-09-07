import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { StaffService } from '../src/staff/staff.service';
import { TrainerService } from '../src/staff/trainer.service';
import { CertificationExpirationProcessor } from '../src/staff/processors/certification-expiration.processor';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Staff & Trainer Lifecycle Management (Day 11 E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let staffService: StaffService;
  let trainerService: TrainerService;
  let expirationProcessor: CertificationExpirationProcessor;

  let orgA: any;
  let orgB: any;
  let outletA: any;
  let outletB: any;

  let actorOwner: AuthenticatedUser;
  let actorManager: AuthenticatedUser;

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
    staffService = app.get(StaffService);
    trainerService = app.get(TrainerService);
    expirationProcessor = app.get(CertificationExpirationProcessor);

    orgA = await prisma.organisation.findFirstOrThrow({ where: { slug: 'second-wind' } });
    orgB = await prisma.organisation.findFirstOrThrow({ where: { slug: 'apex-strength' } });
    outletA = await prisma.outlet.findFirstOrThrow({ where: { organisationId: orgA.id, code: 'SW-PERTH-CBD' } });
    outletB = await prisma.outlet.findFirstOrThrow({ where: { organisationId: orgB.id } });

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

    const managerUser = await prisma.user.findFirstOrThrow({ where: { email: 'manager@secondwind.com.au' } });
    actorManager = {
      id: managerUser.id,
      email: managerUser.email,
      firstName: managerUser.firstName,
      lastName: managerUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'OUTLET_MANAGER', organisationId: orgA.id, outletId: outletA.id }],
      permissions: [
        { resource: 'staff', action: 'READ', scope: 'OUTLET' },
        { resource: 'trainers', action: 'MANAGE', scope: 'OUTLET' },
        { resource: 'trainer_clients', action: 'MANAGE', scope: 'OUTLET' },
      ],
    };
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Decoupled Identity & Staff Employment Lifecycle', () => {
    let createdStaff: any;

    it('creates a new staff profile and user identity', async () => {
      const uniqueEmail = `test.staff.${Date.now()}@secondwind.com.au`;
      createdStaff = await staffService.createStaff(
        orgA.id,
        {
          email: uniqueEmail,
          firstName: 'Jordan',
          lastName: 'Perez',
          jobTitle: 'Strength Coach',
          employeeReference: `EMP-${Date.now()}`,
          hireDate: new Date().toISOString(),
          initialOutletId: outletA.id,
        },
        actorOwner,
      );

      expect(createdStaff).toBeDefined();
      expect(createdStaff.jobTitle).toBe('Strength Coach');
      expect(createdStaff.employmentStatus).toBe('ACTIVE');
      expect(createdStaff.user).toBeDefined();
      expect(createdStaff.user.email).toBe(uniqueEmail);
      expect(createdStaff.outletAssignments.length).toBeGreaterThanOrEqual(1);
      expect(createdStaff.outletAssignments[0].outletId).toBe(outletA.id);
    });

    it('transitions staff employment status through valid lifecycle', async () => {
      // ACTIVE -> ON_LEAVE
      const onLeave = await staffService.transitionStatus(
        orgA.id,
        createdStaff.id,
        'ON_LEAVE',
        'Sabbatical leave',
        actorOwner,
      );
      expect(onLeave.employmentStatus).toBe('ON_LEAVE');

      // ON_LEAVE -> ACTIVE
      const activeAgain = await staffService.transitionStatus(
        orgA.id,
        createdStaff.id,
        'ACTIVE',
        'Returned from sabbatical',
        actorOwner,
      );
      expect(activeAgain.employmentStatus).toBe('ACTIVE');
    });

    it('rejects invalid employment status transitions', async () => {
      // Terminal transition to TERMINATED
      await staffService.transitionStatus(
        orgA.id,
        createdStaff.id,
        'TERMINATED',
        'Contract concluded',
        actorOwner,
      );

      // Attempting to transition from TERMINATED to ACTIVE must throw BadRequestException
      await expect(
        staffService.transitionStatus(orgA.id, createdStaff.id, 'ACTIVE', 'Rehire attempt', actorOwner),
      ).rejects.toThrow(BadRequestException);
    });

    it('assigns and removes outlet assignments respecting tenant boundaries', async () => {
      // Create fresh staff
      const freshStaff = await staffService.createStaff(
        orgA.id,
        {
          email: `outlet.tester.${Date.now()}@secondwind.com.au`,
          firstName: 'Outlet',
          lastName: 'Tester',
          jobTitle: 'Floor Coach',
        },
        actorOwner,
      );

      // Assign to outlet in Org A
      const assigned = await staffService.assignOutlet(
        orgA.id,
        freshStaff.id,
        {
          outletId: outletA.id,
          roleScope: 'Floor Coach',
          isPrimary: true,
        },
        actorOwner,
      );
      expect(assigned.outletId).toBe(outletA.id);

      // Attempt assigning to outlet in Org B (cross-tenant) -> must throw BadRequestException
      await expect(
        staffService.assignOutlet(
          orgA.id,
          freshStaff.id,
          {
            outletId: outletB.id,
            roleScope: 'Cross Tenant Coach',
          },
          actorOwner,
        ),
      ).rejects.toThrow(BadRequestException);

      // Remove outlet assignment
      const removeRes = await staffService.removeOutlet(orgA.id, freshStaff.id, outletA.id, actorOwner);
      expect(removeRes.success).toBe(true);
    });
  });

  describe('2. Trainer Profile, Specialties & Certifications', () => {
    let trainerStaff: any;
    let trainerProfile: any;

    beforeAll(async () => {
      trainerStaff = await staffService.createStaff(
        orgA.id,
        {
          email: `trainer.spec.${Date.now()}@secondwind.com.au`,
          firstName: 'Elena',
          lastName: 'Rostova',
          jobTitle: 'Conditioning Specialist',
          initialOutletId: outletA.id,
        },
        actorOwner,
      );
    });

    it('creates trainer profile with specialties, languages, coaching style', async () => {
      trainerProfile = await trainerService.createTrainerProfile(
        orgA.id,
        {
          staffProfileId: trainerStaff.id,
          professionalName: 'Elena Rostova, MSc, CSCS',
          specialties: ['Olympic Weightlifting', 'Kettlebell Training', 'Athletic Conditioning'],
          yearsExperience: 6,
          languages: ['English', 'Russian'],
          coachingStyle: 'High precision form-focused coaching',
          trainingApproach: 'Structured periodization with biomechanical video feedback',
        },
        actorOwner,
      );

      expect(trainerProfile).toBeDefined();
      expect(trainerProfile.professionalName).toBe('Elena Rostova, MSc, CSCS');
      expect(trainerProfile.specialties).toContain('Olympic Weightlifting');
      expect(trainerProfile.yearsExperience).toBe(6);
      expect(trainerProfile.status).toBe('ACTIVE');
    });

    it('adds, updates, and tracks certifications', async () => {
      const now = new Date();
      const expiryDate = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // 180 days

      const cert = await trainerService.addCertification(
        orgA.id,
        trainerProfile.id,
        {
          certificationName: 'IWF Level 2 Senior Coach',
          issuingOrganisation: 'International Weightlifting Federation',
          certificationNumber: 'IWF-2023-8819',
          issueDate: new Date('2023-01-01').toISOString(),
          expiryDate: expiryDate.toISOString(),
          documentReference: 'certs/iwf_level_2.pdf',
        },
        actorOwner,
      );

      expect(cert).toBeDefined();
      expect(cert.certificationName).toBe('IWF Level 2 Senior Coach');
      expect(cert.status).toBe('ACTIVE');

      // Update certification
      const updatedCert = await trainerService.updateCertification(
        orgA.id,
        trainerProfile.id,
        cert.id,
        {
          certificationNumber: 'IWF-2023-8819-REV',
        },
        actorOwner,
      );
      expect(updatedCert.certificationNumber).toBe('IWF-2023-8819-REV');

      // Verify trainer details include certs
      const details = await trainerService.findTrainerById(orgA.id, trainerProfile.id, actorOwner);
      expect(details.certifications.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('3. Primary Trainer Rule & Reassignment History', () => {
    let trainerOne: any;
    let trainerTwo: any;
    let memberProfile: any;

    beforeAll(async () => {
      // Create Trainer 1
      const staff1 = await staffService.createStaff(
        orgA.id,
        {
          email: `primary.t1.${Date.now()}@secondwind.com.au`,
          firstName: 'Trainer',
          lastName: 'Alpha',
          jobTitle: 'Senior PT',
          initialOutletId: outletA.id,
        },
        actorOwner,
      );
      trainerOne = await trainerService.createTrainerProfile(
        orgA.id,
        { staffProfileId: staff1.id, professionalName: 'Trainer Alpha' },
        actorOwner,
      );

      // Create Trainer 2
      const staff2 = await staffService.createStaff(
        orgA.id,
        {
          email: `primary.t2.${Date.now()}@secondwind.com.au`,
          firstName: 'Trainer',
          lastName: 'Beta',
          jobTitle: 'Senior PT',
          initialOutletId: outletA.id,
        },
        actorOwner,
      );
      trainerTwo = await trainerService.createTrainerProfile(
        orgA.id,
        { staffProfileId: staff2.id, professionalName: 'Trainer Beta' },
        actorOwner,
      );

      // Create Member
      const memberUser = await prisma.user.create({
        data: {
          email: `client.test.${Date.now()}@secondwind.com.au`,
          passwordHash: 'dummy',
          firstName: 'Test',
          lastName: 'Client',
          status: 'ACTIVE',
        },
      });
      memberProfile = await prisma.memberProfile.create({
        data: {
          userId: memberUser.id,
          organisationId: orgA.id,
          status: 'ACTIVE',
        },
      });
    });

    it('successfully assigns Trainer 1 as PRIMARY trainer', async () => {
      const assignment = await trainerService.assignClient(
        orgA.id,
        trainerOne.id,
        {
          memberProfileId: memberProfile.id,
          assignmentType: 'PRIMARY',
          notes: 'Initial strength consultation',
        },
        actorOwner,
      );

      expect(assignment).toBeDefined();
      expect(assignment.trainerProfileId).toBe(trainerOne.id);
      expect(assignment.memberProfileId).toBe(memberProfile.id);
      expect(assignment.assignmentType).toBe('PRIMARY');
      expect(assignment.status).toBe('ACTIVE');
    });

    it('enforces Primary Trainer Rule: rejects second concurrent PRIMARY assignment', async () => {
      // Attempting to assign Trainer 2 as PRIMARY to same member without reassignment must fail
      await expect(
        trainerService.assignClient(
          orgA.id,
          trainerTwo.id,
          {
            memberProfileId: memberProfile.id,
            assignmentType: 'PRIMARY',
            notes: 'Second primary assignment',
          },
          actorOwner,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('allows SECONDARY trainer assignment concurrently with PRIMARY', async () => {
      const secondaryAssignment = await trainerService.assignClient(
        orgA.id,
        trainerTwo.id,
        {
          memberProfileId: memberProfile.id,
          assignmentType: 'SECONDARY',
          notes: 'Nutrition coach assignment',
        },
        actorOwner,
      );

      expect(secondaryAssignment).toBeDefined();
      expect(secondaryAssignment.assignmentType).toBe('SECONDARY');
      expect(secondaryAssignment.status).toBe('ACTIVE');
    });

    it('reassigns client preserving history and closing previous assignment', async () => {
      // Find active primary assignment for Trainer 1
      const activeAssignments = await prisma.trainerClientAssignment.findMany({
        where: {
          trainerProfileId: trainerOne.id,
          memberProfileId: memberProfile.id,
          assignmentType: 'PRIMARY',
          status: 'ACTIVE',
        },
      });
      expect(activeAssignments.length).toBe(1);
      const prevAssignment = activeAssignments[0];

      // Reassign to Trainer 2
      const newAssignment = await trainerService.reassignClient(
        orgA.id,
        trainerOne.id,
        prevAssignment.id,
        {
          newTrainerId: trainerTwo.id,
          reason: 'Client requested barbell specialist',
          transferNotes: 'Client transitioning to competitive powerlifting',
        },
        actorOwner,
      );

      expect(newAssignment).toBeDefined();
      expect(newAssignment.trainerProfileId).toBe(trainerTwo.id);
      expect(newAssignment.status).toBe('ACTIVE');
      expect(newAssignment.previousAssignmentId).toBe(prevAssignment.id);

      // Verify previous assignment is closed with REASSIGNED status
      const closedAssignment = await prisma.trainerClientAssignment.findUnique({
        where: { id: prevAssignment.id },
      });
      expect(closedAssignment?.status).toBe('REASSIGNED');
      expect(closedAssignment?.endDate).toBeDefined();
    });
  });

  describe('4. Certification Expiration Background Processor', () => {
    it('detects and marks expired certifications and expiring soon certifications idempotently', async () => {
      // 1. Create Trainer with expired cert and expiring soon cert
      const staff = await staffService.createStaff(
        orgA.id,
        {
          email: `exp.trainer.${Date.now()}@secondwind.com.au`,
          firstName: 'Expiring',
          lastName: 'Coach',
          jobTitle: 'Coach',
        },
        actorOwner,
      );
      const trainer = await trainerService.createTrainerProfile(
        orgA.id,
        { staffProfileId: staff.id, professionalName: 'Expiring Coach' },
        actorOwner,
      );

      const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const soonDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days ahead

      // Past cert
      const expiredCert = await prisma.trainerCertification.create({
        data: {
          trainerProfileId: trainer.id,
          certificationName: 'Old CPR Cert',
          issuingOrganisation: 'Red Cross',
          issueDate: new Date('2022-01-01'),
          expiryDate: pastDate,
          status: 'ACTIVE',
        },
      });

      // Soon cert
      const soonCert = await prisma.trainerCertification.create({
        data: {
          trainerProfileId: trainer.id,
          certificationName: 'Upcoming Expiry Cert',
          issuingOrganisation: 'Fitness Australia',
          issueDate: new Date('2023-01-01'),
          expiryDate: soonDate,
          status: 'ACTIVE',
        },
      });

      // Run processor
      const result = await expirationProcessor.processAllExpirations(orgA.id);
      expect(result.expiredCertificationsCount).toBeGreaterThanOrEqual(1);
      expect(result.expiredCertIds).toContain(expiredCert.id);
      expect(result.expiringSoonCertificationsCount).toBeGreaterThanOrEqual(1);
      expect(result.expiringSoonCertIds).toContain(soonCert.id);

      // Verify DB statuses
      const updatedExpired = await prisma.trainerCertification.findUnique({ where: { id: expiredCert.id } });
      expect(updatedExpired?.status).toBe('EXPIRED');

      const updatedSoon = await prisma.trainerCertification.findUnique({ where: { id: soonCert.id } });
      expect(updatedSoon?.status).toBe('EXPIRING_SOON');

      // Idempotency: Running processor again should find 0 new items
      const secondRun = await expirationProcessor.processAllExpirations(orgA.id);
      expect(secondRun.expiredCertIds).not.toContain(expiredCert.id);
      expect(secondRun.expiringSoonCertIds).not.toContain(soonCert.id);
    });
  });
});
