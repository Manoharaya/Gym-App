import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ExercisesService } from '../src/exercises/services/exercises.service';
import { ExerciseKnowledgeService } from '../src/exercises/services/exercise-knowledge.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Day 61: Visual Exercise Library Foundation & Biomechanics E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let exercisesService: ExercisesService;
  let knowledgeService: ExerciseKnowledgeService;

  let orgA: any;
  let orgB: any;
  let actorOwnerOrgA: AuthenticatedUser;
  let actorOwnerOrgB: AuthenticatedUser;
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
    if (customExerciseA?.id) {
      await prisma.exercise.deleteMany({ where: { id: customExerciseA.id } });
    }
    await app.close();
  });

  describe('1. Authoritative Visual Content Retrieval (System Exercises)', () => {
    it('should return complete visual exercise model including tempo, ROM, and phases', async () => {
      const visual = await exercisesService.findVisualContent(orgA.id, systemSquat.id);

      expect(visual.id).toBe(systemSquat.id);
      expect(visual.contentStatus).toBe('PUBLISHED');
      expect(visual.tempo).toBe('3-0-1-0');
      expect(visual.rangeOfMotion).toContain('Full depth below parallel');
      expect(visual.breathingInstructions).toBeDefined();

      // Check instruction steps
      expect(visual.instructionSteps.length).toBeGreaterThanOrEqual(4);
      expect(visual.instructionSteps[0].stepNumber).toBe(1);
      expect(visual.instructionSteps[0].title).toBe('Bar Placement & Unrack');
      expect(visual.instructionSteps[0].coachingCue).toBeDefined();

      // Check movement phases
      expect(visual.movementPhases.length).toBeGreaterThanOrEqual(5);
      expect(visual.movementPhases[0].phaseName).toBe('SETUP');
      expect(visual.movementPhases[1].phaseName).toBe('DESCENT');
      expect(visual.movementPhases[2].phaseName).toBe('BOTTOM');
      expect(visual.movementPhases[0].keyCheckpoints).toBeDefined();

      // Check common mistakes
      expect(visual.commonMistakes.length).toBeGreaterThanOrEqual(3);
      const valgus = visual.commonMistakes.find((m) => m.mistake.includes('Valgus'));
      expect(valgus).toBeDefined();
      expect(valgus?.severity).toBe('SEVERE');
      expect(valgus?.correction).toBeDefined();

      // Check safety guidelines
      expect(visual.safetyGuidelines.length).toBeGreaterThanOrEqual(2);
      const safetyPin = visual.safetyGuidelines.find((g) => g.title === 'Safety Pin Verification');
      expect(safetyPin).toBeDefined();
      expect(safetyPin?.severity).toBe('CRITICAL');
      expect(safetyPin?.reviewedBy).toBe('Coach Marcus Vance, CSCS');

      // Check variations and equipment relations
      expect(visual.variationsFrom.length).toBeGreaterThanOrEqual(2);
      expect(visual.equipmentRelations.length).toBeGreaterThanOrEqual(3);
    });

    it('should return step-by-step instructions via getInstructionSteps', async () => {
      const result = await exercisesService.getInstructionSteps(orgA.id, systemSquat.id);
      expect(result.exerciseId).toBe(systemSquat.id);
      expect(result.instructionSteps.length).toBeGreaterThanOrEqual(4);
      expect(result.movementPhases.length).toBeGreaterThanOrEqual(5);
    });

    it('should return variations and equipment relations via getRelationships', async () => {
      const result = await exercisesService.getRelationships(orgA.id, systemSquat.id);
      expect(result.exerciseId).toBe(systemSquat.id);
      expect(result.variations.length).toBeGreaterThanOrEqual(2);
      expect(result.equipment.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('2. Visual Filtering & Taxonomy Querying', () => {
    it('should filter exercises by contentStatus', async () => {
      const res = await exercisesService.findAll(orgA.id, {
        contentStatus: 'PUBLISHED',
      });
      expect(res.items.length).toBeGreaterThan(0);
      expect(res.items.every((e) => e.contentStatus === 'PUBLISHED')).toBe(true);
    });

    it('should support pagination and search term querying', async () => {
      const res = await exercisesService.findAll(orgA.id, {
        search: 'Squat',
        page: 1,
        limit: 5,
      });
      expect(res.items.length).toBeGreaterThanOrEqual(1);
      expect(res.meta.page).toBe(1);
      expect(res.meta.limit).toBe(5);
    });
  });

  describe('3. Custom Organisation Visual Exercise Lifecycle', () => {
    it('should create custom exercise with rich biomechanical parameters', async () => {
      customExerciseA = await exercisesService.create(
        orgA.id,
        {
          name: 'Second Wind Trap Bar Jump Shrug',
          description: 'Explosive triple extension shrug performed on the high-performance turf.',
          difficulty: 'ADVANCED',
          exerciseType: 'PLYOMETRIC',
          movementPattern: 'JUMP',
          primaryMuscleGroup: 'FULL_BODY',
          secondaryMuscleGroups: ['GLUTES', 'CALVES', 'SHOULDERS'],
          equipmentType: 'BARBELL',
          tempo: 'X-0-X-0',
          rangeOfMotion: 'Explosive triple extension through hips, knees, ankles',
          breathingInstructions: 'Inhale on brace, explosive exhale on jump',
          stabilizerMuscles: ['CORE'],
          educationalTips: ['Focus on maximal vertical displacement without knee collapse.'],
          contentStatus: 'DRAFT',
        },
        actorOwnerOrgA,
      );

      expect(customExerciseA.id).toBeDefined();
      expect(customExerciseA.tempo).toBe('X-0-X-0');
      expect(customExerciseA.contentStatus).toBe('DRAFT');
    });

    it('should add instruction steps to custom exercise', async () => {
      const step = await exercisesService.addInstructionStep(
        orgA.id,
        customExerciseA.id,
        {
          stepNumber: 1,
          phase: 'SETUP',
          title: 'Stance and Grip',
          description: 'Step into trap bar, set feet under hips, grip handles firmly with arms long.',
          coachingCue: 'Long arms, tall spine',
        },
        actorOwnerOrgA,
      );

      expect(step.id).toBeDefined();
      expect(step.title).toBe('Stance and Grip');
      expect(step.phase).toBe('SETUP');
    });

    it('should add movement phases to custom exercise', async () => {
      const phase = await exercisesService.addMovementPhase(
        orgA.id,
        customExerciseA.id,
        {
          phaseName: 'TRIPLE_EXTENSION',
          orderIndex: 0,
          cueText: 'Explode through the balls of feet',
          keyCheckpoints: ['Ankles plantarflexed', 'Knees extended', 'Hips locked forward'],
        },
        actorOwnerOrgA,
      );

      expect(phase.id).toBeDefined();
      expect(phase.phaseName).toBe('TRIPLE_EXTENSION');
    });

    it('should add common mistakes to custom exercise', async () => {
      const mistake = await exercisesService.addCommonMistake(
        orgA.id,
        customExerciseA.id,
        {
          mistake: 'Bending elbows early before hip drive',
          consequence: 'Diverts explosive power into biceps instead of hips.',
          correction: 'Keep elbows straight; let hip velocity launch the bar.',
          severity: 'MODERATE',
        },
        actorOwnerOrgA,
      );

      expect(mistake.id).toBeDefined();
      expect(mistake.severity).toBe('MODERATE');
    });

    it('should add safety guidelines to custom exercise', async () => {
      const guideline = await exercisesService.addSafetyGuideline(
        orgA.id,
        customExerciseA.id,
        {
          category: 'EQUIPMENT_WARNING',
          title: 'Weight Collar Check',
          description: 'Ensure spring or lock-jaw collars are securely clamped before plyometric jumps.',
          severity: 'HIGH',
          reviewedBy: 'Head Strength Coach',
        },
        actorOwnerOrgA,
      );

      expect(guideline.id).toBeDefined();
      expect(guideline.severity).toBe('HIGH');
    });

    it('should update content status to PUBLISHED', async () => {
      const updated = await exercisesService.updateContentStatus(
        orgA.id,
        customExerciseA.id,
        'PUBLISHED',
        actorOwnerOrgA,
      );

      expect(updated.contentStatus).toBe('PUBLISHED');
    });

    it('should attach variation relation to an existing system exercise', async () => {
      const variation = await exercisesService.addVariation(
        orgA.id,
        customExerciseA.id,
        {
          targetExerciseId: systemSquat.id,
          relationshipType: 'PROGRESSION',
          notes: 'Advanced explosive power progression following standard squat strength foundation.',
        },
        actorOwnerOrgA,
      );

      expect(variation.baseExerciseId).toBe(customExerciseA.id);
      expect(variation.targetExerciseId).toBe(systemSquat.id);
      expect(variation.relationshipType).toBe('PROGRESSION');
    });
  });

  describe('4. Zero-Trust Security & Tenant Isolation', () => {
    it('should strictly reject modifications to system exercises (ForbiddenException)', async () => {
      await expect(
        exercisesService.addInstructionStep(
          orgA.id,
          systemSquat.id,
          {
            stepNumber: 99,
            title: 'Unauthorized step',
            description: 'Should fail',
          },
          actorOwnerOrgA,
        ),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        exercisesService.updateContentStatus(
          orgA.id,
          systemSquat.id,
          'ARCHIVED',
          actorOwnerOrgA,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent cross-tenant mutations to custom exercises (NotFoundException)', async () => {
      await expect(
        exercisesService.addInstructionStep(
          orgB.id,
          customExerciseA.id,
          {
            stepNumber: 99,
            title: 'Cross tenant attack',
            description: 'Should fail',
          },
          actorOwnerOrgB,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('5. AI Exercise Knowledge Service (Grounding & Safety)', () => {
    it('should return structured, verified biomechanical intelligence for AI tools', async () => {
      const knowledge = await knowledgeService.getExerciseKnowledge(systemSquat.id);

      expect(knowledge.exerciseId).toBe(systemSquat.id);
      expect(knowledge.name).toBe('Barbell Back Squat');
      expect(knowledge.tempo).toBe('3-0-1-0');
      expect(knowledge.rangeOfMotion).toBeDefined();
      expect(knowledge.instructionSteps.length).toBeGreaterThan(0);
      expect(knowledge.movementPhases.length).toBeGreaterThan(0);
      expect(knowledge.commonMistakes.length).toBeGreaterThan(0);
      expect(knowledge.safetyGuidelines.length).toBeGreaterThan(0);
      expect(knowledge.variations.length).toBeGreaterThan(0);
    });

    it('should search knowledge by biomechanical movement pattern', async () => {
      const results = await knowledgeService.searchKnowledgeByBiomechanics({
        movementPattern: 'SQUAT',
        difficulty: 'INTERMEDIATE',
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((e) => e.slug === 'barbell-back-squat')).toBe(true);
    });
  });
});
