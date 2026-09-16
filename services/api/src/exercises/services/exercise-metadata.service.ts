import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import type { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import type {
  ExerciseMuscleRelation,
  ExerciseEquipmentRelation,
  ExerciseMetadataItem,
  ExerciseMetadataCompleteness,
  VariationRelationshipType,
} from '@fitcore/types';
import {
  AddExerciseMuscleRelationDto,
  UpdateExerciseMuscleRelationDto,
  BatchSetExerciseMusclesDto,
  AddExerciseEquipmentRelationExtendedDto,
  UpdateExerciseEquipmentRelationExtendedDto,
  CreateExerciseMetadataItemDto,
  UpdateExerciseMetadataItemDto,
  ExerciseTaxonomyQueryDto,
  UpdateExerciseClassificationDto,
} from '../dto/exercise-metadata.dto';

// Standard fitness-oriented taxonomy fallback seeds
const DEFAULT_SYSTEM_TAXONOMIES: Array<{
  type: string;
  code: string;
  name: string;
  group?: string;
  description?: string;
}> = [
  // Upper Body Muscles
  { type: 'MUSCLE', code: 'CHEST', name: 'Chest (Pectorals)', group: 'UPPER_BODY' },
  { type: 'MUSCLE', code: 'UPPER_BACK', name: 'Upper Back (Rhomboids)', group: 'UPPER_BODY' },
  { type: 'MUSCLE', code: 'LATS', name: 'Lats (Latissimus Dorsi)', group: 'UPPER_BODY' },
  { type: 'MUSCLE', code: 'TRAPS', name: 'Traps (Trapezius)', group: 'UPPER_BODY' },
  { type: 'MUSCLE', code: 'SHOULDERS', name: 'Shoulders (Deltoids)', group: 'UPPER_BODY' },
  { type: 'MUSCLE', code: 'BICEPS', name: 'Biceps Brachii', group: 'UPPER_BODY' },
  { type: 'MUSCLE', code: 'TRICEPS', name: 'Triceps Brachii', group: 'UPPER_BODY' },
  { type: 'MUSCLE', code: 'FOREARMS', name: 'Forearms (Brachioradialis)', group: 'UPPER_BODY' },

  // Core Muscles
  { type: 'MUSCLE', code: 'ABDOMINALS', name: 'Abdominals (Rectus Abdominis)', group: 'CORE' },
  { type: 'MUSCLE', code: 'OBLIQUES', name: 'Obliques', group: 'CORE' },
  { type: 'MUSCLE', code: 'LOWER_BACK', name: 'Lower Back (Erector Spinae)', group: 'CORE' },

  // Lower Body Muscles
  { type: 'MUSCLE', code: 'GLUTES', name: 'Glutes (Gluteus Maximus / Medius)', group: 'LOWER_BODY' },
  { type: 'MUSCLE', code: 'QUADRICEPS', name: 'Quadriceps', group: 'LOWER_BODY' },
  { type: 'MUSCLE', code: 'HAMSTRINGS', name: 'Hamstrings', group: 'LOWER_BODY' },
  { type: 'MUSCLE', code: 'CALVES', name: 'Calves (Gastrocnemius & Soleus)', group: 'LOWER_BODY' },
  { type: 'MUSCLE', code: 'HIP_FLEXORS', name: 'Hip Flexors (Psoas)', group: 'LOWER_BODY' },
  { type: 'MUSCLE', code: 'ADDUCTORS', name: 'Adductors (Inner Thigh)', group: 'LOWER_BODY' },
  { type: 'MUSCLE', code: 'ABDUCTORS', name: 'Abductors (Outer Hip)', group: 'LOWER_BODY' },

  // Equipment Taxonomy
  { type: 'EQUIPMENT', code: 'DUMBBELL', name: 'Dumbbells', group: 'FREE_WEIGHTS' },
  { type: 'EQUIPMENT', code: 'BARBELL', name: 'Olympic Barbell', group: 'FREE_WEIGHTS' },
  { type: 'EQUIPMENT', code: 'KETTLEBELL', name: 'Kettlebell', group: 'FREE_WEIGHTS' },
  { type: 'EQUIPMENT', code: 'WEIGHT_PLATE', name: 'Weight Plates', group: 'FREE_WEIGHTS' },
  { type: 'EQUIPMENT', code: 'BENCH', name: 'Workout Bench (Flat/Adjustable)', group: 'BENCHES_SUPPORTS' },
  { type: 'EQUIPMENT', code: 'CABLE_MACHINE', name: 'Cable Machine / Pulleys', group: 'MACHINES' },
  { type: 'EQUIPMENT', code: 'LEG_PRESS', name: 'Leg Press Machine', group: 'MACHINES' },
  { type: 'EQUIPMENT', code: 'LAT_PULLDOWN', name: 'Lat Pulldown Machine', group: 'MACHINES' },
  { type: 'EQUIPMENT', code: 'PULLUP_BAR', name: 'Pull-Up Bar', group: 'BODYWEIGHT' },
  { type: 'EQUIPMENT', code: 'PARALLEL_BARS', name: 'Parallel Dip Bars', group: 'BODYWEIGHT' },
  { type: 'EQUIPMENT', code: 'NO_EQUIPMENT', name: 'No Equipment / Bodyweight', group: 'BODYWEIGHT' },
  { type: 'EQUIPMENT', code: 'RESISTANCE_BAND', name: 'Resistance Bands', group: 'ACCESSORIES' },
  { type: 'EQUIPMENT', code: 'YOGA_MAT', name: 'Exercise / Yoga Mat', group: 'ACCESSORIES' },

  // Categories
  { type: 'CATEGORY', code: 'STRENGTH', name: 'Strength Training', group: 'FITNESS' },
  { type: 'CATEGORY', code: 'CARDIO', name: 'Cardiovascular Conditioning', group: 'FITNESS' },
  { type: 'CATEGORY', code: 'MOBILITY', name: 'Mobility & Range of Motion', group: 'WELLNESS' },
  { type: 'CATEGORY', code: 'FLEXIBILITY', name: 'Flexibility & Stretching', group: 'WELLNESS' },
  { type: 'CATEGORY', code: 'CORE', name: 'Core Stability & Strength', group: 'FITNESS' },
  { type: 'CATEGORY', code: 'RECOVERY', name: 'Active Recovery', group: 'WELLNESS' },

  // Training Goals
  { type: 'GOAL', code: 'STRENGTH', name: 'Absolute Strength', group: 'PERFORMANCE' },
  { type: 'GOAL', code: 'MUSCLE_BUILDING', name: 'Muscle Hypertrophy', group: 'AESTHETICS' },
  { type: 'GOAL', code: 'ENDURANCE', name: 'Muscular Endurance', group: 'PERFORMANCE' },
  { type: 'GOAL', code: 'FAT_LOSS', name: 'Fat Loss & Conditioning', group: 'FITNESS' },
  { type: 'GOAL', code: 'MOBILITY', name: 'Joint Mobility & Longevity', group: 'WELLNESS' },
  { type: 'GOAL', code: 'GENERAL_FITNESS', name: 'General Health & Fitness', group: 'LIFESTYLE' },
];

@Injectable()
export class ExerciseMetadataService {
  private readonly logger = new Logger(ExerciseMetadataService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // =========================================================================
  // 1. TAXONOMY MANAGEMENT
  // =========================================================================

  /**
   * Get taxonomy items merging active System items and Organisation custom items.
   */
  async getTaxonomy(organisationId?: string, query?: ExerciseTaxonomyQueryDto) {
    const whereCondition: any = {
      OR: [
        { organisationId: null },
        ...(organisationId ? [{ organisationId }] : []),
      ],
    };

    if (query?.type) {
      whereCondition.type = query.type;
    }

    if (!query?.includeArchived) {
      whereCondition.status = 'ACTIVE';
    }

    let items = await this.prisma.exerciseMetadataItem.findMany({
      where: whereCondition,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    // If database has no items for this type yet, seed fallback system taxonomies
    if (items.length === 0 && (!query?.type || query.type)) {
      const filteredDefaults = query?.type
        ? DEFAULT_SYSTEM_TAXONOMIES.filter((t) => t.type === query.type)
        : DEFAULT_SYSTEM_TAXONOMIES;

      if (filteredDefaults.length > 0) {
        try {
          for (const item of filteredDefaults) {
            const existing = await this.prisma.exerciseMetadataItem.findFirst({
              where: {
                organisationId: null,
                type: item.type,
                code: item.code,
              },
            });
            if (!existing) {
              await this.prisma.exerciseMetadataItem.create({
                data: {
                  organisationId: null,
                  type: item.type,
                  code: item.code,
                  name: item.name,
                  group: item.group,
                  status: 'ACTIVE',
                },
              });
            }
          }

          items = await this.prisma.exerciseMetadataItem.findMany({
            where: whereCondition,
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          });
        } catch (seedErr) {
          this.logger.debug(`Taxonomy auto-seed note: ${seedErr.message}`);
        }
      }
    }

    return items;
  }

  /**
   * Create custom tenant taxonomy item (Admins only).
   * Prevents creating or overriding system-level items directly.
   */
  async createTaxonomyItem(
    organisationId: string,
    dto: CreateExerciseMetadataItemDto,
    actor: AuthenticatedUser,
  ) {
    if (!organisationId) {
      throw new BadRequestException('Organisation context required for taxonomy creation');
    }

    const code = dto.code.trim().toUpperCase().replace(/\s+/g, '_');

    const item = await this.prisma.exerciseMetadataItem.create({
      data: {
        organisationId,
        type: dto.type,
        code,
        name: dto.name,
        group: dto.group,
        description: dto.description,
        icon: dto.icon,
        sortOrder: dto.sortOrder ?? 0,
        status: 'ACTIVE',
        metadata: dto.metadata,
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'TAXONOMY_ITEM_CREATED',
      resource: 'exercise_metadata_items',
      resourceId: item.id,
      metadata: { type: item.type, code: item.code, name: item.name },
    });

    return item;
  }

  /**
   * Update custom tenant taxonomy item.
   * System items cannot be modified by tenants.
   */
  async updateTaxonomyItem(
    organisationId: string,
    id: string,
    dto: UpdateExerciseMetadataItemDto,
    actor: AuthenticatedUser,
  ) {
    const existing = await this.prisma.exerciseMetadataItem.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Taxonomy item '${id}' not found`);
    }

    if (existing.organisationId === null) {
      throw new ForbiddenException({
        code: 'SYSTEM_TAXONOMY_IMMUTABLE',
        message: 'System global taxonomy items cannot be modified by organisations',
      });
    }

    if (existing.organisationId !== organisationId) {
      throw new NotFoundException(`Taxonomy item '${id}' not found in organisation`);
    }

    const updated = await this.prisma.exerciseMetadataItem.update({
      where: { id },
      data: {
        name: dto.name,
        group: dto.group,
        description: dto.description,
        icon: dto.icon,
        sortOrder: dto.sortOrder,
        status: dto.status,
        metadata: dto.metadata,
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'TAXONOMY_ITEM_UPDATED',
      resource: 'exercise_metadata_items',
      resourceId: id,
      metadata: { updates: dto },
    });

    return updated;
  }

  /**
   * Soft-archive custom taxonomy item.
   * Ensures existing exercise references do not break.
   */
  async archiveTaxonomyItem(organisationId: string, id: string, actor: AuthenticatedUser) {
    const existing = await this.prisma.exerciseMetadataItem.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Taxonomy item '${id}' not found`);
    }

    if (existing.organisationId === null) {
      throw new ForbiddenException({
        code: 'SYSTEM_TAXONOMY_IMMUTABLE',
        message: 'System global taxonomy items cannot be archived by organisations',
      });
    }

    if (existing.organisationId !== organisationId) {
      throw new NotFoundException(`Taxonomy item '${id}' not found in organisation`);
    }

    const archived = await this.prisma.exerciseMetadataItem.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'TAXONOMY_ITEM_ARCHIVED',
      resource: 'exercise_metadata_items',
      resourceId: id,
    });

    return archived;
  }

  // =========================================================================
  // 2. EXERCISE MUSCLE RELATIONS
  // =========================================================================

  /**
   * Add or update an individual muscle relation for an exercise.
   */
  async addMuscleRelation(
    organisationId: string,
    exerciseId: string,
    dto: AddExerciseMuscleRelationDto,
    actor: AuthenticatedUser,
  ) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found`);
    }
    this.ensureCanModify(exercise, organisationId);

    const muscleCode = dto.muscle.trim().toUpperCase().replace(/\s+/g, '_');

    const relation = await this.prisma.exerciseMuscleRelation.upsert({
      where: {
        exerciseId_muscle_role: {
          exerciseId,
          muscle: muscleCode,
          role: dto.role,
        },
      },
      update: {
        muscleGroup: dto.muscleGroup,
        activationLevel: dto.activationLevel ?? 'HIGH',
        notes: dto.notes,
      },
      create: {
        exerciseId,
        muscle: muscleCode,
        muscleGroup: dto.muscleGroup,
        role: dto.role,
        activationLevel: dto.activationLevel ?? 'HIGH',
        notes: dto.notes,
      },
    });

    // Synchronize legacy primaryMuscleGroup and secondaryMuscleGroups if needed
    if (dto.role === 'PRIMARY') {
      await this.prisma.exercise.update({
        where: { id: exerciseId },
        data: { primaryMuscleGroup: muscleCode as any },
      });
    }

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'EXERCISE_MUSCLE_ADDED',
      resource: 'exercises',
      resourceId: exerciseId,
      metadata: { muscle: muscleCode, role: dto.role, activationLevel: dto.activationLevel },
    });

    return relation;
  }

  /**
   * Batch set all muscles for an exercise (atomic transaction).
   */
  async batchSetMuscles(
    organisationId: string,
    exerciseId: string,
    dto: BatchSetExerciseMusclesDto,
    actor: AuthenticatedUser,
  ) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found`);
    }
    this.ensureCanModify(exercise, organisationId);

    const primaryMuscles: string[] = [];
    const secondaryMuscles: string[] = [];
    const stabilizerMuscles: string[] = [];

    await this.prisma.$transaction(async (tx: any) => {
      // Clear existing muscle relations for this exercise
      await tx.exerciseMuscleRelation.deleteMany({ where: { exerciseId } });

      for (const m of dto.muscles) {
        const muscleCode = m.muscle.trim().toUpperCase().replace(/\s+/g, '_');
        await tx.exerciseMuscleRelation.create({
          data: {
            exerciseId,
            muscle: muscleCode,
            muscleGroup: m.muscleGroup,
            role: m.role,
            activationLevel: m.activationLevel ?? 'HIGH',
            notes: m.notes,
          },
        });

        if (m.role === 'PRIMARY') primaryMuscles.push(muscleCode);
        else if (m.role === 'SECONDARY') secondaryMuscles.push(muscleCode);
        else if (m.role === 'STABILIZER') stabilizerMuscles.push(muscleCode);
      }

      // Sync backward compatibility fields on Exercise
      await tx.exercise.update({
        where: { id: exerciseId },
        data: {
          primaryMuscleGroup: (primaryMuscles[0] || exercise.primaryMuscleGroup) as any,
          secondaryMuscleGroups: secondaryMuscles as any,
          stabilizerMuscles: stabilizerMuscles as any,
        },
      });
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'EXERCISE_MUSCLES_BATCH_SET',
      resource: 'exercises',
      resourceId: exerciseId,
      metadata: { count: dto.muscles.length },
    });

    return this.getExerciseMuscles(organisationId, exerciseId);
  }

  /**
   * Remove an individual muscle relation.
   */
  async removeMuscleRelation(organisationId: string, relationId: string, actor: AuthenticatedUser) {
    const relation = await this.prisma.exerciseMuscleRelation.findUnique({
      where: { id: relationId },
      include: { exercise: true },
    });

    if (!relation) {
      throw new NotFoundException(`Muscle relation '${relationId}' not found`);
    }

    this.ensureCanModify(relation.exercise, organisationId);

    await this.prisma.exerciseMuscleRelation.delete({ where: { id: relationId } });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'EXERCISE_MUSCLE_REMOVED',
      resource: 'exercises',
      resourceId: relation.exerciseId,
      metadata: { muscle: relation.muscle, role: relation.role },
    });

    return { success: true, removedId: relationId };
  }

  /**
   * Get structured muscles worked for an exercise.
   */
  async getExerciseMuscles(organisationId: string, exerciseId: string) {
    const relations = await this.prisma.exerciseMuscleRelation.findMany({
      where: { exerciseId },
      orderBy: [{ role: 'asc' }, { muscle: 'asc' }],
    });

    const primary = relations.filter((r: any) => r.role === 'PRIMARY');
    const secondary = relations.filter((r: any) => r.role === 'SECONDARY');
    const stabilizers = relations.filter((r: any) => r.role === 'STABILIZER');

    return {
      exerciseId,
      all: relations,
      primary,
      secondary,
      stabilizers,
    };
  }

  // =========================================================================
  // 3. EXERCISE EQUIPMENT RELATIONS (EXTENDED)
  // =========================================================================

  /**
   * Add extended equipment relation to exercise.
   */
  async addEquipmentRelation(
    organisationId: string,
    exerciseId: string,
    dto: AddExerciseEquipmentRelationExtendedDto,
    actor: AuthenticatedUser,
  ) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found`);
    }
    this.ensureCanModify(exercise, organisationId);

    const relation = await this.prisma.exerciseEquipmentRelation.create({
      data: {
        exerciseId,
        equipmentName: dto.equipmentName,
        requirementType: dto.requirementType ?? 'REQUIRED',
        equipmentCategory: dto.equipmentCategory ?? 'FREE_WEIGHTS',
        isOptional: dto.isOptional ?? false,
        alternatives: dto.alternatives ? (dto.alternatives as any) : undefined,
        availabilityContexts: dto.availabilityContexts
          ? (dto.availabilityContexts as any)
          : undefined,
        notes: dto.notes,
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'EXERCISE_EQUIPMENT_ADDED',
      resource: 'exercises',
      resourceId: exerciseId,
      metadata: { equipmentName: dto.equipmentName, requirementType: dto.requirementType },
    });

    return relation;
  }

  /**
   * Update extended equipment relation.
   */
  async updateEquipmentRelation(
    organisationId: string,
    relationId: string,
    dto: UpdateExerciseEquipmentRelationExtendedDto,
    actor: AuthenticatedUser,
  ) {
    const relation = await this.prisma.exerciseEquipmentRelation.findUnique({
      where: { id: relationId },
      include: { exercise: true },
    });

    if (!relation) {
      throw new NotFoundException(`Equipment relation '${relationId}' not found`);
    }

    this.ensureCanModify(relation.exercise, organisationId);

    const updated = await this.prisma.exerciseEquipmentRelation.update({
      where: { id: relationId },
      data: {
        equipmentName: dto.equipmentName,
        requirementType: dto.requirementType,
        equipmentCategory: dto.equipmentCategory,
        isOptional: dto.isOptional,
        alternatives: dto.alternatives ? (dto.alternatives as any) : undefined,
        availabilityContexts: dto.availabilityContexts
          ? (dto.availabilityContexts as any)
          : undefined,
        notes: dto.notes,
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'EXERCISE_EQUIPMENT_UPDATED',
      resource: 'exercises',
      resourceId: relation.exerciseId,
      metadata: { relationId, updates: dto },
    });

    return updated;
  }

  /**
   * Remove equipment relation.
   */
  async removeEquipmentRelation(
    organisationId: string,
    relationId: string,
    actor: AuthenticatedUser,
  ) {
    const relation = await this.prisma.exerciseEquipmentRelation.findUnique({
      where: { id: relationId },
      include: { exercise: true },
    });

    if (!relation) {
      throw new NotFoundException(`Equipment relation '${relationId}' not found`);
    }

    this.ensureCanModify(relation.exercise, organisationId);

    await this.prisma.exerciseEquipmentRelation.delete({ where: { id: relationId } });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'EXERCISE_EQUIPMENT_REMOVED',
      resource: 'exercises',
      resourceId: relation.exerciseId,
      metadata: { equipmentName: relation.equipmentName },
    });

    return { success: true, removedId: relationId };
  }

  // =========================================================================
  // 4. EXERCISE RELATIONSHIP MANAGEMENT & VALIDATION
  // =========================================================================

  /**
   * Add structured exercise relationship with strict validation:
   * 1. Cannot be its own variation/progression/regression/alternative.
   * 2. Target must exist and be accessible (SYSTEM or same organisation).
   * 3. Prevents duplicate relationships.
   */
  async addRelationship(
    organisationId: string,
    baseExerciseId: string,
    dto: {
      targetExerciseId: string;
      relationshipType: VariationRelationshipType;
      notes?: string;
    },
    actor: AuthenticatedUser,
  ) {
    if (baseExerciseId === dto.targetExerciseId) {
      throw new BadRequestException({
        code: 'SELF_REFERENCING_RELATIONSHIP_PROHIBITED',
        message: 'An exercise cannot establish a relationship with itself',
      });
    }

    const baseExercise = await this.prisma.exercise.findUnique({ where: { id: baseExerciseId } });
    if (!baseExercise) {
      throw new NotFoundException(`Base exercise '${baseExerciseId}' not found`);
    }
    this.ensureCanModify(baseExercise, organisationId);

    const targetExercise = await this.prisma.exercise.findFirst({
      where: {
        id: dto.targetExerciseId,
        OR: [
          { ownershipType: 'SYSTEM', organisationId: null },
          { ownershipType: 'ORGANISATION', organisationId },
        ],
      },
    });

    if (!targetExercise) {
      throw new NotFoundException(
        `Target exercise '${dto.targetExerciseId}' not found or not accessible to this organisation`
      );
    }

    const relationship = await this.prisma.exerciseVariation.upsert({
      where: {
        baseExerciseId_targetExerciseId_relationshipType: {
          baseExerciseId,
          targetExerciseId: dto.targetExerciseId,
          relationshipType: dto.relationshipType,
        },
      },
      update: {
        notes: dto.notes,
      },
      create: {
        baseExerciseId,
        targetExerciseId: dto.targetExerciseId,
        relationshipType: dto.relationshipType,
        notes: dto.notes,
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'EXERCISE_RELATIONSHIP_CREATED',
      resource: 'exercises',
      resourceId: baseExerciseId,
      metadata: {
        targetExerciseId: dto.targetExerciseId,
        relationshipType: dto.relationshipType,
      },
    });

    return relationship;
  }

  // =========================================================================
  // 5. CLASSIFICATION & METADATA UPDATE
  // =========================================================================

  /**
   * Update exercise classification (Category, Mechanics, EquipmentRequirement, Goals, Tags).
   */
  async updateClassification(
    organisationId: string,
    exerciseId: string,
    dto: UpdateExerciseClassificationDto,
    actor: AuthenticatedUser,
  ) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found`);
    }
    this.ensureCanModify(exercise, organisationId);

    const updated = await this.prisma.exercise.update({
      where: { id: exerciseId },
      data: {
        exerciseCategory: dto.exerciseCategory,
        exerciseMechanics: dto.exerciseMechanics,
        equipmentRequirement: dto.equipmentRequirement,
        availableEnvironments: dto.availableEnvironments ? (dto.availableEnvironments as any) : undefined,
        trainingGoals: dto.trainingGoals ? (dto.trainingGoals as any) : undefined,
        tags: dto.tags ? (dto.tags as any) : undefined,
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'EXERCISE_CLASSIFICATION_UPDATED',
      resource: 'exercises',
      resourceId: exerciseId,
      metadata: { updates: dto },
    });

    return updated;
  }

  // =========================================================================
  // 6. METADATA QUALITY & COMPLETENESS AUDIT
  // =========================================================================

  /**
   * Audit exercise metadata completeness score and identify missing fields.
   */
  async getCompleteness(organisationId: string, exerciseId: string): Promise<ExerciseMetadataCompleteness> {
    const exercise = await this.prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        OR: [
          { ownershipType: 'SYSTEM', organisationId: null },
          { ownershipType: 'ORGANISATION', organisationId },
        ],
      },
      include: {
        media: { take: 1 },
        instructionSteps: { take: 1 },
        muscleRelations: true,
        equipmentRelations: true,
      },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found`);
    }

    const missingFields: string[] = [];

    // Score checks
    const hasPrimaryMuscle =
      exercise.primaryMuscleGroup !== 'OTHER' &&
      exercise.primaryMuscleGroup !== 'FULL_BODY' &&
      Boolean(exercise.primaryMuscleGroup) ||
      exercise.muscleRelations.some((m: any) => m.role === 'PRIMARY');
    if (!hasPrimaryMuscle) missingFields.push('Primary Muscle Target');

    const hasEquipment =
      exercise.equipmentRelations.length > 0 ||
      (Boolean(exercise.equipment) && exercise.equipment !== 'OTHER');
    if (!hasEquipment) missingFields.push('Equipment Requirements');

    const hasMovementPattern =
      Boolean(exercise.movementPattern) && exercise.movementPattern !== 'OTHER';
    if (!hasMovementPattern) missingFields.push('Movement Pattern');

    const hasCategory = Boolean(exercise.exerciseCategory);
    if (!hasCategory) missingFields.push('Exercise Category');

    const hasMechanics = Boolean(exercise.exerciseMechanics);
    if (!hasMechanics) missingFields.push('Exercise Mechanics (Compound / Isolation)');

    const hasGoals = Array.isArray(exercise.trainingGoals) && exercise.trainingGoals.length > 0;
    if (!hasGoals) missingFields.push('Training Goals');

    const hasInstructions =
      exercise.instructionSteps.length > 0 || Boolean(exercise.instructions);
    if (!hasInstructions) missingFields.push('Instructional Steps');

    const hasMedia = exercise.media.length > 0;
    if (!hasMedia) missingFields.push('Visual Demonstration Asset');

    const weights = {
      primaryMuscle: 20,
      equipment: 15,
      movementPattern: 15,
      exerciseCategory: 10,
      exerciseMechanics: 10,
      trainingGoals: 10,
      instructions: 10,
      media: 10,
    };

    let totalScore = 0;
    if (hasPrimaryMuscle) totalScore += weights.primaryMuscle;
    if (hasEquipment) totalScore += weights.equipment;
    if (hasMovementPattern) totalScore += weights.movementPattern;
    if (hasCategory) totalScore += weights.exerciseCategory;
    if (hasMechanics) totalScore += weights.exerciseMechanics;
    if (hasGoals) totalScore += weights.trainingGoals;
    if (hasInstructions) totalScore += weights.instructions;
    if (hasMedia) totalScore += weights.media;

    return {
      overallPercentage: totalScore,
      isComplete: totalScore >= 80,
      missingFields,
      scoreBreakdown: {
        primaryMuscle: hasPrimaryMuscle,
        equipment: hasEquipment,
        movementPattern: hasMovementPattern,
        exerciseCategory: hasCategory,
        exerciseMechanics: hasMechanics,
        trainingGoals: hasGoals,
        instructions: hasInstructions,
        media: hasMedia,
      },
    };
  }

  // =========================================================================
  // 7. EXERCISE SUBSTITUTES CANDIDATE DISCOVERY
  // =========================================================================

  /**
   * Find viable exercise substitutes based on:
   * - Mapped alternatives / equipment substitutes
   * - Matching primary muscle and movement pattern
   * - Compatibility with provided available equipment
   */
  async getSubstitutes(
    organisationId: string,
    exerciseId: string,
    availableEquipment?: string[],
  ) {
    const base = await this.prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        OR: [
          { ownershipType: 'SYSTEM', organisationId: null },
          { ownershipType: 'ORGANISATION', organisationId },
        ],
      },
      include: {
        variationsFrom: {
          include: {
            targetExercise: {
              select: {
                id: true,
                name: true,
                slug: true,
                difficulty: true,
                primaryMuscleGroup: true,
                equipment: true,
                exerciseCategory: true,
                exerciseMechanics: true,
                media: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
      },
    });

    if (!base) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found`);
    }

    // Direct mapped alternatives or equipment substitutes
    const mappedSubstitutes = base.variationsFrom
      .filter((v: any) =>
        ['ALTERNATIVE', 'EQUIPMENT_SUBSTITUTE', 'VARIATION', 'REGRESSION', 'PROGRESSION'].includes(
          v.relationshipType
        )
      )
      .map((v: any) => ({
        exercise: v.targetExercise,
        relationshipType: v.relationshipType,
        source: 'DIRECT_RELATIONSHIP',
        notes: v.notes,
      }));

    // Pattern & muscle compatible exercises
    const patternCandidates = await this.prisma.exercise.findMany({
      where: {
        id: { not: exerciseId },
        status: 'ACTIVE',
        OR: [
          { ownershipType: 'SYSTEM', organisationId: null },
          { ownershipType: 'ORGANISATION', organisationId },
        ],
        AND: [
          { primaryMuscleGroup: base.primaryMuscleGroup },
          { movementPattern: base.movementPattern },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        difficulty: true,
        primaryMuscleGroup: true,
        equipment: true,
        exerciseCategory: true,
        exerciseMechanics: true,
        media: { where: { isPrimary: true }, take: 1 },
      },
      take: 6,
    });

    const candidateList = [
      ...mappedSubstitutes,
      ...patternCandidates
        .filter((c: any) => !mappedSubstitutes.some((m: any) => m.exercise?.id === c.id))
        .map((c: any) => ({
          exercise: c,
          relationshipType: 'ALTERNATIVE' as VariationRelationshipType,
          source: 'BIOMECHANICAL_MATCH',
          notes: `Matches ${base.movementPattern} pattern and ${base.primaryMuscleGroup} primary muscle.`,
        })),
    ];

    // Filter by available equipment if specified
    if (availableEquipment && availableEquipment.length > 0) {
      const allowedEqUpper = availableEquipment.map((e) => e.toUpperCase().trim());
      return candidateList.filter((item) => {
        if (!item.exercise) return false;
        const eq = (item.exercise.equipment || '').toUpperCase();
        return eq === 'NONE' || eq === 'BODYWEIGHT' || allowedEqUpper.includes(eq);
      });
    }

    return candidateList;
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  private ensureCanModify(exercise: any, organisationId: string) {
    if (exercise.ownershipType === 'SYSTEM' || !exercise.organisationId) {
      throw new ForbiddenException({
        code: 'SYSTEM_EXERCISE_IMMUTABLE',
        message: 'System exercises cannot be modified by organisations',
      });
    }

    if (exercise.organisationId !== organisationId) {
      throw new NotFoundException({
        code: 'EXERCISE_NOT_FOUND',
        message: `Exercise '${exercise.id}' not found in organisation`,
      });
    }
  }
}
