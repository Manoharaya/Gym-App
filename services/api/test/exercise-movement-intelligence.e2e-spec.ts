import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ExercisesService } from '../src/exercises/services/exercises.service';
import { ExerciseMediaService } from '../src/exercises/services/exercise-media.service';
import { ExerciseInstructionsService } from '../src/exercises/services/exercise-instructions.service';
import { ExerciseMovementService } from '../src/exercises/services/exercise-movement.service';
import { ExerciseKnowledgeService } from '../src/exercises/services/exercise-knowledge.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Day 64: Movement Steps, Phases & Exercise Movement Intelligence E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let exercisesService: ExercisesService;
  let mediaService: ExerciseMediaService;
  let instructionsService: ExerciseInstructionsService;
  let movementService: ExerciseMovementService;
  let knowledgeService: ExerciseKnowledgeService;

  let orgA: any;
  let orgB: any;
  let actorOwnerOrgA: AuthenticatedUser;
  let actorOwnerOrgB: AuthenticatedUser;
  let actorMemberOrgB: AuthenticatedUser;
  let systemSquat: any;
  let customExerciseA: any;
  let exerciseMediaA: any;
  let customStepA: any;

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
    movementService = app.get(ExerciseMovementService);
    knowledgeService = app.get(ExerciseKnowledgeService);

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
        name: `Day 64 Romanian Deadlift ${Date.now()}`,
        difficulty: 'INTERMEDIATE',
        exerciseType: 'STRENGTH',
        movementPattern: 'HINGE',
        primaryMuscleGroup: 'HAMSTRINGS',
        equipmentType: 'BARBELL',
        description: 'Hip hinge movement testing Day 64 movement intelligence lifecycle',
      },
      actorOwnerOrgA,
    );

    // Create sample media on Org A custom exercise
    exerciseMediaA = await mediaService.createMediaRecord(
      orgA.id,
      customExerciseA.id,
      {
        mediaType: 'VIDEO',
        purpose: 'MOVEMENT_PHASE',
        storageKey: `exercises/${customExerciseA.id}/phases/video_loop.mp4`,
        mimeType: 'video/mp4',
        fileSize: 4194304,
        durationSeconds: 12,
        frameRate: 60,
      },
      actorOwnerOrgA,
    );

    // Create a step on Org A custom exercise to test phase-to-step linking
    customStepA = await instructionsService.createStep(
      orgA.id,
      customExerciseA.id,
      {
        stepNumber: 1,
        stepType: 'EXECUTION',
        title: 'Hinge back at the hips',
        description: 'Push pelvis posteriorly while maintaining neutral lumbar curvature.',
      },
      actorOwnerOrgA,
    );
  });

  afterAll(async () => {
    if (customExerciseA?.id) {
      await prisma.exercise.delete({ where: { id: customExerciseA.id } }).catch(() => null);
    }
    await app.close();
  });

  describe('1. Movement Structure & Backward Compatibility with Seeded Exercises', () => {
    it('should retrieve full movement structure for system Barbell Back Squat preserving seeded phases', async () => {
      const structure = await movementService.getMovementStructure(
        orgA.id,
        systemSquat.id,
        actorOwnerOrgA,
      );

      expect(structure).toBeDefined();
      expect(structure.exerciseId).toBe(systemSquat.id);
      expect(structure.exerciseName).toBe(systemSquat.name);
      expect(structure.ownershipType).toBe('SYSTEM');
      expect(structure.phasesCount).toBeGreaterThanOrEqual(5);

      // Verify seeded squat phases exist
      const phaseNames = structure.phases.map((p: any) => p.phaseName);
      expect(phaseNames).toContain('SETUP');
      expect(phaseNames).toContain('DESCENT');
      expect(phaseNames).toContain('BOTTOM');
      expect(phaseNames).toContain('ASCENT');
      expect(phaseNames).toContain('LOCKOUT');

      // Verify AI movement intelligence breakdown is present
      expect(structure.aiMovementIntelligence).toBeDefined();
      expect(structure.aiMovementIntelligence.exerciseId).toBe(systemSquat.id);
      expect(structure.aiMovementIntelligence.primaryPattern).toBe('SQUAT');
      expect(structure.aiMovementIntelligence.totalPhases).toBeGreaterThanOrEqual(5);
      expect(Array.isArray(structure.aiMovementIntelligence.movementLifecycle)).toBe(true);
    });

    it('should return movement phases ordered by orderIndex asc', async () => {
      const phases = await movementService.getPhases(orgA.id, systemSquat.id, actorOwnerOrgA);
      expect(Array.isArray(phases)).toBe(true);
      expect(phases.length).toBeGreaterThanOrEqual(5);

      for (let i = 0; i < phases.length - 1; i++) {
        expect(phases[i].orderIndex).toBeLessThanOrEqual(phases[i + 1].orderIndex);
      }
    });
  });

  describe('2. Authoring Movement Phases with Rich Biomechanical Intelligence', () => {
    let createdPhase: any;

    it('should create an eccentric lowering phase with joint alignments, ROM, tempo, and breathing pattern', async () => {
      createdPhase = await movementService.createPhase(
        orgA.id,
        customExerciseA.id,
        {
          phaseName: 'DESCENT',
          phaseType: 'ECCENTRIC',
          title: 'Eccentric Hinge Lowering',
          description: 'Controlled lowering phase emphasizing hamstring stretch under load.',
          cueText: 'Push hips to back wall, soften knees, chest proud',
          bodyPosition: 'STANDING',
          bodyOrientation: 'UPRIGHT',
          rangeOfMotionType: 'FULL',
          rangeOfMotionNotes: 'Lower until deep hamstring tension is reached, just below patella',
          breathingPattern: 'INHALE_DESCENT',
          breathingNotes: 'Inhale diaphragmatically into belt before initiating hip displacement',
          tempoSeconds: 3.5,
          holdDurationSeconds: 1.0,
          jointAlignments: [
            {
              joint: 'KNEES',
              alignment: 'Soft bend 15-20 degrees, vertical shins preserved',
              status: 'OPTIMAL',
              cue: 'Freeze knee angle',
              angleDegrees: 20,
            },
            {
              joint: 'LUMBAR_SPINE',
              alignment: 'Rigid neutral lordosis, anti-flexion braced',
              status: 'OPTIMAL',
              cue: 'Lock lats down',
              angleDegrees: 0,
            },
          ],
          keyCheckpoints: [
            'Barbell remains in constant contact with quadriceps/thighs',
            'Neck aligned with thoracic spine',
          ],
          visualCues: [
            { text: 'Bar path stays purely vertical over midfoot', category: 'ALIGNMENT' },
          ],
          commonMistakes: [
            {
              mistake: 'Squatting the movement by bending knees excessively',
              correction: 'Direct hips backwards rather than downward',
              severity: 'MODERATE',
            },
          ],
          safetyNotes: 'Cease descent immediately if lumbar spine begins to round.',
        },
        actorOwnerOrgA,
      );

      expect(createdPhase).toBeDefined();
      expect(createdPhase.id).toBeDefined();
      expect(createdPhase.phaseName).toBe('DESCENT');
      expect(createdPhase.phaseType).toBe('ECCENTRIC');
      expect(createdPhase.tempoSeconds).toBe(3.5);
      expect(createdPhase.holdDurationSeconds).toBe(1.0);
      expect(createdPhase.rangeOfMotionType).toBe('FULL');
      expect(createdPhase.breathingPattern).toBe('INHALE_DESCENT');
      expect(Array.isArray(createdPhase.jointAlignments)).toBe(true);
      expect(createdPhase.jointAlignments.length).toBe(2);
      expect(createdPhase.jointAlignments[0].joint).toBe('KNEES');
    });

    it('should update movement phase parameters and refine coaching cue', async () => {
      const updated = await movementService.updatePhase(
        orgA.id,
        customExerciseA.id,
        createdPhase.id,
        {
          cueText: 'Drive hips back, keep barbell tight to shins',
          tempoSeconds: 4.0,
        },
        actorOwnerOrgA,
      );

      expect(updated.id).toBe(createdPhase.id);
      expect(updated.cueText).toBe('Drive hips back, keep barbell tight to shins');
      expect(updated.tempoSeconds).toBe(4.0);
    });

    it('should retrieve specific phase by ID with its enriched relations', async () => {
      const phase = await movementService.getPhaseById(
        orgA.id,
        customExerciseA.id,
        createdPhase.id,
        actorOwnerOrgA,
      );

      expect(phase).toBeDefined();
      expect(phase.id).toBe(createdPhase.id);
      expect(phase.phaseName).toBe('DESCENT');
      expect(phase.keyCheckpoints).toContain('Neck aligned with thoracic spine');
    });
  });

  describe('3. Reordering Movement Phases', () => {
    let phase1: any;
    let phase2: any;
    let phase3: any;

    beforeAll(async () => {
      phase1 = await movementService.createPhase(
        orgA.id,
        customExerciseA.id,
        { phaseName: 'SETUP', phaseType: 'SETUP', orderIndex: 0 },
        actorOwnerOrgA,
      );
      phase2 = await movementService.createPhase(
        orgA.id,
        customExerciseA.id,
        { phaseName: 'BOTTOM_INFLECTION', phaseType: 'TRANSITION_BOTTOM', orderIndex: 1 },
        actorOwnerOrgA,
      );
      phase3 = await movementService.createPhase(
        orgA.id,
        customExerciseA.id,
        { phaseName: 'ASCENT_DRIVE', phaseType: 'CONCENTRIC', orderIndex: 2 },
        actorOwnerOrgA,
      );
    });

    it('should reorder phases to match sequence array', async () => {
      const reordered = await movementService.reorderPhases(
        orgA.id,
        customExerciseA.id,
        { phaseIds: [phase3.id, phase1.id, phase2.id] },
        actorOwnerOrgA,
      );

      const p3 = reordered.find((p) => p.id === phase3.id);
      const p1 = reordered.find((p) => p.id === phase1.id);
      const p2 = reordered.find((p) => p.id === phase2.id);

      expect(p3?.orderIndex).toBe(0);
      expect(p1?.orderIndex).toBe(1);
      expect(p2?.orderIndex).toBe(2);
    });

    it('should reject reordering if a phase ID belongs to another exercise', async () => {
      await expect(
        movementService.reorderPhases(
          orgA.id,
          customExerciseA.id,
          { phaseIds: [phase1.id, 'non-existent-phase-id'] },
          actorOwnerOrgA,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('4. Media Binding with Sub-Second Loop Timestamps', () => {
    let targetPhase: any;

    beforeAll(async () => {
      const phases = await movementService.getPhases(orgA.id, customExerciseA.id, actorOwnerOrgA);
      targetPhase = phases[0];
    });

    it('should attach media with start and end second offsets for loop rendering', async () => {
      const attached = await movementService.attachPhaseMedia(
        orgA.id,
        customExerciseA.id,
        targetPhase.id,
        {
          mediaId: exerciseMediaA.id,
          startTimeSeconds: 1.25,
          endTimeSeconds: 4.75,
        },
        actorOwnerOrgA,
      );

      expect(attached.mediaId).toBe(exerciseMediaA.id);
      expect(attached.videoStartTimeSeconds).toBe(1.25);
      expect(attached.videoEndTimeSeconds).toBe(4.75);
      expect(attached.media).toBeDefined();
      expect(attached.media.storageKey).toBe(exerciseMediaA.storageKey);
    });

    it('should reject media attachment if mediaId does not belong to the exercise', async () => {
      await expect(
        movementService.attachPhaseMedia(
          orgA.id,
          customExerciseA.id,
          targetPhase.id,
          { mediaId: 'foreign-media-id-123' },
          actorOwnerOrgA,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('5. Instruction Step Linking to Movement Phases', () => {
    let targetPhase: any;

    beforeAll(async () => {
      const phases = await movementService.getPhases(orgA.id, customExerciseA.id, actorOwnerOrgA);
      targetPhase = phases[0];
    });

    it('should link instruction steps to the specified movement phase', async () => {
      const linked = await movementService.linkPhaseSteps(
        orgA.id,
        customExerciseA.id,
        targetPhase.id,
        { stepIds: [customStepA.id] },
        actorOwnerOrgA,
      );

      expect(linked.instructionSteps).toBeDefined();
      const matching = linked.instructionSteps?.find((s: any) => s.id === customStepA.id);
      expect(matching).toBeDefined();
      expect(matching?.phaseId).toBe(targetPhase.id);
    });

    it('should reject linking steps that do not belong to this exercise', async () => {
      await expect(
        movementService.linkPhaseSteps(
          orgA.id,
          customExerciseA.id,
          targetPhase.id,
          { stepIds: ['non-existent-step-id-999'] },
          actorOwnerOrgA,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('6. Top-Level Exercise Movement Blueprint & Architecture', () => {
    it('should update exercise secondary movement patterns, repetition type, and tempo structure', async () => {
      const updated = await movementService.updateExerciseMovementStructure(
        orgA.id,
        customExerciseA.id,
        {
          secondaryMovementPatterns: ['HINGE', 'ROTATION'],
          repetitionType: 'REPETITION',
          tempoStructure: {
            eccentricSeconds: 3,
            bottomHoldSeconds: 1,
            concentricSeconds: 1,
            topHoldSeconds: 0,
            notes: 'Pause 1s at maximum hamstring stretch',
          },
        },
        actorOwnerOrgA,
      );

      expect(updated.secondaryMovementPatterns).toContain('HINGE');
      expect(updated.secondaryMovementPatterns).toContain('ROTATION');
      expect(updated.repetitionType).toBe('REPETITION');
      expect(updated.tempoStructure).toBeDefined();
      expect((updated.tempoStructure as any)?.eccentricSeconds).toBe(3);
      expect((updated.tempoStructure as any)?.bottomHoldSeconds).toBe(1);
    });

    it('should publish all movement phases for an exercise in one call', async () => {
      const published = await movementService.publishMovementStructure(
        orgA.id,
        customExerciseA.id,
        actorOwnerOrgA,
      );

      expect(published.phases.every((p: any) => p.status === 'PUBLISHED')).toBe(true);
    });
  });

  describe('7. Multi-Tenant Isolation & Immutability Rules', () => {
    it('should forbid tenant owner from modifying system exercise movement phases', async () => {
      await expect(
        movementService.createPhase(
          orgA.id,
          systemSquat.id,
          { phaseName: 'UNAUTHORIZED_PHASE' },
          actorOwnerOrgA,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should forbid Org B from modifying Org A custom exercise movement phases', async () => {
      await expect(
        movementService.createPhase(
          orgB.id,
          customExerciseA.id,
          { phaseName: 'CROSS_TENANT_ATTACK' },
          actorOwnerOrgB,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should forbid Org B from reordering Org A custom exercise movement phases', async () => {
      await expect(
        movementService.reorderPhases(
          orgB.id,
          customExerciseA.id,
          { phaseIds: [] },
          actorOwnerOrgB,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('8. Deletion & Safe Cascading Unlink', () => {
    it('should delete a movement phase and safely unlink referenced instruction steps', async () => {
      // Create a dedicated phase to delete
      const disposablePhase = await movementService.createPhase(
        orgA.id,
        customExerciseA.id,
        { phaseName: 'TEMPORARY_PHASE' },
        actorOwnerOrgA,
      );

      // Link our step to this disposable phase
      await movementService.linkPhaseSteps(
        orgA.id,
        customExerciseA.id,
        disposablePhase.id,
        { stepIds: [customStepA.id] },
        actorOwnerOrgA,
      );

      // Delete the phase
      const result = await movementService.deletePhase(
        orgA.id,
        customExerciseA.id,
        disposablePhase.id,
        actorOwnerOrgA,
      );

      expect(result.success).toBe(true);
      expect(result.deletedPhaseId).toBe(disposablePhase.id);

      // Verify the step still exists and has phaseId set to null
      const step = await prisma.exerciseInstructionStep.findUnique({
        where: { id: customStepA.id },
      });
      expect(step).toBeDefined();
      expect(step?.phaseId).toBeNull();
    });
  });

  describe('9. AI Biomechanics Knowledge Grounding Integration', () => {
    it('should export rich movement phases, joint alignments, and tempo in getExerciseKnowledge', async () => {
      const knowledge = await knowledgeService.getExerciseKnowledge(customExerciseA.id);

      expect(knowledge).toBeDefined();
      expect(knowledge.exerciseId).toBe(customExerciseA.id);
      expect(knowledge.repetitionType).toBe('REPETITION');
      expect(knowledge.tempoStructure).toBeDefined();
      expect(knowledge.tempoStructure?.eccentricSeconds).toBe(3);
      expect(Array.isArray(knowledge.movementPhases)).toBe(true);
      expect(knowledge.movementPhases.length).toBeGreaterThanOrEqual(1);

      const descentPhase = knowledge.movementPhases.find((p) => p.phaseName === 'DESCENT');
      expect(descentPhase).toBeDefined();
      expect(descentPhase?.phaseType).toBe('ECCENTRIC');
      expect(descentPhase?.breathingPattern).toBe('INHALE_DESCENT');
      expect(Array.isArray(descentPhase?.jointAlignments)).toBe(true);
      expect(descentPhase?.jointAlignments.length).toBeGreaterThanOrEqual(1);
    });
  });
});
