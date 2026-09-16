import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ExercisesService } from '../src/exercises/services/exercises.service';
import { ExerciseMediaService } from '../src/exercises/services/exercise-media.service';
import { ExerciseInstructionsService } from '../src/exercises/services/exercise-instructions.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Day 63: Exercise Visual Instructions & Step-by-Step Learning System E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let exercisesService: ExercisesService;
  let mediaService: ExerciseMediaService;
  let instructionsService: ExerciseInstructionsService;

  let orgA: any;
  let orgB: any;
  let actorOwnerOrgA: AuthenticatedUser;
  let actorOwnerOrgB: AuthenticatedUser;
  let actorMemberOrgB: AuthenticatedUser;
  let systemSquat: any;
  let customExerciseA: any;
  let exerciseMediaA: any;

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
    instructionsService = app.get(ExerciseInstructionsService);

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

    const ownerUserB = await prisma.user.findFirstOrThrow({ where: { email: 'owner@apexstrength.com.au' } });
    actorOwnerOrgB = {
      id: ownerUserB.id,
      email: ownerUserB.email,
      firstName: ownerUserB.firstName,
      lastName: ownerUserB.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'ORGANISATION_OWNER', organisationId: orgB.id }],
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

    // Create a dedicated custom exercise in Org A
    customExerciseA = await exercisesService.create(
      orgA.id,
      {
        name: `Day 63 Custom Deadlift ${Date.now()}`,
        difficulty: 'ADVANCED',
        exerciseType: 'STRENGTH',
        movementPattern: 'HINGE',
        primaryMuscleGroup: 'GLUTES',
        equipmentType: 'BARBELL',
        description: 'Heavy compound hinge movement testing step learning system',
      },
      actorOwnerOrgA,
    );

    // Attach sample media for testing media binding
    exerciseMediaA = await mediaService.createMediaRecord(
      orgA.id,
      customExerciseA.id,
      {
        mediaType: 'VIDEO',
        purpose: 'STEP_VIDEO',
        storageKey: `fitbeat/tenants/${orgA.id}/exercises/${customExerciseA.id}/videos/test_clip.mp4`,
        mimeType: 'video/mp4',
        fileSize: 4500000,
        durationSeconds: 15,
        title: 'Deadlift Setup & Pull Clip',
        isPrimary: true,
      },
      actorOwnerOrgA,
    );
  });

  afterAll(async () => {
    // Clean up created entities
    if (customExerciseA?.id) {
      await prisma.exerciseInstructionStep.deleteMany({ where: { exerciseId: customExerciseA.id } });
      await prisma.exerciseInstruction.deleteMany({ where: { exerciseId: customExerciseA.id } });
      await prisma.exerciseMedia.deleteMany({ where: { exerciseId: customExerciseA.id } });
      await prisma.exercise.delete({ where: { id: customExerciseA.id } }).catch(() => {});
    }
    await app.close();
  });

  describe('1. Master Instruction Guide Overview & Lifecycle', () => {
    it('should upsert master instruction guide overview with version tracking', async () => {
      const guide = await instructionsService.upsertInstruction(
        orgA.id,
        customExerciseA.id,
        {
          title: 'Master Conventional Deadlift Guide',
          overview: 'Comprehensive step-by-step masterclass for conventional deadlift.',
          preparationGuide: 'Load Olympic barbell with calibrated bumper plates, stand over mid-foot.',
          startingPosition: 'Feet hip-width apart, shins 1 inch from bar, hip hinge posture.',
          executionSummary: 'Drive legs into floor while maintaining stiff neutral spine.',
          breathingSummary: 'Deep diaphragmatic inhale and intra-abdominal brace at bottom, exhale past lockout.',
          safetySummary: 'Do not hyperextend lumbar at lockout or round lower back off the floor.',
          status: 'DRAFT',
        },
        actorOwnerOrgA,
      );

      expect(guide).toBeDefined();
      expect(guide.exerciseId).toBe(customExerciseA.id);
      expect(guide.title).toBe('Master Conventional Deadlift Guide');
      expect(guide.version).toBe(1);
      expect(guide.status).toBe('DRAFT');
    });

    it('should increment version when updating instruction overview', async () => {
      const updated = await instructionsService.upsertInstruction(
        orgA.id,
        customExerciseA.id,
        {
          title: 'Master Conventional Deadlift Guide (Updated)',
        },
        actorOwnerOrgA,
      );

      expect(updated.title).toBe('Master Conventional Deadlift Guide (Updated)');
      expect(updated.version).toBe(2);
    });

    it('should fetch instruction guide with all details', async () => {
      const fetched = await instructionsService.getInstruction(
        orgA.id,
        customExerciseA.id,
        actorOwnerOrgA,
      );

      expect(fetched).toBeDefined();
      expect(fetched.title).toBe('Master Conventional Deadlift Guide (Updated)');
      expect(fetched.preparationGuide).toContain('calibrated bumper plates');
      expect(fetched.steps).toBeInstanceOf(Array);
    });
  });

  describe('2. Step Sequence Creation & Biomechanical Guidance', () => {
    let step1: any;
    let step2: any;
    let step3: any;

    it('should create sequential instruction steps with rich biomechanical cues', async () => {
      step1 = await instructionsService.createStep(
        orgA.id,
        customExerciseA.id,
        {
          stepNumber: 1,
          stepType: 'PREPARATION',
          movementPhase: 'SETUP',
          title: 'Foot Placement & Mid-Foot Alignment',
          description: 'Approach the bar so it bisects your laces, approximately one inch from your shins.',
          detailedInstruction: 'Biomechanical efficiency requires the center of mass to remain directly over mid-foot.',
          bodyPosition: 'Standing, feet hip-width apart, toes pointing forward or slightly outward',
          breathing: 'Normal relaxed breathing during stance setup',
          visualCue: 'Look straight down: bar splits feet in half',
          visualCueCategory: 'ALIGNMENT',
          trainerTip: 'Do not move the barbell once placed; adjust your feet to the bar.',
        },
        actorOwnerOrgA,
      );

      expect(step1).toBeDefined();
      expect(step1.stepNumber).toBe(1);
      expect(step1.stepType).toBe('PREPARATION');
      expect(step1.visualCueCategory).toBe('ALIGNMENT');
      expect(step1.status).toBe('DRAFT');

      step2 = await instructionsService.createStep(
        orgA.id,
        customExerciseA.id,
        {
          stepNumber: 2,
          stepType: 'START_POSITION',
          movementPhase: 'START',
          title: 'Hinge Hips & Take Grip',
          description: 'Hinge at the hips and grip the bar just outside your legs without dropping hips low.',
          coachingCue: 'Long arms, hook grip or double overhand',
          breathing: 'Deep diaphragmatic inhale, 360-degree abdominal brace',
          tempo: '3-1-1-0',
          visualCue: 'Shoulder blades set directly over the bar',
          visualCueCategory: 'POSTURE',
          safetyNote: 'Keep lats engaged to protect thoracic spine.',
        },
        actorOwnerOrgA,
      );

      expect(step2.stepNumber).toBe(2);
      expect(step2.movementPhase).toBe('START');

      step3 = await instructionsService.createStep(
        orgA.id,
        customExerciseA.id,
        {
          stepNumber: 3,
          stepType: 'EXECUTION',
          movementPhase: 'CONCENTRIC',
          title: 'Floor Push & Hip Extension',
          description: 'Push the floor away through your mid-foot while dragging the bar up your shins.',
          detailedInstruction: 'Initiate drive with knee extension before transitioning into explosive glute lockout.',
          holdDurationSeconds: 1,
          visualCue: 'Keep bar in continuous contact with legs',
          visualCueCategory: 'RANGE_OF_MOTION',
          trainerTip: 'Imagine doing a leg press into the earth.',
        },
        actorOwnerOrgA,
      );

      expect(step3.stepNumber).toBe(3);
    });

    it('should update step with revised coaching cue and tempo', async () => {
      const updated = await instructionsService.updateStep(
        orgA.id,
        step2.id,
        {
          title: 'Hinge Hips & Squeeze Armpits',
          coachingCue: 'Protect armpits with oranges, lock lats in place',
          tempo: '2-1-1-0',
        },
        actorOwnerOrgA,
      );

      expect(updated.title).toBe('Hinge Hips & Squeeze Armpits');
      expect(updated.coachingCue).toContain('Protect armpits');
      expect(updated.tempo).toBe('2-1-1-0');
    });

    it('should reject invalid video timestamp range (start > end)', async () => {
      await expect(
        instructionsService.updateStep(
          orgA.id,
          step1.id,
          {
            videoStartTimeSeconds: 10,
            videoEndTimeSeconds: 4,
          },
          actorOwnerOrgA,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. Media Asset Binding to Step with Video Timestamp Offsets', () => {
    it('should attach media to step with video playback offsets and enrich with pre-signed URL', async () => {
      const steps = await prisma.exerciseInstructionStep.findMany({
        where: { exerciseId: customExerciseA.id },
        orderBy: { stepNumber: 'asc' },
      });

      const stepToBind = steps[1]; // step 2

      const enriched = await instructionsService.attachStepMedia(
        orgA.id,
        stepToBind.id,
        {
          mediaId: exerciseMediaA.id,
          videoStartTimeSeconds: 3.5,
          videoEndTimeSeconds: 7.2,
        },
        actorOwnerOrgA,
      );

      expect(enriched.mediaId).toBe(exerciseMediaA.id);
      expect(enriched.videoStartTimeSeconds).toBe(3.5);
      expect(enriched.videoEndTimeSeconds).toBe(7.2);
      expect(enriched.media).toBeDefined();
      expect(enriched.media.id).toBe(exerciseMediaA.id);
      expect(enriched.media.signedUrl).toBeDefined();
    });
  });

  describe('4. Atomic Step Reordering & Automatic Sequence Renumbering', () => {
    it('should reorder steps atomically maintaining contiguous 1-based order', async () => {
      const stepsBefore = await prisma.exerciseInstructionStep.findMany({
        where: { exerciseId: customExerciseA.id },
        orderBy: { stepNumber: 'asc' },
      });

      expect(stepsBefore.length).toBe(3);
      // Reverse order: [step3, step2, step1]
      const reversedIds = [stepsBefore[2].id, stepsBefore[1].id, stepsBefore[0].id];

      const reordered = await instructionsService.reorderSteps(
        orgA.id,
        customExerciseA.id,
        { stepIds: reversedIds },
        actorOwnerOrgA,
      );

      expect(reordered[0].id).toBe(stepsBefore[2].id);
      expect(reordered[0].stepNumber).toBe(1);
      expect(reordered[1].id).toBe(stepsBefore[1].id);
      expect(reordered[1].stepNumber).toBe(2);
      expect(reordered[2].id).toBe(stepsBefore[0].id);
      expect(reordered[2].stepNumber).toBe(3);
    });

    it('should delete a step and automatically renumber remaining steps to remain contiguous', async () => {
      const steps = await prisma.exerciseInstructionStep.findMany({
        where: { exerciseId: customExerciseA.id },
        orderBy: { stepNumber: 'asc' },
      });

      const stepToDelete = steps[1]; // delete step at stepNumber 2
      const res = await instructionsService.deleteStep(
        orgA.id,
        stepToDelete.id,
        actorOwnerOrgA,
      );

      expect(res.success).toBe(true);

      const remainingSteps = await prisma.exerciseInstructionStep.findMany({
        where: { exerciseId: customExerciseA.id },
        orderBy: { stepNumber: 'asc' },
      });

      expect(remainingSteps.length).toBe(2);
      expect(remainingSteps[0].stepNumber).toBe(1);
      expect(remainingSteps[1].stepNumber).toBe(2); // renumbered from 3 down to 2
    });
  });

  describe('5. Publication Lifecycle & Validation', () => {
    it('should publish instructions and transition all step statuses to PUBLISHED', async () => {
      const published = await instructionsService.publishInstruction(
        orgA.id,
        customExerciseA.id,
        actorOwnerOrgA,
      );

      expect(published.status).toBe('PUBLISHED');
      published.steps.forEach((step: any) => {
        expect(step.status).toBe('PUBLISHED');
      });
    });

    it('should reject publishing an exercise instruction sequence with zero steps', async () => {
      const emptyExercise = await exercisesService.create(
        orgA.id,
        {
          name: `Empty Steps Exercise ${Date.now()}`,
          difficulty: 'BEGINNER',
          exerciseType: 'MOBILITY',
          movementPattern: 'SQUAT',
          primaryMuscleGroup: 'QUADRICEPS',
          equipmentType: 'NONE',
        },
        actorOwnerOrgA,
      );

      await expect(
        instructionsService.publishInstruction(
          orgA.id,
          emptyExercise.id,
          actorOwnerOrgA,
        ),
      ).rejects.toThrow(BadRequestException);

      await prisma.exercise.delete({ where: { id: emptyExercise.id } });
    });
  });

  describe('6. Zero-Trust Multi-Tenant Isolation', () => {
    it('should reject Org B trainer modifying Org A exercise instructions', async () => {
      await expect(
        instructionsService.upsertInstruction(
          orgB.id,
          customExerciseA.id,
          { title: 'Cross Tenant Tampering Attempt' },
          actorOwnerOrgB,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject tenant staff modifying System exercise instructions', async () => {
      await expect(
        instructionsService.upsertInstruction(
          orgA.id,
          systemSquat.id,
          { title: 'Illegal Tampering of System Squat' },
          actorOwnerOrgA,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow members of any organisation to read published system exercise instructions', async () => {
      const result = await instructionsService.getInstruction(
        orgB.id,
        systemSquat.id,
        actorMemberOrgB,
      );

      expect(result).toBeDefined();
      expect(result.exerciseId).toBe(systemSquat.id);
    });
  });

  describe('7. Backward Compatibility with Day 61 Standalone Steps', () => {
    it('should gracefully resolve system exercise instruction steps seeded in Day 61', async () => {
      const result = await instructionsService.getInstruction(
        orgA.id,
        systemSquat.id,
        actorOwnerOrgA,
      );

      expect(result).toBeDefined();
      expect(result.exerciseId).toBe(systemSquat.id);
      expect(result.steps).toBeInstanceOf(Array);
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.steps[0].title).toBeDefined();
      expect(result.steps[0].description).toBeDefined();
    });
  });
});
