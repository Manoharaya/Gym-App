import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, BadRequestException, NotFoundException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ExerciseMediaService } from '../src/exercises/services/exercise-media.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Day 77: Multi-Angle Exercise Demonstrations & Visual Comparison E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mediaService: ExerciseMediaService;

  let orgA: any;
  let orgB: any;
  let userA: any;
  let userB: any;
  let actorTrainerA: AuthenticatedUser;
  let actorMemberA: AuthenticatedUser;
  let actorTrainerB: AuthenticatedUser;

  let testExercise: any;
  let testPhase1: any;
  let testPhase2: any;
  let mediaFront: any;
  let mediaSide: any;
  let mediaRear: any;

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
    mediaService = app.get(ExerciseMediaService);

    orgA = await prisma.organisation.findFirstOrThrow({ where: { slug: 'second-wind' } });
    orgB = await prisma.organisation.findFirstOrThrow({ where: { slug: 'apex-strength' } });

    userA =
      (await prisma.user.findFirst({ where: { email: 'owner@secondwind.com.au' } })) ||
      (await prisma.user.findFirstOrThrow({ where: { email: 'member@secondwind.com.au' } }));

    userB =
      (await prisma.user.findFirst({ where: { email: 'owner@apexstrength.com.au' } })) ||
      (await prisma.user.findFirstOrThrow({ where: { email: 'member@apexstrength.com.au' } }));

    actorTrainerA = {
      id: userA.id,
      email: userA.email,
      roles: [{ role: 'TRAINER', organisationId: orgA.id }],
    } as any;

    actorMemberA = {
      id: userA.id,
      email: userA.email,
      roles: [{ role: 'MEMBER', organisationId: orgA.id }],
    } as any;

    actorTrainerB = {
      id: userB.id,
      email: userB.email,
      roles: [{ role: 'TRAINER', organisationId: orgB.id }],
    } as any;

    // Create test exercise in Org A
    testExercise = await prisma.exercise.create({
      data: {
        organisationId: orgA.id,
        ownershipType: 'ORGANISATION',
        name: `Multi-Angle Test Squat ${Date.now()}`,
        slug: `multi-angle-test-squat-${Date.now()}`,
        difficulty: 'BEGINNER',
        movementPattern: 'SQUAT',
        primaryMuscleGroup: 'QUADRICEPS',
        equipment: 'BARBELL',
        status: 'PUBLISHED',
      },
    });

    // Create test movement phases
    testPhase1 = await prisma.exerciseMovementPhase.create({
      data: {
        exerciseId: testExercise.id,
        phaseName: 'SETUP',
        phaseType: 'START_POSITION',
        title: 'Starting Posture & Foot Stance',
        orderIndex: 0,
        tempoSeconds: 2.0,
        videoStartTimeSeconds: 0.0,
        videoEndTimeSeconds: 2.5,
        status: 'PUBLISHED',
      },
    });

    testPhase2 = await prisma.exerciseMovementPhase.create({
      data: {
        exerciseId: testExercise.id,
        phaseName: 'DESCENT',
        phaseType: 'ECCENTRIC',
        title: 'Controlled Descent to Parallel',
        orderIndex: 1,
        tempoSeconds: 3.0,
        videoStartTimeSeconds: 2.5,
        videoEndTimeSeconds: 5.5,
        status: 'PUBLISHED',
      },
    });
  });

  afterAll(async () => {
    if (testExercise) {
      await prisma.exerciseMediaAnnotation.deleteMany({
        where: { media: { exerciseId: testExercise.id } },
      });
      await prisma.exerciseMedia.deleteMany({
        where: { exerciseId: testExercise.id },
      });
      await prisma.exerciseMovementPhase.deleteMany({
        where: { exerciseId: testExercise.id },
      });
      await prisma.exercise.delete({
        where: { id: testExercise.id },
      });
    }
    await app.close();
  });

  describe('1. Multi-Angle Media Creation & View Tagging', () => {
    it('should create media records tagged with viewAngle and phaseId', async () => {
      // 1. Front View (Setup phase)
      mediaFront = await mediaService.createMediaRecord(
        orgA.id,
        testExercise.id,
        {
          mediaType: 'VIDEO',
          purpose: 'PRIMARY_DEMONSTRATION',
          storageKey: `videos/test-squat-front-${Date.now()}.mp4`,
          mimeType: 'video/mp4',
          fileSize: 5000000,
          durationSeconds: 12,
          isPrimary: true,
          viewAngle: 'FRONT',
          phaseId: testPhase1.id,
          title: 'Barbell Squat - Front Angle',
        },
        actorTrainerA,
      );

      expect(mediaFront).toBeDefined();
      expect(mediaFront.viewAngle).toBe('FRONT');
      expect(mediaFront.phaseId).toBe(testPhase1.id);
      expect(mediaFront.isPrimary).toBe(true);

      // 2. Side View (Descent phase)
      mediaSide = await mediaService.createMediaRecord(
        orgA.id,
        testExercise.id,
        {
          mediaType: 'VIDEO',
          purpose: 'PRIMARY_DEMONSTRATION',
          storageKey: `videos/test-squat-side-${Date.now()}.mp4`,
          mimeType: 'video/mp4',
          fileSize: 4800000,
          durationSeconds: 12,
          isPrimary: false,
          viewAngle: 'SIDE',
          phaseId: testPhase2.id,
          title: 'Barbell Squat - Side View Profile',
        },
        actorTrainerA,
      );

      expect(mediaSide).toBeDefined();
      expect(mediaSide.viewAngle).toBe('SIDE');
      expect(mediaSide.phaseId).toBe(testPhase2.id);

      // 3. Rear View
      mediaRear = await mediaService.createMediaRecord(
        orgA.id,
        testExercise.id,
        {
          mediaType: 'IMAGE',
          purpose: 'SECONDARY_DEMONSTRATION',
          storageKey: `images/test-squat-rear-${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          fileSize: 1200000,
          viewAngle: 'BACK',
          title: 'Barbell Squat - Posterior Alignment',
        },
        actorTrainerA,
      );

      expect(mediaRear).toBeDefined();
      expect(mediaRear.viewAngle).toBe('BACK');
    });

    it('should filter media by viewAngle and phaseId in getExerciseMedia', async () => {
      const frontMedia = await mediaService.getExerciseMedia(
        orgA.id,
        testExercise.id,
        { viewAngle: 'FRONT' },
        actorMemberA,
      );
      expect(frontMedia.length).toBe(1);
      expect(frontMedia[0].viewAngle).toBe('FRONT');

      const sideMedia = await mediaService.getExerciseMedia(
        orgA.id,
        testExercise.id,
        { viewAngle: 'SIDE' },
        actorMemberA,
      );
      expect(sideMedia.length).toBe(1);
      expect(sideMedia[0].viewAngle).toBe('SIDE');

      const phase2Media = await mediaService.getExerciseMedia(
        orgA.id,
        testExercise.id,
        { phaseId: testPhase2.id },
        actorMemberA,
      );
      expect(phase2Media.length).toBe(1);
      expect(phase2Media[0].id).toBe(mediaSide.id);
    });
  });

  describe('2. Multi-Angle Grouped Views & Deterministic Fallback', () => {
    it('should return available angles and resolve defaultAngle deterministically', async () => {
      const viewsGroup = await mediaService.getExerciseMediaViews(
        orgA.id,
        testExercise.id,
        actorMemberA,
      );

      expect(viewsGroup).toBeDefined();
      expect(viewsGroup.totalMedia).toBeGreaterThanOrEqual(3);
      expect(viewsGroup.availableAngles).toEqual(expect.arrayContaining(['FRONT', 'SIDE', 'BACK']));

      // Primary was configured as FRONT
      expect(viewsGroup.defaultAngle).toBe('FRONT');
      expect(viewsGroup.views['FRONT'].length).toBe(1);
      expect(viewsGroup.views['SIDE'].length).toBe(1);
      expect(viewsGroup.views['BACK'].length).toBe(1);
    });

    it('should organize media assets by movement phases and angles', async () => {
      const phaseViews = await mediaService.getExerciseMediaPhases(
        orgA.id,
        testExercise.id,
        actorMemberA,
      );

      expect(phaseViews.length).toBe(2);

      const p1 = phaseViews.find((p) => p.phaseId === testPhase1.id);
      expect(p1).toBeDefined();
      expect(p1!.availableAngles).toContain('FRONT');
      expect(p1!.views['FRONT'][0].id).toBe(mediaFront.id);

      const p2 = phaseViews.find((p) => p.phaseId === testPhase2.id);
      expect(p2).toBeDefined();
      expect(p2!.availableAngles).toContain('SIDE');
      expect(p2!.views['SIDE'][0].id).toBe(mediaSide.id);
    });
  });

  describe('3. Authored Visual Cue Annotations Lifecycle', () => {
    let annotationId: string;

    it('should create an authored visual annotation with normalized coordinates', async () => {
      const created = await mediaService.createMediaAnnotation(
        orgA.id,
        mediaFront.id,
        {
          type: 'POINT',
          label: 'Knee Tracking Plane',
          description: 'Ensure patella tracks in line with 2nd and 3rd toes during flexion',
          category: 'ALIGNMENT',
          x: 0.42,
          y: 0.68,
          startTime: 1.0,
          endTime: 3.5,
          status: 'PUBLISHED',
        },
        actorTrainerA,
      );

      expect(created).toBeDefined();
      expect(created.label).toBe('Knee Tracking Plane');
      expect(created.category).toBe('ALIGNMENT');
      expect(created.x).toBe(0.42);
      expect(created.y).toBe(0.68);
      expect(created.startTime).toBe(1.0);
      expect(created.endTime).toBe(3.5);
      expect(created.status).toBe('PUBLISHED');

      annotationId = created.id;
    });

    it('should list annotations for members filtering published assets', async () => {
      const annotations = await mediaService.getMediaAnnotations(
        orgA.id,
        mediaFront.id,
        {},
        actorMemberA,
      );

      expect(annotations.length).toBe(1);
      expect(annotations[0].id).toBe(annotationId);
      expect(annotations[0].label).toBe('Knee Tracking Plane');
    });

    it('should update visual annotation details and coordinates', async () => {
      const updated = await mediaService.updateMediaAnnotation(
        orgA.id,
        mediaFront.id,
        annotationId,
        {
          label: 'Updated Knee Tracking Plane',
          x: 0.45,
          y: 0.70,
          category: 'SAFETY',
        },
        actorTrainerA,
      );

      expect(updated.label).toBe('Updated Knee Tracking Plane');
      expect(updated.x).toBe(0.45);
      expect(updated.y).toBe(0.70);
      expect(updated.category).toBe('SAFETY');
    });

    it('should reject invalid coordinates (< 0 or > 1)', async () => {
      await expect(
        mediaService.createMediaAnnotation(
          orgA.id,
          mediaFront.id,
          {
            type: 'POINT',
            label: 'Invalid Coordinate Test',
            category: 'ALIGNMENT',
            x: 1.25, // Invalid: > 1
            y: 0.5,
          },
          actorTrainerA,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid timestamp range (startTime > endTime)', async () => {
      await expect(
        mediaService.createMediaAnnotation(
          orgA.id,
          mediaFront.id,
          {
            type: 'POINT',
            label: 'Invalid Timing Test',
            category: 'ALIGNMENT',
            x: 0.5,
            y: 0.5,
            startTime: 5.0,
            endTime: 2.0, // Invalid: startTime > endTime
          },
          actorTrainerA,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delete visual annotation', async () => {
      const res = await mediaService.deleteMediaAnnotation(
        orgA.id,
        mediaFront.id,
        annotationId,
        actorTrainerA,
      );
      expect(res.success).toBe(true);

      const remaining = await mediaService.getMediaAnnotations(
        orgA.id,
        mediaFront.id,
        {},
        actorTrainerA,
      );
      expect(remaining.length).toBe(0);
    });
  });

  describe('4. Multi-Tenant Security & Permission Boundaries', () => {
    it('should prevent Org B trainer from modifying Org A media', async () => {
      await expect(
        mediaService.updateMedia(
          orgB.id,
          mediaFront.id,
          { title: 'Hacked Title' },
          actorTrainerB,
        ),
      ).rejects.toThrow();
    });

    it('should prevent Org B trainer from adding annotations to Org A media', async () => {
      await expect(
        mediaService.createMediaAnnotation(
          orgB.id,
          mediaFront.id,
          {
            type: 'POINT',
            label: 'Cross-Tenant Annotation',
            x: 0.5,
            y: 0.5,
          },
          actorTrainerB,
        ),
      ).rejects.toThrow();
    });
  });
});
