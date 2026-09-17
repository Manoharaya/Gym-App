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
import {
  MuscleInvolvedItemDto,
  MovementMechanicsPhaseDto,
  WhyThisExerciseWorksDto,
  ExerciseAnatomyResponseDto,
  MuscleCatalogItemDto,
  MuscleDetailResponseDto,
  MovementCatalogItemDto,
  MovementPatternDetailResponseDto,
  UpdateExerciseWhyItWorksDto,
  AnatomicalRegion,
  MuscleRole,
  MuscleGroupCategory,
} from '../dto/exercise-anatomy.dto';

interface MuscleKnowledge {
  code: string;
  name: string;
  group: MuscleGroupCategory;
  region: AnatomicalRegion;
  educationalDescription: string;
  primaryActions: string[];
  synergistMuscles: string[];
  roleExplanations: Record<MuscleRole, string>;
}

const MUSCLE_KNOWLEDGE_BASE: Record<string, MuscleKnowledge> = {
  // Upper Body
  CHEST: {
    code: 'CHEST',
    name: 'Chest (Pectorals)',
    group: 'UPPER_BODY',
    region: 'ANTERIOR',
    educationalDescription:
      'The pectoral complex (pectoralis major and minor) covers the anterior chest wall. It drives horizontal adduction, shoulder flexion, and internal rotation of the humerus.',
    primaryActions: ['Horizontal adduction of the arm', 'Shoulder flexion', 'Internal rotation'],
    synergistMuscles: ['SHOULDERS', 'TRICEPS'],
    roleExplanations: {
      PRIMARY: 'Primary force generator executing horizontal adduction to push the load away.',
      SECONDARY: 'Assisting mover providing anterior shoulder stabilization and supplemental pressing force.',
      STABILIZER: 'Maintains rib cage positioning and humeral alignment during upper body movement.',
    },
  },
  UPPER_BACK: {
    code: 'UPPER_BACK',
    name: 'Upper Back (Rhomboids & Mid Traps)',
    group: 'UPPER_BODY',
    region: 'POSTERIOR',
    educationalDescription:
      'The rhomboids (major and minor) and middle trapezius pull the scapulae toward the spine, ensuring scapular stability during pulling and overhead pressing.',
    primaryActions: ['Scapular retraction', 'Scapular downward rotation', 'Thoracic posture maintenance'],
    synergistMuscles: ['LATS', 'TRAPS', 'BICEPS'],
    roleExplanations: {
      PRIMARY: 'Primary mover retracting scapulae to pull resistance toward the torso.',
      SECONDARY: 'Synergist supporting scapular control and preventing excessive rounding of the shoulders.',
      STABILIZER: 'Isometric stabilizer creating a rigid upper-back shelf for posture and pressing support.',
    },
  },
  LATS: {
    code: 'LATS',
    name: 'Lats (Latissimus Dorsi)',
    group: 'UPPER_BODY',
    region: 'POSTERIOR',
    educationalDescription:
      'The widest muscle of the back, spanning from the mid-to-lower spine and pelvis to the humerus. It performs shoulder adduction, extension, and internal rotation.',
    primaryActions: ['Shoulder extension (pulling elbow down/back)', 'Shoulder adduction', 'Spinal stabilization'],
    synergistMuscles: ['UPPER_BACK', 'BICEPS', 'LOWER_BACK'],
    roleExplanations: {
      PRIMARY: 'Primary mover pulling the arm downward and back toward the pelvis.',
      SECONDARY: 'Assists in shoulder depression and stabilizes the spine under heavy loads.',
      STABILIZER: 'Locks the ribcage to the pelvis, preventing spinal hyperextension or lateral deflection.',
    },
  },
  TRAPS: {
    code: 'TRAPS',
    name: 'Traps (Trapezius)',
    group: 'UPPER_BODY',
    region: 'POSTERIOR',
    educationalDescription:
      'A broad, kite-shaped muscle spanning the neck, shoulders, and mid-back with upper, middle, and lower divisions regulating scapular elevation, upward rotation, and depression.',
    primaryActions: ['Scapular elevation (upper)', 'Scapular retraction (mid)', 'Scapular depression (lower)'],
    synergistMuscles: ['UPPER_BACK', 'SHOULDERS'],
    roleExplanations: {
      PRIMARY: 'Primary driver elevating the shoulder girdle or pulling the scapulae backward.',
      SECONDARY: 'Assists in controlling upward rotation of the scapulae during overhead arm elevation.',
      STABILIZER: 'Steadies the neck, head, and shoulder girdle against downward pull or heavy carries.',
    },
  },
  SHOULDERS: {
    code: 'SHOULDERS',
    name: 'Shoulders (Deltoids)',
    group: 'UPPER_BODY',
    region: 'ANTERIOR',
    educationalDescription:
      'The deltoid consists of three distinct heads (anterior, lateral, and posterior) that work with rotator cuff tendons to elevate, abduct, and rotate the arm in all planes.',
    primaryActions: ['Arm abduction (lateral)', 'Arm flexion (anterior)', 'Horizontal abduction (posterior)'],
    synergistMuscles: ['CHEST', 'TRICEPS', 'UPPER_BACK'],
    roleExplanations: {
      PRIMARY: 'Primary driver pushing resistance upward or outward away from the shoulder axis.',
      SECONDARY: 'Assists in stabilizing the glenohumeral joint during chest presses or rows.',
      STABILIZER: 'Rotator cuff and deltoid co-contraction centers the humeral head inside the joint socket.',
    },
  },
  BICEPS: {
    code: 'BICEPS',
    name: 'Biceps Brachii',
    group: 'UPPER_BODY',
    region: 'ANTERIOR',
    educationalDescription:
      'A two-headed muscle on the front of the upper arm that acts across both the shoulder and elbow joints to bend the elbow and supinate the forearm.',
    primaryActions: ['Elbow flexion', 'Forearm supination (palm up)', 'Weak shoulder flexion'],
    synergistMuscles: ['FOREARMS', 'UPPER_BACK', 'LATS'],
    roleExplanations: {
      PRIMARY: 'Primary force generator curling the forearm upward against resistance.',
      SECONDARY: 'Synergist assisting pulling movements by flexing the elbow.',
      STABILIZER: 'Maintains anterior shoulder stability and forearm grip integrity.',
    },
  },
  TRICEPS: {
    code: 'TRICEPS',
    name: 'Triceps Brachii',
    group: 'UPPER_BODY',
    region: 'POSTERIOR',
    educationalDescription:
      'A three-headed muscle (lateral, long, and medial heads) occupying the back of the upper arm responsible for extending the elbow and locking out the arm.',
    primaryActions: ['Elbow extension', 'Shoulder extension (long head)'],
    synergistMuscles: ['CHEST', 'SHOULDERS'],
    roleExplanations: {
      PRIMARY: 'Primary mover straightening the elbow joint against resistance.',
      SECONDARY: 'Synergist assisting the lockout portion of pushing and pressing exercises.',
      STABILIZER: 'Decelerates rapid elbow flexion and provides joint stability during planks and holds.',
    },
  },
  FOREARMS: {
    code: 'FOREARMS',
    name: 'Forearms & Grip',
    group: 'UPPER_BODY',
    region: 'ANTERIOR',
    educationalDescription:
      'Comprises flexor and extensor compartments of the lower arm controlling wrist movement, hand closure, and finger isometric force transmission.',
    primaryActions: ['Wrist flexion and extension', 'Finger grip closure', 'Pronation and supination'],
    synergistMuscles: ['BICEPS'],
    roleExplanations: {
      PRIMARY: 'Primary driver flexing or extending the wrist against load.',
      SECONDARY: 'Transmits muscular force from the arms directly into the barbell, dumbbell, or bar.',
      STABILIZER: 'Isometric grip anchor preventing loss of bar control during pulling and carrying.',
    },
  },

  // Core
  ABDOMINALS: {
    code: 'ABDOMINALS',
    name: 'Abdominals (Rectus Abdominis)',
    group: 'CORE',
    region: 'ANTERIOR',
    educationalDescription:
      'The superficial front abdominal muscle spanning from the pubic crest to the sternum. It flexes the lumbar spine and resists excessive extension under load.',
    primaryActions: ['Lumbar flexion', 'Pelvic posterior tilt', 'Intra-abdominal pressure generation'],
    synergistMuscles: ['OBLIQUES', 'HIP_FLEXORS'],
    roleExplanations: {
      PRIMARY: 'Primary force generator bringing the ribcage toward the pelvis during flexion movements.',
      SECONDARY: 'Works with obliques to prevent lower back hyperextension during standing and overhead lifts.',
      STABILIZER: 'Maintains neutral spine posture by acting as an anterior muscular brace.',
    },
  },
  OBLIQUES: {
    code: 'OBLIQUES',
    name: 'Obliques (Internal & External)',
    group: 'CORE',
    region: 'ANTERIOR',
    educationalDescription:
      'Layered diagonal muscles along the flanks of the abdomen responsible for torso rotation, lateral flexion, and resisting unwanted twisting forces.',
    primaryActions: ['Torso rotation', 'Lateral trunk flexion', 'Anti-rotational stability'],
    synergistMuscles: ['ABDOMINALS', 'LOWER_BACK'],
    roleExplanations: {
      PRIMARY: 'Primary driver rotating or side-bending the torso against load.',
      SECONDARY: 'Synergist assisting front core muscles during compound bracing.',
      STABILIZER: 'Resists rotational and lateral shear forces to safeguard the lumbar spine.',
    },
  },
  LOWER_BACK: {
    code: 'LOWER_BACK',
    name: 'Lower Back (Erector Spinae)',
    group: 'CORE',
    region: 'POSTERIOR',
    educationalDescription:
      'A bundle of muscles running parallel to the vertebral column that extends the spine, resists forward flexion under load, and protects intervertebral discs.',
    primaryActions: ['Spinal extension', 'Anti-flexion postural endurance', 'Lateral spinal stabilization'],
    synergistMuscles: ['GLUTES', 'HAMSTRINGS', 'ABDOMINALS'],
    roleExplanations: {
      PRIMARY: 'Primary mover extending the trunk upward from a hinged position.',
      SECONDARY: 'Synergist supporting hip hinge and deadlift lockout mechanics.',
      STABILIZER: 'Crucial isometric stabilizer keeping the spine in neutral alignment under axial load.',
    },
  },

  // Lower Body
  GLUTES: {
    code: 'GLUTES',
    name: 'Glutes (Maximus & Medius)',
    group: 'LOWER_BODY',
    region: 'POSTERIOR',
    educationalDescription:
      'The largest muscle group in the body, consisting of the gluteus maximus (powerful hip extensor) and gluteus medius/minimus (hip abductors and pelvic stabilizers).',
    primaryActions: ['Hip extension', 'Hip external rotation', 'Hip abduction and pelvic leveling'],
    synergistMuscles: ['HAMSTRINGS', 'QUADRICEPS', 'ADDUCTORS'],
    roleExplanations: {
      PRIMARY: 'Primary force generator driving hip extension to push the body or weight upward.',
      SECONDARY: 'Assists in stabilizing the pelvis and aligning the femurs during squatting and lunging.',
      STABILIZER: 'Gluteus medius prevents dynamic knee valgus (knees caving in) and levels the hips.',
    },
  },
  QUADRICEPS: {
    code: 'QUADRICEPS',
    name: 'Quadriceps',
    group: 'LOWER_BODY',
    region: 'ANTERIOR',
    educationalDescription:
      'A four-headed muscle group on the front thigh (rectus femoris, vastus lateralis, vastus medialis, vastus intermedius) primarily responsible for extending the knee joint.',
    primaryActions: ['Knee extension', 'Hip flexion (rectus femoris)', 'Eccentric deceleration during knee flexion'],
    synergistMuscles: ['GLUTES', 'CALVES', 'HIP_FLEXORS'],
    roleExplanations: {
      PRIMARY: 'Primary force generator producing knee extension to overcome load.',
      SECONDARY: 'Assisting synergist helping stabilize knee extension.',
      STABILIZER: 'Isometric joint stabilizer keeping the knee aligned over the toes during descent.',
    },
  },
  HAMSTRINGS: {
    code: 'HAMSTRINGS',
    name: 'Hamstrings',
    group: 'LOWER_BODY',
    region: 'POSTERIOR',
    educationalDescription:
      'A three-muscle posterior thigh group (biceps femoris, semitendinosus, semimembranosus) crossing the hip and knee joints to flex the knee and extend the hip.',
    primaryActions: ['Knee flexion', 'Hip extension', 'Knee rotation and deceleration in gait'],
    synergistMuscles: ['GLUTES', 'CALVES', 'LOWER_BACK'],
    roleExplanations: {
      PRIMARY: 'Primary mover flexing the knee or extending the hips in deadlifts and hinges.',
      SECONDARY: 'Synergist controlling knee extension speed and co-contracting with quads for stability.',
      STABILIZER: 'Protects the anterior cruciate ligament (ACL) by resisting anterior tibial translation.',
    },
  },
  CALVES: {
    code: 'CALVES',
    name: 'Calves (Gastrocnemius & Soleus)',
    group: 'LOWER_BODY',
    region: 'POSTERIOR',
    educationalDescription:
      'The calf complex includes the superficial gastrocnemius (fast-twitch power) and deep soleus (endurance), which insert into the Achilles tendon to plantarflex the ankle.',
    primaryActions: ['Ankle plantarflexion (pointing toes)', 'Knee flexion assist', 'Balance & ground stabilization'],
    synergistMuscles: ['HAMSTRINGS', 'QUADRICEPS'],
    roleExplanations: {
      PRIMARY: 'Primary driver raising the heels off the ground during calf raises or jumping.',
      SECONDARY: 'Assists in ground reaction force transfer during explosive lower-body movements.',
      STABILIZER: 'Essential stabilizer keeping the foot and ankle centered under axial barbell loads.',
    },
  },
  HIP_FLEXORS: {
    code: 'HIP_FLEXORS',
    name: 'Hip Flexors (Psoas & Iliacus)',
    group: 'LOWER_BODY',
    region: 'ANTERIOR',
    educationalDescription:
      'Deep anterior hip muscles originating from the lumbar spine and pelvis, inserting into the femur to draw the thigh toward the chest and stabilize the pelvis.',
    primaryActions: ['Hip flexion', 'Lumbar spine stabilization', 'Pelvic anterior tilt regulation'],
    synergistMuscles: ['QUADRICEPS', 'ABDOMINALS'],
    roleExplanations: {
      PRIMARY: 'Primary mover lifting the knee or leg forward and upward.',
      SECONDARY: 'Assists in deep hip crease flexion during bottom phases of squats.',
      STABILIZER: 'Stabilizes the lumbar-pelvic junction in unilateral stance.',
    },
  },
  ADDUCTORS: {
    code: 'ADDUCTORS',
    name: 'Adductors (Inner Thigh)',
    group: 'LOWER_BODY',
    region: 'ANTERIOR',
    educationalDescription:
      'Muscles along the medial thigh (adductor magnus, longus, brevis, gracilis) that pull the thigh inward toward the midline and assist hip flexion/extension.',
    primaryActions: ['Hip adduction', 'Assisting hip extension/flexion', 'Medial knee stabilization'],
    synergistMuscles: ['GLUTES', 'QUADRICEPS', 'HAMSTRINGS'],
    roleExplanations: {
      PRIMARY: 'Primary mover drawing the legs together against resistance.',
      SECONDARY: 'Synergist generating hip extension torque out of the bottom of deep squats.',
      STABILIZER: 'Balances lateral hip abductor forces to keep the knees tracking correctly.',
    },
  },
  ABDUCTORS: {
    code: 'ABDUCTORS',
    name: 'Abductors (Outer Hip)',
    group: 'LOWER_BODY',
    region: 'POSTERIOR',
    educationalDescription:
      'Muscles along the lateral hip (gluteus medius, minimus, tensor fasciae latae) that draw the thigh outward and keep the pelvis level during walking and single-leg balance.',
    primaryActions: ['Hip abduction', 'Pelvic tilt control in unilateral stance', 'Femur tracking'],
    synergistMuscles: ['GLUTES'],
    roleExplanations: {
      PRIMARY: 'Primary mover pushing the legs outward away from the body midline.',
      SECONDARY: 'Assists in outward femoral rotation during squatting.',
      STABILIZER: 'Prevents pelvic drop (Trendelenburg sign) during single-leg exercises like lunges and step-ups.',
    },
  },
};

interface MovementKnowledge {
  code: string;
  name: string;
  definition: string;
  description: string;
  primaryJointActions: string[];
  commonBodyPositions: string[];
  recommendedStartingExercise?: string;
}

const MOVEMENT_KNOWLEDGE_BASE: Record<string, MovementKnowledge> = {
  SQUAT: {
    code: 'SQUAT',
    name: 'Squat Pattern',
    definition:
      'A fundamental lower-body movement pattern involving simultaneous flexion and extension of the hips, knees, and ankles with an upright or inclined torso.',
    description:
      'The squat pattern trains total lower-body strength and mobility. The knees travel forward while the hips descend downward and backward, loaded primarily by the quadriceps and glutes with heavy spinal stabilization.',
    primaryJointActions: ['Knee flexion and extension', 'Hip flexion and extension', 'Ankle dorsiflexion and plantarflexion'],
    commonBodyPositions: ['STANDING', 'SQUATTING'],
    recommendedStartingExercise: 'Bodyweight Squat',
  },
  HINGE: {
    code: 'HINGE',
    name: 'Hinge Pattern',
    definition:
      'A posterior chain dominant movement pattern characterized by maximum hip flexion and minimal knee flexion, loading the glutes, hamstrings, and lower back.',
    description:
      'The hinge pattern teaches safe weight shifting into the hips while maintaining a neutral spine. The hips push backward like closing a door with your glutes, keeping the shins relatively vertical.',
    primaryJointActions: ['Hip flexion and extension', 'Isometric spinal stabilization', 'Scapular isometric tension'],
    commonBodyPositions: ['STANDING', 'HINGED'],
    recommendedStartingExercise: 'Romanian Deadlift',
  },
  PUSH: {
    code: 'PUSH',
    name: 'Push Pattern',
    definition:
      'An upper-body movement pattern where resistance is pushed away from the torso, or the body is pushed away from an anchor, in horizontal or vertical planes.',
    description:
      'The push pattern primarily trains the chest, anterior shoulders, and triceps. It requires strong core bracing and scapulothoracic rhythm to maintain joint health across shoulder and elbow articulations.',
    primaryJointActions: ['Elbow extension', 'Shoulder flexion (vertical)', 'Shoulder horizontal adduction (horizontal)'],
    commonBodyPositions: ['SUPINE', 'STANDING', 'PLANK', 'SEATED'],
    recommendedStartingExercise: 'Standard Push-Up',
  },
  PULL: {
    code: 'PULL',
    name: 'Pull Pattern',
    definition:
      'An upper-body movement pattern where resistance is drawn toward the body, or the body is pulled toward an anchor, in vertical or horizontal trajectories.',
    description:
      'The pull pattern targets the latissimus dorsi, rhomboids, trapezius, rear deltoids, and biceps. It builds balanced posture and shoulder girdle integrity by counteracting forward-rounded daily postures.',
    primaryJointActions: ['Elbow flexion', 'Shoulder extension (vertical/horizontal)', 'Scapular retraction and depression'],
    commonBodyPositions: ['HANGING', 'STANDING', 'HINGED', 'SEATED'],
    recommendedStartingExercise: 'Inverted Row',
  },
  LUNGE: {
    code: 'LUNGE',
    name: 'Lunge Pattern',
    definition:
      'A unilateral lower-body movement pattern featuring an asymmetrical split stance that challenges balance, pelvic stability, and single-leg strength.',
    description:
      'The lunge isolates one leg at a time, addressing left-to-right muscular imbalances. It requires the gluteus medius and core to prevent pelvic tilt while the front quadriceps and glutes drive movement.',
    primaryJointActions: ['Unilateral knee flexion/extension', 'Unilateral hip flexion/extension', 'Pelvic isometric stabilization'],
    commonBodyPositions: ['STANDING', 'HALF_KNEELING'],
    recommendedStartingExercise: 'Walking Lunge',
  },
  ROTATION: {
    code: 'ROTATION',
    name: 'Rotation Pattern',
    definition:
      'A multi-planar pattern involving rotational force production or anti-rotational resistance through the transverse plane across the hips and core.',
    description:
      'Human athletic movement occurs in three dimensions. Rotation transfers ground force from the feet through the hips and core into the upper body, developing rotational torque and anti-rotational spinal safety.',
    primaryJointActions: ['Thoracic spine rotation', 'Hip internal/external rotation', 'Anti-rotational core stabilization'],
    commonBodyPositions: ['STANDING', 'KNEELING', 'SEATED'],
    recommendedStartingExercise: 'Paloff Press',
  },
  CARRY: {
    code: 'CARRY',
    name: 'Carry Pattern',
    definition:
      'A functional full-body pattern where a load is supported while walking or holding a position, emphasizing grip, core, and gait stabilization.',
    description:
      'Carrying heavy objects develops functional resilience. It forces continuous micro-adjustments from the feet through the spine, conditioning grip strength, shoulder girdle packing, and postural endurance.',
    primaryJointActions: ['Locomotor hip and knee flexion/extension', 'Isometric grip retention', 'Isometric core stiffness'],
    commonBodyPositions: ['STANDING'],
    recommendedStartingExercise: "Farmer's Walk",
  },
  LOCOMOTION: {
    code: 'LOCOMOTION',
    name: 'Locomotion Pattern',
    definition:
      'Rhythmic, cyclical movement patterns that propel the body through space, including walking, running, skipping, and climbing.',
    description:
      'Locomotion builds aerobic efficiency, joint resilience, and coordination across contralateral limb pairs (opposite arm and leg moving synchronously).',
    primaryJointActions: ['Alternating hip and knee extension/flexion', 'Ankle propulsion', 'Arm swing counterbalance'],
    commonBodyPositions: ['STANDING'],
    recommendedStartingExercise: 'Brisk Incline Walk',
  },
  STABILIZATION: {
    code: 'STABILIZATION',
    name: 'Stabilization & Anti-Movement',
    definition:
      'An isometric pattern where the musculature resists external forces attempting to extend, flex, or twist the spine.',
    description:
      'True core strength is the ability to prevent unwanted movement rather than initiate it. Stabilization trains the deep transverse abdominis, obliques, and erector spinae to function as an unyielding cylinder.',
    primaryJointActions: ['Isometric anti-extension', 'Isometric anti-flexion', 'Isometric anti-lateral flexion'],
    commonBodyPositions: ['PLANK', 'QUADRUPED', 'SUPINE'],
    recommendedStartingExercise: 'Forearm Plank',
  },
  ISOMETRIC: {
    code: 'ISOMETRIC',
    name: 'Isometric Pattern',
    definition:
      'Static muscular contraction where tension is generated without changes in muscle length or joint angle.',
    description:
      'Isometric contractions strengthen tendons, improve joint tolerance at specific sticking points, and activate high-threshold motor units without joint wear.',
    primaryJointActions: ['Static joint stabilization without displacement'],
    commonBodyPositions: ['SQUATTING', 'PLANK', 'HANGING'],
    recommendedStartingExercise: 'Wall Sit',
  },
};

@Injectable()
export class ExerciseAnatomyService {
  private readonly logger = new Logger(ExerciseAnatomyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // =========================================================================
  // 1. AGGREGATED EXERCISE ANATOMY & MECHANICS
  // =========================================================================

  async getExerciseAnatomy(
    organisationId: string,
    exerciseId: string,
    userId?: string,
  ): Promise<ExerciseAnatomyResponseDto> {
    const exercise = await this.prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        OR: [
          { ownershipType: 'SYSTEM', organisationId: null },
          { ownershipType: 'ORGANISATION', organisationId },
        ],
      },
      include: {
        muscleRelations: {
          orderBy: [{ role: 'asc' }, { muscle: 'asc' }],
        },
        movementPhases: {
          orderBy: { orderIndex: 'asc' },
        },
        equipmentRelations: {
          orderBy: { createdAt: 'asc' },
        },
        knowledgeChecks: {
          where: { contentStatus: 'PUBLISHED' },
          select: {
            id: true,
            title: true,
            questionCount: true,
            questions: { select: { id: true } },
          },
        },
        learningLessons: {
          select: {
            id: true,
            title: true,
            pathId: true,
            path: {
              select: {
                id: true,
                title: true,
                curriculum: {
                  select: { id: true, title: true },
                },
              },
            },
          },
          take: 3,
        },
      },
    });

    if (!exercise) {
      throw new NotFoundException({
        code: 'EXERCISE_NOT_FOUND',
        message: `Exercise with ID '${exerciseId}' not found or inaccessible`,
      });
    }

    // 1. Format muscles involved with explicit role text (No fake percentages)
    const primaryMuscles: MuscleInvolvedItemDto[] = [];
    const secondaryMuscles: MuscleInvolvedItemDto[] = [];
    const stabilizerMuscles: MuscleInvolvedItemDto[] = [];

    const anteriorHighlighted: string[] = [];
    const posteriorHighlighted: string[] = [];
    const allInvolvedMuscles: Array<{
      code: string;
      label: string;
      role: MuscleRole;
      region: AnatomicalRegion;
    }> = [];

    // If explicit muscle relations exist, use them; otherwise fallback to primaryMuscleGroup
    const relationsToProcess =
      exercise.muscleRelations.length > 0
        ? exercise.muscleRelations
        : [
            {
              muscle: exercise.primaryMuscleGroup,
              muscleGroup: 'FULL_BODY',
              role: 'PRIMARY',
              activationLevel: 'HIGH',
              notes: 'Primary targeted muscle group',
            },
          ];

    for (const rel of relationsToProcess) {
      const code = (rel.muscle || 'CHEST').toUpperCase();
      const role = (rel.role || 'PRIMARY').toUpperCase() as MuscleRole;
      const kb = MUSCLE_KNOWLEDGE_BASE[code] || {
        code,
        name: code.replace(/_/g, ' '),
        group: (rel.muscleGroup || 'CORE') as MuscleGroupCategory,
        region: 'ANTERIOR' as AnatomicalRegion,
        educationalDescription: `Muscles of the ${code.replace(/_/g, ' ').toLowerCase()} involved in this exercise.`,
        primaryActions: ['Stabilization and movement control'],
        synergistMuscles: [],
        roleExplanations: {
          PRIMARY: 'Primary contributor in this exercise.',
          SECONDARY: 'Assisting synergist in this exercise.',
          STABILIZER: 'Joint stabilizer in this exercise.',
        },
      };

      const roleExplanation =
        kb.roleExplanations[role] || `${role} contributor in this exercise.`;

      const item: MuscleInvolvedItemDto = {
        code: kb.code,
        name: kb.name,
        group: kb.group,
        region: kb.region,
        role,
        roleExplanation,
        educationalDescription: kb.educationalDescription,
        activationLevel: rel.activationLevel || 'HIGH',
        notes: rel.notes || undefined,
      };

      if (role === 'PRIMARY') {
        primaryMuscles.push(item);
      } else if (role === 'SECONDARY') {
        secondaryMuscles.push(item);
      } else {
        stabilizerMuscles.push(item);
      }

      if (kb.region === 'ANTERIOR') {
        if (!anteriorHighlighted.includes(kb.code)) {
          anteriorHighlighted.push(kb.code);
        }
      } else {
        if (!posteriorHighlighted.includes(kb.code)) {
          posteriorHighlighted.push(kb.code);
        }
      }

      allInvolvedMuscles.push({
        code: kb.code,
        label: kb.name,
        role,
        region: kb.region,
      });
    }

    // 2. Resolve Movement Pattern Details
    const patternKey = (exercise.movementPattern || 'SQUAT').toUpperCase();
    const patternKb = MOVEMENT_KNOWLEDGE_BASE[patternKey] || {
      code: patternKey,
      name: `${patternKey.replace(/_/g, ' ')} Pattern`,
      definition: `A movement pattern involving coordinated multi-joint motion in the ${patternKey.toLowerCase()} trajectory.`,
      description: `Trains functional movement and stabilization along the ${patternKey.toLowerCase()} kinetic chain.`,
      primaryJointActions: ['Coordinated joint flexion and extension'],
      commonBodyPositions: [exercise.bodyPosition || 'STANDING'],
    };

    // 3. Format Movement Phases
    let phases: MovementMechanicsPhaseDto[] = [];
    if (exercise.movementPhases.length > 0) {
      phases = exercise.movementPhases.map((p) => ({
        id: p.id,
        phaseName: p.phaseName,
        phaseType: p.phaseType,
        title: p.title || p.phaseName,
        description: p.description || undefined,
        orderIndex: p.orderIndex,
        cueText: p.cueText || undefined,
        bodyPosition: p.bodyPosition || undefined,
        jointAlignments: p.jointAlignments || undefined,
        rangeOfMotionType: p.rangeOfMotionType || undefined,
        rangeOfMotionNotes: p.rangeOfMotionNotes || undefined,
        breathingPattern: p.breathingPattern || undefined,
        breathingNotes: p.breathingNotes || undefined,
        tempoSeconds: p.tempoSeconds || undefined,
        holdDurationSeconds: p.holdDurationSeconds || undefined,
        visualCues: p.visualCues || undefined,
        phaseMuscles: (p as any).phaseMuscles || undefined,
      }));
    } else {
      // Deterministic foundational phase sequence
      phases = [
        {
          id: 'default-phase-1',
          phaseName: 'Setup',
          phaseType: 'SETUP',
          title: 'Establish Starting Position',
          description: `Assume a stable ${exercise.bodyPosition?.toLowerCase() || 'standing'} posture with proper joint alignment before loading.`,
          orderIndex: 0,
          cueText: 'Brace your core and align your spine before initiating movement.',
          bodyPosition: exercise.bodyPosition || 'STANDING',
          breathingPattern: 'INHALE_PREPARATION',
        },
        {
          id: 'default-phase-2',
          phaseName: 'Eccentric',
          phaseType: 'ECCENTRIC',
          title: 'Controlled Lowering Phase',
          description: 'Control the descent under steady muscular tension rather than letting gravity drop you.',
          orderIndex: 1,
          cueText: 'Control the lowering phase for 2 to 3 seconds.',
          tempoSeconds: 3,
          breathingPattern: 'INHALE_DESCENT',
        },
        {
          id: 'default-phase-3',
          phaseName: 'Bottom Transition',
          phaseType: 'TRANSITION_BOTTOM',
          title: 'Reversal Point',
          description: `Reach the target range of motion (${exercise.rangeOfMotion || 'full controlled depth'}) without losing tension.`,
          orderIndex: 2,
          cueText: 'Pause briefly without bouncing or losing core bracing.',
          tempoSeconds: 1,
          breathingPattern: 'HOLD_VALSALVA',
        },
        {
          id: 'default-phase-4',
          phaseName: 'Concentric',
          phaseType: 'CONCENTRIC',
          title: 'Drive & Upward Ascent',
          description: 'Drive forcefully through the primary muscle groups to return through the movement trajectory.',
          orderIndex: 3,
          cueText: 'Drive up with intent while keeping your joint alignment true.',
          tempoSeconds: 2,
          breathingPattern: 'EXHALE_EFFORT',
        },
        {
          id: 'default-phase-5',
          phaseName: 'Finish / Lockout',
          phaseType: 'LOCKOUT_FINISH',
          title: 'Return to Starting Position',
          description: 'Lock out smoothly under control, resetting breath for the subsequent repetition.',
          orderIndex: 4,
          cueText: 'Finish strong at the top without hyperextending your joints.',
          breathingPattern: 'EXHALE_RECOVERY',
        },
      ];
    }

    // 4. Resolve Tempo & Breathing Guides
    const tempoStruct = (exercise.tempoStructure as any) || {};
    const tempoSummary = {
      tempoString: exercise.tempo || '3-1-2-0',
      eccentricSeconds: tempoStruct.eccentricSeconds ?? 3,
      bottomHoldSeconds: tempoStruct.bottomHoldSeconds ?? 1,
      concentricSeconds: tempoStruct.concentricSeconds ?? 2,
      topHoldSeconds: tempoStruct.topHoldSeconds ?? 0,
      tempoExplanation:
        'Tempo dictates movement velocity: lowering under control (eccentric), pausing to eliminate elastic bounce (isometric), driving upward with intent (concentric), and resetting posture (lockout).',
    };

    const breathingSummary = {
      instructions: exercise.breathingInstructions || undefined,
      patternType: 'CADENCE_SYNCHRONIZED',
      guidance:
        'Inhale on the eccentric (lowering) phase to expand the ribcage and brace intra-abdominal pressure. Exhale through the concentric (effort) phase to maintain spinal stability.',
    };

    // 5. "Why This Exercise Works" (Authored or Deterministic Rule-Based Synthesis)
    let whyWorks: WhyThisExerciseWorksDto;
    if (exercise.whyItWorks && typeof exercise.whyItWorks === 'object') {
      const authored = exercise.whyItWorks as any;
      whyWorks = {
        overview:
          authored.overview ||
          `${exercise.name} combines a ${patternKb.name.toLowerCase()} with coordinated multi-joint mechanics.`,
        mechanicsExplanation:
          authored.mechanicsExplanation ||
          `This exercise relies on kinetic chain force transmission between primary drivers and stabilizers.`,
        primaryDrivers:
          authored.primaryDrivers ||
          primaryMuscles.map((m) => m.name),
        jointAction:
          authored.jointAction ||
          patternKb.primaryJointActions.join(', '),
        stabilizationFocus:
          authored.stabilizationFocus ||
          'Core and spinal stabilization prevents unwanted energy leaks and maintains joint safety.',
        benefits:
          authored.benefits || [
            'Builds functional strength along compound movement pathways',
            'Develops joint stability and postural endurance',
            'Improves motor unit recruitment and muscular coordination',
          ],
        educationalDisclaimer:
          'Fitness education only. Not intended as medical diagnosis, rehabilitation prescription, or medical treatment.',
      };
    } else {
      // Deterministic synthesis
      const primaryNames = primaryMuscles.map((m) => m.name);
      whyWorks = {
        overview: `The ${exercise.name} utilizes the ${patternKb.name} to train lower and upper body kinetic integration. By moving resistance through this anatomical path, it maximizes muscle fiber recruitment while teaching safe joint tracking.`,
        mechanicsExplanation: `During execution, the ${patternKb.primaryJointActions.join(' and ')} are driven by the primary movers, while the secondary synergists and core stabilizers keep the torso aligned.`,
        primaryDrivers: primaryNames.length > 0 ? primaryNames : [exercise.primaryMuscleGroup],
        jointAction: patternKb.primaryJointActions.join(', '),
        stabilizationFocus:
          stabilizerMuscles.length > 0
            ? `Stabilized by ${stabilizerMuscles.map((s) => s.name).join(', ')} to protect articular cartilage and discs.`
            : 'Requires active core bracing and scapulopelvic stability throughout the range of motion.',
        benefits: [
          `Develops targeted hypertrophy and force output in the ${exercise.primaryMuscleGroup.toLowerCase().replace(/_/g, ' ')}`,
          `Refines biomechanical efficiency in the ${patternKb.name.toLowerCase()}`,
          'Enhances joint integrity through controlled eccentric and concentric loading',
        ],
        educationalDisclaimer:
          'Fitness education only. Not intended as medical diagnosis, rehabilitation prescription, or medical treatment.',
      };
    }

    // 6. Fetch related exercises targeting the same primary muscle or pattern
    const relatedExercisesRaw = await this.prisma.exercise.findMany({
      where: {
        id: { not: exercise.id },
        status: 'ACTIVE',
        OR: [
          { ownershipType: 'SYSTEM', organisationId: null },
          { ownershipType: 'ORGANISATION', organisationId },
        ],
        AND: [
          {
            OR: [
              { primaryMuscleGroup: exercise.primaryMuscleGroup },
              { movementPattern: exercise.movementPattern },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        difficulty: true,
        primaryMuscleGroup: true,
        movementPattern: true,
        media: {
          where: { isPrimary: true },
          select: { url: true, thumbnailUrl: true },
          take: 1,
        },
      },
      take: 4,
    });

    const relatedExercises = relatedExercisesRaw.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      difficulty: r.difficulty,
      primaryMuscleGroup: r.primaryMuscleGroup,
      movementPattern: r.movementPattern,
      mediaUrl: r.media[0]?.thumbnailUrl || r.media[0]?.url || undefined,
    }));

    // 7. Format related Academy learning content
    const relatedLearning: Array<{
      id: string;
      title: string;
      type: 'CURRICULUM' | 'LEARNING_PATH' | 'LESSON';
      pathId?: string;
      lessonId?: string;
    }> = [];

    for (const lesson of exercise.learningLessons) {
      if (lesson.path) {
        relatedLearning.push({
          id: lesson.path.id,
          title: lesson.path.title,
          type: 'LEARNING_PATH',
          pathId: lesson.path.id,
          lessonId: lesson.id,
        });

        if (lesson.path.curriculum) {
          if (
            !relatedLearning.some(
              (rl) => rl.id === lesson.path.curriculum?.id,
            )
          ) {
            relatedLearning.push({
              id: lesson.path.curriculum.id,
              title: lesson.path.curriculum.title,
              type: 'CURRICULUM',
            });
          }
        }
      }
    }

    // 8. Knowledge Checks
    const knowledgeChecks = exercise.knowledgeChecks.map((kc) => ({
      id: kc.id,
      title: kc.title,
      questionCount: kc.questions.length,
    }));

    return {
      exercise: {
        id: exercise.id,
        name: exercise.name,
        slug: exercise.slug,
        difficulty: exercise.difficulty,
        movementPattern: exercise.movementPattern,
        exerciseMechanics: exercise.exerciseMechanics || undefined,
        bodyPosition: exercise.bodyPosition || undefined,
        laterality: exercise.laterality || undefined,
        tempo: exercise.tempo || undefined,
        tempoStructure: exercise.tempoStructure || undefined,
        rangeOfMotion: exercise.rangeOfMotion || undefined,
        breathingInstructions: exercise.breathingInstructions || undefined,
        educationalTips: (exercise.educationalTips as string[]) || undefined,
        safetyNotes: exercise.safetyNotes || undefined,
      },
      musclesInvolved: {
        primary: primaryMuscles,
        secondary: secondaryMuscles,
        stabilizers: stabilizerMuscles,
        totalCount:
          primaryMuscles.length +
          secondaryMuscles.length +
          stabilizerMuscles.length,
      },
      movementMechanics: {
        pattern: {
          code: patternKb.code,
          name: patternKb.name,
          definition: patternKb.definition,
          primaryJointActions: patternKb.primaryJointActions,
        },
        phases,
        tempoSummary,
        breathingSummary,
      },
      equipment: exercise.equipmentRelations.map((eq) => ({
        id: eq.id,
        equipmentName: eq.equipmentName,
        requirementType: eq.requirementType,
        equipmentCategory: eq.equipmentCategory || undefined,
        alternatives: (eq.alternatives as string[]) || undefined,
        notes: eq.notes || undefined,
      })),
      whyThisExerciseWorks: whyWorks,
      bodyMapData: {
        anteriorHighlighted,
        posteriorHighlighted,
        allInvolvedMuscles,
      },
      relatedExercises,
      relatedLearning,
      knowledgeChecks,
    };
  }

  // =========================================================================
  // 2. MUSCLES CATALOG & DETAIL
  // =========================================================================

  async getMusclesCatalog(organisationId?: string): Promise<MuscleCatalogItemDto[]> {
    // Count exercises per muscle
    const muscleExerciseCounts = await this.prisma.exerciseMuscleRelation.groupBy({
      by: ['muscle'],
      _count: { exerciseId: true },
      where: {
        exercise: {
          status: 'ACTIVE',
          OR: [
            { ownershipType: 'SYSTEM', organisationId: null },
            ...(organisationId
              ? [{ ownershipType: 'ORGANISATION', organisationId }]
              : []),
          ],
        },
      },
    });

    const countMap = new Map<string, number>();
    for (const c of muscleExerciseCounts) {
      countMap.set(c.muscle.toUpperCase(), c._count.exerciseId);
    }

    return Object.values(MUSCLE_KNOWLEDGE_BASE).map((kb) => ({
      code: kb.code,
      name: kb.name,
      group: kb.group,
      region: kb.region,
      exerciseCount: countMap.get(kb.code) || 0,
      educationalSummary: kb.educationalDescription,
    }));
  }

  async getMuscleDetail(
    organisationId: string,
    muscleCode: string,
  ): Promise<MuscleDetailResponseDto> {
    const code = muscleCode.toUpperCase();
    const kb = MUSCLE_KNOWLEDGE_BASE[code];
    if (!kb) {
      throw new NotFoundException({
        code: 'MUSCLE_NOT_FOUND',
        message: `Muscle taxonomy item '${muscleCode}' not found`,
      });
    }

    // Fetch exercises targeting this muscle
    const relations = await this.prisma.exerciseMuscleRelation.findMany({
      where: {
        muscle: code,
        exercise: {
          status: 'ACTIVE',
          OR: [
            { ownershipType: 'SYSTEM', organisationId: null },
            { ownershipType: 'ORGANISATION', organisationId },
          ],
        },
      },
      include: {
        exercise: {
          select: {
            id: true,
            name: true,
            difficulty: true,
            movementPattern: true,
            equipment: true,
          },
        },
      },
      take: 20,
    });

    const primaryExercises: Array<{
      id: string;
      name: string;
      difficulty: string;
      movementPattern: string;
      equipment: string;
    }> = [];

    const secondaryExercises: Array<{
      id: string;
      name: string;
      difficulty: string;
      movementPattern: string;
      equipment: string;
    }> = [];

    for (const r of relations) {
      const item = {
        id: r.exercise.id,
        name: r.exercise.name,
        difficulty: r.exercise.difficulty,
        movementPattern: r.exercise.movementPattern,
        equipment: r.exercise.equipment,
      };

      if (r.role === 'PRIMARY') {
        if (!primaryExercises.some((p) => p.id === item.id)) {
          primaryExercises.push(item);
        }
      } else {
        if (!secondaryExercises.some((s) => s.id === item.id)) {
          secondaryExercises.push(item);
        }
      }
    }

    // Fetch related lessons
    const lessons = await this.prisma.learningPathLesson.findMany({
      where: {
        OR: [
          { title: { contains: kb.name.split(' ')[0], mode: 'insensitive' } },
          { content: { contains: kb.code, mode: 'insensitive' } },
        ],
        path: {
          contentStatus: 'PUBLISHED',
          OR: [
            { ownershipType: 'SYSTEM', organisationId: null },
            { ownershipType: 'ORGANISATION', organisationId },
          ],
        },
      },
      select: {
        id: true,
        title: true,
        pathId: true,
        path: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      take: 4,
    });

    return {
      code: kb.code,
      name: kb.name,
      group: kb.group,
      region: kb.region,
      educationalDescription: kb.educationalDescription,
      primaryActions: kb.primaryActions,
      synergistMuscles: kb.synergistMuscles,
      exercises: {
        primary: primaryExercises,
        secondary: secondaryExercises,
      },
      relatedLessons: lessons.map((l) => ({
        id: l.id,
        title: l.title,
        learningPathId: l.path.id,
        learningPathTitle: l.path.title,
      })),
    };
  }

  // =========================================================================
  // 3. MOVEMENTS CATALOG & DETAIL
  // =========================================================================

  async getMovementsCatalog(organisationId?: string): Promise<MovementCatalogItemDto[]> {
    const counts = await this.prisma.exercise.groupBy({
      by: ['movementPattern'],
      _count: { id: true },
      where: {
        status: 'ACTIVE',
        OR: [
          { ownershipType: 'SYSTEM', organisationId: null },
          ...(organisationId
            ? [{ ownershipType: 'ORGANISATION', organisationId }]
            : []),
        ],
      },
    });

    const countMap = new Map<string, number>();
    for (const c of counts) {
      countMap.set(c.movementPattern.toUpperCase(), c._count.id);
    }

    return Object.values(MOVEMENT_KNOWLEDGE_BASE).map((kb) => ({
      code: kb.code,
      name: kb.name,
      definition: kb.definition,
      exerciseCount: countMap.get(kb.code) || 0,
    }));
  }

  async getMovementPatternDetail(
    organisationId: string,
    patternCode: string,
  ): Promise<MovementPatternDetailResponseDto> {
    const code = patternCode.toUpperCase();
    const kb = MOVEMENT_KNOWLEDGE_BASE[code];
    if (!kb) {
      throw new NotFoundException({
        code: 'MOVEMENT_PATTERN_NOT_FOUND',
        message: `Movement pattern '${patternCode}' not recognized in educational taxonomy`,
      });
    }

    const exercises = await this.prisma.exercise.findMany({
      where: {
        movementPattern: code,
        status: 'ACTIVE',
        OR: [
          { ownershipType: 'SYSTEM', organisationId: null },
          { ownershipType: 'ORGANISATION', organisationId },
        ],
      },
      select: {
        id: true,
        name: true,
        difficulty: true,
        primaryMuscleGroup: true,
        equipment: true,
      },
      take: 12,
    });

    // Find curricula tagged with movement or matching
    const curricula = await this.prisma.curriculum.findMany({
      where: {
        contentStatus: 'PUBLISHED',
        OR: [
          { category: 'MOVEMENT_FUNDAMENTALS' },
          { title: { contains: kb.name.split(' ')[0], mode: 'insensitive' } },
        ],
        AND: [
          {
            OR: [
              { ownershipType: 'SYSTEM', organisationId: null },
              { ownershipType: 'ORGANISATION', organisationId },
            ],
          },
        ],
      },
      select: {
        id: true,
        title: true,
        category: true,
      },
      take: 3,
    });

    return {
      code: kb.code,
      name: kb.name,
      definition: kb.definition,
      description: kb.description,
      primaryJointActions: kb.primaryJointActions,
      commonBodyPositions: kb.commonBodyPositions,
      exercises,
      relatedCurricula: curricula,
    };
  }

  // =========================================================================
  // 4. AUTHORING: WHY THIS EXERCISE WORKS
  // =========================================================================

  async updateExerciseWhyItWorks(
    organisationId: string,
    exerciseId: string,
    dto: UpdateExerciseWhyItWorksDto,
    user: AuthenticatedUser,
  ) {
    const exercise = await this.prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        OR: [
          { ownershipType: 'ORGANISATION', organisationId },
          { ownershipType: 'SYSTEM' },
        ],
      },
    });

    if (!exercise) {
      throw new NotFoundException({
        code: 'EXERCISE_NOT_FOUND',
        message: `Exercise '${exerciseId}' not found`,
      });
    }

    if (exercise.ownershipType === 'SYSTEM' && (user as any).role !== 'SUPERADMIN') {
      throw new ForbiddenException({
        code: 'CANNOT_MODIFY_SYSTEM_EXERCISE',
        message: 'Only superadmins can author educational content for system-wide exercises',
      });
    }

    const currentWhy = (exercise.whyItWorks as any) || {};
    const updatedWhy = {
      ...currentWhy,
      ...(dto.overview !== undefined ? { overview: dto.overview } : {}),
      ...(dto.mechanicsExplanation !== undefined
        ? { mechanicsExplanation: dto.mechanicsExplanation }
        : {}),
      ...(dto.primaryDrivers !== undefined ? { primaryDrivers: dto.primaryDrivers } : {}),
      ...(dto.jointAction !== undefined ? { jointAction: dto.jointAction } : {}),
      ...(dto.stabilizationFocus !== undefined
        ? { stabilizationFocus: dto.stabilizationFocus }
        : {}),
      ...(dto.benefits !== undefined ? { benefits: dto.benefits } : {}),
    };

    const updated = await this.prisma.exercise.update({
      where: { id: exerciseId },
      data: {
        whyItWorks: updatedWhy,
      },
    });

    await this.auditService.log({
      action: 'UPDATE',
      resource: 'EXERCISE_EDUCATIONAL_CONTENT',
      resourceId: exerciseId,
      userId: user.id,
      organisationId,
      metadata: {
        updatedFields: Object.keys(dto),
      },
    });

    return updated;
  }
}
