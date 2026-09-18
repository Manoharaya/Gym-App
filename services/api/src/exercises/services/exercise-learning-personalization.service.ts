import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { ExerciseTutorialService } from './exercise-tutorial.service';
import {
  UpdateLearningPreferencesDto,
  LearningPreferencesResponseDto,
  PersonalizedTutorialPlanDto,
  PersonalizedTutorialResponseDto,
  TargetedReviewResponseDto,
  LearningRecommendationsResponseDto,
  LearningDepth,
  PersonalizedTutorialMode,
} from '../dto/learning-personalization.dto';

@Injectable()
export class ExerciseLearningPersonalizationService {
  private readonly logger = new Logger(ExerciseLearningPersonalizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly tutorialService: ExerciseTutorialService,
  ) {}

  // =========================================================================
  // 1. LEARNING PREFERENCES MANAGEMENT
  // =========================================================================

  /**
   * Get member learning personalization preferences.
   * Returns stored profile or deterministic defaults.
   */
  async getPreferences(
    organisationId: string,
    userId: string,
  ): Promise<LearningPreferencesResponseDto> {
    const existing = await this.prisma.learningPersonalizationProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      return {
        userId: existing.userId,
        organisationId: existing.organisationId,
        preferredLearningDepth: existing.preferredLearningDepth as LearningDepth,
        preferredTutorialMode: existing.preferredTutorialMode as PersonalizedTutorialMode,
        preferredMediaType: existing.preferredMediaType,
        preferredViewAngle: existing.preferredViewAngle,
        autoAdvancePreference: existing.autoAdvancePreference,
        showDetailedInstructions: existing.showDetailedInstructions,
        showAnatomyDetails: existing.showAnatomyDetails,
        showTechniqueDetails: existing.showTechniqueDetails,
        practicePreference: existing.practicePreference as any,
        knowledgeCheckPreference: existing.knowledgeCheckPreference,
        playbackSpeed: existing.playbackSpeed,
        createdAt: existing.createdAt.toISOString(),
        updatedAt: existing.updatedAt.toISOString(),
      };
    }

    return {
      userId,
      organisationId,
      preferredLearningDepth: 'STANDARD',
      preferredTutorialMode: 'PERSONALIZED',
      preferredMediaType: 'VIDEO',
      preferredViewAngle: 'SIDE',
      autoAdvancePreference: false,
      showDetailedInstructions: true,
      showAnatomyDetails: true,
      showTechniqueDetails: true,
      practicePreference: 'REPS',
      knowledgeCheckPreference: true,
      playbackSpeed: 1.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Update member learning personalization preferences.
   */
  async updatePreferences(
    organisationId: string,
    userId: string,
    dto: UpdateLearningPreferencesDto,
  ): Promise<LearningPreferencesResponseDto> {
    const upserted = await this.prisma.learningPersonalizationProfile.upsert({
      where: { userId },
      create: {
        userId,
        organisationId,
        preferredLearningDepth: dto.preferredLearningDepth ?? 'STANDARD',
        preferredTutorialMode: dto.preferredTutorialMode ?? 'PERSONALIZED',
        preferredMediaType: dto.preferredMediaType ?? 'VIDEO',
        preferredViewAngle: dto.preferredViewAngle ?? 'SIDE',
        autoAdvancePreference: dto.autoAdvancePreference ?? false,
        showDetailedInstructions: dto.showDetailedInstructions ?? true,
        showAnatomyDetails: dto.showAnatomyDetails ?? true,
        showTechniqueDetails: dto.showTechniqueDetails ?? true,
        practicePreference: dto.practicePreference ?? 'REPS',
        knowledgeCheckPreference: dto.knowledgeCheckPreference ?? true,
        playbackSpeed: dto.playbackSpeed ?? 1.0,
      },
      update: {
        preferredLearningDepth: dto.preferredLearningDepth,
        preferredTutorialMode: dto.preferredTutorialMode,
        preferredMediaType: dto.preferredMediaType,
        preferredViewAngle: dto.preferredViewAngle,
        autoAdvancePreference: dto.autoAdvancePreference,
        showDetailedInstructions: dto.showDetailedInstructions,
        showAnatomyDetails: dto.showAnatomyDetails,
        showTechniqueDetails: dto.showTechniqueDetails,
        practicePreference: dto.practicePreference,
        knowledgeCheckPreference: dto.knowledgeCheckPreference,
        playbackSpeed: dto.playbackSpeed,
      },
    });

    await this.auditService.log({
      organisationId,
      userId,
      action: 'LEARNING_PREFERENCES_UPDATED',
      resource: 'users',
      resourceId: userId,
      metadata: { updates: dto },
    });

    return {
      userId: upserted.userId,
      organisationId: upserted.organisationId,
      preferredLearningDepth: upserted.preferredLearningDepth as LearningDepth,
      preferredTutorialMode: upserted.preferredTutorialMode as PersonalizedTutorialMode,
      preferredMediaType: upserted.preferredMediaType,
      preferredViewAngle: upserted.preferredViewAngle,
      autoAdvancePreference: upserted.autoAdvancePreference,
      showDetailedInstructions: upserted.showDetailedInstructions,
      showAnatomyDetails: upserted.showAnatomyDetails,
      showTechniqueDetails: upserted.showTechniqueDetails,
      practicePreference: upserted.practicePreference as any,
      knowledgeCheckPreference: upserted.knowledgeCheckPreference,
      playbackSpeed: upserted.playbackSpeed,
      createdAt: upserted.createdAt.toISOString(),
      updatedAt: upserted.updatedAt.toISOString(),
    };
  }

  /**
   * Reset learning preferences to defaults.
   */
  async resetPreferences(
    organisationId: string,
    userId: string,
  ): Promise<LearningPreferencesResponseDto> {
    await this.prisma.learningPersonalizationProfile.deleteMany({
      where: { userId },
    });

    return this.getPreferences(organisationId, userId);
  }

  // =========================================================================
  // 2. DETERMINISTIC PERSONALIZATION RULE ENGINE & PLAN GENERATION
  // =========================================================================

  /**
   * Generate a PersonalizedTutorialPlan for a specific member and exercise.
   */
  async buildPersonalizedTutorialPlan(
    organisationId: string,
    exerciseId: string,
    userId: string,
    actor?: AuthenticatedUser,
  ): Promise<PersonalizedTutorialPlanDto> {
    const preferences = await this.getPreferences(organisationId, userId);

    // Fetch exercise with relations
    const exercise = await this.prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        OR: [{ ownershipType: 'SYSTEM' }, { organisationId }],
      },
      include: {
        media: { where: { isPublished: true }, orderBy: { sortOrder: 'asc' } },
        movementPhases: { where: { status: 'PUBLISHED' }, orderBy: { orderIndex: 'asc' } },
        commonMistakes: { orderBy: { sortOrder: 'asc' } },
        instruction: { include: { steps: { orderBy: { stepNumber: 'asc' } } } },
      },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise not found: ${exerciseId}`);
    }

    // Fetch member's prior learning progress on this exercise
    const learningProgress = await this.prisma.exerciseLearningProgress.findUnique({
      where: { userId_exerciseId: { userId, exerciseId } },
    });

    // Fetch member discovery preference (for experience level)
    const exercisePreferences = await this.prisma.memberExercisePreference.findUnique({
      where: { userId },
    });

    const memberLevel = exercisePreferences?.preferredDifficulty || 'INTERMEDIATE';
    const exerciseDifficulty = exercise.difficulty || 'INTERMEDIATE';
    const hasCompletedTutorial =
      learningProgress?.status === 'COMPLETED' || !!learningProgress?.completedAt;
    const tutorialProgressData = (learningProgress?.tutorialProgress as any) || {};
    const knowledgeScore = tutorialProgressData.knowledgeCheckScore as number | undefined;

    // -----------------------------------------------------------------------
    // RULE 1: Determine Educational Presentation Depth
    // -----------------------------------------------------------------------
    let depth: LearningDepth = 'STANDARD';
    let rationale = '';

    // Check if user set an explicit non-default depth
    const explicitDepth = preferences.preferredLearningDepth;
    const isExplicitOverride =
      explicitDepth && explicitDepth !== 'STANDARD';

    if (isExplicitOverride) {
      depth = explicitDepth;
      rationale = `Using your explicitly chosen ${depth} learning depth.`;
    } else {
      if (!hasCompletedTutorial) {
        if (memberLevel === 'BEGINNER' || exerciseDifficulty === 'ADVANCED' || exerciseDifficulty === 'EXPERT') {
          depth = 'BASIC';
          rationale = 'Recommended: Basic depth to build foundational movement awareness and safety checkpoints.';
        } else {
          depth = 'STANDARD';
          rationale = 'Recommended: Standard depth for initial comprehensive movement breakdown.';
        }
      } else {
        // Has completed previously
        if (knowledgeScore != null && knowledgeScore >= 80) {
          depth = 'ADVANCED';
          rationale = `Recommended: Advanced depth based on your strong ${knowledgeScore}% knowledge check mastery.`;
        } else if (knowledgeScore != null && knowledgeScore < 70) {
          depth = 'DETAILED';
          rationale = `Recommended: Detailed review mode with targeted checkpoints to reinforce key phases.`;
        } else {
          depth = 'STANDARD';
          rationale = 'Recommended: Standard refresher mode for continued technique consistency.';
        }
      }
    }

    // -----------------------------------------------------------------------
    // RULE 2: Determine Tutorial Mode
    // -----------------------------------------------------------------------
    let mode: PersonalizedTutorialMode = 'STEP_BY_STEP';

    if (preferences.preferredTutorialMode !== 'PERSONALIZED') {
      mode = preferences.preferredTutorialMode;
    } else {
      if (!hasCompletedTutorial) {
        mode = depth === 'BASIC' ? 'STEP_BY_STEP' : 'STEP_BY_STEP';
      } else {
        if (knowledgeScore != null && knowledgeScore >= 80) {
          mode = 'TECHNIQUE_CHECKLIST';
        } else if (knowledgeScore != null && knowledgeScore < 70) {
          mode = 'MOVEMENT_BREAKDOWN';
        } else {
          mode = 'QUICK_LEARN';
        }
      }
    }

    // -----------------------------------------------------------------------
    // RULE 3: Section Prioritization
    // -----------------------------------------------------------------------
    let orderedSections: string[] = [];
    if (depth === 'BASIC') {
      orderedSections = [
        'INTRO',
        'EQUIPMENT',
        'STARTING_POSITION',
        'DEMONSTRATION',
        'STEPS',
        'BREATHING',
        'COMMON_MISTAKES',
        'PRACTICE',
        'KNOWLEDGE_CHECK',
        'SUMMARY',
      ];
    } else if (depth === 'STANDARD') {
      orderedSections = [
        'INTRO',
        'DEMONSTRATION',
        'MULTI_ANGLE',
        'PHASES',
        'MUSCLES',
        'TECHNIQUE_CUES',
        'COMMON_MISTAKES',
        'PRACTICE',
        'KNOWLEDGE_CHECK',
        'SUMMARY',
      ];
    } else if (depth === 'DETAILED') {
      orderedSections = [
        'DEMONSTRATION',
        'MULTI_ANGLE',
        'MOVEMENT_MECHANICS',
        'PHASES',
        'MUSCLES',
        'WHY_IT_WORKS',
        'TEMPO',
        'COMMON_MISTAKES',
        'TECHNIQUE_COMPARISON',
        'PRACTICE',
        'KNOWLEDGE_CHECK',
        'SUMMARY',
      ];
    } else {
      // ADVANCED
      orderedSections = [
        'MULTI_ANGLE',
        'TECHNIQUE_COMPARISON',
        'MOVEMENT_MECHANICS',
        'PHASES',
        'MUSCLE_ROLES',
        'WHY_IT_WORKS',
        'TECHNIQUE_CUES',
        'COMMON_MISTAKES',
        'PRACTICE',
        'KNOWLEDGE_CHECK',
        'PROGRESSIONS',
        'SUMMARY',
      ];
    }

    // -----------------------------------------------------------------------
    // RULE 4: Media & View Angle Selection (Day 77 Integration)
    // -----------------------------------------------------------------------
    const preferredAngle = preferences.preferredViewAngle || 'SIDE';
    const mediaList = exercise.media || [];
    let activeMedia = mediaList.find(
      (m) => m.viewAngle === preferredAngle && m.isPublished,
    );
    let isFallback = false;

    if (!activeMedia) {
      activeMedia =
        mediaList.find((m) => m.isPrimary) ||
        mediaList.find((m) => m.viewAngle === 'SIDE') ||
        mediaList.find((m) => m.viewAngle === 'FRONT') ||
        mediaList[0];
      isFallback = true;
    }

    const resolvedAngle = activeMedia?.viewAngle || preferredAngle;

    // -----------------------------------------------------------------------
    // RULE 5: Playback Speed
    // -----------------------------------------------------------------------
    let speed = preferences.playbackSpeed ?? 1.0;
    if (depth === 'BASIC' && memberLevel === 'BEGINNER' && preferences.playbackSpeed === 1.0) {
      speed = 0.75; // Helpful educational pacing
    }

    // -----------------------------------------------------------------------
    // RULE 6: Practice Checklist & Structure Adaptation
    // -----------------------------------------------------------------------
    const baseChecklist: string[] = [];
    if (depth === 'BASIC') {
      baseChecklist.push(
        'Stable setup with grounded foot positioning',
        'Inhale before initiating movement; brace core',
        'Maintain controlled descent through comfortable range',
        'Exhale through stick point to return to starting position',
      );
    } else if (depth === 'STANDARD') {
      baseChecklist.push(
        'Joint alignment check: Knees track along second toe',
        'Spinal neutrality: Natural lordosis maintained without rounding',
        'Smooth cadence matching 3-1-1 tempo recommendation',
        'Full active range reached before turnaround',
      );
    } else {
      // DETAILED / ADVANCED
      baseChecklist.push(
        'Pre-tension: Latissimus dorsi and intra-abdominal pressure locked',
        'Joint kinematics: Symmetrical bilateral hip hinge & knee flexion',
        'Turnaround elasticity: Eliminate rebound; control deceleration phase',
        'Full concentric extension without hyperextending lumbar spine',
        'Breathing sync: Diaphragmatic inhalation with eccentric loading',
      );
    }

    // -----------------------------------------------------------------------
    // RULE 7: Targeted Review Recommendation
    // -----------------------------------------------------------------------
    const needsReview = knowledgeScore != null && knowledgeScore < 75;
    const reviewPhases: string[] = [];
    if (needsReview && exercise.movementPhases.length > 0) {
      // Recommend middle and turnaround phases
      const targetPhase =
        exercise.movementPhases.find((p) => p.phaseType === 'TURNAROUND' || p.phaseType === 'ECCENTRIC') ||
        exercise.movementPhases[0];
      if (targetPhase) {
        reviewPhases.push(targetPhase.id);
      }
    }

    const instructionDepth =
      depth === 'BASIC'
        ? 'ESSENTIAL'
        : depth === 'ADVANCED'
          ? 'ADVANCED_BIOMECHANICAL'
          : 'COMPREHENSIVE';

    return {
      learningDepth: depth,
      recommendedMode: mode,
      orderedSections,
      preferredAngle: resolvedAngle,
      mediaSelection: {
        preferredAngle: resolvedAngle,
        activeMediaId: activeMedia?.id || null,
        isFallback,
      },
      playbackSpeed: speed,
      instructionDepth,
      practiceChecklist: baseChecklist,
      practiceMode: exercise.movementPattern === 'ISOMETRIC' ? 'TIMED' : 'REPS',
      knowledgeCheckConfig: {
        enabled: preferences.knowledgeCheckPreference,
        recommendedDifficulty: depth === 'BASIC' ? 'BASIC' : depth === 'ADVANCED' ? 'ADVANCED' : 'STANDARD',
        questionCount: depth === 'BASIC' ? 3 : depth === 'ADVANCED' ? 5 : 4,
      },
      targetedReviewRecommended: needsReview,
      recommendedReviewPhases: reviewPhases,
      estimatedLearningTimeMinutes: depth === 'BASIC' ? 4 : depth === 'ADVANCED' ? 8 : 6,
      personalizationReason: rationale,
    };
  }

  /**
   * Retrieve full personalized exercise tutorial payload.
   */
  async getPersonalizedTutorial(
    organisationId: string,
    exerciseId: string,
    actor: AuthenticatedUser,
  ): Promise<PersonalizedTutorialResponseDto> {
    const tutorial = await this.tutorialService.getExerciseTutorial(
      organisationId,
      exerciseId,
      actor,
    );

    const plan = await this.buildPersonalizedTutorialPlan(
      organisationId,
      exerciseId,
      actor.id,
      actor,
    );

    const progress = await this.prisma.exerciseLearningProgress.findUnique({
      where: { userId_exerciseId: { userId: actor.id, exerciseId } },
    });

    const tutProgress = (progress?.tutorialProgress as any) || {};

    return {
      tutorial,
      plan,
      learningContext: {
        hasCompletedTutorial: progress?.status === 'COMPLETED' || !!progress?.completedAt,
        completedSteps: progress?.completedSteps || 0,
        totalSteps: progress?.totalSteps || 0,
        knowledgeCheckScore: tutProgress.knowledgeCheckScore ?? null,
        phasesExplored: progress?.phasesExplored ?? false,
        lastInteractedAt: progress?.lastInteractedAt?.toISOString() ?? null,
      },
    };
  }

  // =========================================================================
  // 3. TARGETED REVIEW & FOCUSED REHEARSAL
  // =========================================================================

  /**
   * Retrieve targeted checkpoints for focused movement phase and mistake review.
   */
  async getTargetedReview(
    organisationId: string,
    exerciseId: string,
    userId: string,
  ): Promise<TargetedReviewResponseDto> {
    const exercise = await this.prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        OR: [{ ownershipType: 'SYSTEM' }, { organisationId }],
      },
      include: {
        movementPhases: { where: { status: 'PUBLISHED' }, orderBy: { orderIndex: 'asc' } },
        commonMistakes: { orderBy: { sortOrder: 'asc' } },
        instruction: true,
      },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise not found: ${exerciseId}`);
    }

    const phases = exercise.movementPhases.map((p) => ({
      id: p.id,
      name: p.phaseName,
      cue: p.cueText || 'Focus on controlled muscle tension and joint tracking.',
      orderIndex: p.orderIndex,
    }));

    const mistakes = exercise.commonMistakes.map((m) => ({
      id: m.id,
      name: m.mistake,
      cue: m.correction || 'Keep core engaged and posture balanced.',
      severity: m.severity,
    }));

    return {
      exerciseId,
      exerciseName: exercise.name,
      suggestedPhases: phases,
      commonMistakesToAvoid: mistakes,
      breathingGuidance:
        exercise.instruction?.breathingSummary || exercise.breathingInstructions || null,
      reviewPrompt:
        'Targeted Review Mode: Focus on the specific movement phases and avoidance cues below to solidify correct technique.',
    };
  }

  // =========================================================================
  // 4. LEARNING RECOMMENDATIONS
  // =========================================================================

  /**
   * Retrieve member personalized learning recommendations:
   * 1. Continue Learning (in-progress tutorials)
   * 2. Review Recommended (completed with lower scores or missed practice)
   * 3. Recently Mastered (completed with >= 80% score)
   */
  async getRecommendations(
    organisationId: string,
    userId: string,
  ): Promise<LearningRecommendationsResponseDto> {
    const progresses = await this.prisma.exerciseLearningProgress.findMany({
      where: { userId },
      include: {
        exercise: {
          select: {
            id: true,
            name: true,
            difficulty: true,
          },
        },
      },
      orderBy: { lastInteractedAt: 'desc' },
      take: 20,
    });

    const continueLearning: LearningRecommendationsResponseDto['continueLearning'] = [];
    const reviewRecommended: LearningRecommendationsResponseDto['reviewRecommended'] = [];
    const recentlyMastered: LearningRecommendationsResponseDto['recentlyMastered'] = [];

    for (const p of progresses) {
      const tut = (p.tutorialProgress as any) || {};
      const score = tut.knowledgeCheckScore as number | undefined;

      if (p.status === 'IN_PROGRESS' || (!p.completedAt && p.completedSteps > 0)) {
        continueLearning.push({
          exerciseId: p.exercise.id,
          name: p.exercise.name,
          difficulty: p.exercise.difficulty,
          completedSteps: p.completedSteps,
          totalSteps: p.totalSteps || 5,
          percentComplete: p.totalSteps ? Math.round((p.completedSteps / p.totalSteps) * 100) : 25,
          lastAccessedAt: p.lastInteractedAt.toISOString(),
        });
      } else if (p.status === 'COMPLETED') {
        if (score != null && score < 75) {
          reviewRecommended.push({
            exerciseId: p.exercise.id,
            name: p.exercise.name,
            difficulty: p.exercise.difficulty,
            reason: `Knowledge check score was ${score}%. Revisit key phases.`,
            lastScore: score,
          });
        } else {
          recentlyMastered.push({
            exerciseId: p.exercise.id,
            name: p.exercise.name,
            difficulty: p.exercise.difficulty,
            completedAt: (p.completedAt || p.updatedAt).toISOString(),
            score: score ?? null,
          });
        }
      }
    }

    return {
      continueLearning,
      reviewRecommended,
      recentlyMastered,
    };
  }
}
