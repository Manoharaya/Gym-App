import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ExercisesService } from '../src/exercises/services/exercises.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Exercise Library & Media Domain (Day 13 E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let exercisesService: ExercisesService;

  let orgA: any;
  let orgB: any;
  let actorOwnerOrgA: AuthenticatedUser;
  let actorOwnerOrgB: AuthenticatedUser;
  let systemSquat: any;

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
    exercisesService = app.get(ExercisesService);

    orgA = await prisma.organisation.findFirstOrThrow({ where: { slug: 'second-wind' } });
    orgB = await prisma.organisation.findFirstOrThrow({ where: { slug: 'apex-strength' } });

    const ownerUserA = await prisma.user.findFirstOrThrow({ where: { email: 'owner@secondwind.com.au' } });
    actorOwnerOrgA = {
      id: ownerUserA.id,
      email: ownerUserA.email,
      firstName: ownerUserA.firstName,
      lastName: ownerUserA.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'ORGANISATION_OWNER', organisationId: orgA.id }],
      permissions: [{ resource: '*', action: 'MANAGE', scope: 'ORGANISATION' }],
    };

    const ownerUserB = await prisma.user.findFirstOrThrow({ where: { email: 'member@apexstrength.com.au' } });
    actorOwnerOrgB = {
      id: ownerUserB.id,
      email: ownerUserB.email,
      firstName: ownerUserB.firstName,
      lastName: ownerUserB.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'MEMBER', organisationId: orgB.id }],
      permissions: [{ resource: 'exercises', action: 'READ', scope: 'ORGANISATION' }],
    };

    systemSquat = await prisma.exercise.findFirstOrThrow({
      where: { slug: 'barbell-back-squat', ownershipType: 'SYSTEM' },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Global System Exercises Access', () => {
    it('should return system exercises to any organisation', async () => {
      const resA = await exercisesService.findAll(orgA.id, {});
      expect(resA.items.length).toBeGreaterThanOrEqual(6);
      const hasSquatA = resA.items.some((e) => e.slug === 'barbell-back-squat');
      expect(hasSquatA).toBe(true);

      const resB = await exercisesService.findAll(orgB.id, {});
      const hasSquatB = resB.items.some((e) => e.slug === 'barbell-back-squat');
      expect(hasSquatB).toBe(true);
    });

    it('should filter exercises by muscle group and difficulty', async () => {
      const filtered = await exercisesService.findAll(orgA.id, {
        muscleGroup: 'QUADRICEPS',
      });
      expect(filtered.items.length).toBeGreaterThan(0);
      expect(filtered.items.every((e) => e.primaryMuscleGroup === 'QUADRICEPS')).toBe(true);
    });
  });

  describe('2. System Exercise Immutability', () => {
    it('should reject modifications to system exercises with ForbiddenException', async () => {
      await expect(
        exercisesService.update(
          orgA.id,
          systemSquat.id,
          { name: 'Hacked Squat Name' },
          actorOwnerOrgA,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject archiving system exercises with ForbiddenException', async () => {
      await expect(
        exercisesService.archive(orgA.id, systemSquat.id, actorOwnerOrgA),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject attaching custom media to system exercises with ForbiddenException', async () => {
      await expect(
        exercisesService.attachMedia(
          orgA.id,
          systemSquat.id,
          { mediaType: 'IMAGE', url: 'https://example.com/squat.jpg' },
          actorOwnerOrgA,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('3. Organisation Custom Exercises & Multi-Tenant Isolation', () => {
    let customExA: any;

    it('should create a custom exercise for Org A', async () => {
      customExA = await exercisesService.create(
        orgA.id,
        {
          name: 'SecondWind Sandbag Carry',
          difficulty: 'ADVANCED',
          exerciseType: 'FUNCTIONAL',
          movementPattern: 'CARRY',
          primaryMuscleGroup: 'FULL_BODY',
          equipmentType: 'OTHER',
          instructions: ['Pick up sandbag', 'Brace core', 'Walk 50m'],
          coachingCues: ['Chest proud', 'Keep ribs down'],
        },
        actorOwnerOrgA,
      );

      expect(customExA.id).toBeDefined();
      expect(customExA.ownershipType).toBe('ORGANISATION');
      expect(customExA.organisationId).toBe(orgA.id);
    });

    it('should allow Org A to find custom exercise', async () => {
      const found = await exercisesService.findById(orgA.id, customExA.id);
      expect(found.name).toBe('SecondWind Sandbag Carry');
    });

    it('should NOT allow Org B to view Org A custom exercise (tenant isolation)', async () => {
      await expect(
        exercisesService.findById(orgB.id, customExA.id),
      ).rejects.toThrow(NotFoundException);

      const listB = await exercisesService.findAll(orgB.id, { search: 'Sandbag Carry' });
      expect(listB.items.some((e) => e.id === customExA.id)).toBe(false);
    });

    it('should allow Org A to update and archive its custom exercise', async () => {
      const updated = await exercisesService.update(
        orgA.id,
        customExA.id,
        { description: 'High intensity sandbag carry' },
        actorOwnerOrgA,
      );
      expect(updated.description).toBe('High intensity sandbag carry');

      const archived = await exercisesService.archive(orgA.id, customExA.id, actorOwnerOrgA);
      expect(archived.status).toBe('ARCHIVED');

      // Should be hidden by default
      const listA = await exercisesService.findAll(orgA.id, { search: 'Sandbag Carry' });
      expect(listA.items.some((e) => e.id === customExA.id)).toBe(false);

      // Should appear when includeArchived is true
      const listArchived = await exercisesService.findAll(orgA.id, {
        search: 'Sandbag Carry',
        includeArchived: true,
      });
      expect(listArchived.items.some((e) => e.id === customExA.id)).toBe(true);
    });
  });

  describe('4. Media Pre-signing & Attachment', () => {
    let customExForMedia: any;

    beforeAll(async () => {
      customExForMedia = await exercisesService.create(
        orgA.id,
        {
          name: 'Kettlebell Clean & Jerk',
          difficulty: 'ADVANCED',
          exerciseType: 'STRENGTH',
          movementPattern: 'HINGE',
          primaryMuscleGroup: 'FULL_BODY',
          equipmentType: 'KETTLEBELL',
        },
        actorOwnerOrgA,
      );
    });

    it('should presign an upload URL for exercise media', async () => {
      const presigned = await exercisesService.presignMediaUpload(
        orgA.id,
        customExForMedia.id,
        {
          filename: 'kettlebell_demo.mp4',
          mimeType: 'video/mp4',
          mediaType: 'VIDEO',
        },
      );

      expect(presigned.uploadUrl).toBeDefined();
      expect(presigned.storageKey).toContain(orgA.id);
      expect(presigned.storageKey).toContain(customExForMedia.id);
    });

    it('should attach media record to the custom exercise', async () => {
      const media = await exercisesService.attachMedia(
        orgA.id,
        customExForMedia.id,
        {
          mediaType: 'IMAGE',
          url: '/uploads/exercises/kb_photo.jpg',
          isPrimary: true,
        },
        actorOwnerOrgA,
      );

      expect(media.id).toBeDefined();
      expect(media.isPrimary).toBe(true);

      const ex = await exercisesService.findById(orgA.id, customExForMedia.id);
      expect(ex.media.length).toBe(1);
    });
  });
});
