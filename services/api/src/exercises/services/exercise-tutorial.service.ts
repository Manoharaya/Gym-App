import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { ExerciseAnatomyService } from './exercise-anatomy.service';
import {
  ExerciseTutorialResponseDto,
  TutorialDemonstrationDto,
  TutorialPhaseDto,
  TutorialStepDto,
  TechniqueCoachingPanelDto,
  TutorialCommonMistakeDto,
  TutorialSafetyGuidelineDto,
  TutorialEquipmentDto,
  TutorialMusclesDto,
  TutorialVariationsDto,
  TutorialUserProgressDto,
  TutorialKnowledgeCheckDto,
  TutorialRelatedLearningDto,
  UpdateExerciseTutorialConfigDto,
  StartExerciseTutorialDto,
  UpdateExerciseTutorialProgressDto,
  CompleteExerciseTutorialDto,
  TutorialMode,
} from '../dto/exercise-tutorial.dto';

@Injectable()
export class ExerciseTutorialService {
  private readonly logger = new Logger(ExerciseTutorialService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly anatomyService: ExerciseAnatomyService,
  ) {}

  /**
   * Check if actor is superadmin
   */
  private isSuperAdmin(actor?: AuthenticatedUser): boolean {
    if (!actor) return false;
    if ((actor as any).isSuperAdmin) return true;
    return (
      actor.roles?.some((r: any) => {
        const roleName = typeof r === 'string' ? r : r.role || r.name;
        return roleName === 'SUPERADMIN';
      }) ?? false
    );
  }

  /**
   * Check if actor is trainer, admin, or superadmin
   */
  private isTrainerOrAdmin(actor?: AuthenticatedUser): boolean {
    if (!actor) return false;
    if (this.isSuperAdmin(actor)) return true;
    return (
      actor.roles?.some((r: any) => {
        const roleName = typeof r === 'string' ? r : r.role || r.name;
        return roleName === 'TRAINER' || roleName === 'ADMIN' || roleName === 'CLUB_MANAGER';
      }) ?? false
    );
  }

  /**
   * Retrieve aggregated Interactive Exercise Tutorial payload
   */
  async getExerciseTutorial(
    organisationId: string,
    exerciseId: string,
    actor?: AuthenticatedUser,
  ): Promise<ExerciseTutorialResponseDto> {
    const isPrivileged = this.isTrainerOrAdmin(actor);

    // Fetch exercise with all nested relations in a single query
    const exercise = await this.prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        OR: [{ ownershipType: 'SYSTEM' }, { organisationId }],
        ...(isPrivileged ? {} : { contentStatus: 'PUBLISHED' }),
      },
      include: {
        media: {
          where: isPrivileged ? {} : { isPublished: true },
          orderBy: { sortOrder: 'asc' },
        },
        instruction: {
          include: {
            steps: {
              where: isPrivileged ? {} : { status: 'PUBLISHED' },
              orderBy: { stepNumber: 'asc' },
            },
          },
        },
        instructionSteps: {
          where: isPrivileged ? {} : { status: 'PUBLISHED' },
          orderBy: { stepNumber: 'asc' },
        },
        movementPhases: {
          where: isPrivileged ? {} : { status: 'PUBLISHED' },
          orderBy: { orderIndex: 'asc' },
        },
        commonMistakes: {
          orderBy: { sortOrder: 'asc' },
        },
        safetyGuidelines: {
          orderBy: { createdAt: 'asc' },
        },
        variationsFrom: {
          include: {
            targetExercise: {
              select: {
                id: true,
                name: true,
                slug: true,
                difficulty: true,
                equipment: true,
              },
            },
          },
        },
        variationsTo: {
          include: {
            baseExercise: {
              select: {
                id: true,
                name: true,
                slug: true,
                difficulty: true,
                equipment: true,
              },
            },
          },
        },
        equipmentRelations: true,
        muscleRelations: true,
        knowledgeChecks: {
          where: { contentStatus: 'PUBLISHED' },
          take: 1,
        },
      },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found or not accessible`);
    }

    // Fetch user progress if authenticated
    let userProgress: TutorialUserProgressDto | null = null;
    if (actor?.id) {
      const progress = await this.prisma.exerciseLearningProgress.findUnique({
        where: {
          userId_exerciseId: {
            userId: actor.id,
            exerciseId: exercise.id,
          },
        },
      });

      if (progress) {
        const rawTp = (progress.tutorialProgress as any) || {};
        userProgress = {
          status: (progress.status as any) || 'NOT_STARTED',
          currentMode: rawTp.currentMode || 'STEP_BY_STEP',
          currentPhaseIndex: rawTp.currentPhaseIndex ?? 0,
          currentStepIndex: rawTp.currentStepIndex ?? 0,
          completedSections: Array.isArray(rawTp.completedSections) ? rawTp.completedSections : [],
          checklistState: rawTp.checklistState || {},
          practiceCompleted: !!rawTp.practiceCompleted,
          practiceCompletedAt: rawTp.practiceCompletedAt || null,
          timeSpentSeconds: rawTp.timeSpentSeconds || 0,
          knowledgeCheckCompleted: !!rawTp.knowledgeCheckCompleted,
          knowledgeCheckScore: rawTp.knowledgeCheckScore ?? null,
          lastInteractedAt: progress.lastInteractedAt,
          completedAt: progress.completedAt,
        };
      }
    }

    // 1. Build demonstrations with fallback hierarchy: VIDEO -> ANIMATION/GIF -> IMAGE -> ILLUSTRATION
    const demonstrations: TutorialDemonstrationDto[] = [];
    if (exercise.media && exercise.media.length > 0) {
      const sortedMedia = [...exercise.media].sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
        const typePriority: Record<string, number> = {
          VIDEO: 1,
          ANIMATION: 2,
          GIF: 3,
          IMAGE: 4,
          ILLUSTRATION: 5,
        };
        const pA = typePriority[a.mediaType] || 99;
        const pB = typePriority[b.mediaType] || 99;
        if (pA !== pB) return pA - pB;
        return a.sortOrder - b.sortOrder;
      });

      for (const m of sortedMedia) {
        demonstrations.push({
          id: m.id,
          mediaType: m.mediaType,
          url: m.url || m.thumbnailUrl || '',
          thumbnailUrl: m.thumbnailUrl || null,
          durationSeconds: m.durationSeconds,
          isPrimary: m.isPrimary,
          purpose: m.purpose,
          altText: m.altText || `${exercise.name} Demonstration`,
        });
      }
    }

    // Fallback if no media exists
    if (demonstrations.length === 0) {
      demonstrations.push({
        id: `fallback-media-${exercise.id}`,
        mediaType: 'IMAGE',
        url: '',
        thumbnailUrl: null,
        durationSeconds: null,
        isPrimary: true,
        purpose: 'PRIMARY_DEMONSTRATION',
        altText: `${exercise.name} Demonstration Placeholder`,
      });
    }

    // 2. Format Movement Phases
    const phases: TutorialPhaseDto[] = (exercise.movementPhases || []).map((phase) => ({
      id: phase.id,
      orderIndex: phase.orderIndex,
      phaseName: phase.phaseName,
      phaseType: phase.phaseType,
      title: phase.title || phase.phaseName,
      description: phase.description,
      cueText: phase.cueText,
      bodyPosition: phase.bodyPosition,
      bodyOrientation: phase.bodyOrientation,
      jointAlignments: phase.jointAlignments,
      rangeOfMotionType: phase.rangeOfMotionType,
      breathingPattern: phase.breathingPattern,
      breathingNotes: phase.breathingNotes,
      tempoSeconds: phase.tempoSeconds,
      visualCues: phase.visualCues,
      commonMistakes: phase.commonMistakes,
      safetyNotes: phase.safetyNotes,
      phaseMuscles: phase.phaseMuscles,
      videoStartTimeSeconds: phase.videoStartTimeSeconds,
      videoEndTimeSeconds: phase.videoEndTimeSeconds,
    }));

    // Fallback phases if none authored yet
    if (phases.length === 0) {
      phases.push(
        {
          id: `phase-setup-${exercise.id}`,
          orderIndex: 0,
          phaseName: 'SETUP',
          phaseType: 'SETUP',
          title: 'Setup & Starting Stance',
          description:
            exercise.setupInstructions ||
            'Position body with stable base of support, neutral spine, and engaged core.',
          cueText: 'Brace core and set joint alignment.',
          bodyPosition: exercise.bodyPosition || 'STANDING',
          bodyOrientation: 'UPRIGHT',
          rangeOfMotionType: 'STARTING',
          breathingPattern: 'INHALE_PREPARATION',
          breathingNotes: 'Take a deep diaphragmatic breath and brace intra-abdominally.',
          tempoSeconds: 2,
          videoStartTimeSeconds: 0,
          videoEndTimeSeconds: 2,
        },
        {
          id: `phase-eccentric-${exercise.id}`,
          orderIndex: 1,
          phaseName: 'DESCENT',
          phaseType: 'ECCENTRIC',
          title: 'Controlled Lengthening (Eccentric)',
          description: 'Lower or lengthen under deliberate muscular control through the full active range.',
          cueText: 'Control the descent; do not drop into position.',
          bodyPosition: exercise.bodyPosition || 'STANDING',
          bodyOrientation: 'UPRIGHT',
          rangeOfMotionType: 'FULL',
          breathingPattern: 'HOLD_BRACE',
          breathingNotes: 'Maintain intra-abdominal pressure throughout lowering.',
          tempoSeconds: 3,
          videoStartTimeSeconds: 2,
          videoEndTimeSeconds: 5,
        },
        {
          id: `phase-transition-${exercise.id}`,
          orderIndex: 2,
          phaseName: 'TRANSITION',
          phaseType: 'TRANSITION_BOTTOM',
          title: 'Inflection Point / Transition',
          description: 'Reach maximum active depth without bouncing or collapsing joint stability.',
          cueText: 'Stay tight at the bottom; do not lose spinal alignment.',
          bodyPosition: exercise.bodyPosition || 'STANDING',
          bodyOrientation: 'UPRIGHT',
          rangeOfMotionType: 'PEAK_STRETCH',
          breathingPattern: 'HOLD_BRACE',
          breathingNotes: 'Hold stable breath brace through turnaround.',
          tempoSeconds: 1,
          videoStartTimeSeconds: 5,
          videoEndTimeSeconds: 6,
        },
        {
          id: `phase-concentric-${exercise.id}`,
          orderIndex: 3,
          phaseName: 'ASCENT',
          phaseType: 'CONCENTRIC',
          title: 'Forceful Drive (Concentric)',
          description: 'Drive forcefully through the prime movers back toward the starting position.',
          cueText: 'Drive through the floor/handles with explosive intent.',
          bodyPosition: exercise.bodyPosition || 'STANDING',
          bodyOrientation: 'UPRIGHT',
          rangeOfMotionType: 'FULL',
          breathingPattern: 'EXHALE_EFFORT',
          breathingNotes: 'Exhale forcefully through pursed lips past the sticking point.',
          tempoSeconds: 1,
          videoStartTimeSeconds: 6,
          videoEndTimeSeconds: 7,
        },
        {
          id: `phase-lockout-${exercise.id}`,
          orderIndex: 4,
          phaseName: 'LOCKOUT',
          phaseType: 'LOCKOUT_FINISH',
          title: 'Lockout & Reset',
          description: 'Return to complete extension under control without joint hyperextension.',
          cueText: 'Finish tall with neutral joints and reset breath.',
          bodyPosition: exercise.bodyPosition || 'STANDING',
          bodyOrientation: 'UPRIGHT',
          rangeOfMotionType: 'TERMINAL',
          breathingPattern: 'EXHALE_RECOVERY',
          breathingNotes: 'Complete exhale, re-brace, and prepare for next repetition.',
          tempoSeconds: 1,
          videoStartTimeSeconds: 7,
          videoEndTimeSeconds: 8,
        },
      );
    }

    // 3. Format Instruction Steps
    const rawSteps =
      exercise.instruction?.steps && exercise.instruction.steps.length > 0
        ? exercise.instruction.steps
        : exercise.instructionSteps && exercise.instructionSteps.length > 0
        ? exercise.instructionSteps
        : [];

    const steps: TutorialStepDto[] = rawSteps.map((s) => ({
      id: s.id,
      stepNumber: s.stepNumber,
      stepType: s.stepType,
      phase: s.phase,
      movementPhase: s.movementPhase,
      title: s.title,
      description: s.description,
      detailedInstruction: s.detailedInstruction,
      coachingCue: s.coachingCue,
      bodyPosition: s.bodyPosition,
      breathing: s.breathing,
      tempo: s.tempo,
      visualCue: s.visualCue,
      visualCueCategory: s.visualCueCategory,
      videoStartTimeSeconds: s.videoStartTimeSeconds,
      videoEndTimeSeconds: s.videoEndTimeSeconds,
    }));

    // Fallback steps if none exist
    if (steps.length === 0) {
      steps.push(
        {
          id: `step-1-${exercise.id}`,
          stepNumber: 1,
          stepType: 'PREPARATION',
          phase: 'SETUP',
          movementPhase: 'SETUP',
          title: 'Establish Stance & Alignment',
          description:
            exercise.setupInstructions ||
            'Stand or position with feet shoulder-width apart, spine neutral, and shoulders packed.',
          coachingCue: 'Feet flat, spine neutral, eyes forward.',
          bodyPosition: exercise.bodyPosition || 'STANDING',
          breathing: 'Inhale to prepare and brace core.',
          tempo: '2s',
          visualCue: 'Check that feet are planted and knees track in line with toes.',
          visualCueCategory: 'ALIGNMENT',
          videoStartTimeSeconds: 0,
          videoEndTimeSeconds: 2,
        },
        {
          id: `step-2-${exercise.id}`,
          stepNumber: 2,
          stepType: 'EXECUTION',
          phase: 'EXECUTION',
          movementPhase: 'ECCENTRIC',
          title: 'Controlled Descent / Extension',
          description:
            exercise.executionInstructions ||
            'Lower the weight or body under full muscular tension for 3 seconds.',
          coachingCue: 'Hips and knees break in rhythm; keep chest upright.',
          bodyPosition: exercise.bodyPosition || 'STANDING',
          breathing: 'Maintain brace throughout lowering.',
          tempo: '3s',
          visualCue: 'Maintain active core tension and do not let lower back round.',
          visualCueCategory: 'POSTURE',
          videoStartTimeSeconds: 2,
          videoEndTimeSeconds: 5,
        },
        {
          id: `step-3-${exercise.id}`,
          stepNumber: 3,
          stepType: 'EXECUTION',
          phase: 'EXECUTION',
          movementPhase: 'CONCENTRIC',
          title: 'Drive to Finish',
          description: 'Press through feet or pull handles explosively to return to start.',
          coachingCue: 'Drive upward with speed and intent.',
          bodyPosition: exercise.bodyPosition || 'STANDING',
          breathing: 'Exhale forcefully past sticking point.',
          tempo: '1s',
          visualCue: 'Maintain level shoulders and knees tracking outward.',
          visualCueCategory: 'FOCUS',
          videoStartTimeSeconds: 5,
          videoEndTimeSeconds: 7,
        },
      );
    }

    // 4. Technique Coaching Panel Data
    const coaching: TechniqueCoachingPanelDto = {
      setup: exercise.setupInstructions
        ? [exercise.setupInstructions]
        : [
            'Ensure equipment is securely racked and weight collar locked.',
            'Position body with stable foot and hand width.',
            'Engage 360-degree intra-abdominal pressure before initiating movement.',
          ],
      position: {
        feet: 'Feet flat on floor, shoulder-width apart, weight evenly balanced between heel and midfoot.',
        hands: 'Symmetrical grip with knuckles rotated around bar/handles and wrists neutral.',
        spine: 'Neutral cervical, thoracic, and lumbar alignment; avoid hyperextension.',
        head: 'Neck neutral, gaze fixed approximately 2-3 meters forward.',
        core: 'Ribcage pulled down toward pelvis, transverse abdominis engaged.',
      },
      movement: {
        direction: exercise.movementPattern === 'PULL' ? 'Toward body center' : 'Away from center',
        movementPattern: exercise.movementPattern,
        phase: 'Full bilateral movement cycle',
        rangeOfMotion: exercise.rangeOfMotion || 'Complete active joint range of motion',
      },
      breathing: {
        pattern:
          exercise.breathingInstructions ||
          'Inhale and brace before eccentric lowering; exhale past concentric peak.',
        cues: [
          'Diaphragmatic inhale into lower abdomen during setup.',
          'Hold intra-abdominal brace through bottom transition.',
          'Forceful exhale past the sticking point.',
        ],
      },
      tempo: {
        value: exercise.tempo || '3-0-1-0',
        explanation: '3s eccentric lowering, 0s pause, 1s explosive concentric, 0s lockout reset',
      },
    };

    // 5. Common Mistakes
    const commonMistakes: TutorialCommonMistakeDto[] = (exercise.commonMistakes || []).map(
      (m) => ({
        id: m.id,
        mistake: m.mistake,
        consequence: m.consequence,
        correction: m.correction,
        severity: m.severity,
        mediaUrl: m.mediaUrl,
      }),
    );

    // Fallback mistakes if none configured
    if (commonMistakes.length === 0) {
      if (exercise.movementPattern === 'SQUAT') {
        commonMistakes.push({
          id: `mistake-squat-valgus-${exercise.id}`,
          mistake: 'Knee Valgus (Knees Caving Inward)',
          consequence: 'Increases shear stress across the ACL and reduces gluteus medius recruitment.',
          correction: 'Actively drive knees outward over pinky toes throughout descent and ascent.',
          severity: 'MODERATE',
        });
      } else if (exercise.movementPattern === 'HINGE') {
        commonMistakes.push({
          id: `mistake-hinge-spine-${exercise.id}`,
          mistake: 'Lumbar Flexion (Spinal Rounding)',
          consequence: 'Transfers shear load directly onto lumbar intervertebral discs.',
          correction: 'Push hips backward with a proud chest; soften knees without squatting.',
          severity: 'SEVERE',
        });
      } else {
        commonMistakes.push({
          id: `mistake-generic-tempo-${exercise.id}`,
          mistake: 'Rushing the Eccentric Phase (Using Momentum)',
          consequence: 'Dramatically decreases mechanical tension and increases risk of joint strain.',
          correction: 'Control every descent for at least 2-3 seconds without bouncing.',
          severity: 'MODERATE',
        });
      }
    }

    // 6. Safety Guidelines
    const safetyGuidelines: TutorialSafetyGuidelineDto[] = (
      exercise.safetyGuidelines || []
    ).map((sg) => ({
      id: sg.id,
      category: sg.category,
      title: sg.title || 'Technique Precaution',
      description: sg.description,
      severity: sg.severity,
    }));

    // Fallback safety notes
    if (safetyGuidelines.length === 0) {
      safetyGuidelines.push(
        {
          id: `safety-before-${exercise.id}`,
          category: 'BEFORE_YOU_START',
          title: 'Pre-Movement Check',
          description:
            exercise.safetyNotes ||
            'Perform a light dynamic warm-up and ensure clean joint mobility before adding external resistance.',
          severity: 'STANDARD',
        },
        {
          id: `safety-during-${exercise.id}`,
          category: 'DURING_MOVEMENT',
          title: 'Spinal Alignment & Joint Health',
          description: 'Cease the repetition immediately if you experience sharp or radiating joint pain.',
          severity: 'HIGH',
        },
        {
          id: `safety-modify-${exercise.id}`,
          category: 'STOP_OR_MODIFY',
          title: 'Fatigue & Form Breakdown',
          description: 'Terminate the set if form degrades and prevents maintaining neutral spine.',
          severity: 'STANDARD',
        },
      );
    }

    // 7. Equipment
    const requiredEq: string[] = [];
    const optionalEq: string[] = [];
    const altEq: Array<{ from: string; to: string; notes?: string }> = [];

    if (exercise.equipment && exercise.equipment !== 'NONE' && exercise.equipment !== 'BODYWEIGHT') {
      if (exercise.equipmentRequirement === 'OPTIONAL') {
        optionalEq.push(exercise.equipment);
      } else {
        requiredEq.push(exercise.equipment);
      }
    } else {
      optionalEq.push('BODYWEIGHT');
    }

    if (exercise.equipmentRelations) {
      for (const eq of exercise.equipmentRelations) {
        const eqName = eq.equipmentName || 'EQUIPMENT';
        if (!eq.isOptional && !requiredEq.includes(eqName)) {
          requiredEq.push(eqName);
        } else if (eq.isOptional && !optionalEq.includes(eqName)) {
          optionalEq.push(eqName);
        }
      }
    }

    // Suggest default alternatives
    if (requiredEq.includes('BARBELL')) {
      altEq.push({
        from: 'BARBELL',
        to: 'DUMBBELL',
        notes: 'Allows independent unilateral arm path and reduces bilateral wrist stiffness.',
      });
    }
    if (requiredEq.includes('DUMBBELL')) {
      altEq.push({
        from: 'DUMBBELL',
        to: 'RESISTANCE_BAND',
        notes: 'Provides ascending variable tension with joint-friendly resistance curves.',
      });
    }

    const equipment: TutorialEquipmentDto = {
      required: requiredEq,
      optional: optionalEq,
      alternatives: altEq,
    };

    // 8. Muscles
    const primaryMuscles: string[] = [];
    const secondaryMuscles: string[] = [];
    const stabilizerMuscles: string[] = [];

    if (exercise.muscleRelations && exercise.muscleRelations.length > 0) {
      for (const mr of exercise.muscleRelations) {
        if (mr.role === 'PRIMARY') primaryMuscles.push(mr.muscle);
        else if (mr.role === 'SECONDARY') secondaryMuscles.push(mr.muscle);
        else if (mr.role === 'STABILIZER') stabilizerMuscles.push(mr.muscle);
      }
    }

    if (primaryMuscles.length === 0 && exercise.primaryMuscleGroup) {
      primaryMuscles.push(exercise.primaryMuscleGroup);
    }
    if (secondaryMuscles.length === 0 && Array.isArray(exercise.secondaryMuscleGroups)) {
      secondaryMuscles.push(...(exercise.secondaryMuscleGroups as string[]));
    }
    if (stabilizerMuscles.length === 0 && Array.isArray(exercise.stabilizerMuscles)) {
      stabilizerMuscles.push(...(exercise.stabilizerMuscles as string[]));
    }

    const muscles: TutorialMusclesDto = {
      primary: primaryMuscles,
      secondary: secondaryMuscles,
      stabilizers: stabilizerMuscles,
    };

    // 9. Variations
    const progressions: any[] = [];
    const regressions: any[] = [];
    const alternatives: any[] = [];

    if (exercise.variationsFrom) {
      for (const v of exercise.variationsFrom) {
        if (v.relationshipType === 'PROGRESSION') progressions.push(v.targetExercise);
        else if (v.relationshipType === 'REGRESSION') regressions.push(v.targetExercise);
        else alternatives.push(v.targetExercise);
      }
    }
    if (exercise.variationsTo) {
      for (const v of exercise.variationsTo) {
        if (v.relationshipType === 'PROGRESSION') regressions.push(v.baseExercise);
        else if (v.relationshipType === 'REGRESSION') progressions.push(v.baseExercise);
      }
    }

    const variations: TutorialVariationsDto = {
      progressions,
      regressions,
      alternatives,
    };

    // 10. Why It Works (Authored or Deterministic Fallback)
    const whyItWorks =
      exercise.whyItWorks && typeof exercise.whyItWorks === 'object'
        ? {
            ...(exercise.whyItWorks as any),
            educationalDisclaimer:
              'Fitness education only. Not intended as medical diagnosis, rehabilitation prescription, or medical treatment.',
          }
        : {
            overview: `The ${exercise.name} utilizes the ${exercise.movementPattern} pattern for multi-joint neuromuscular development.`,
            mechanicsExplanation:
              'Moves resistance through active kinematic chains with synchronized muscular contraction.',
            primaryDrivers: primaryMuscles.length > 0 ? primaryMuscles : [exercise.primaryMuscleGroup],
            jointAction: 'Full active joint flexion and extension',
            stabilizationFocus: 'Spinal and core rigidity to prevent energy leakage and joint shear.',
            benefits: [
              'Builds functional strength along compound movement pathways',
              'Develops joint stability and postural endurance',
              'Improves motor unit recruitment and muscular coordination',
            ],
            educationalDisclaimer:
              'Fitness education only. Not intended as medical diagnosis, rehabilitation prescription, or medical treatment.',
          };

    // 11. Attached Knowledge Check
    const kc = exercise.knowledgeChecks && exercise.knowledgeChecks[0];
    const knowledgeCheck: TutorialKnowledgeCheckDto | null = kc
      ? {
          id: kc.id,
          title: kc.title,
          passingScore: kc.passingScore,
          questionCount: kc.questionCount,
        }
      : null;

    // 12. Tutorial Config
    const rawConfig = (exercise.tutorialConfig as any) || {};
    const defaultChecklist = [
      'Stance & foot positioning stable',
      'Neutral spine & engaged core brace',
      'Controlled eccentric tempo throughout descent',
      'Turnaround without bouncing or collapse',
      'Explosive concentric drive with breath exhalation',
      'Controlled lockout without hyperextension',
    ];

    const tutorialConfig = {
      checklist:
        Array.isArray(rawConfig.checklist) && rawConfig.checklist.length > 0
          ? rawConfig.checklist
          : defaultChecklist,
      audioGuidanceUrl: rawConfig.audioGuidanceUrl || null,
      audioGuidanceTranscript: rawConfig.audioGuidanceTranscript || null,
      defaultMode: (rawConfig.defaultMode as TutorialMode) || 'STEP_BY_STEP',
      estimatedMinutes: rawConfig.estimatedMinutes || 5,
      keyTechniquePoints:
        Array.isArray(rawConfig.keyTechniquePoints) && rawConfig.keyTechniquePoints.length > 0
          ? rawConfig.keyTechniquePoints
          : [
              'Maintain full-foot pressure (tripod foot).',
              'Keep ribcage stacked over pelvis.',
              'Move with controlled cadence (3s eccentric).',
            ],
    };

    // 13. Related Learning
    const relatedExercises = await this.prisma.exercise.findMany({
      where: {
        id: { not: exercise.id },
        contentStatus: 'PUBLISHED',
        OR: [
          { movementPattern: exercise.movementPattern },
          { primaryMuscleGroup: exercise.primaryMuscleGroup },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        difficulty: true,
        equipment: true,
      },
      take: 4,
    });

    const rawLearningPaths = await this.prisma.learningPath.findMany({
      where: {
        contentStatus: 'PUBLISHED',
        lessons: {
          some: { exerciseId: exercise.id },
        },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
      },
      take: 3,
    });

    const learningPaths = rawLearningPaths.map((lp) => ({
      id: lp.id,
      title: lp.title,
      slug: lp.slug,
      category: lp.category || 'GENERAL',
    }));

    const relatedLearning: TutorialRelatedLearningDto = {
      movementPattern: exercise.movementPattern,
      primaryMuscle: exercise.primaryMuscleGroup,
      relatedExercises,
      learningPaths,
    };

    return {
      exercise: {
        id: exercise.id,
        name: exercise.name,
        slug: exercise.slug,
        difficulty: exercise.difficulty,
        equipment: exercise.equipment,
        movementPattern: exercise.movementPattern,
        primaryMuscleGroup: exercise.primaryMuscleGroup,
        secondaryMuscleGroups: Array.isArray(exercise.secondaryMuscleGroups)
          ? (exercise.secondaryMuscleGroups as string[])
          : [],
        description: exercise.description,
        setupInstructions: exercise.setupInstructions,
        executionInstructions: exercise.executionInstructions,
        safetyNotes: exercise.safetyNotes,
        tempo: exercise.tempo,
        breathingInstructions: exercise.breathingInstructions,
        rangeOfMotion: exercise.rangeOfMotion,
      },
      tutorialConfig,
      demonstrations,
      phases,
      steps,
      coaching,
      commonMistakes,
      safetyGuidelines,
      equipment,
      muscles,
      variations,
      whyItWorks,
      knowledgeCheck,
      userProgress,
      relatedLearning,
    };
  }

  /**
   * Get user tutorial progress
   */
  async getTutorialProgress(
    organisationId: string,
    exerciseId: string,
    userId: string,
  ): Promise<TutorialUserProgressDto> {
    const progress = await this.prisma.exerciseLearningProgress.findUnique({
      where: {
        userId_exerciseId: { userId, exerciseId },
      },
    });

    if (!progress) {
      return {
        status: 'NOT_STARTED',
        currentMode: 'STEP_BY_STEP',
        currentPhaseIndex: 0,
        currentStepIndex: 0,
        completedSections: [],
        checklistState: {},
        practiceCompleted: false,
        practiceCompletedAt: null,
        timeSpentSeconds: 0,
        knowledgeCheckCompleted: false,
        knowledgeCheckScore: null,
        lastInteractedAt: new Date(),
        completedAt: null,
      };
    }

    const rawTp = (progress.tutorialProgress as any) || {};
    return {
      status: (progress.status as any) || 'NOT_STARTED',
      currentMode: rawTp.currentMode || 'STEP_BY_STEP',
      currentPhaseIndex: rawTp.currentPhaseIndex ?? 0,
      currentStepIndex: rawTp.currentStepIndex ?? 0,
      completedSections: Array.isArray(rawTp.completedSections) ? rawTp.completedSections : [],
      checklistState: rawTp.checklistState || {},
      practiceCompleted: !!rawTp.practiceCompleted,
      practiceCompletedAt: rawTp.practiceCompletedAt || null,
      timeSpentSeconds: rawTp.timeSpentSeconds || 0,
      knowledgeCheckCompleted: !!rawTp.knowledgeCheckCompleted,
      knowledgeCheckScore: rawTp.knowledgeCheckScore ?? null,
      lastInteractedAt: progress.lastInteractedAt,
      completedAt: progress.completedAt,
    };
  }

  /**
   * Start or resume exercise tutorial
   */
  async startTutorial(
    organisationId: string,
    exerciseId: string,
    userId: string,
    dto: StartExerciseTutorialDto,
  ): Promise<TutorialUserProgressDto> {
    const existing = await this.prisma.exerciseLearningProgress.findUnique({
      where: { userId_exerciseId: { userId, exerciseId } },
    });

    const currentTp = (existing?.tutorialProgress as any) || {};
    const newMode = dto.mode || currentTp.currentMode || 'STEP_BY_STEP';
    const completedSections = Array.isArray(currentTp.completedSections)
      ? currentTp.completedSections
      : ['OVERVIEW'];

    if (!completedSections.includes('OVERVIEW')) {
      completedSections.push('OVERVIEW');
    }

    const updatedTp = {
      ...currentTp,
      currentMode: newMode,
      currentPhaseIndex: currentTp.currentPhaseIndex ?? 0,
      currentStepIndex: currentTp.currentStepIndex ?? 0,
      completedSections,
    };

    const status = existing?.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS';

    const saved = await this.prisma.exerciseLearningProgress.upsert({
      where: { userId_exerciseId: { userId, exerciseId } },
      create: {
        userId,
        exerciseId,
        organisationId,
        status,
        completedSteps: 1,
        totalSteps: 5,
        lastStepNumber: 1,
        mediaViewed: true,
        instructionsViewed: true,
        tutorialProgress: updatedTp,
        lastInteractedAt: new Date(),
      },
      update: {
        status,
        mediaViewed: true,
        instructionsViewed: true,
        tutorialProgress: updatedTp,
        lastInteractedAt: new Date(),
      },
    });

    return this.getTutorialProgress(organisationId, exerciseId, userId);
  }

  /**
   * Checkpoint tutorial progress
   */
  async recordTutorialProgress(
    organisationId: string,
    exerciseId: string,
    userId: string,
    dto: UpdateExerciseTutorialProgressDto,
  ): Promise<TutorialUserProgressDto> {
    const existing = await this.prisma.exerciseLearningProgress.findUnique({
      where: { userId_exerciseId: { userId, exerciseId } },
    });

    const currentTp = (existing?.tutorialProgress as any) || {};
    const completedSections: string[] = Array.isArray(currentTp.completedSections)
      ? [...currentTp.completedSections]
      : [];

    if (dto.section && !completedSections.includes(dto.section)) {
      completedSections.push(dto.section);
    }

    const checklistState = {
      ...(currentTp.checklistState || {}),
      ...(dto.checklistState || {}),
    };

    const updatedTp = {
      ...currentTp,
      currentMode: dto.mode || currentTp.currentMode || 'STEP_BY_STEP',
      currentPhaseIndex: dto.phaseIndex !== undefined ? dto.phaseIndex : currentTp.currentPhaseIndex ?? 0,
      currentStepIndex: dto.stepIndex !== undefined ? dto.stepIndex : currentTp.currentStepIndex ?? 0,
      completedSections,
      checklistState,
      practiceCompleted:
        dto.practiceCompleted !== undefined ? dto.practiceCompleted : currentTp.practiceCompleted ?? false,
      practiceCompletedAt: dto.practiceCompleted
        ? new Date().toISOString()
        : currentTp.practiceCompletedAt,
      timeSpentSeconds: (currentTp.timeSpentSeconds || 0) + (dto.timeSpentSeconds || 0),
    };

    await this.prisma.exerciseLearningProgress.upsert({
      where: { userId_exerciseId: { userId, exerciseId } },
      create: {
        userId,
        exerciseId,
        organisationId,
        status: 'IN_PROGRESS',
        completedSteps: dto.stepIndex ? dto.stepIndex + 1 : 1,
        totalSteps: 5,
        lastStepNumber: dto.stepIndex ? dto.stepIndex + 1 : 1,
        tutorialProgress: updatedTp,
        lastInteractedAt: new Date(),
      },
      update: {
        completedSteps: dto.stepIndex ? dto.stepIndex + 1 : undefined,
        tutorialProgress: updatedTp,
        lastInteractedAt: new Date(),
      },
    });

    return this.getTutorialProgress(organisationId, exerciseId, userId);
  }

  /**
   * Complete exercise tutorial
   */
  async completeTutorial(
    organisationId: string,
    exerciseId: string,
    userId: string,
    dto: CompleteExerciseTutorialDto,
  ): Promise<TutorialUserProgressDto> {
    const existing = await this.prisma.exerciseLearningProgress.findUnique({
      where: { userId_exerciseId: { userId, exerciseId } },
    });

    const currentTp = (existing?.tutorialProgress as any) || {};
    const completedSections: string[] = Array.isArray(currentTp.completedSections)
      ? [...currentTp.completedSections]
      : [];

    for (const sec of ['OVERVIEW', 'DEMONSTRATION', 'COACHING', 'PRACTICE', 'COMPLETE']) {
      if (!completedSections.includes(sec)) completedSections.push(sec);
    }

    const updatedTp = {
      ...currentTp,
      completedSections,
      practiceCompleted: true,
      practiceCompletedAt: currentTp.practiceCompletedAt || new Date().toISOString(),
      timeSpentSeconds: (currentTp.timeSpentSeconds || 0) + (dto.timeSpentSeconds || 0),
      knowledgeCheckCompleted: dto.knowledgeCheckScore !== undefined ? true : currentTp.knowledgeCheckCompleted,
      knowledgeCheckScore:
        dto.knowledgeCheckScore !== undefined ? dto.knowledgeCheckScore : currentTp.knowledgeCheckScore,
    };

    const completedAt = new Date();

    await this.prisma.exerciseLearningProgress.upsert({
      where: { userId_exerciseId: { userId, exerciseId } },
      create: {
        userId,
        exerciseId,
        organisationId,
        status: 'COMPLETED',
        completedSteps: 5,
        totalSteps: 5,
        lastStepNumber: 5,
        mediaViewed: true,
        instructionsViewed: true,
        phasesExplored: true,
        completedAt,
        tutorialProgress: updatedTp,
        lastInteractedAt: completedAt,
      },
      update: {
        status: 'COMPLETED',
        mediaViewed: true,
        instructionsViewed: true,
        phasesExplored: true,
        completedAt: existing?.completedAt || completedAt,
        tutorialProgress: updatedTp,
        lastInteractedAt: completedAt,
      },
    });

    return this.getTutorialProgress(organisationId, exerciseId, userId);
  }

  /**
   * Author or update tutorial configuration (Trainer/Admin/Superadmin only)
   */
  async updateTutorialConfig(
    organisationId: string,
    exerciseId: string,
    actor: AuthenticatedUser,
    dto: UpdateExerciseTutorialConfigDto,
  ) {
    if (!this.isTrainerOrAdmin(actor)) {
      throw new ForbiddenException({
        code: 'ROLE_UNAUTHORIZED',
        message: 'Only trainers, gym managers, and administrators can author tutorial configurations',
      });
    }

    const exercise = await this.prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        OR: [{ ownershipType: 'SYSTEM' }, { organisationId }],
      },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found or not accessible`);
    }

    // Protect system exercise from non-superadmins
    if (exercise.ownershipType === 'SYSTEM' && !this.isSuperAdmin(actor)) {
      throw new ForbiddenException({
        code: 'SYSTEM_EXERCISE_IMMUTABLE',
        message: 'System exercises are immutable to gym staff; only superadmins can modify them',
      });
    }

    // IDOR protection: cannot modify exercise belonging to another tenant
    if (exercise.organisationId && exercise.organisationId !== organisationId) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found or not accessible`);
    }

    const existingConfig = (exercise.tutorialConfig as any) || {};
    const updatedConfig = {
      ...existingConfig,
      ...(dto.checklist !== undefined ? { checklist: dto.checklist } : {}),
      ...(dto.audioGuidanceUrl !== undefined ? { audioGuidanceUrl: dto.audioGuidanceUrl } : {}),
      ...(dto.audioGuidanceTranscript !== undefined
        ? { audioGuidanceTranscript: dto.audioGuidanceTranscript }
        : {}),
      ...(dto.defaultMode !== undefined ? { defaultMode: dto.defaultMode } : {}),
      ...(dto.estimatedMinutes !== undefined ? { estimatedMinutes: dto.estimatedMinutes } : {}),
      ...(dto.keyTechniquePoints !== undefined
        ? { keyTechniquePoints: dto.keyTechniquePoints }
        : {}),
    };

    const updated = await this.prisma.exercise.update({
      where: { id: exerciseId },
      data: {
        tutorialConfig: updatedConfig,
      },
    });

    await this.auditService.log({
      action: 'EXERCISE_TUTORIAL_CONFIG_UPDATED',
      resource: 'Exercise',
      resourceId: exerciseId,
      userId: actor.id,
      organisationId,
      metadata: {
        changes: dto,
      },
    });

    return updated.tutorialConfig;
  }

  /**
   * Get related tutorials for post-tutorial recommendations
   */
  async getRelatedTutorials(organisationId: string, exerciseId: string) {
    const exercise = await this.prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        OR: [{ ownershipType: 'SYSTEM' }, { organisationId }],
      },
      select: {
        id: true,
        movementPattern: true,
        primaryMuscleGroup: true,
      },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found`);
    }

    const relatedExercises = await this.prisma.exercise.findMany({
      where: {
        id: { not: exercise.id },
        contentStatus: 'PUBLISHED',
        OR: [
          { movementPattern: exercise.movementPattern },
          { primaryMuscleGroup: exercise.primaryMuscleGroup },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        difficulty: true,
        equipment: true,
        movementPattern: true,
        primaryMuscleGroup: true,
      },
      take: 6,
    });

    return {
      movementPattern: exercise.movementPattern,
      primaryMuscle: exercise.primaryMuscleGroup,
      related: relatedExercises,
    };
  }
}
