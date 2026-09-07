import { apiClient } from '../../../services/api/apiClient';
import type {
  Exercise,
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

  static async createCustomExercise(payload: CreateCustomExercisePayload): Promise<Exercise> {
    const res = await apiClient.post<any>('/exercises', payload);
    return res.data?.data || res.data;
  }

  static async archiveExercise(id: string): Promise<Exercise> {
    const res = await apiClient.post<any>(`/exercises/${id}/archive`);
    return res.data?.data || res.data;
  }
}
