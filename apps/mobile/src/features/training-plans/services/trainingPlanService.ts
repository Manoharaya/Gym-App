import { apiClient } from '../../../services/api/apiClient';
import type {
  TrainingPlan,
  TrainingPlanDay,
  WorkoutProgressionRule,
  PlanAdherenceMetrics,
  Workout,
} from '@fitcore/types';

export interface TrainingPlanQueryOptions {
  memberProfileId?: string;
  trainerProfileId?: string;
  trainingProgramId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreateTrainingPlanPayload {
  name: string;
  description?: string;
  objective?: string;
  trainingProgramId?: string;
  memberProfileId: string;
  durationWeeks: number;
  startDate: string;
  endDate?: string;
}

export interface GenerateWorkoutsPayload {
  workoutTemplateId: string;
  dayNumbers: number[];
  startWeek?: number;
  endWeek?: number;
  applyProgression?: boolean;
}

export interface CreateExerciseGroupPayload {
  name: string;
  type: string;
  section?: string;
  orderIndex?: number;
  rounds?: number;
  restBetweenExercises?: number;
  restBetweenRounds?: number;
  durationSeconds?: number;
  notes?: string;
  exerciseIds?: string[];
}

export class TrainingPlanService {
  static async getPlans(options: TrainingPlanQueryOptions = {}): Promise<{ items: TrainingPlan[]; total: number }> {
    const params: Record<string, any> = {};
    if (options.memberProfileId) params.memberProfileId = options.memberProfileId;
    if (options.trainerProfileId) params.trainerProfileId = options.trainerProfileId;
    if (options.trainingProgramId) params.trainingProgramId = options.trainingProgramId;
    if (options.status) params.status = options.status;
    if (options.page) params.page = options.page;
    if (options.limit) params.limit = options.limit;

    const res = await apiClient.get<any>('/training-plans', { params });
    const payload = res.data?.data || res.data;
    return {
      items: payload?.items || [],
      total: payload?.total || 0,
    };
  }

  static async getPlanById(id: string): Promise<TrainingPlan> {
    const res = await apiClient.get<any>(`/training-plans/${id}`);
    return res.data?.data || res.data;
  }

  static async createPlan(payload: CreateTrainingPlanPayload): Promise<TrainingPlan> {
    const res = await apiClient.post<any>('/training-plans', payload);
    return res.data?.data || res.data;
  }

  static async updatePlan(id: string, payload: Partial<CreateTrainingPlanPayload & { status: string }>): Promise<TrainingPlan> {
    const res = await apiClient.patch<any>(`/training-plans/${id}`, payload);
    return res.data?.data || res.data;
  }

  static async activatePlan(id: string): Promise<TrainingPlan> {
    const res = await apiClient.post<any>(`/training-plans/${id}/activate`);
    return res.data?.data || res.data;
  }

  static async pausePlan(id: string): Promise<TrainingPlan> {
    const res = await apiClient.post<any>(`/training-plans/${id}/pause`);
    return res.data?.data || res.data;
  }

  static async archivePlan(id: string): Promise<TrainingPlan> {
    const res = await apiClient.post<any>(`/training-plans/${id}/archive`);
    return res.data?.data || res.data;
  }

  static async generateWorkouts(planId: string, payload: GenerateWorkoutsPayload): Promise<any> {
    const res = await apiClient.post<any>(`/training-plans/${planId}/generate-workouts`, payload);
    return res.data?.data || res.data;
  }

  static async getAdherence(planId: string): Promise<PlanAdherenceMetrics & { weeklyBreakdown?: any[] }> {
    const res = await apiClient.get<any>(`/training-plans/${planId}/adherence`);
    return res.data?.data || res.data;
  }

  static async getCalendar(planId: string, startDate?: string, endDate?: string): Promise<TrainingPlanDay[]> {
    const params: Record<string, any> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const res = await apiClient.get<any>(`/training-plans/${planId}/calendar`, { params });
    return res.data?.data || res.data || [];
  }

  static async addExerciseGroup(workoutId: string, payload: CreateExerciseGroupPayload): Promise<Workout> {
    const res = await apiClient.post<any>(`/workouts/${workoutId}/groups`, payload);
    return res.data?.data || res.data;
  }

  static async addProgressionRule(planId: string, payload: any): Promise<WorkoutProgressionRule> {
    const res = await apiClient.post<any>(`/training-plans/${planId}/progression-rules`, payload);
    return res.data?.data || res.data;
  }
}
