import { apiClient } from '../../../services/api/apiClient';
import type {
  Exercise,
  ExerciseMedia,
  ExerciseInstruction,
  ExerciseInstructionStep,
  ExerciseMovementPhase,
  ExerciseDifficulty,
  ExerciseType,
  MovementPattern,
  MuscleGroup,
  EquipmentType,
} from '@fitcore/types';

export interface ExerciseQueryOptions {
  search?: string;
  muscleGroup?: MuscleGroup;
  primaryMuscle?: string;
  secondaryMuscle?: string;
  muscle?: string;
  availableEquipment?: string[];
  noEquipment?: boolean;
  trainingGoal?: string;
  exerciseCategory?: string;
  exerciseMechanics?: string;
  environment?: string;
  tag?: string;
  movementPattern?: MovementPattern;
  equipmentType?: EquipmentType;
  difficulty?: ExerciseDifficulty;
  exerciseType?: ExerciseType;
  ownership?: 'ALL' | 'SYSTEM' | 'ORGANISATION';
  includeArchived?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateCustomExercisePayload {
  name: string;
  description?: string;
  difficulty: ExerciseDifficulty;
  exerciseType: ExerciseType;
  movementPattern: MovementPattern;
  primaryMuscleGroup: MuscleGroup;
  secondaryMuscleGroups?: MuscleGroup[];
  equipmentType: EquipmentType;
  instructions?: string[];
  coachingCues?: string[];
  safetyNotes?: string;
  defaultRestSeconds?: number;
}

export class ExerciseService {
  static async getExercises(options: ExerciseQueryOptions = {}): Promise<{
    items: Exercise[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const params: Record<string, any> = {};
    if (options.search) params.search = options.search;
    if (options.muscleGroup) params.muscleGroup = options.muscleGroup;
    if (options.primaryMuscle) params.primaryMuscle = options.primaryMuscle;
    if (options.secondaryMuscle) params.secondaryMuscle = options.secondaryMuscle;
    if (options.muscle) params.muscle = options.muscle;
    if (options.availableEquipment && options.availableEquipment.length > 0) {
      params.availableEquipment = options.availableEquipment.join(',');
    }
    if (options.noEquipment !== undefined) params.noEquipment = options.noEquipment;
    if (options.trainingGoal) params.trainingGoal = options.trainingGoal;
    if (options.exerciseCategory) params.exerciseCategory = options.exerciseCategory;
    if (options.exerciseMechanics) params.exerciseMechanics = options.exerciseMechanics;
    if (options.environment) params.environment = options.environment;
    if (options.tag) params.tag = options.tag;
    if (options.movementPattern) params.movementPattern = options.movementPattern;
    if (options.equipmentType) params.equipmentType = options.equipmentType;
    if (options.difficulty) params.difficulty = options.difficulty;
    if (options.exerciseType) params.exerciseType = options.exerciseType;
    if (options.ownership) params.ownership = options.ownership;
    if (options.includeArchived) params.includeArchived = options.includeArchived;
    if (options.page) params.page = options.page;
    if (options.limit) params.limit = options.limit;

    const res = await apiClient.get<any>('/exercises', { params });
    const payload = res.data?.data || res.data;
    return {
      items: payload.items || [],
      meta: payload.meta || { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  }

  static async getExerciseById(id: string): Promise<Exercise> {
    const res = await apiClient.get<any>(`/exercises/${id}`);
    return res.data?.data || res.data;
  }

  static async getExerciseVisualDetails(id: string): Promise<Exercise> {
    const res = await apiClient.get<any>(`/exercises/${id}/visual`);
    return res.data?.data || res.data;
  }

  static async getExerciseInstructions(id: string): Promise<{
    exerciseId: string;
    instructionSteps: any[];
    movementPhases: any[];
  }> {
    const res = await apiClient.get<any>(`/exercises/${id}/instructions`);
    return res.data?.data || res.data;
  }

  static async getExerciseMedia(id: string, query?: Record<string, any>): Promise<ExerciseMedia[]> {
    const res = await apiClient.get<any>(`/exercises/${id}/media`, { params: query });
    return res.data?.data || res.data;
  }

  static async getMediaById(mediaId: string): Promise<ExerciseMedia> {
    const res = await apiClient.get<any>(`/exercise-media/${mediaId}`);
    return res.data?.data || res.data;
  }

  static async presignMediaUpload(
    id: string,
    payload: {
      filename: string;
      mimeType: string;
      mediaType: string;
      purpose?: string;
      fileSize?: number;
      isPrimary?: boolean;
      altText?: string;
      title?: string;
    },
  ): Promise<{ uploadUrl: string; storageKey: string; expiresAt: string; publicUrl: string }> {
    const res = await apiClient.post<any>(`/exercises/${id}/media/presign-upload`, payload);
    return res.data?.data || res.data;
  }

  static async attachMedia(id: string, payload: Partial<ExerciseMedia>): Promise<ExerciseMedia> {
    const res = await apiClient.post<any>(`/exercises/${id}/media`, payload);
    return res.data?.data || res.data;
  }

  static async updateMedia(mediaId: string, payload: Partial<ExerciseMedia>): Promise<ExerciseMedia> {
    const res = await apiClient.patch<any>(`/exercise-media/${mediaId}`, payload);
    return res.data?.data || res.data;
  }

  static async deleteMedia(mediaId: string): Promise<{ success: boolean; deletedId: string }> {
    const res = await apiClient.delete<any>(`/exercise-media/${mediaId}`);
    return res.data?.data || res.data;
  }

  static async publishMedia(mediaId: string): Promise<ExerciseMedia> {
    const res = await apiClient.post<any>(`/exercise-media/${mediaId}/publish`);
    return res.data?.data || res.data;
  }

  static async archiveMedia(mediaId: string): Promise<ExerciseMedia> {
    const res = await apiClient.post<any>(`/exercise-media/${mediaId}/archive`);
    return res.data?.data || res.data;
  }

  static async getExerciseRelationships(id: string): Promise<{
    exerciseId: string;
    variations: any[];
    referencedAsVariationIn: any[];
    equipment: any[];
  }> {
    const res = await apiClient.get<any>(`/exercises/${id}/relationships`);
    return res.data?.data || res.data;
  }

  static async createCustomExercise(payload: CreateCustomExercisePayload): Promise<Exercise> {
    const res = await apiClient.post<any>('/exercises', payload);
    return res.data?.data || res.data;
  }

  static async archiveExercise(id: string): Promise<Exercise> {
    const res = await apiClient.post<any>(`/exercises/${id}/archive`);
    return res.data?.data || res.data;
  }

  // ==========================================
  // DAY 63: STEP-BY-STEP LEARNING & INSTRUCTIONS
  // ==========================================

  static async getExerciseInstructionGuide(exerciseId: string): Promise<ExerciseInstruction> {
    const res = await apiClient.get<any>(`/exercises/${exerciseId}/instruction`);
    return res.data?.data || res.data;
  }

  static async upsertExerciseInstruction(
    exerciseId: string,
    payload: Partial<ExerciseInstruction>,
  ): Promise<ExerciseInstruction> {
    const res = await apiClient.put<any>(`/exercises/${exerciseId}/instruction`, payload);
    return res.data?.data || res.data;
  }

  static async createInstructionStep(
    exerciseId: string,
    payload: Partial<ExerciseInstructionStep>,
  ): Promise<ExerciseInstructionStep> {
    const res = await apiClient.post<any>(`/exercises/${exerciseId}/instruction/steps`, payload);
    return res.data?.data || res.data;
  }

  static async updateInstructionStep(
    stepId: string,
    payload: Partial<ExerciseInstructionStep>,
  ): Promise<ExerciseInstructionStep> {
    const res = await apiClient.patch<any>(`/exercise-instruction-steps/${stepId}`, payload);
    return res.data?.data || res.data;
  }

  static async deleteInstructionStep(stepId: string): Promise<{ success: boolean; deletedStepId: string }> {
    const res = await apiClient.delete<any>(`/exercise-instruction-steps/${stepId}`);
    return res.data?.data || res.data;
  }

  static async reorderInstructionSteps(
    exerciseId: string,
    stepIds: string[],
  ): Promise<ExerciseInstructionStep[]> {
    const res = await apiClient.post<any>(`/exercises/${exerciseId}/instruction/reorder`, { stepIds });
    return res.data?.data || res.data;
  }

  static async attachStepMedia(
    stepId: string,
    payload: {
      mediaId: string;
      videoStartTimeSeconds?: number;
      videoEndTimeSeconds?: number;
    },
  ): Promise<ExerciseInstructionStep> {
    const res = await apiClient.post<any>(`/exercise-instruction-steps/${stepId}/media`, payload);
    return res.data?.data || res.data;
  }

  static async publishExerciseInstruction(exerciseId: string): Promise<ExerciseInstruction> {
    const res = await apiClient.post<any>(`/exercises/${exerciseId}/instruction/publish`);
    return res.data?.data || res.data;
  }

  // --- Day 64: Movement Steps, Phases & Exercise Movement Intelligence ---

  static async getExerciseMovementStructure(exerciseId: string): Promise<{
    exerciseId: string;
    exerciseName: string;
    ownershipType: string;
    movementPattern: string;
    secondaryMovementPatterns: string[];
    repetitionType: string;
    tempoStructure: any;
    phasesCount: number;
    phases: ExerciseMovementPhase[];
    aiMovementIntelligence: any;
  }> {
    const res = await apiClient.get<any>(`/exercises/${exerciseId}/movement`);
    return res.data?.data || res.data;
  }

  static async updateExerciseMovementStructure(
    exerciseId: string,
    payload: {
      secondaryMovementPatterns?: string[];
      repetitionType?: string;
      tempoStructure?: any;
    },
  ): Promise<any> {
    const res = await apiClient.put<any>(`/exercises/${exerciseId}/movement`, payload);
    return res.data?.data || res.data;
  }

  static async publishExerciseMovementStructure(exerciseId: string): Promise<any> {
    const res = await apiClient.post<any>(`/exercises/${exerciseId}/movement/publish`);
    return res.data?.data || res.data;
  }

  static async getExerciseMovementPhases(exerciseId: string): Promise<ExerciseMovementPhase[]> {
    const res = await apiClient.get<any>(`/exercises/${exerciseId}/movement/phases`);
    return res.data?.data || res.data;
  }

  static async getMovementPhaseById(exerciseId: string, phaseId: string): Promise<ExerciseMovementPhase> {
    const res = await apiClient.get<any>(`/exercises/${exerciseId}/movement/phases/${phaseId}`);
    return res.data?.data || res.data;
  }

  static async createMovementPhase(
    exerciseId: string,
    payload: Partial<ExerciseMovementPhase>,
  ): Promise<ExerciseMovementPhase> {
    const res = await apiClient.post<any>(`/exercises/${exerciseId}/movement/phases`, payload);
    return res.data?.data || res.data;
  }

  static async updateMovementPhase(
    exerciseId: string,
    phaseId: string,
    payload: Partial<ExerciseMovementPhase>,
  ): Promise<ExerciseMovementPhase> {
    const res = await apiClient.put<any>(`/exercises/${exerciseId}/movement/phases/${phaseId}`, payload);
    return res.data?.data || res.data;
  }

  static async deleteMovementPhase(
    exerciseId: string,
    phaseId: string,
  ): Promise<{ success: boolean; deletedPhaseId: string }> {
    const res = await apiClient.delete<any>(`/exercises/${exerciseId}/movement/phases/${phaseId}`);
    return res.data?.data || res.data;
  }

  static async reorderMovementPhases(
    exerciseId: string,
    phaseIds: string[],
  ): Promise<ExerciseMovementPhase[]> {
    const res = await apiClient.post<any>(`/exercises/${exerciseId}/movement/phases/reorder`, { phaseIds });
    return res.data?.data || res.data;
  }

  static async attachPhaseMedia(
    exerciseId: string,
    phaseId: string,
    payload: {
      mediaId: string;
      startTimeSeconds?: number;
      endTimeSeconds?: number;
    },
  ): Promise<ExerciseMovementPhase> {
    const res = await apiClient.post<any>(`/exercises/${exerciseId}/movement/phases/${phaseId}/media`, payload);
    return res.data?.data || res.data;
  }

  static async linkPhaseSteps(
    exerciseId: string,
    phaseId: string,
    stepIds: string[],
  ): Promise<ExerciseMovementPhase> {
    const res = await apiClient.post<any>(`/exercises/${exerciseId}/movement/phases/${phaseId}/steps`, { stepIds });
    return res.data?.data || res.data;
  }

  // ==========================================
  // DAY 65: METADATA, MUSCLES & EQUIPMENT
  // ==========================================

  static async getTaxonomy(query?: { type?: string; includeArchived?: boolean }): Promise<any[]> {
    const res = await apiClient.get<any>('/exercise-metadata/taxonomy', { params: query });
    return res.data?.data || res.data || [];
  }

  static async getExerciseMuscles(exerciseId: string): Promise<any> {
    const res = await apiClient.get<any>(`/exercises/${exerciseId}/muscles`);
    return res.data?.data || res.data;
  }

  static async addExerciseMuscle(exerciseId: string, payload: any): Promise<any> {
    const res = await apiClient.post<any>(`/exercises/${exerciseId}/muscles`, payload);
    return res.data?.data || res.data;
  }

  static async batchSetExerciseMuscles(exerciseId: string, muscles: any[]): Promise<any> {
    const res = await apiClient.put<any>(`/exercises/${exerciseId}/muscles`, { muscles });
    return res.data?.data || res.data;
  }

  static async removeExerciseMuscle(relationId: string): Promise<any> {
    const res = await apiClient.delete<any>(`/exercise-muscles/${relationId}`);
    return res.data?.data || res.data;
  }

  static async addExerciseEquipmentRelation(exerciseId: string, payload: any): Promise<any> {
    const res = await apiClient.post<any>(`/exercises/${exerciseId}/equipment-relations`, payload);
    return res.data?.data || res.data;
  }

  static async removeExerciseEquipmentRelation(relationId: string): Promise<any> {
    const res = await apiClient.delete<any>(`/exercise-equipment/${relationId}`);
    return res.data?.data || res.data;
  }

  static async updateExerciseClassification(exerciseId: string, payload: any): Promise<any> {
    const res = await apiClient.patch<any>(`/exercises/${exerciseId}/classification`, payload);
    return res.data?.data || res.data;
  }

  static async getExerciseCompleteness(exerciseId: string): Promise<any> {
    const res = await apiClient.get<any>(`/exercises/${exerciseId}/completeness`);
    return res.data?.data || res.data;
  }

  static async getExerciseSubstitutes(exerciseId: string, availableEquipment?: string[]): Promise<any[]> {
    const params: Record<string, any> = {};
    if (availableEquipment && availableEquipment.length > 0) {
      params.availableEquipment = availableEquipment.join(',');
    }
    const res = await apiClient.get<any>(`/exercises/${exerciseId}/substitutes`, { params });
    return res.data?.data || res.data || [];
  }
}

