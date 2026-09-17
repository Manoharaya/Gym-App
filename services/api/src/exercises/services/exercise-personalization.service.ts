import {
  Injectable,
  NotFoundException,
  Inject,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { STORAGE_PROVIDER, StorageProvider } from '../../storage/storage.interface';
import {
  UpdateExercisePreferencesDto,
  UpdateExerciseLearningProgressDto,
  PersonalizedExerciseItem,
  PersonalizedDiscoveryResponse,
  ReasonCode,
} from '../dto/exercise-personalization.dto';

@Injectable()
export class ExercisePersonalizationService {
  private readonly logger = new Logger(ExercisePersonalizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(STORAGE_PROVIDER) private readonly storageProvider: StorageProvider,
  ) {}

  /**
   * Get or initialize a member's personalized exercise preferences.
   * If explicit preferences don't exist yet, infers initial goals from active TrainingGoal records.
   */
  async getPreferences(organisationId: string, userId: string) {
    const existing = await this.prisma.memberExercisePreference.findUnique({
      where: { userId },
    });

    if (existing) {
      return existing;
    }

    // Infer baseline goals from existing training goals if present
    const activeGoals = await this.prisma.trainingGoal.findMany({
      where: {
        memberProfile: { userId },
        status: { in: ['ACTIVE', 'ON_TRACK'] },
      },
      select: { category: true },
    });

    const inferredGoals = Array.from(
      new Set(activeGoals.map((g) => g.category.toUpperCase())),
    );

    return {
      userId,
      organisationId,
      fitnessGoals: inferredGoals.length > 0 ? inferredGoals : ['STRENGTH', 'GENERAL_FITNESS'],
      preferredDifficulty: 'INTERMEDIATE',
      preferredCategories: ['STRENGTH'],
      availableEquipment: ['DUMBBELL', 'BARBELL', 'BODYWEIGHT'],
      workoutLocation: 'GYM',
      preferredTrainingStyles: [],
    };
  }

  /**
   * Update a member's personalized exercise preferences.
   */
  async updatePreferences(
    organisationId: string,
    userId: string,
    dto: UpdateExercisePreferencesDto,
  ) {
    const updated = await this.prisma.memberExercisePreference.upsert({
      where: { userId },
      create: {
        userId,
        organisationId,
        fitnessGoals: dto.fitnessGoals ?? ['STRENGTH'],
        preferredDifficulty: dto.preferredDifficulty ?? 'INTERMEDIATE',
        preferredCategories: dto.preferredCategories ?? ['STRENGTH'],
        availableEquipment: dto.availableEquipment ?? ['DUMBBELL', 'BODYWEIGHT'],
        workoutLocation: dto.workoutLocation ?? 'GYM',
        preferredTrainingStyles: dto.preferredTrainingStyles ?? [],
      },
      update: {
        fitnessGoals: dto.fitnessGoals,
        preferredDifficulty: dto.preferredDifficulty,
        preferredCategories: dto.preferredCategories,
        availableEquipment: dto.availableEquipment,
        workoutLocation: dto.workoutLocation,
        preferredTrainingStyles: dto.preferredTrainingStyles,
      },
    });

    await this.auditService.log({
      organisationId,
      userId,
      action: 'EXERCISE_PREFERENCES_UPDATED',
      resource: 'users',
      resourceId: userId,
      metadata: { updates: dto },
    });

    return updated;
  }

  /**
   * Reset a member's exercise preferences to default settings without altering
   * favorites, workout history, or learning progress.
   */
  async resetPreferences(organisationId: string, userId: string) {
    const reset = await this.prisma.memberExercisePreference.upsert({
      where: { userId },
      create: {
        userId,
        organisationId,
        fitnessGoals: ['STRENGTH', 'GENERAL_FITNESS'],
        preferredDifficulty: 'INTERMEDIATE',
        preferredCategories: ['STRENGTH'],
        availableEquipment: ['DUMBBELL', 'BARBELL', 'BODYWEIGHT'],
        workoutLocation: 'GYM',
        preferredTrainingStyles: [],
      },
      update: {
        fitnessGoals: ['STRENGTH', 'GENERAL_FITNESS'],
        preferredDifficulty: 'INTERMEDIATE',
        preferredCategories: ['STRENGTH'],
        availableEquipment: ['DUMBBELL', 'BARBELL', 'BODYWEIGHT'],
        workoutLocation: 'GYM',
        preferredTrainingStyles: [],
      },
    });

    await this.auditService.log({
      organisationId,
      userId,
      action: 'EXERCISE_PREFERENCES_RESET',
      resource: 'users',
      resourceId: userId,
    });

    return reset;
  }

  /**
   * Get learning progress for a specific exercise and user.
   */
  async getLearningProgress(organisationId: string, userId: string, exerciseId: string) {
    await this.ensureExerciseAccessible(organisationId, exerciseId);

    const progress = await this.prisma.exerciseLearningProgress.findUnique({
      where: {
        userId_exerciseId: {
          userId,
          exerciseId,
        },
      },
    });

    if (!progress) {
      return {
        exerciseId,
        status: 'NOT_STARTED',
        completedSteps: 0,
        totalSteps: 0,
        phasesExplored: false,
        mediaViewed: false,
        instructionsViewed: false,
      };
    }

    return progress;
  }

  /**
   * Record or update educational learning progress for an exercise.
   */
  async updateLearningProgress(
    organisationId: string,
    userId: string,
    exerciseId: string,
    dto: UpdateExerciseLearningProgressDto,
  ) {
    await this.ensureExerciseAccessible(organisationId, exerciseId);

    const existing = await this.prisma.exerciseLearningProgress.findUnique({
      where: { userId_exerciseId: { userId, exerciseId } },
    });

    const isComplete = dto.isComplete ?? (dto.completedSteps && dto.totalSteps && dto.completedSteps >= dto.totalSteps);
    const newStatus = isComplete
      ? 'COMPLETED'
      : existing?.status === 'COMPLETED' && dto.isComplete === undefined
      ? 'COMPLETED'
      : 'IN_PROGRESS';

    const progress = await this.prisma.exerciseLearningProgress.upsert({
      where: {
        userId_exerciseId: { userId, exerciseId },
      },
      create: {
        userId,
        exerciseId,
        organisationId,
        status: newStatus,
        completedSteps: dto.completedSteps ?? (dto.stepNumber ? dto.stepNumber : 1),
        totalSteps: dto.totalSteps ?? 5,
        lastStepNumber: dto.stepNumber ?? 1,
        mediaViewed: dto.mediaViewed ?? false,
        instructionsViewed: dto.instructionsViewed ?? false,
        phasesExplored: dto.phasesExplored ?? false,
        completedAt: isComplete ? new Date() : null,
        lastInteractedAt: new Date(),
      },
      update: {
        status: newStatus,
        completedSteps: dto.completedSteps ?? (dto.stepNumber ? dto.stepNumber : undefined),
        totalSteps: dto.totalSteps,
        lastStepNumber: dto.stepNumber,
        mediaViewed: dto.mediaViewed !== undefined ? dto.mediaViewed : undefined,
        instructionsViewed: dto.instructionsViewed !== undefined ? dto.instructionsViewed : undefined,
        phasesExplored: dto.phasesExplored !== undefined ? dto.phasesExplored : undefined,
        completedAt: isComplete ? new Date() : undefined,
        lastInteractedAt: new Date(),
      },
    });

    return progress;
  }

  /**
   * Aggregate complete personalized exercise sections for a member in a single round-trip.
   */
  async getPersonalizedDiscovery(
    organisationId: string,
    userId: string,
  ): Promise<PersonalizedDiscoveryResponse> {
    const preferences = await this.getPreferences(organisationId, userId);

    // Parallel retrieval of member signals
    const [
      userFavorites,
      userRecents,
      inProgressLearning,
      completedLearning,
      workoutExercises,
      candidateExercises,
    ] = await Promise.all([
      // 1. Favorites
      this.prisma.userExerciseFavorite.findMany({
        where: { userId },
        select: { exerciseId: true },
      }),
      // 2. Recent Views (latest 20)
      this.prisma.userExerciseRecentView.findMany({
        where: { userId },
        orderBy: { viewedAt: 'desc' },
        take: 20,
        select: { exerciseId: true, viewedAt: true },
      }),
      // 3. Learning In Progress
      this.prisma.exerciseLearningProgress.findMany({
        where: { userId, status: 'IN_PROGRESS' },
        orderBy: { lastInteractedAt: 'desc' },
        take: 10,
      }),
      // 4. Learning Completed
      this.prisma.exerciseLearningProgress.findMany({
        where: { userId, status: 'COMPLETED' },
        select: { exerciseId: true },
      }),
      // 5. Exercises Used in Workouts
      this.prisma.workoutExercise.findMany({
        where: {
          workout: {
            memberProfile: { userId },
            status: { in: ['COMPLETED', 'IN_PROGRESS', 'ASSIGNED'] },
          },
        },
        distinct: ['exerciseId'],
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: { exerciseId: true },
      }),
      // 6. Active Candidate Exercises Accessible to Tenant
      this.prisma.exercise.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { ownershipType: 'SYSTEM', organisationId: null },
            { ownershipType: 'ORGANISATION', organisationId },
          ],
        },
        include: {
          media: {
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          },
          muscleRelations: {
            orderBy: [{ role: 'asc' }, { muscle: 'asc' }],
          },
          equipmentRelations: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    ]);

    const favoriteSet = new Set(userFavorites.map((f) => f.exerciseId));
    const recentMap = new Map(userRecents.map((r) => [r.exerciseId, r.viewedAt]));
    const learningMap = new Map(inProgressLearning.map((l) => [l.exerciseId, l]));
    const completedLearningSet = new Set(completedLearning.map((c) => c.exerciseId));
    const workoutUsedSet = new Set(workoutExercises.map((w) => w.exerciseId));

    // Sign media URLs
    const signedExercises = await Promise.all(
      candidateExercises.map(async (ex) => ({
        ...ex,
        media: await this.resolveMediaUrls(ex.media),
      })),
    );

    const exerciseMap = new Map(signedExercises.map((ex) => [ex.id, ex]));

    // --- Deterministic Scoring for "For You" Section ---
    const goalUpper = preferences.fitnessGoals.map((g) => g.toUpperCase());
    const equipUpper = preferences.availableEquipment.map((e) => e.toUpperCase());
    const prefDiff = preferences.preferredDifficulty?.toUpperCase();
    const prefCats = preferences.preferredCategories.map((c) => c.toUpperCase());

    const GOAL_TO_CATEGORIES: Record<string, string[]> = {
      BUILD_MUSCLE: ['STRENGTH', 'HYPERTROPHY'],
      INCREASE_STRENGTH: ['STRENGTH', 'HYPERTROPHY'],
      STRENGTH: ['STRENGTH', 'HYPERTROPHY'],
      WEIGHT_LOSS: ['CARDIO', 'HIIT', 'FUNCTIONAL'],
      ENDURANCE: ['CARDIO', 'HIIT'],
      CARDIO: ['CARDIO', 'HIIT'],
      MOBILITY: ['MOBILITY', 'FLEXIBILITY'],
      FLEXIBILITY: ['FLEXIBILITY', 'MOBILITY'],
      GENERAL_FITNESS: ['STRENGTH', 'CARDIO', 'FUNCTIONAL', 'MOBILITY'],
    };

    const checkGoalMatch = (ex: any): boolean => {
      const exCat = (ex.exerciseCategory || ex.exerciseType || '').toUpperCase();
      if (goalUpper.includes(exCat)) return true;
      for (const g of goalUpper) {
        const mapped = GOAL_TO_CATEGORIES[g] || [];
        if (mapped.includes(exCat)) return true;
      }
      if (ex.trainingGoals && Array.isArray(ex.trainingGoals)) {
        return ex.trainingGoals.some((tg: string) => goalUpper.includes(tg.toUpperCase()));
      }
      return false;
    };

    const scoredCandidates = signedExercises.map((ex) => {
      let score = 0;
      let primaryReasonCode: ReasonCode = 'NEW_DISCOVERY';
      let reasonText = 'Recommended for you';

      // 1. Goal Match (+35)
      const exCat = (ex.exerciseCategory || ex.exerciseType || '').toUpperCase();
      const isGoalMatch = checkGoalMatch(ex);
      if (isGoalMatch) {
        score += 35;
        primaryReasonCode = 'GOAL_MATCH';
        reasonText = `Matches your ${exCat.toLowerCase()} goal`;
      }

      // 2. Equipment Match (+25)
      const exEquip = (ex.equipment || 'BODYWEIGHT').toUpperCase();
      const isEquipMatch =
        equipUpper.includes(exEquip) ||
        exEquip === 'BODYWEIGHT' ||
        exEquip === 'NONE' ||
        ex.equipmentRequirement === 'NONE';
      if (isEquipMatch) {
        score += 25;
        if (primaryReasonCode === 'NEW_DISCOVERY') {
          primaryReasonCode = 'EQUIPMENT_MATCH';
          reasonText = `Compatible with your ${exEquip.toLowerCase()}`;
        }
      }

      // 3. Difficulty Match (+20)
      if (prefDiff && ex.difficulty.toUpperCase() === prefDiff) {
        score += 20;
        if (primaryReasonCode === 'NEW_DISCOVERY') {
          primaryReasonCode = 'DIFFICULTY_MATCH';
          reasonText = `Tailored for ${prefDiff.toLowerCase()} level`;
        }
      }

      // 4. Favorite Signal (+15)
      if (favoriteSet.has(ex.id)) {
        score += 15;
      }

      // 5. Category Preference (+10)
      if (prefCats.includes(exCat)) {
        score += 10;
      }

      // 6. Recent Interest (+5)
      if (recentMap.has(ex.id)) {
        score += 5;
      }

      return {
        exercise: ex,
        score,
        reasonCode: primaryReasonCode,
        reasonText,
      };
    });

    // Sort scored candidates descending
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Apply Diversity Filter (cap same muscleGroup at 3)
    const forYou: PersonalizedExerciseItem[] = [];
    const muscleCountMap = new Map<string, number>();

    for (const item of scoredCandidates) {
      const muscle = item.exercise.primaryMuscleGroup || 'OTHER';
      const count = muscleCountMap.get(muscle) || 0;
      if (count < 3 || forYou.length < 5) {
        muscleCountMap.set(muscle, count + 1);
        forYou.push(this.toPersonalizedItem(item.exercise, favoriteSet, item.reasonCode, item.reasonText, learningMap.get(item.exercise.id)));
      }
      if (forYou.length >= 10) break;
    }

    // --- Continue Learning Section ---
    const continueLearning: PersonalizedExerciseItem[] = [];
    for (const record of inProgressLearning) {
      const ex = exerciseMap.get(record.exerciseId);
      if (ex) {
        continueLearning.push(
          this.toPersonalizedItem(
            ex,
            favoriteSet,
            'RECENT_INTEREST',
            record.lastStepNumber ? `Continue learning step ${record.lastStepNumber} of ${record.totalSteps}` : 'Resume learning guide',
            record,
          ),
        );
      }
    }

    // --- Favorites Section ---
    const favorites: PersonalizedExerciseItem[] = [];
    for (const favId of favoriteSet) {
      const ex = exerciseMap.get(favId);
      if (ex) {
        favorites.push(
          this.toPersonalizedItem(ex, favoriteSet, 'FAVORITE', 'Saved to your favorites', learningMap.get(ex.id)),
        );
      }
      if (favorites.length >= 10) break;
    }

    // --- Recently Viewed Section ---
    const recentlyViewed: PersonalizedExerciseItem[] = [];
    for (const [recId] of recentMap) {
      const ex = exerciseMap.get(recId);
      if (ex) {
        recentlyViewed.push(
          this.toPersonalizedItem(ex, favoriteSet, 'RECENT_INTEREST', 'Recently viewed', learningMap.get(ex.id)),
        );
      }
      if (recentlyViewed.length >= 10) break;
    }

    // --- Based on Your Goals Section ---
    const basedOnGoals: PersonalizedExerciseItem[] = [];
    for (const item of scoredCandidates) {
      if (checkGoalMatch(item.exercise)) {
        const exCat = (item.exercise.exerciseCategory || item.exercise.exerciseType || '').toUpperCase();
        basedOnGoals.push(
          this.toPersonalizedItem(
            item.exercise,
            favoriteSet,
            'GOAL_MATCH',
            `Focuses on ${exCat.toLowerCase()} goals`,
            learningMap.get(item.exercise.id),
          ),
        );
      }
      if (basedOnGoals.length >= 10) break;
    }

    // --- Based on Your Equipment Section ---
    const basedOnEquipment: PersonalizedExerciseItem[] = [];
    for (const ex of signedExercises) {
      const exEquip = (ex.equipment || 'BODYWEIGHT').toUpperCase();
      if (equipUpper.includes(exEquip) && exEquip !== 'BODYWEIGHT' && exEquip !== 'NONE') {
        basedOnEquipment.push(
          this.toPersonalizedItem(
            ex,
            favoriteSet,
            'EQUIPMENT_MATCH',
            `Uses ${exEquip.toLowerCase()}`,
            learningMap.get(ex.id),
          ),
        );
      }
      if (basedOnEquipment.length >= 10) break;
    }

    // --- Exercises Used in Workouts ---
    const usedInWorkouts: PersonalizedExerciseItem[] = [];
    for (const exId of workoutUsedSet) {
      const ex = exerciseMap.get(exId);
      if (ex) {
        usedInWorkouts.push(
          this.toPersonalizedItem(
            ex,
            favoriteSet,
            'WORKOUT_HISTORY',
            'Used in your recent workout sessions',
            learningMap.get(ex.id),
          ),
        );
      }
      if (usedInWorkouts.length >= 10) break;
    }

    // --- Explore Something New ---
    // Exercises not recently viewed, not bookmarked, not yet learned
    const exploreNew: PersonalizedExerciseItem[] = [];
    for (const ex of signedExercises) {
      if (!recentMap.has(ex.id) && !favoriteSet.has(ex.id) && !completedLearningSet.has(ex.id)) {
        exploreNew.push(
          this.toPersonalizedItem(
            ex,
            favoriteSet,
            'NEW_DISCOVERY',
            'Broaden your exercise repertoire',
            learningMap.get(ex.id),
          ),
        );
      }
      if (exploreNew.length >= 10) break;
    }

    return {
      preferences: {
        fitnessGoals: preferences.fitnessGoals,
        preferredDifficulty: preferences.preferredDifficulty,
        preferredCategories: preferences.preferredCategories,
        availableEquipment: preferences.availableEquipment,
        workoutLocation: preferences.workoutLocation,
      },
      forYou,
      continueLearning,
      favorites,
      recentlyViewed,
      basedOnGoals,
      basedOnEquipment,
      usedInWorkouts,
      exploreNew,
    };
  }

  private toPersonalizedItem(
    ex: any,
    favoriteSet: Set<string>,
    reasonCode: ReasonCode,
    reasonText: string,
    learning?: any,
  ): PersonalizedExerciseItem {
    return {
      id: ex.id,
      name: ex.name,
      slug: ex.slug,
      description: ex.description,
      difficulty: ex.difficulty,
      exerciseType: ex.exerciseType,
      movementPattern: ex.movementPattern,
      primaryMuscleGroup: ex.primaryMuscleGroup,
      equipment: ex.equipment,
      exerciseCategory: ex.exerciseCategory,
      exerciseMechanics: ex.exerciseMechanics,
      media: ex.media || [],
      muscleRelations: ex.muscleRelations || [],
      equipmentRelations: ex.equipmentRelations || [],
      isFavorite: favoriteSet.has(ex.id),
      reasonCode,
      reasonText,
      learningProgress: learning
        ? {
            status: learning.status,
            completedSteps: learning.completedSteps,
            totalSteps: learning.totalSteps,
            lastStepNumber: learning.lastStepNumber,
            phasesExplored: learning.phasesExplored,
            completedAt: learning.completedAt,
          }
        : undefined,
    };
  }

  private async ensureExerciseAccessible(organisationId: string, exerciseId: string) {
    const ex = await this.prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        status: 'ACTIVE',
        OR: [
          { ownershipType: 'SYSTEM', organisationId: null },
          { ownershipType: 'ORGANISATION', organisationId },
        ],
      },
    });

    if (!ex) {
      throw new NotFoundException({
        code: 'EXERCISE_NOT_FOUND',
        message: `Exercise '${exerciseId}' not found or not accessible`,
      });
    }
    return ex;
  }

  private async resolveMediaUrls(mediaList: any[]) {
    return Promise.all(
      (mediaList || []).map(async (m) => {
        let viewUrl = m.url || m.storageKey;
        if (m.storageKey && !m.storageKey.startsWith('http')) {
          try {
            viewUrl = await this.storageProvider.getDownloadSignedUrl(m.storageKey, 3600);
          } catch (err) {
            this.logger.warn(`Failed to sign download URL for ${m.storageKey}: ${err.message}`);
          }
        }
        return {
          ...m,
          url: viewUrl,
          resolvedUrl: viewUrl,
        };
      }),
    );
  }
}
