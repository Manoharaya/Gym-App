import { apiClient } from '../../../services/api/apiClient';
import type {
  Workout,
  WorkoutTemplate,
  WorkoutSet,
  WorkoutStatus,
  ExerciseDifficulty,
  PrescriptionType,
  LoadUnit,
  DistanceUnit,
} from '@fitcore/types';

export interface WorkoutQueryOptions {
  memberProfileId?: string;
  trainerProfileId?: string;
  trainingProgramId?: string;
  status?: WorkoutStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AssignWorkoutExercisePayload {
  exerciseId: string;
  sortOrder: number;
  prescriptionType?: PrescriptionType;
  targetSets?: number;
  targetReps?: number;
  targetLoad?: number;
  loadUnit?: LoadUnit;
  targetDurationSeconds?: number;
  targetDistance?: number;
  distanceUnit?: DistanceUnit;
  restSeconds?: number;
  trainerNotes?: string;
}

export interface AssignWorkoutPayload {
  memberProfileId: string;
  trainerProfileId?: string;
  templateId?: string;
  trainingProgramId?: string;
  personalTrainingSessionId?: string;
  name: string;
  description?: string;
  scheduledDate: string;
  estimatedDurationMinutes?: number;
  difficulty?: ExerciseDifficulty;
  exercises?: AssignWorkoutExercisePayload[];
}

export interface LogWorkoutSetPayload {
  setNumber: number;
  setKind?: 'WARMUP' | 'WORKING' | 'DROPSET' | 'AMRAP' | 'COOLDOWN';
  targetReps?: number;
  actualReps?: number;
  targetLoad?: number;
  actualLoad?: number;
  loadUnit?: LoadUnit;
  actualDurationSeconds?: number;
  actualDistance?: number;
  distanceUnit?: DistanceUnit;
  actualRpe?: number;
  isCompleted?: boolean;
  notes?: string;
  idempotencyKey?: string;
}

export interface CorrectWorkoutSetPayload {
  actualReps?: number;
  actualLoad?: number;
  loadUnit?: LoadUnit;
  actualDurationSeconds?: number;
  actualDistance?: number;
  distanceUnit?: DistanceUnit;
  actualRpe?: number;
  isCompleted?: boolean;
  reason: string;
}

export interface CompleteWorkoutPayload {
  memberNotes?: string;
  trainerFeedback?: string;
  rating?: number;
}

export class WorkoutService {
  static async getWorkouts(options: WorkoutQueryOptions = {}): Promise<{
    items: Workout[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const params: Record<string, any> = {};
    if (options.memberProfileId) params.memberProfileId = options.memberProfileId;
    if (options.trainerProfileId) params.trainerProfileId = options.trainerProfileId;
    if (options.trainingProgramId) params.trainingProgramId = options.trainingProgramId;
    if (options.status) params.status = options.status;
    if (options.startDate) params.startDate = options.startDate;
    if (options.endDate) params.endDate = options.endDate;
    if (options.page) params.page = options.page;
    if (options.limit) params.limit = options.limit;

    const res = await apiClient.get<any>('/workouts', { params });
    const payload = res.data?.data || res.data;
    return {
      items: payload.items || [],
      meta: payload.meta || { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  }

  static async getWorkoutById(id: string): Promise<Workout> {
    const res = await apiClient.get<any>(`/workouts/${id}`);
    return res.data?.data || res.data;
  }

  static async assignWorkout(payload: AssignWorkoutPayload): Promise<Workout> {
    const res = await apiClient.post<any>('/workouts/assign', payload);
    return res.data?.data || res.data;
  }

  static async startWorkout(id: string): Promise<Workout> {
    const res = await apiClient.post<any>(`/workouts/${id}/start`);
    return res.data?.data || res.data;
  }

  static async completeWorkout(id: string, payload: CompleteWorkoutPayload = {}): Promise<Workout> {
    const res = await apiClient.post<any>(`/workouts/${id}/complete`, payload);
    return res.data?.data || res.data;
  }

  static async cancelWorkout(id: string): Promise<Workout> {
    const res = await apiClient.post<any>(`/workouts/${id}/cancel`);
    return res.data?.data || res.data;
  }

  static async logSet(workoutExerciseId: string, payload: LogWorkoutSetPayload): Promise<WorkoutSet> {
    const res = await apiClient.post<any>(`/workouts/exercises/${workoutExerciseId}/sets`, payload);
    return res.data?.data || res.data;
  }

  static async correctSet(setId: string, payload: CorrectWorkoutSetPayload): Promise<WorkoutSet> {
    const res = await apiClient.patch<any>(`/workouts/sets/${setId}/correct`, payload);
    return res.data?.data || res.data;
  }

  static async deleteSet(setId: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<any>(`/workouts/sets/${setId}`);
    return res.data?.data || res.data;
  }

  static async getTemplates(): Promise<{ items: WorkoutTemplate[] }> {
    const res = await apiClient.get<any>('/workout-templates');
    const payload = res.data?.data || res.data;
    return { items: payload.items || [] };
  }
}
