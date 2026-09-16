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
import { ExerciseMetadataService } from '../src/exercises/services/exercise-metadata.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Day 65: Muscles, Equipment & Exercise Metadata Intelligence E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let exercisesService: ExercisesService;
  let metadataService: ExerciseMetadataService;

  let orgA: any;
  let orgB: any;
  let actorOwnerOrgA: AuthenticatedUser;
  let actorOwnerOrgB: AuthenticatedUser;
  let customExerciseA: any;
  let customExerciseA2: any;

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
    metadataService = app.get(ExerciseMetadataService);

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

    // Create primary custom exercise in Org A
    customExerciseA = await exercisesService.create(
      orgA.id,
      {
        name: `Day 65 Incline Dumbbell Press ${Date.now()}`,
        difficulty: 'INTERMEDIATE',
        exerciseType: 'STRENGTH',
        movementPattern: 'PUSH',
        primaryMuscleGroup: 'CHEST',
        equipmentType: 'DUMBBELL',
        description: 'Upper chest pressing movement for Day 65 metadata testing',
      },
      actorOwnerOrgA,
    );

    // Create candidate substitute custom exercise in Org A
    customExerciseA2 = await exercisesService.create(
      orgA.id,
      {
        name: `Day 65 Push Up Substitute ${Date.now()}`,
        difficulty: 'BEGINNER',
        exerciseType: 'STRENGTH',
        movementPattern: 'PUSH',
        primaryMuscleGroup: 'CHEST',
        equipmentType: 'BODYWEIGHT',
        description: 'Bodyweight substitute matching Day 65 chest push pattern',
      },
      actorOwnerOrgA,
    );
  });

  afterAll(async () => {
    if (customExerciseA?.id) {
      await prisma.exercise.delete({ where: { id: customExerciseA.id } }).catch(() => null);
    }
    if (customExerciseA2?.id) {
      await prisma.exercise.delete({ where: { id: customExerciseA2.id } }).catch(() => null);
    }
    await app.close();
  });

  describe('1. Taxonomy Management & Seeding', () => {
    it('should retrieve active system fallback taxonomies', async () => {
      const taxonomy = await metadataService.getTaxonomy(orgA.id, { type: 'MUSCLE' });
      expect(Array.isArray(taxonomy)).toBe(true);
      expect(taxonomy.length).toBeGreaterThan(0);
      const chestItem = taxonomy.find((t) => t.code === 'CHEST');
      expect(chestItem).toBeDefined();
      expect(chestItem?.name).toBe('Chest (Pectorals)');
      expect(chestItem?.group).toBe('UPPER_BODY');
    });

    it('should create a custom organisation taxonomy item', async () => {
      const customItem = await metadataService.createTaxonomyItem(
        orgA.id,
        {
          type: 'EQUIPMENT',
          code: `SAFETY_SQUAT_BAR_${Date.now()}`,
          name: 'Safety Squat Bar (SSB)',
          group: 'FREE_WEIGHTS',
          description: 'Specialty cambered barbell for spinal loading relief',
        },
        actorOwnerOrgA,
      );

      expect(customItem).toBeDefined();
      expect(customItem.organisationId).toBe(orgA.id);
      expect(customItem.status).toBe('ACTIVE');

      // Update custom taxonomy item
      const updated = await metadataService.updateTaxonomyItem(
        orgA.id,
        customItem.id,
        { name: 'Safety Squat Bar (SSB) - Cambered' },
        actorOwnerOrgA,
      );
      expect(updated.name).toBe('Safety Squat Bar (SSB) - Cambered');

      // Archive custom taxonomy item
      const archived = await metadataService.archiveTaxonomyItem(orgA.id, customItem.id, actorOwnerOrgA);
      expect(archived.status).toBe('ARCHIVED');
    });

    it('should forbid tenants from modifying or deleting global system taxonomies', async () => {
      const systemTaxonomies = await metadataService.getTaxonomy(orgA.id, { type: 'MUSCLE' });
      const systemItem = systemTaxonomies.find((t) => t.organisationId === null);
      if (systemItem) {
        await expect(
          metadataService.updateTaxonomyItem(orgA.id, systemItem.id, { name: 'Hacked Muscle' }, actorOwnerOrgA),
        ).rejects.toThrow(ForbiddenException);

        await expect(
          metadataService.archiveTaxonomyItem(orgA.id, systemItem.id, actorOwnerOrgA),
        ).rejects.toThrow(ForbiddenException);
      }
    });
  });

  describe('2. Exercise Muscle Relations Management', () => {
    let primaryChestRelationId: string;

    it('should add primary, secondary, and stabilizer muscle relations', async () => {
      // Add Primary Chest
      const primaryRelation = await metadataService.addMuscleRelation(
        orgA.id,
        customExerciseA.id,
        {
          muscle: 'CHEST',
          muscleGroup: 'UPPER_BODY',
          role: 'PRIMARY',
          activationLevel: 'HIGH',
          notes: 'Upper clavicular head emphasis',
        },
        actorOwnerOrgA,
      );
      expect(primaryRelation).toBeDefined();
      expect(primaryRelation.muscle).toBe('CHEST');
      expect(primaryRelation.role).toBe('PRIMARY');
      expect(primaryRelation.activationLevel).toBe('HIGH');
      primaryChestRelationId = primaryRelation.id;

      // Add Secondary Triceps
      const secondaryRelation = await metadataService.addMuscleRelation(
        orgA.id,
        customExerciseA.id,
        {
          muscle: 'TRICEPS',
          muscleGroup: 'UPPER_BODY',
          role: 'SECONDARY',
          activationLevel: 'MODERATE',
        },
        actorOwnerOrgA,
      );
      expect(secondaryRelation.role).toBe('SECONDARY');

      // Add Stabilizer Core
      const stabilizerRelation = await metadataService.addMuscleRelation(
        orgA.id,
        customExerciseA.id,
        {
          muscle: 'CORE',
          muscleGroup: 'CORE',
          role: 'STABILIZER',
          activationLevel: 'LOW',
        },
        actorOwnerOrgA,
      );
      expect(stabilizerRelation.role).toBe('STABILIZER');
    });

    it('should idempotently update muscle relation without creating duplicates for the same exercise, muscle, and role', async () => {
      const updated = await metadataService.addMuscleRelation(
        orgA.id,
        customExerciseA.id,
        {
          muscle: 'CHEST',
          muscleGroup: 'UPPER_BODY',
          role: 'PRIMARY',
          activationLevel: 'HIGH',
          notes: 'Upper clavicular head emphasis - updated',
        },
        actorOwnerOrgA,
      );
      expect(updated.id).toBe(primaryChestRelationId);
      expect(updated.notes).toBe('Upper clavicular head emphasis - updated');
      const musclesData = await metadataService.getExerciseMuscles(orgA.id, customExerciseA.id);
      expect(musclesData.primary.length).toBe(1);
    });

    it('should retrieve structured muscle taxonomy for an exercise', async () => {
      const musclesData = await metadataService.getExerciseMuscles(orgA.id, customExerciseA.id);
      expect(musclesData).toBeDefined();
      expect(musclesData.primary.length).toBeGreaterThanOrEqual(1);
      expect(musclesData.secondary.length).toBeGreaterThanOrEqual(1);
      expect(musclesData.stabilizers.length).toBeGreaterThanOrEqual(1);
      expect(musclesData.primary[0].muscle).toBe('CHEST');
    });

    it('should batch set muscles replacing existing relations atomically', async () => {
      const batchResult = await metadataService.batchSetMuscles(
        orgA.id,
        customExerciseA.id,
        {
          muscles: [
            { muscle: 'CHEST', muscleGroup: 'UPPER_BODY', role: 'PRIMARY', activationLevel: 'HIGH' },
            { muscle: 'SHOULDERS', muscleGroup: 'UPPER_BODY', role: 'SECONDARY', activationLevel: 'HIGH' },
            { muscle: 'TRICEPS', muscleGroup: 'UPPER_BODY', role: 'SECONDARY', activationLevel: 'MODERATE' },
          ],
        },
        actorOwnerOrgA,
      );

      expect(batchResult.all.length).toBe(3);
      const musclesData = await metadataService.getExerciseMuscles(orgA.id, customExerciseA.id);
      expect(musclesData.primary.length).toBe(1);
      expect(musclesData.secondary.length).toBe(2);
      expect(musclesData.stabilizers.length).toBe(0);
    });

    it('should remove a structured muscle relation', async () => {
      const musclesData = await metadataService.getExerciseMuscles(orgA.id, customExerciseA.id);
      const targetRelation = musclesData.secondary[0];

      await metadataService.removeMuscleRelation(orgA.id, targetRelation.id, actorOwnerOrgA);

      const afterRemove = await metadataService.getExerciseMuscles(orgA.id, customExerciseA.id);
      expect(afterRemove.secondary.length).toBe(1);
    });
  });

  describe('3. Exercise Equipment Relations Management', () => {
    let eqRelationId: string;

    it('should add an extended equipment relation with requirement and contexts', async () => {
      const eqRelation = await metadataService.addEquipmentRelation(
        orgA.id,
        customExerciseA.id,
        {
          equipmentName: 'Dumbbells',
          requirementType: 'REQUIRED',
          equipmentCategory: 'FREE_WEIGHTS',
          alternatives: ['Kettlebells', 'Resistance Bands'],
          availabilityContexts: ['GYM', 'HOME'],
          isOptional: false,
          notes: 'Pair of matching dumbbells required for bilateral load',
        },
        actorOwnerOrgA,
      );

      expect(eqRelation).toBeDefined();
      expect(eqRelation.equipmentName).toBe('Dumbbells');
      expect(eqRelation.requirementType).toBe('REQUIRED');
      expect(eqRelation.equipmentCategory).toBe('FREE_WEIGHTS');
      eqRelationId = eqRelation.id;
    });

    it('should update an equipment relation', async () => {
      const updated = await metadataService.updateEquipmentRelation(
        orgA.id,
        eqRelationId,
        {
          requirementType: 'OPTIONAL',
          isOptional: true,
          notes: 'Can also be performed with single arm dumbbell',
        },
        actorOwnerOrgA,
      );

      expect(updated.requirementType).toBe('OPTIONAL');
      expect(updated.isOptional).toBe(true);
    });

    it('should remove an equipment relation', async () => {
      await metadataService.removeEquipmentRelation(orgA.id, eqRelationId, actorOwnerOrgA);
      const exercise = await prisma.exercise.findUnique({
        where: { id: customExerciseA.id },
        include: { equipmentRelations: true },
      });
      expect(exercise?.equipmentRelations.some((e) => e.id === eqRelationId)).toBe(false);
    });
  });

  describe('4. Exercise Classification & Metadata Intelligence', () => {
    it('should update comprehensive exercise classification', async () => {
      const updatedExercise = await metadataService.updateClassification(
        orgA.id,
        customExerciseA.id,
        {
          exerciseCategory: 'STRENGTH',
          exerciseMechanics: 'COMPOUND',
          equipmentRequirement: 'REQUIRED',
          availableEnvironments: ['GYM', 'HOME'],
          trainingGoals: ['STRENGTH', 'MUSCLE_BUILDING'],
          tags: ['Upper Chest', 'Hypertrophy', 'Dumbbells'],
        },
        actorOwnerOrgA,
      );

      expect(updatedExercise.exerciseCategory).toBe('STRENGTH');
      expect(updatedExercise.exerciseMechanics).toBe('COMPOUND');
      expect(updatedExercise.equipmentRequirement).toBe('REQUIRED');
      expect(updatedExercise.trainingGoals).toEqual(expect.arrayContaining(['STRENGTH', 'MUSCLE_BUILDING']));
    });
  });

  describe('5. Metadata Quality & Completeness Auditing', () => {
    it('should compute completeness percentage and breakdown correctly', async () => {
      // Ensure candidate has at least 1 muscle relation and equipment relation
      await metadataService.addMuscleRelation(
        orgA.id,
        customExerciseA.id,
        { muscle: 'CHEST', muscleGroup: 'UPPER_BODY', role: 'PRIMARY' },
        actorOwnerOrgA,
      ).catch(() => null);

      await metadataService.addEquipmentRelation(
        orgA.id,
        customExerciseA.id,
        { equipmentName: 'Dumbbells', requirementType: 'REQUIRED', equipmentCategory: 'FREE_WEIGHTS' },
        actorOwnerOrgA,
      );

      const completeness = await metadataService.getCompleteness(orgA.id, customExerciseA.id);
      expect(completeness).toBeDefined();
      expect(typeof completeness.overallPercentage).toBe('number');
      expect(completeness.overallPercentage).toBeGreaterThan(0);
      expect(completeness.scoreBreakdown).toBeDefined();
      expect(completeness.scoreBreakdown.primaryMuscle).toBe(true);
      expect(completeness.scoreBreakdown.equipment).toBe(true);
      expect(completeness.scoreBreakdown.movementPattern).toBe(true);
      expect(completeness.scoreBreakdown.exerciseCategory).toBe(true);
      expect(completeness.scoreBreakdown.exerciseMechanics).toBe(true);
      expect(completeness.scoreBreakdown.trainingGoals).toBe(true);
    });
  });

  describe('6. Exercise Substitution Engine', () => {
    beforeAll(async () => {
      // Setup candidate substitute A2 with matching chest muscle and bodyweight equipment
      await metadataService.addMuscleRelation(
        orgA.id,
        customExerciseA2.id,
        { muscle: 'CHEST', muscleGroup: 'UPPER_BODY', role: 'PRIMARY' },
        actorOwnerOrgA,
      );
      await metadataService.addEquipmentRelation(
        orgA.id,
        customExerciseA2.id,
        { equipmentName: 'No Equipment', requirementType: 'NONE', equipmentCategory: 'BODYWEIGHT' },
        actorOwnerOrgA,
      );
      await metadataService.updateClassification(
        orgA.id,
        customExerciseA2.id,
        {
          exerciseCategory: 'STRENGTH',
          exerciseMechanics: 'COMPOUND',
          equipmentRequirement: 'NONE',
          availableEnvironments: ['HOME', 'GYM', 'OUTDOOR'],
        },
        actorOwnerOrgA,
      );
    });

    it('should find exercise substitutes matching primary muscle and movement pattern', async () => {
      const substitutes = await metadataService.getSubstitutes(orgA.id, customExerciseA.id);
      expect(Array.isArray(substitutes)).toBe(true);
      expect(substitutes.length).toBeGreaterThan(0);
      const foundCandidate = substitutes.find((s) => s.exercise?.id === customExerciseA2.id);
      expect(foundCandidate).toBeDefined();
    });

    it('should filter substitutes based on available equipment', async () => {
      const substitutesNoEquip = await metadataService.getSubstitutes(orgA.id, customExerciseA.id, ['BODYWEIGHT']);
      expect(Array.isArray(substitutesNoEquip)).toBe(true);
      const foundBodyweight = substitutesNoEquip.find((s) => s.exercise?.id === customExerciseA2.id);
      expect(foundBodyweight).toBeDefined();
    });
  });

  describe('7. Zero-Trust Multi-Tenancy & IDOR Security', () => {
    it('should forbid Org B from modifying Org A exercise muscle relations', async () => {
      await expect(
        metadataService.addMuscleRelation(
          orgB.id,
          customExerciseA.id,
          { muscle: 'BICEPS', muscleGroup: 'UPPER_BODY', role: 'SECONDARY' },
          actorOwnerOrgB,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should forbid Org B from updating Org A exercise classification', async () => {
      await expect(
        metadataService.updateClassification(
          orgB.id,
          customExerciseA.id,
          { exerciseCategory: 'CARDIO' },
          actorOwnerOrgB,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should forbid Org B from adding equipment relations to Org A exercise', async () => {
      await expect(
        metadataService.addEquipmentRelation(
          orgB.id,
          customExerciseA.id,
          { equipmentName: 'Barbell', requirementType: 'REQUIRED' },
          actorOwnerOrgB,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
