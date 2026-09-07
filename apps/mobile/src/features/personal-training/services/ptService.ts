import { apiClient } from '../../../services/api/apiClient';
import type {
  TrainingProgram,
  TrainingGoal,
  TrainingGoalCategory,
  TrainingGoalStatus,
  TrainerNote,
  TrainerNoteType,
  TrainerNoteVisibility,
  PersonalTrainingSession,
  PTSessionStatus,
  PTSessionType,
} from '@fitcore/types';

export interface CreateProgramPayload {
  outletId?: string;
  trainerProfileId?: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  metadata?: Record<string, any>;
}

export interface UpdateProgramPayload {
  name?: string;
  description?: string;
  endDate?: string;
  metadata?: Record<string, any>;
}

export interface CreateGoalPayload {
  trainingProgramId?: string;
  title: string;
  description?: string;
  category: TrainingGoalCategory;
  baselineValue?: number;
  targetValue?: number;
  unit?: string;
  targetDate?: string;
  priority?: number;
}

export interface UpdateGoalProgressPayload {
  currentValue?: number;
  status?: TrainingGoalStatus;
  notes?: string;
}

export interface CreateNotePayload {
  outletId?: string;
  trainingProgramId?: string;
  trainingGoalId?: string;
  personalTrainingSessionId?: string;
  noteType?: TrainerNoteType;
  content: string;
  visibility?: TrainerNoteVisibility;
  isPinned?: boolean;
}

export interface UpdateNotePayload {
  content?: string;
  visibility?: TrainerNoteVisibility;
  noteType?: TrainerNoteType;
  isPinned?: boolean;
}

export interface SchedulePTSessionPayload {
  outletId?: string;
  memberProfileId: string;
  trainerProfileId?: string;
  trainingProgramId?: string;
  sessionType?: PTSessionType;
  scheduledStart: string;
  scheduledEnd: string;
  location?: string;
  notes?: string;
}

export interface QueryPTSessionsParams {
  memberProfileId?: string;
  trainerProfileId?: string;
  outletId?: string;
  status?: PTSessionStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const ptService = {
  // --- Training Programs ---
  async getMemberPrograms(memberProfileId: string): Promise<TrainingProgram[]> {
    const res = await apiClient.get<any>(`/members/${memberProfileId}/training-programs`);
    if (Array.isArray(res.data)) return res.data;
    if (res.data?.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  },

  async getProgramById(programId: string): Promise<TrainingProgram> {
    const res = await apiClient.get<TrainingProgram>(`/training-programs/${programId}`);
    return res.data;
  },

  async createProgram(memberProfileId: string, payload: CreateProgramPayload): Promise<TrainingProgram> {
    const res = await apiClient.post<TrainingProgram>(`/members/${memberProfileId}/training-programs`, payload);
    return res.data;
  },

  async updateProgram(programId: string, payload: UpdateProgramPayload): Promise<TrainingProgram> {
    const res = await apiClient.patch<TrainingProgram>(`/training-programs/${programId}`, payload);
    return res.data;
  },

  async activateProgram(programId: string): Promise<TrainingProgram> {
    const res = await apiClient.post<TrainingProgram>(`/training-programs/${programId}/activate`, {});
    return res.data;
  },

  async pauseProgram(programId: string, reason?: string): Promise<TrainingProgram> {
    const res = await apiClient.post<TrainingProgram>(`/training-programs/${programId}/pause`, { reason });
    return res.data;
  },

  async completeProgram(programId: string): Promise<TrainingProgram> {
    const res = await apiClient.post<TrainingProgram>(`/training-programs/${programId}/complete`, {});
    return res.data;
  },

  async cancelProgram(programId: string, reason: string): Promise<TrainingProgram> {
    const res = await apiClient.post<TrainingProgram>(`/training-programs/${programId}/cancel`, { reason });
    return res.data;
  },

  // --- Member Goals ---
  async getMemberGoals(memberProfileId: string, statusFilter?: string): Promise<TrainingGoal[]> {
    const res = await apiClient.get<any>(`/members/${memberProfileId}/training-goals`, {
      params: statusFilter ? { status: statusFilter } : undefined,
    });
    if (Array.isArray(res.data)) return res.data;
    if (res.data?.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  },

  async getGoalById(goalId: string): Promise<TrainingGoal> {
    const res = await apiClient.get<TrainingGoal>(`/training-goals/${goalId}`);
    return res.data;
  },

  async createGoal(memberProfileId: string, payload: CreateGoalPayload): Promise<TrainingGoal> {
    const res = await apiClient.post<TrainingGoal>(`/members/${memberProfileId}/training-goals`, payload);
    return res.data;
  },

  async updateGoal(goalId: string, payload: Partial<CreateGoalPayload>): Promise<TrainingGoal> {
    const res = await apiClient.patch<TrainingGoal>(`/training-goals/${goalId}`, payload);
    return res.data;
  },

  async recordGoalProgress(goalId: string, payload: UpdateGoalProgressPayload): Promise<TrainingGoal> {
    const res = await apiClient.post<TrainingGoal>(`/training-goals/${goalId}/progress`, payload);
    return res.data;
  },

  // --- Trainer Notes ---
  async getMemberNotes(memberProfileId: string): Promise<TrainerNote[]> {
    const res = await apiClient.get<any>(`/members/${memberProfileId}/trainer-notes`);
    if (Array.isArray(res.data)) return res.data;
    if (res.data?.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  },

  async createNote(memberProfileId: string, payload: CreateNotePayload): Promise<TrainerNote> {
    const res = await apiClient.post<TrainerNote>(`/members/${memberProfileId}/trainer-notes`, payload);
    return res.data;
  },

  async updateNote(noteId: string, payload: UpdateNotePayload): Promise<TrainerNote> {
    const res = await apiClient.patch<TrainerNote>(`/trainer-notes/${noteId}`, payload);
    return res.data;
  },

  async deleteNote(noteId: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(`/trainer-notes/${noteId}`);
    return res.data;
  },

  // --- Personal Training Sessions ---
  async getPTSessions(params?: QueryPTSessionsParams): Promise<PersonalTrainingSession[]> {
    const res = await apiClient.get<any>('/pt-sessions', {
      params: params as Record<string, string | number | boolean | undefined>,
    });
    if (Array.isArray(res.data)) return res.data;
    if (res.data?.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  },

  async getPTSessionById(sessionId: string): Promise<PersonalTrainingSession> {
    const res = await apiClient.get<PersonalTrainingSession>(`/pt-sessions/${sessionId}`);
    return res.data;
  },

  async schedulePTSession(payload: SchedulePTSessionPayload): Promise<PersonalTrainingSession> {
    const res = await apiClient.post<PersonalTrainingSession>('/pt-sessions', payload);
    return res.data;
  },

  async startPTSession(sessionId: string): Promise<PersonalTrainingSession> {
    const res = await apiClient.post<PersonalTrainingSession>(`/pt-sessions/${sessionId}/start`, {});
    return res.data;
  },

  async completePTSession(sessionId: string): Promise<PersonalTrainingSession> {
    const res = await apiClient.post<PersonalTrainingSession>(`/pt-sessions/${sessionId}/complete`, {});
    return res.data;
  },

  async cancelPTSession(sessionId: string, reason: string): Promise<PersonalTrainingSession> {
    const res = await apiClient.post<PersonalTrainingSession>(`/pt-sessions/${sessionId}/cancel`, { reason });
    return res.data;
  },
};
