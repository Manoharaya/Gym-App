import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface ExerciseKnowledgePayload {
  exerciseId: string;
  name: string;
  slug: string;
  difficulty: string;
  exerciseType: string;
  movementPattern: string;
  primaryMuscleGroup: string;
  secondaryMuscleGroups: string[];
  stabilizerMuscles: string[];
  equipment: string;
  equipmentRequirements: string[];
  exerciseCategory?: string | null;
  exerciseMechanics?: string | null;
  equipmentRequirement?: string | null;
  availableEnvironments?: string[];
  trainingGoals?: string[];
  tags?: string[];
  musclesWorked?: Array<{
    muscle: string;
    muscleGroup: string;
    role: string;
    activationLevel: string | null;
  }>;
  structuredEquipment?: Array<{
    equipmentName: string;
    requirementType: string;
    equipmentCategory: string | null;
    alternatives: string[];
    availabilityContexts: string[];
  }>;
  tempo: string | null;
  tempoStructure?: Record<string, any> | null;
  rangeOfMotion: string | null;
  repetitionType?: string;
  breathingInstructions: string | null;
  educationalTips: string[];
  secondaryMovementPatterns?: string[];
  instructionSteps: Array<{
    stepNumber: number;
    phase: string | null;
    title: string;
    description: string;
    coachingCue: string | null;
  }>;
  movementPhases: Array<{
    phaseName: string;
    phaseType: string;
    title: string | null;
    orderIndex: number;
    cueText: string | null;
    bodyPosition: string | null;
    rangeOfMotionType: string | null;
    breathingPattern: string | null;
    tempoSeconds: number | null;
    holdDurationSeconds: number | null;
    jointAlignments: any[];
    keyCheckpoints: string[];
    visualCues: any[];
  }>;
  commonMistakes: Array<{
    mistake: string;
    consequence: string | null;
    correction: string;
    severity: string;
  }>;
  safetyGuidelines: Array<{
    category: string;
    title: string | null;
    description: string;
    severity: string;
  }>;
  variations: Array<{
    relationshipType: string;
    targetExerciseName: string;
    notes: string | null;
  }>;
}

@Injectable()
export class ExerciseKnowledgeService {
  private readonly logger = new Logger(ExerciseKnowledgeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns grounded, structured exercise biomechanics, cues, and safety intelligence
   * for consumption by AI Coaches and algorithmic programming engines.
   */
  async getExerciseKnowledge(exerciseId: string): Promise<ExerciseKnowledgePayload> {
    const exercise = await this.prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        status: 'ACTIVE',
      },
      include: {
        instructionSteps: {
          orderBy: { stepNumber: 'asc' },
        },
        movementPhases: {
          orderBy: { orderIndex: 'asc' },
        },
        commonMistakes: {
          orderBy: { sortOrder: 'asc' },
        },
        safetyGuidelines: {
          orderBy: { createdAt: 'asc' },
        },
        equipmentRelations: {
          orderBy: { createdAt: 'asc' },
        },
        muscleRelations: {
          orderBy: [{ role: 'asc' }, { muscle: 'asc' }],
        },
        variationsFrom: {
          include: {
            targetExercise: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise '${exerciseId}' not found in knowledge base`);
    }

    const secondaryMuscles = Array.isArray(exercise.secondaryMuscleGroups)
      ? (exercise.secondaryMuscleGroups as string[])
      : [];

    const stabilizers = Array.isArray(exercise.stabilizerMuscles)
      ? (exercise.stabilizerMuscles as string[])
      : [];

    const educational = Array.isArray(exercise.educationalTips)
      ? (exercise.educationalTips as string[])
      : [];

    const equipmentList = exercise.equipmentRelations?.map((e) => e.equipmentName) || [
      exercise.equipment,
    ];

    const secondaryPatterns = Array.isArray(exercise.secondaryMovementPatterns)
      ? (exercise.secondaryMovementPatterns as string[])
      : [];

    return {
      exerciseId: exercise.id,
      name: exercise.name,
      slug: exercise.slug,
      difficulty: exercise.difficulty,
      exerciseType: exercise.exerciseType,
      movementPattern: exercise.movementPattern,
      secondaryMovementPatterns: secondaryPatterns,
      primaryMuscleGroup: exercise.primaryMuscleGroup,
      secondaryMuscleGroups: secondaryMuscles,
      stabilizerMuscles: stabilizers,
      equipment: exercise.equipment,
      equipmentRequirements: equipmentList,
      exerciseCategory: exercise.exerciseCategory,
      exerciseMechanics: exercise.exerciseMechanics,
      equipmentRequirement: exercise.equipmentRequirement,
      availableEnvironments: Array.isArray(exercise.availableEnvironments)
        ? (exercise.availableEnvironments as string[])
        : [],
      trainingGoals: Array.isArray(exercise.trainingGoals)
        ? (exercise.trainingGoals as string[])
        : [],
      tags: Array.isArray(exercise.tags) ? (exercise.tags as string[]) : [],
      musclesWorked: exercise.muscleRelations.map((m) => ({
        muscle: m.muscle,
        muscleGroup: m.muscleGroup,
        role: m.role,
        activationLevel: m.activationLevel,
      })),
      structuredEquipment: exercise.equipmentRelations.map((e) => ({
        equipmentName: e.equipmentName,
        requirementType: e.requirementType,
        equipmentCategory: e.equipmentCategory,
        alternatives: Array.isArray(e.alternatives) ? (e.alternatives as string[]) : [],
        availabilityContexts: Array.isArray(e.availabilityContexts)
          ? (e.availabilityContexts as string[])
          : [],
      })),
      tempo: exercise.tempo,
      tempoStructure: (exercise.tempoStructure as Record<string, any>) || null,
      rangeOfMotion: exercise.rangeOfMotion,
      repetitionType: exercise.repetitionType || 'REPETITION',
      breathingInstructions: exercise.breathingInstructions,
      educationalTips: educational,
      instructionSteps: exercise.instructionSteps.map((s) => ({
        stepNumber: s.stepNumber,
        phase: s.phase,
        title: s.title,
        description: s.description,
        coachingCue: s.coachingCue,
      })),
      movementPhases: exercise.movementPhases.map((p) => ({
        phaseName: p.phaseName,
        phaseType: p.phaseType || 'ECCENTRIC',
        title: p.title || null,
        orderIndex: p.orderIndex,
        cueText: p.cueText,
        bodyPosition: p.bodyPosition || null,
        rangeOfMotionType: p.rangeOfMotionType || null,
        breathingPattern: p.breathingPattern || null,
        tempoSeconds: p.tempoSeconds ?? null,
        holdDurationSeconds: p.holdDurationSeconds ?? null,
        jointAlignments: Array.isArray(p.jointAlignments) ? (p.jointAlignments as any[]) : [],
        keyCheckpoints: Array.isArray(p.keyCheckpoints) ? (p.keyCheckpoints as string[]) : [],
        visualCues: Array.isArray(p.visualCues) ? (p.visualCues as any[]) : [],
      })),
      commonMistakes: exercise.commonMistakes.map((m) => ({
        mistake: m.mistake,
        consequence: m.consequence,
        correction: m.correction,
        severity: m.severity,
      })),
      safetyGuidelines: exercise.safetyGuidelines.map((g) => ({
        category: g.category,
        title: g.title,
        description: g.description,
        severity: g.severity,
      })),
      variations: exercise.variationsFrom.map((v) => ({
        relationshipType: v.relationshipType,
        targetExerciseName: v.targetExercise.name,
        notes: v.notes,
      })),
    };
  }

  /**
   * Search knowledge base by biomechanical criteria
   */
  async searchKnowledgeByBiomechanics(criteria: {
    muscleGroup?: string;
    movementPattern?: string;
    difficulty?: string;
    search?: string;
  }) {
    const where: any = { status: 'ACTIVE' };

    if (criteria.muscleGroup) {
      where.OR = [
        { primaryMuscleGroup: criteria.muscleGroup },
        { secondaryMuscleGroups: { array_contains: criteria.muscleGroup } },
      ];
    }
    if (criteria.movementPattern) {
      where.movementPattern = criteria.movementPattern;
    }
    if (criteria.difficulty) {
      where.difficulty = criteria.difficulty;
    }
    if (criteria.search) {
      where.name = { contains: criteria.search, mode: 'insensitive' };
    }

    const exercises = await this.prisma.exercise.findMany({
      where,
      take: 10,
      select: {
        id: true,
        name: true,
        slug: true,
        difficulty: true,
        movementPattern: true,
        primaryMuscleGroup: true,
        equipment: true,
        tempo: true,
        rangeOfMotion: true,
        contentStatus: true,
      },
    });

    return exercises;
  }
}
