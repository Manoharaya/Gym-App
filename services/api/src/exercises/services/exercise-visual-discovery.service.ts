import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { STORAGE_PROVIDER, StorageProvider } from '../../storage/storage.interface';
import {
  DiscoveryDimension,
  ExerciseDiscoveryOverviewResponseDto,
  ExerciseDimensionDetailResponseDto,
  DiscoveryCategoryItemDto,
  DiscoveryMuscleItemDto,
  DiscoveryEquipmentItemDto,
  DiscoveryMovementItemDto,
  DiscoveryGoalItemDto,
  DiscoveryDifficultyItemDto,
  PreviewExerciseDto,
  RelatedMetadataCountItemDto,
} from '../dto/exercise-discovery.dto';

interface MuscleDefinition {
  code: string;
  name: string;
  group: 'UPPER_BODY' | 'CORE' | 'LOWER_BODY';
  region: 'ANTERIOR' | 'POSTERIOR';
  description: string;
}

const SYSTEM_MUSCLES: MuscleDefinition[] = [
  // Anterior (Front)
  { code: 'CHEST', name: 'Chest (Pectorals)', group: 'UPPER_BODY', region: 'ANTERIOR', description: 'Major pressing muscles across the anterior upper torso' },
  { code: 'SHOULDERS', name: 'Shoulders (Deltoids)', group: 'UPPER_BODY', region: 'ANTERIOR', description: 'Anterior, lateral, and overhead arm stabilizers and movers' },
  { code: 'BICEPS', name: 'Biceps Brachii', group: 'UPPER_BODY', region: 'ANTERIOR', description: 'Elbow flexors and forearm supinators' },
  { code: 'FOREARMS', name: 'Forearms & Grip', group: 'UPPER_BODY', region: 'ANTERIOR', description: 'Wrist flexors, extensors, and grip strength muscles' },
  { code: 'ABDOMINALS', name: 'Abdominals', group: 'CORE', region: 'ANTERIOR', description: 'Rectus abdominis and anterior spinal flexion stability' },
  { code: 'OBLIQUES', name: 'Obliques', group: 'CORE', region: 'ANTERIOR', description: 'Lateral abdominal wall supporting rotation and anti-lateral flexion' },
  { code: 'QUADRICEPS', name: 'Quadriceps', group: 'LOWER_BODY', region: 'ANTERIOR', description: 'Knee extensors powering squats, lunges, and jumping movements' },
  { code: 'HIP_FLEXORS', name: 'Hip Flexors', group: 'LOWER_BODY', region: 'ANTERIOR', description: 'Anterior hip muscles lifting the femur toward the pelvis' },
  { code: 'ADDUCTORS', name: 'Adductors', group: 'LOWER_BODY', region: 'ANTERIOR', description: 'Inner thigh muscles aiding medial leg stability' },

  // Posterior (Back)
  { code: 'TRAPS', name: 'Traps (Trapezius)', group: 'UPPER_BODY', region: 'POSTERIOR', description: 'Scapular elevation, depression, and retraction foundation' },
  { code: 'UPPER_BACK', name: 'Upper Back & Rhomboids', group: 'UPPER_BODY', region: 'POSTERIOR', description: 'Scapular retractors stabilizing posture and pulling' },
  { code: 'LATS', name: 'Lats (Latissimus Dorsi)', group: 'UPPER_BODY', region: 'POSTERIOR', description: 'Broadest back muscles driving vertical and horizontal pulling' },
  { code: 'TRICEPS', name: 'Triceps Brachii', group: 'UPPER_BODY', region: 'POSTERIOR', description: 'Elbow extensors critical for pushing and lockout strength' },
  { code: 'LOWER_BACK', name: 'Lower Back', group: 'CORE', region: 'POSTERIOR', description: 'Erector spinae stabilizing the lumbar spine during hinges' },
  { code: 'GLUTES', name: 'Glutes', group: 'LOWER_BODY', region: 'POSTERIOR', description: 'Primary hip extensors generating powerful athletic drive' },
  { code: 'HAMSTRINGS', name: 'Hamstrings', group: 'LOWER_BODY', region: 'POSTERIOR', description: 'Posterior chain knee flexors and secondary hip extensors' },
  { code: 'CALVES', name: 'Calves (Gastrocnemius & Soleus)', group: 'LOWER_BODY', region: 'POSTERIOR', description: 'Plantar flexors driving locomotion, bounding, and ankle stability' },
];

const SYSTEM_EQUIPMENT = [
  { code: 'DUMBBELL', name: 'Dumbbells', group: 'FREE_WEIGHTS', isNoEquipment: false },
  { code: 'BARBELL', name: 'Barbell', group: 'FREE_WEIGHTS', isNoEquipment: false },
  { code: 'KETTLEBELL', name: 'Kettlebell', group: 'FREE_WEIGHTS', isNoEquipment: false },
  { code: 'WEIGHT_PLATE', name: 'Weight Plates', group: 'FREE_WEIGHTS', isNoEquipment: false },
  { code: 'BENCH', name: 'Workout Bench', group: 'BENCHES_SUPPORTS', isNoEquipment: false },
  { code: 'CABLE_MACHINE', name: 'Cable Machine', group: 'MACHINES', isNoEquipment: false },
  { code: 'LEG_PRESS', name: 'Leg Press', group: 'MACHINES', isNoEquipment: false },
  { code: 'LAT_PULLDOWN', name: 'Lat Pulldown Machine', group: 'MACHINES', isNoEquipment: false },
  { code: 'SMITH_MACHINE', name: 'Smith Machine', group: 'MACHINES', isNoEquipment: false },
  { code: 'PULLUP_BAR', name: 'Pull-Up Bar', group: 'BODYWEIGHT', isNoEquipment: false },
  { code: 'RESISTANCE_BAND', name: 'Resistance Band', group: 'ACCESSORIES', isNoEquipment: false },
  { code: 'NO_EQUIPMENT', name: 'No Equipment / Bodyweight', group: 'BODYWEIGHT', isNoEquipment: true },
];

const SYSTEM_MOVEMENTS = [
  { code: 'SQUAT', name: 'Squat', description: 'Knee-dominant lower body flexion and extension' },
  { code: 'HINGE', name: 'Hinge', description: 'Hip-dominant posterior chain extension' },
  { code: 'PUSH', name: 'Push', description: 'Horizontal and overhead upper body pressing' },
  { code: 'PULL', name: 'Pull', description: 'Horizontal rows and vertical pulling movements' },
  { code: 'LUNGE', name: 'Lunge', description: 'Unilateral split-stance locomotion and stability' },
  { code: 'CARRY', name: 'Carry', description: 'Loaded locomotion and functional grip development' },
  { code: 'ROTATION', name: 'Rotation', description: 'Transverse plane rotational and anti-rotational core drive' },
  { code: 'ISOLATION', name: 'Isolation', description: 'Targeted single-joint hypertrophy and muscular refinement' },
];

const SYSTEM_CATEGORIES = [
  { code: 'STRENGTH', name: 'Strength', description: 'Resistance exercises designed to build absolute muscle strength and force output' },
  { code: 'CARDIO', name: 'Cardio', description: 'Aerobic and anaerobic conditioning to optimize cardiovascular capacity' },
  { code: 'MOBILITY', name: 'Mobility', description: 'Active range of motion exercises to promote joint freedom and structural health' },
  { code: 'CORE', name: 'Core', description: 'Midsection stabilization and anti-rotation movements protecting the spine' },
  { code: 'FUNCTIONAL', name: 'Functional', description: 'Multi-planar patterns simulating real-world athletic movement demands' },
  { code: 'HIIT', name: 'HIIT', description: 'High-intensity interval bursts alternating with targeted recovery intervals' },
  { code: 'RECOVERY', name: 'Recovery', description: 'Gentle low-intensity drills supporting tissue regeneration and recovery' },
];

const SYSTEM_GOALS = [
  { code: 'STRENGTH', name: 'Absolute Strength', group: 'PERFORMANCE', description: 'Maximizing maximal neurological force output and heavy load capacity' },
  { code: 'MUSCLE_BUILDING', name: 'Muscle Hypertrophy', group: 'AESTHETICS', description: 'Stimulating muscular hypertrophy and lean muscle mass development' },
  { code: 'ENDURANCE', name: 'Muscular Endurance', group: 'PERFORMANCE', description: 'Sustained muscular contraction stamina under progressive fatigue' },
  { code: 'FAT_LOSS', name: 'Fat Loss & Conditioning', group: 'FITNESS', description: 'High metabolic output circuits and caloric conditioning' },
  { code: 'MOBILITY', name: 'Joint Mobility', group: 'WELLNESS', description: 'Joint health, fluid movement quality, and functional durability' },
  { code: 'GENERAL_FITNESS', name: 'General Health & Fitness', group: 'LIFESTYLE', description: 'Balanced full-body longevity, health, and physical capability' },
];

@Injectable()
export class ExerciseVisualDiscoveryService {
  private readonly logger = new Logger(ExerciseVisualDiscoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storageProvider: StorageProvider,
  ) {}

  private getBaseWhere(organisationId: string) {
    return {
      status: 'ACTIVE' as const,
      OR: [
        { ownershipType: 'SYSTEM' as const, organisationId: null },
        { ownershipType: 'ORGANISATION' as const, organisationId },
      ],
    };
  }

  private async resolveThumbnail(media: any): Promise<string | undefined> {
    if (!media) return undefined;
    const url = media.thumbnailUrl || media.url || media.storageKey;
    if (url && !url.startsWith('http') && media.storageKey) {
      try {
        return await this.storageProvider.getDownloadSignedUrl(media.storageKey, 3600);
      } catch (err: any) {
        this.logger.warn(`Failed to sign thumbnail URL: ${err.message}`);
      }
    }
    return url;
  }

  /**
   * Main Visual Discovery Landing Data Overview
   */
  async getDiscoveryOverview(organisationId: string): Promise<ExerciseDiscoveryOverviewResponseDto> {
    const baseWhere = this.getBaseWhere(organisationId);

    const [
      totalExercises,
      categoryCounts,
      primaryMuscleCounts,
      muscleRelationCounts,
      equipmentCounts,
      movementCounts,
      difficultyCounts,
      representativeSamples,
    ] = await Promise.all([
      this.prisma.exercise.count({ where: baseWhere }),
      this.prisma.exercise.groupBy({
        by: ['exerciseCategory'],
        where: baseWhere,
        _count: { _all: true },
      }),
      this.prisma.exercise.groupBy({
        by: ['primaryMuscleGroup'],
        where: baseWhere,
        _count: { _all: true },
      }),
      this.prisma.exerciseMuscleRelation.groupBy({
        by: ['muscle', 'role'],
        where: { exercise: baseWhere },
        _count: { _all: true },
      }),
      this.prisma.exercise.groupBy({
        by: ['equipment'],
        where: baseWhere,
        _count: { _all: true },
      }),
      this.prisma.exercise.groupBy({
        by: ['movementPattern'],
        where: baseWhere,
        _count: { _all: true },
      }),
      this.prisma.exercise.groupBy({
        by: ['difficulty'],
        where: baseWhere,
        _count: { _all: true },
      }),
      this.prisma.exercise.findMany({
        where: baseWhere,
        select: {
          id: true,
          name: true,
          slug: true,
          primaryMuscleGroup: true,
          equipment: true,
          exerciseCategory: true,
          movementPattern: true,
          difficulty: true,
          media: {
            where: { isPrimary: true },
            take: 1,
            select: {
              url: true,
              thumbnailUrl: true,
              storageKey: true,
            },
          },
        },
        take: 100,
        orderBy: [{ ownershipType: 'asc' }, { name: 'asc' }],
      }),
    ]);

    // Build sample lookup map for quick representative thumbnails
    const sampleByCat = new Map<string, any>();
    const sampleByMuscle = new Map<string, any>();
    const sampleByEquip = new Map<string, any>();
    const sampleByMovement = new Map<string, any>();

    for (const ex of representativeSamples) {
      if (ex.exerciseCategory && !sampleByCat.has(ex.exerciseCategory.toUpperCase())) {
        sampleByCat.set(ex.exerciseCategory.toUpperCase(), ex);
      }
      if (ex.primaryMuscleGroup && !sampleByMuscle.has(ex.primaryMuscleGroup.toUpperCase())) {
        sampleByMuscle.set(ex.primaryMuscleGroup.toUpperCase(), ex);
      }
      if (ex.equipment && !sampleByEquip.has(ex.equipment.toUpperCase())) {
        sampleByEquip.set(ex.equipment.toUpperCase(), ex);
      }
      if (ex.movementPattern && !sampleByMovement.has(ex.movementPattern.toUpperCase())) {
        sampleByMovement.set(ex.movementPattern.toUpperCase(), ex);
      }
    }

    // 1. Categories
    const catCountMap = new Map<string, number>();
    for (const c of categoryCounts) {
      if (c.exerciseCategory) {
        catCountMap.set(c.exerciseCategory.toUpperCase(), c._count._all);
      }
    }

    const categories: DiscoveryCategoryItemDto[] = await Promise.all(
      SYSTEM_CATEGORIES.map(async (cat) => {
        const count = catCountMap.get(cat.code) || 0;
        const sample = sampleByCat.get(cat.code);
        const thumb = sample?.media?.[0] ? await this.resolveThumbnail(sample.media[0]) : undefined;

        return {
          code: cat.code,
          name: cat.name,
          description: cat.description,
          count,
          representativeExercise: sample
            ? {
                id: sample.id,
                name: sample.name,
                slug: sample.slug,
                thumbnailUrl: thumb,
                difficulty: sample.difficulty,
              }
            : null,
        };
      })
    );

    // 2. Muscles
    const primaryMuscleMap = new Map<string, number>();
    for (const pm of primaryMuscleCounts) {
      if (pm.primaryMuscleGroup) {
        primaryMuscleMap.set(pm.primaryMuscleGroup.toUpperCase(), pm._count._all);
      }
    }

    const relationMap = new Map<string, { primary: number; secondary: number }>();
    for (const mr of muscleRelationCounts) {
      if (mr.muscle) {
        const mKey = mr.muscle.toUpperCase();
        const cur = relationMap.get(mKey) || { primary: 0, secondary: 0 };
        if (mr.role === 'PRIMARY') cur.primary += mr._count._all;
        else cur.secondary += mr._count._all;
        relationMap.set(mKey, cur);
      }
    }

    const muscles: DiscoveryMuscleItemDto[] = await Promise.all(
      SYSTEM_MUSCLES.map(async (m) => {
        const primaryCount =
          (relationMap.get(m.code)?.primary || 0) + (primaryMuscleMap.get(m.code) || 0);
        const secondaryCount = relationMap.get(m.code)?.secondary || 0;
        const count = Math.max(primaryCount + secondaryCount, primaryMuscleMap.get(m.code) || 0);

        const sample = sampleByMuscle.get(m.code);
        const thumb = sample?.media?.[0] ? await this.resolveThumbnail(sample.media[0]) : undefined;

        return {
          code: m.code,
          name: m.name,
          group: m.group,
          region: m.region,
          count,
          primaryCount,
          secondaryCount,
          representativeExercise: sample
            ? {
                id: sample.id,
                name: sample.name,
                slug: sample.slug,
                thumbnailUrl: thumb,
                difficulty: sample.difficulty,
              }
            : null,
        };
      })
    );

    // 3. Equipment
    const equipCountMap = new Map<string, number>();
    for (const eq of equipmentCounts) {
      if (eq.equipment) {
        equipCountMap.set(eq.equipment.toUpperCase(), eq._count._all);
      }
    }

    // Special count for no equipment
    const noEquipCount = await this.prisma.exercise.count({
      where: {
        ...baseWhere,
        OR: [
          { equipment: { in: ['BODYWEIGHT', 'NONE'] } },
          { equipmentRequirement: 'NONE' },
          {
            equipmentRelations: {
              some: { requirementType: 'NONE' },
            },
          },
        ],
      },
    });

    const equipment: DiscoveryEquipmentItemDto[] = await Promise.all(
      SYSTEM_EQUIPMENT.map(async (eq) => {
        const count = eq.isNoEquipment ? noEquipCount : equipCountMap.get(eq.code) || 0;
        const sample = eq.isNoEquipment
          ? representativeSamples.find(
              (e) => e.equipment === 'BODYWEIGHT' || e.equipment === 'NONE'
            )
          : sampleByEquip.get(eq.code);
        const thumb = sample?.media?.[0] ? await this.resolveThumbnail(sample.media[0]) : undefined;

        return {
          code: eq.code,
          name: eq.name,
          group: eq.group,
          count,
          isNoEquipment: eq.isNoEquipment,
          representativeExercise: sample
            ? {
                id: sample.id,
                name: sample.name,
                slug: sample.slug,
                thumbnailUrl: thumb,
                difficulty: sample.difficulty,
              }
            : null,
        };
      })
    );

    // 4. Movement Patterns
    const moveCountMap = new Map<string, number>();
    for (const mv of movementCounts) {
      if (mv.movementPattern) {
        moveCountMap.set(mv.movementPattern.toUpperCase(), mv._count._all);
      }
    }

    const movementPatterns: DiscoveryMovementItemDto[] = await Promise.all(
      SYSTEM_MOVEMENTS.map(async (mov) => {
        const count = moveCountMap.get(mov.code) || 0;
        const sample = sampleByMovement.get(mov.code);
        const thumb = sample?.media?.[0] ? await this.resolveThumbnail(sample.media[0]) : undefined;

        return {
          code: mov.code,
          name: mov.name,
          description: mov.description,
          count,
          representativeExercise: sample
            ? {
                id: sample.id,
                name: sample.name,
                slug: sample.slug,
                thumbnailUrl: thumb,
                difficulty: sample.difficulty,
              }
            : null,
        };
      })
    );

    // 5. Goals
    const goals: DiscoveryGoalItemDto[] = SYSTEM_GOALS.map((g) => {
      // Relate goal to category count or strength baseline
      const count =
        catCountMap.get(g.code) ||
        (g.code === 'MUSCLE_BUILDING' ? catCountMap.get('STRENGTH') || 0 : totalExercises);
      return {
        code: g.code,
        name: g.name,
        group: g.group,
        description: g.description,
        count,
      };
    });

    // 6. Difficulties
    const diffMap = new Map<string, number>();
    for (const d of difficultyCounts) {
      if (d.difficulty) {
        diffMap.set(d.difficulty.toUpperCase(), d._count._all);
      }
    }

    const diffTiers = [
      { code: 'BEGINNER', name: 'Beginner', level: 1 },
      { code: 'INTERMEDIATE', name: 'Intermediate', level: 2 },
      { code: 'ADVANCED', name: 'Advanced', level: 3 },
      { code: 'EXPERT', name: 'Expert', level: 4 },
    ];

    const difficulties: DiscoveryDifficultyItemDto[] = diffTiers.map((dt) => ({
      code: dt.code,
      name: dt.name,
      count: diffMap.get(dt.code) || 0,
      level: dt.level,
    }));

    return {
      totalExercises,
      categories,
      muscles,
      equipment,
      movementPatterns,
      goals,
      difficulties,
    };
  }

  /**
   * Dedicated Taxonomy Dimension Lists
   */
  async getCategories(organisationId: string) {
    const overview = await this.getDiscoveryOverview(organisationId);
    return overview.categories;
  }

  async getMuscles(organisationId: string) {
    const overview = await this.getDiscoveryOverview(organisationId);
    return overview.muscles;
  }

  async getEquipment(organisationId: string) {
    const overview = await this.getDiscoveryOverview(organisationId);
    return overview.equipment;
  }

  async getMovements(organisationId: string) {
    const overview = await this.getDiscoveryOverview(organisationId);
    return overview.movementPatterns;
  }

  async getGoals(organisationId: string) {
    const overview = await this.getDiscoveryOverview(organisationId);
    return overview.goals;
  }

  async getDifficulty(organisationId: string) {
    const overview = await this.getDiscoveryOverview(organisationId);
    return overview.difficulties;
  }

  /**
   * Deep Dimension Exploration Detail with Cross-Discovery Co-occurrences
   */
  async getDimensionDetail(
    organisationId: string,
    dimension: DiscoveryDimension,
    rawValue: string
  ): Promise<ExerciseDimensionDetailResponseDto> {
    const value = rawValue.trim().toUpperCase();
    const tenantCondition = {
      OR: [
        { ownershipType: 'SYSTEM' as const, organisationId: null },
        { ownershipType: 'ORGANISATION' as const, organisationId },
      ],
    };

    let title = value;
    let description = '';
    let region: 'ANTERIOR' | 'POSTERIOR' | null = null;
    let group: string | null = null;
    let isNoEquipment = false;
    let dimensionCondition: any = {};

    // Apply specific dimension filtering
    if (dimension === 'muscle') {
      const muscleDef = SYSTEM_MUSCLES.find((m) => m.code === value);
      if (muscleDef) {
        title = muscleDef.name;
        description = muscleDef.description;
        region = muscleDef.region;
        group = muscleDef.group;
      }
      dimensionCondition = {
        OR: [
          { primaryMuscleGroup: { contains: value, mode: 'insensitive' } },
          {
            muscleRelations: {
              some: {
                muscle: { contains: value, mode: 'insensitive' },
              },
            },
          },
        ],
      };
    } else if (dimension === 'equipment') {
      const equipDef = SYSTEM_EQUIPMENT.find((e) => e.code === value);
      if (equipDef) {
        title = equipDef.name;
        group = equipDef.group;
        isNoEquipment = equipDef.isNoEquipment;
      }
      description = isNoEquipment
        ? 'Bodyweight-only movements requiring zero external gym machinery or weights'
        : `Exercises utilizing ${title.toLowerCase()} for targeted resistance`;

      if (isNoEquipment || value === 'BODYWEIGHT' || value === 'NO_EQUIPMENT') {
        isNoEquipment = true;
        dimensionCondition = {
          OR: [
            { equipment: { in: ['BODYWEIGHT', 'NONE'] } },
            { equipmentRequirement: 'NONE' },
            {
              equipmentRelations: {
                some: { requirementType: 'NONE' },
              },
            },
          ],
        };
      } else {
        dimensionCondition = {
          OR: [
            { equipment: { contains: value, mode: 'insensitive' } },
            {
              equipmentRelations: {
                some: {
                  equipmentName: { contains: value, mode: 'insensitive' },
                },
              },
            },
          ],
        };
      }
    } else if (dimension === 'movement') {
      const movDef = SYSTEM_MOVEMENTS.find((m) => m.code === value);
      if (movDef) {
        title = movDef.name;
        description = movDef.description;
      }
      dimensionCondition = { movementPattern: { contains: value, mode: 'insensitive' } };
    } else if (dimension === 'category') {
      const catDef = SYSTEM_CATEGORIES.find((c) => c.code === value);
      if (catDef) {
        title = catDef.name;
        description = catDef.description;
      }
      dimensionCondition = { exerciseCategory: { contains: value, mode: 'insensitive' } };
    } else if (dimension === 'difficulty') {
      title = `${value.charAt(0)}${value.slice(1).toLowerCase()} Level`;
      description = `Exercises calibrated for ${title.toLowerCase()} athletes and trainees`;
      dimensionCondition = { difficulty: value };
    } else if (dimension === 'goal') {
      const goalDef = SYSTEM_GOALS.find((g) => g.code === value);
      if (goalDef) {
        title = goalDef.name;
        description = goalDef.description;
        group = goalDef.group;
      }
      // Query related category or primary mechanics
      dimensionCondition = {
        OR: [
          { exerciseCategory: { contains: value, mode: 'insensitive' } },
          { description: { contains: value, mode: 'insensitive' } },
          { name: { contains: value, mode: 'insensitive' } },
        ],
      };
    } else {
      throw new BadRequestException(`Unsupported discovery dimension: '${dimension}'`);
    }

    const filterWhere = {
      status: 'ACTIVE' as const,
      AND: [tenantCondition, dimensionCondition],
    };

    // Execute queries to fetch matching exercises and compute cross-discovery co-occurrences
    const [exerciseCount, matchingExercises] = await Promise.all([
      this.prisma.exercise.count({ where: filterWhere }),
      this.prisma.exercise.findMany({
        where: filterWhere,
        include: {
          media: {
            where: { isPrimary: true },
            take: 1,
            select: {
              url: true,
              thumbnailUrl: true,
              storageKey: true,
            },
          },
          muscleRelations: {
            where: {
              muscle: { contains: value, mode: 'insensitive' },
            },
            select: {
              role: true,
              muscle: true,
            },
            take: 1,
          },
        },
        orderBy: [{ ownershipType: 'asc' }, { name: 'asc' }],
        take: 24,
      }),
    ]);

    // Compute muscle roles if browsing by muscle
    let roles: { primaryCount: number; secondaryCount: number; stabilizerCount: number } | undefined = undefined;
    if (dimension === 'muscle') {
      const [primaryCount, secondaryCount, stabilizerCount] = await Promise.all([
        this.prisma.exercise.count({
          where: {
            status: 'ACTIVE',
            AND: [
              tenantCondition,
              {
                OR: [
                  { primaryMuscleGroup: { contains: value, mode: 'insensitive' } },
                  {
                    muscleRelations: {
                      some: {
                        muscle: { contains: value, mode: 'insensitive' },
                        role: 'PRIMARY',
                      },
                    },
                  },
                ],
              },
            ],
          },
        }),
        this.prisma.exercise.count({
          where: {
            status: 'ACTIVE',
            AND: [
              tenantCondition,
              {
                muscleRelations: {
                  some: {
                    muscle: { contains: value, mode: 'insensitive' },
                    role: 'SECONDARY',
                  },
                },
              },
            ],
          },
        }),
        this.prisma.exercise.count({
          where: {
            status: 'ACTIVE',
            AND: [
              tenantCondition,
              {
                muscleRelations: {
                  some: {
                    muscle: { contains: value, mode: 'insensitive' },
                    role: 'STABILIZER',
                  },
                },
              },
            ],
          },
        }),
      ]);

      roles = { primaryCount, secondaryCount, stabilizerCount };
    }

    // Cross-discovery: calculate related dimensions based on the matching set of exercises
    const [coEquip, coMuscles, coMovements, coCategories, coDifficulties] = await Promise.all([
      this.prisma.exercise.groupBy({
        by: ['equipment'],
        where: filterWhere,
        _count: { _all: true },
      }),
      this.prisma.exercise.groupBy({
        by: ['primaryMuscleGroup'],
        where: filterWhere,
        _count: { _all: true },
      }),
      this.prisma.exercise.groupBy({
        by: ['movementPattern'],
        where: filterWhere,
        _count: { _all: true },
      }),
      this.prisma.exercise.groupBy({
        by: ['exerciseCategory'],
        where: filterWhere,
        _count: { _all: true },
      }),
      this.prisma.exercise.groupBy({
        by: ['difficulty'],
        where: filterWhere,
        _count: { _all: true },
      }),
    ]);

    const relatedEquipment: RelatedMetadataCountItemDto[] = coEquip
      .filter((e) => !!e.equipment && e.equipment.toUpperCase() !== value)
      .map((e) => {
        const sysEq = SYSTEM_EQUIPMENT.find((se) => se.code === e.equipment.toUpperCase());
        return {
          id: e.equipment,
          name: sysEq?.name || e.equipment,
          count: e._count._all,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const relatedMuscles: RelatedMetadataCountItemDto[] = coMuscles
      .filter((m) => !!m.primaryMuscleGroup && m.primaryMuscleGroup.toUpperCase() !== value)
      .map((m) => {
        const sysM = SYSTEM_MUSCLES.find((sm) => sm.code === m.primaryMuscleGroup.toUpperCase());
        return {
          id: m.primaryMuscleGroup,
          name: sysM?.name || m.primaryMuscleGroup,
          count: m._count._all,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const relatedMovements: RelatedMetadataCountItemDto[] = coMovements
      .filter((mv) => !!mv.movementPattern && mv.movementPattern.toUpperCase() !== value)
      .map((mv) => {
        const sysMov = SYSTEM_MOVEMENTS.find((sm) => sm.code === mv.movementPattern?.toUpperCase());
        return {
          id: mv.movementPattern!,
          name: sysMov?.name || mv.movementPattern!,
          count: mv._count._all,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const relatedCategories: RelatedMetadataCountItemDto[] = coCategories
      .filter((c) => !!c.exerciseCategory && c.exerciseCategory.toUpperCase() !== value)
      .map((c) => {
        const sysCat = SYSTEM_CATEGORIES.find((sc) => sc.code === c.exerciseCategory?.toUpperCase());
        return {
          id: c.exerciseCategory!,
          name: sysCat?.name || c.exerciseCategory!,
          count: c._count._all,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const difficultyDistribution: RelatedMetadataCountItemDto[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'].map(
      (diff) => {
        const match = coDifficulties.find((d) => d.difficulty === diff);
        return {
          id: diff,
          name: diff.charAt(0) + diff.slice(1).toLowerCase(),
          count: match?._count._all || 0,
        };
      }
    );

    // Map preview exercises with resolved thumbnails
    const previewExercises: PreviewExerciseDto[] = await Promise.all(
      matchingExercises.map(async (ex) => {
        const thumb = ex.media?.[0] ? await this.resolveThumbnail(ex.media[0]) : undefined;
        let muscleRole: string | undefined = undefined;
        if (dimension === 'muscle') {
          if (ex.primaryMuscleGroup?.toUpperCase() === value) {
            muscleRole = 'PRIMARY';
          } else if (ex.muscleRelations?.[0]?.role) {
            muscleRole = ex.muscleRelations[0].role;
          }
        }

        return {
          id: ex.id,
          name: ex.name,
          slug: ex.slug,
          difficulty: ex.difficulty,
          primaryMuscleGroup: ex.primaryMuscleGroup,
          equipment: ex.equipment,
          movementPattern: ex.movementPattern,
          exerciseCategory: ex.exerciseCategory,
          thumbnailUrl: thumb,
          muscleRole,
        };
      })
    );

    return {
      dimension,
      value,
      title,
      description,
      exerciseCount,
      region,
      group,
      isNoEquipment,
      roles,
      relatedEquipment,
      relatedMuscles,
      relatedMovements,
      relatedCategories,
      difficultyDistribution,
      previewExercises,
    };
  }
}
