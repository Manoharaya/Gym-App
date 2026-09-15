import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ExercisesService } from '../src/exercises/services/exercises.service';
import { ExerciseMediaService } from '../src/exercises/services/exercise-media.service';
import { ExerciseMediaValidatorService } from '../src/exercises/services/exercise-media-validator.service';
import { ExerciseMediaStorageService } from '../src/exercises/services/exercise-media-storage.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Day 62: Exercise Media & Asset Management System E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let exercisesService: ExercisesService;
  let mediaService: ExerciseMediaService;
  let validator: ExerciseMediaValidatorService;
  let storageService: ExerciseMediaStorageService;

  let orgA: any;
  let orgB: any;
  let actorOwnerOrgA: AuthenticatedUser;
  let actorMemberOrgB: AuthenticatedUser;
  let systemSquat: any;
  let customExerciseA: any;

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
    mediaService = app.get(ExerciseMediaService);
    validator = app.get(ExerciseMediaValidatorService);
    storageService = app.get(ExerciseMediaStorageService);

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

    const memberUserB = await prisma.user.findFirstOrThrow({ where: { email: 'member@apexstrength.com.au' } });
    actorMemberOrgB = {
      id: memberUserB.id,
      email: memberUserB.email,
      firstName: memberUserB.firstName,
      lastName: memberUserB.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'MEMBER', organisationId: orgB.id }],
      permissions: [{ resource: 'exercises', action: 'READ', scope: 'ORGANISATION' }],
    };

    systemSquat = await prisma.exercise.findFirstOrThrow({
      where: { slug: 'barbell-back-squat', ownershipType: 'SYSTEM' },
    });

    // Create a custom exercise for Org A
    customExerciseA = await exercisesService.create(
      orgA.id,
      {
        name: 'Day 62 Media Test Exercise',
        description: 'Testing media lifecycle, storage isolation, and publication',
        difficulty: 'INTERMEDIATE',
        exerciseType: 'STRENGTH',
        movementPattern: 'SQUAT',
        primaryMuscleGroup: 'QUADRICEPS',
        equipmentType: 'BARBELL',
        instructions: ['Step 1: Setup camera', 'Step 2: Record motion'],
      },
      actorOwnerOrgA,
    );
  });

  afterAll(async () => {
    // Clean up created test data
    if (customExerciseA) {
      await prisma.exerciseMedia.deleteMany({ where: { exerciseId: customExerciseA.id } });
      await prisma.exercise.delete({ where: { id: customExerciseA.id } }).catch(() => null);
    }
    await app.close();
  });

  describe('1. File Validation Engine (Security & Whitelisting)', () => {
    it('validates legitimate JPEG image metadata and sanitizes filenames', () => {
      const result = validator.validateMediaMetadata({
        filename: '../../../malicious_path/../front_squat.JPG',
        mimeType: 'image/jpeg',
        mediaType: 'IMAGE',
        fileSize: 2 * 1024 * 1024,
      });

      expect(result.sanitizedFilename).toBe('front_squat.JPG');
      expect(result.extension).toBe('jpg');
      expect(result.cleanMimeType).toBe('image/jpeg');
    });

    it('rejects executable file extensions', () => {
      expect(() => {
        validator.validateMediaMetadata({
          filename: 'exercise_exploit.exe',
          mimeType: 'application/octet-stream',
          mediaType: 'IMAGE',
        });
      }).toThrow(BadRequestException);
    });

    it('rejects forbidden/mismatched MIME types', () => {
      expect(() => {
        validator.validateMediaMetadata({
          filename: 'test.png',
          mimeType: 'application/x-msdownload',
          mediaType: 'IMAGE',
        });
      }).toThrow(BadRequestException);
    });

    it('rejects oversized files exceeding category ceiling', () => {
      expect(() => {
        validator.validateMediaMetadata({
          filename: 'giant_avatar.jpg',
          mimeType: 'image/jpeg',
          mediaType: 'IMAGE',
          fileSize: 30 * 1024 * 1024, // 30 MB > 15 MB limit
        });
      }).toThrow(BadRequestException);
    });

    it('verifies magic bytes for JPEG and PNG', () => {
      const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
      expect(() => {
        validator.verifyMagicBytes(validJpegBuffer, 'image/jpeg', 'jpg');
      }).not.toThrow();

      const invalidJpegBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      expect(() => {
        validator.verifyMagicBytes(invalidJpegBuffer, 'image/jpeg', 'jpg');
      }).toThrow(BadRequestException);
    });
  });

  describe('2. Deterministic Key Structure & Tenant Storage Isolation', () => {
    it('generates system exercise key with fitbeat/exercises prefix', () => {
      const key = storageService.generateStorageKey({
        exerciseId: systemSquat.id,
        mediaType: 'VIDEO',
        extension: 'mp4',
      });

      expect(key).toMatch(new RegExp(`^fitbeat/exercises/${systemSquat.id}/videos/\\d+_[a-f0-9]+\\.mp4$`));
    });

    it('generates tenant-isolated key with fitbeat/tenants/{orgId}/exercises prefix', () => {
      const key = storageService.generateStorageKey({
        organisationId: orgA.id,
        exerciseId: customExerciseA.id,
        mediaType: 'IMAGE',
        extension: 'webp',
      });

      expect(key).toMatch(
        new RegExp(`^fitbeat/tenants/${orgA.id}/exercises/${customExerciseA.id}/images/\\d+_[a-f0-9]+\\.webp$`),
      );
    });
  });

  describe('3. Pre-sign Media Upload & Immutability Checks', () => {
    it('pre-signs upload successfully for tenant exercise', async () => {
      const presigned = await mediaService.presignUpload(
        orgA.id,
        customExerciseA.id,
        {
          filename: 'barbell_bench_setup.mp4',
          mimeType: 'video/mp4',
          mediaType: 'VIDEO',
          purpose: 'PRIMARY_DEMONSTRATION',
          fileSize: 5 * 1024 * 1024,
          altText: 'Athlete positioning barbell on rack',
        },
        actorOwnerOrgA,
      );

      expect(presigned.uploadUrl).toBeDefined();
      expect(presigned.storageKey).toContain(`tenants/${orgA.id}/exercises/${customExerciseA.id}/videos/`);
      expect(presigned.mimeType).toBe('video/mp4');
      expect(presigned.extension).toBe('mp4');
    });

    it('forbids tenant actors from uploading media to immutable SYSTEM exercises', async () => {
      await expect(
        mediaService.presignUpload(
          orgA.id,
          systemSquat.id,
          {
            filename: 'rogue_video.mp4',
            mimeType: 'video/mp4',
            mediaType: 'VIDEO',
          },
          actorOwnerOrgA,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('4. Media CRUD & Single Primary Asset Enforcement', () => {
    let media1: any;
    let media2: any;

    it('creates initial primary demonstration asset', async () => {
      media1 = await mediaService.createMediaRecord(
        orgA.id,
        customExerciseA.id,
        {
          mediaType: 'IMAGE',
          purpose: 'PRIMARY_DEMONSTRATION',
          storageKey: `fitbeat/tenants/${orgA.id}/exercises/${customExerciseA.id}/images/front_view.jpg`,
          mimeType: 'image/jpeg',
          fileExtension: 'jpg',
          fileSize: 1024 * 800,
          isPrimary: true,
          title: 'Front View Squat Stance',
          altText: 'Front camera view of lifter setting hip-width stance',
          width: 1920,
          height: 1080,
          status: 'READY',
          isPublished: true,
        },
        actorOwnerOrgA,
      );

      expect(media1.id).toBeDefined();
      expect(media1.isPrimary).toBe(true);
      expect(media1.purpose).toBe('PRIMARY_DEMONSTRATION');
      expect(media1.signedUrl).toBeDefined();
    });

    it('automatically demotes older primary when a new primary is created for the same purpose', async () => {
      media2 = await mediaService.createMediaRecord(
        orgA.id,
        customExerciseA.id,
        {
          mediaType: 'VIDEO',
          purpose: 'PRIMARY_DEMONSTRATION',
          storageKey: `fitbeat/tenants/${orgA.id}/exercises/${customExerciseA.id}/videos/front_view_v2.mp4`,
          mimeType: 'video/mp4',
          fileExtension: 'mp4',
          fileSize: 1024 * 1024 * 12,
          durationSeconds: 30,
          frameRate: 60,
          isPrimary: true,
          title: 'High-Speed Front View Demonstration',
          status: 'READY',
          isPublished: true,
        },
        actorOwnerOrgA,
      );

      expect(media2.isPrimary).toBe(true);

      // Verify media1 is no longer primary
      const updatedMedia1 = await prisma.exerciseMedia.findUnique({ where: { id: media1.id } });
      expect(updatedMedia1?.isPrimary).toBe(false);
    });

    it('updates media metadata, title, and altText', async () => {
      const updated = await mediaService.updateMedia(
        orgA.id,
        media1.id,
        {
          title: 'Updated Front View Image',
          altText: 'Updated accessibility description for front stance',
          sortOrder: 2,
        },
        actorOwnerOrgA,
      );

      expect(updated.title).toBe('Updated Front View Image');
      expect(updated.altText).toBe('Updated accessibility description for front stance');
      expect(updated.sortOrder).toBe(2);
    });

    it('deletes media safely and coordinates storage cleanup', async () => {
      const deleteResult = await mediaService.deleteMedia(orgA.id, media2.id, actorOwnerOrgA);
      expect(deleteResult.success).toBe(true);
      expect(deleteResult.deletedId).toBe(media2.id);

      const checkDb = await prisma.exerciseMedia.findUnique({ where: { id: media2.id } });
      expect(checkDb).toBeNull();
    });
  });

  describe('5. Publication Lifecycle & Role-Aware Visibility', () => {
    let draftMedia: any;

    beforeAll(async () => {
      draftMedia = await mediaService.createMediaRecord(
        orgA.id,
        customExerciseA.id,
        {
          mediaType: 'ANIMATION',
          purpose: 'MOVEMENT_PHASE',
          storageKey: `fitbeat/tenants/${orgA.id}/exercises/${customExerciseA.id}/animations/draft.gif`,
          mimeType: 'image/gif',
          status: 'UPLOADING',
          isPublished: false,
          title: 'Unpublished Draft Animation',
        },
        actorOwnerOrgA,
      );
    });

    it('hides unpublished/draft media from members', async () => {
      const memberResults = await mediaService.getExerciseMedia(
        orgA.id,
        customExerciseA.id,
        {},
        actorMemberOrgB, // Member role
      );

      const hasDraft = memberResults.some((m) => m.id === draftMedia.id);
      expect(hasDraft).toBe(false);
    });

    it('displays draft/uploading media to trainers and admins', async () => {
      const adminResults = await mediaService.getExerciseMedia(
        orgA.id,
        customExerciseA.id,
        {},
        actorOwnerOrgA, // Owner/Admin role
      );

      const foundDraft = adminResults.find((m) => m.id === draftMedia.id);
      expect(foundDraft).toBeDefined();
      expect(foundDraft?.status).toBe('UPLOADING');
      expect(foundDraft?.isPublished).toBe(false);
    });

    it('publishes media asset making it visible to all members', async () => {
      const published = await mediaService.publishMedia(orgA.id, draftMedia.id, actorOwnerOrgA);
      expect(published.isPublished).toBe(true);
      expect(published.status).toBe('READY');

      const memberResults = await mediaService.getExerciseMedia(
        orgA.id,
        customExerciseA.id,
        {},
        actorMemberOrgB,
      );
      const foundPublished = memberResults.find((m) => m.id === draftMedia.id);
      expect(foundPublished).toBeDefined();
    });

    it('archives media asset removing it from member view', async () => {
      const archived = await mediaService.archiveMedia(orgA.id, draftMedia.id, actorOwnerOrgA);
      expect(archived.isPublished).toBe(false);
      expect(archived.status).toBe('ARCHIVED');

      const memberResults = await mediaService.getExerciseMedia(
        orgA.id,
        customExerciseA.id,
        {},
        actorMemberOrgB,
      );
      const foundArchived = memberResults.find((m) => m.id === draftMedia.id);
      expect(foundArchived).toBeUndefined();
    });
  });

  describe('6. Zero-Trust Multi-Tenancy & Cross-Tenant Protection', () => {
    let privateMediaA: any;

    beforeAll(async () => {
      privateMediaA = await mediaService.createMediaRecord(
        orgA.id,
        customExerciseA.id,
        {
          mediaType: 'MODEL_3D',
          purpose: '3D_MODEL',
          storageKey: `fitbeat/tenants/${orgA.id}/exercises/${customExerciseA.id}/models/mesh.glb`,
          mimeType: 'model/gltf-binary',
          format3d: 'GLB',
          modelLod: 'HIGH',
          status: 'READY',
          isPublished: true,
          title: 'Org A Proprietary 3D Mesh',
        },
        actorOwnerOrgA,
      );
    });

    it('blocks foreign tenant actor from accessing private media by ID', async () => {
      await expect(
        mediaService.getMediaById(orgB.id, privateMediaA.id, actorMemberOrgB),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks foreign tenant actor from updating private media', async () => {
      await expect(
        mediaService.updateMedia(
          orgB.id,
          privateMediaA.id,
          { title: 'Hacked Title' },
          actorMemberOrgB,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks foreign tenant actor from deleting private media', async () => {
      await expect(
        mediaService.deleteMedia(orgB.id, privateMediaA.id, actorMemberOrgB),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
