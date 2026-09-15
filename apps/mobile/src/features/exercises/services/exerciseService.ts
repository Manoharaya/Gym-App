import { apiClient } from '../../../services/api/apiClient';
import type {
  Exercise,
  ExerciseMedia,
  ExerciseDifficulty,
  ExerciseType,
  MovementPattern,
  MuscleGroup,
  EquipmentType,
} from '@fitcore/types';

export interface ExerciseQueryOptions {
  search?: string;
  muscleGroup?: MuscleGroup;
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
}

