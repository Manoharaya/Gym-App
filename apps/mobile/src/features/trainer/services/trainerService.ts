import { apiClient } from '../../../services/api/apiClient';
import type {
  TrainerProfile,
  TrainerCertification,
  TrainerClientAssignment,
  TrainerAssignmentType,
} from '@fitcore/types';

export interface QueryTrainersParams {
  outletId?: string;
  specialty?: string;
  language?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AddCertificationPayload {
  certificationName: string;
  issuingOrganisation: string;
  certificationNumber?: string;
  issueDate: string;
  expiryDate?: string;
  documentReference?: string;
  documentUrl?: string;
}

export interface AssignClientPayload {
  memberProfileId: string;
  assignmentType?: TrainerAssignmentType;
  outletId?: string;
  startDate?: string;
  notes?: string;
}

export interface ReassignClientPayload {
  newTrainerId: string;
  assignmentType?: TrainerAssignmentType;
  reason?: string;
  transferNotes?: string;
}

export const trainerService = {
  async getAllTrainers(params?: QueryTrainersParams): Promise<TrainerProfile[]> {
    const res = await apiClient.get<any>('/trainers', {
      params: params as Record<string, string | number | boolean | undefined>,
    });
    if (Array.isArray(res.data)) return res.data;
    if (res.data?.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  },

  async getTrainerById(id: string): Promise<TrainerProfile> {
    const res = await apiClient.get<TrainerProfile>(`/trainers/${id}`);
    return res.data;
  },

  async updateTrainerProfile(id: string, payload: Partial<TrainerProfile>): Promise<TrainerProfile> {
    const res = await apiClient.patch<TrainerProfile>(`/trainers/${id}`, payload);
    return res.data;
  },

  async addCertification(trainerId: string, payload: AddCertificationPayload): Promise<TrainerCertification> {
    const res = await apiClient.post<TrainerCertification>(`/trainers/${trainerId}/certifications`, payload);
    return res.data;
  },

  async updateCertification(
    trainerId: string,
    certId: string,
    payload: Partial<AddCertificationPayload>,
  ): Promise<TrainerCertification> {
    const res = await apiClient.patch<TrainerCertification>(
      `/trainers/${trainerId}/certifications/${certId}`,
      payload,
    );
    return res.data;
  },

  async deleteCertification(trainerId: string, certId: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(`/trainers/${trainerId}/certifications/${certId}`);
    return res.data;
  },

  async assignClient(trainerId: string, payload: AssignClientPayload): Promise<TrainerClientAssignment> {
    const res = await apiClient.post<TrainerClientAssignment>(`/trainers/${trainerId}/clients`, payload);
    return res.data;
  },

  async reassignClient(
    trainerId: string,
    assignmentId: string,
    payload: ReassignClientPayload,
  ): Promise<TrainerClientAssignment> {
    const res = await apiClient.post<TrainerClientAssignment>(
      `/trainers/${trainerId}/clients/${assignmentId}/reassign`,
      payload,
    );
    return res.data;
  },

  async terminateClientAssignment(trainerId: string, assignmentId: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(`/trainers/${trainerId}/clients/${assignmentId}`);
    return res.data;
  },

  async getTrainerClients(trainerId: string): Promise<TrainerClientAssignment[]> {
    const res = await apiClient.get<TrainerClientAssignment[]>(`/trainers/${trainerId}/clients`);
    return res.data ?? [];
  },

  async getMemberTrainers(memberProfileId: string): Promise<TrainerClientAssignment[]> {
    const res = await apiClient.get<TrainerClientAssignment[]>(`/trainers/member/${memberProfileId}`);
    return res.data ?? [];
  },
};
