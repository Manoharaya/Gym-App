import { apiClient } from '../../../services/api';

export interface ProgressSummaryDto {
  memberProfileId: string;
  organisationId: string;
  period: string;
  adherence: {
    totalScheduled: number;
    completed: number;
    skipped: number;
    overdue: number;
    cancelled: number;
    pending: number;
    effectiveScheduled: number;
    adherenceRate: number;
    completionRate: number;
    dailyBreakdown: Array<{
      date: string;
      total: number;
      completed: number;
      skipped: number;
      cancelled: number;
    }>;
  };
  workoutsCompleted: number;
  totalTonnageLifted: number;
  exercisesCompleted: number;
  exerciseAnalytics: Array<{
    exerciseId: string;
    exerciseName: string;
    exerciseType: string;
    totalSets: number;
    totalReps: number;
    totalVolume: number;
    maxLoad: number;
    averageRpe: number | null;
  }>;
  recentMeasurements: Array<{
    id: string;
    measurementType: string;
    value: number;
    unit: string;
    recordedAt: string;
    notes?: string;
  }>;
  personalRecords: Array<{
    id: string;
    recordType: string;
    value: number;
    unit: string;
    achievedAt: string;
    previousValue?: number | null;
    improvementPercentage?: number | null;
    exercise: {
      id: string;
      name: string;
    };
  }>;
  activeGoals: Array<{
    id: string;
    title: string;
    category: string;
    baselineValue: number | null;
    targetValue: number | null;
    currentValue: number | null;
    unit: string | null;
    progressPercentage: number;
    isCompleted: boolean;
    isOverdue: boolean;
    direction: 'INCREASING' | 'DECREASING' | 'NEUTRAL';
    targetDate: string | null;
    status: string;
  }>;
  recentAssessments: Array<{
    id: string;
    title: string;
    category: string;
    status: string;
    completedAt: string;
    summaryScore?: number | null;
    results: Array<{
      metricName: string;
      value?: number;
      unit?: string;
      repetitions?: number;
      weight?: number;
      durationSeconds?: number;
      score?: number;
    }>;
  }>;
}

export class ProgressService {
  /**
   * Fetches the member's own progress summary from real backend data.
   */
  static async getMyProgress(period: string = '30D'): Promise<ProgressSummaryDto> {
    const res = await apiClient.get<ProgressSummaryDto>(`/progress/summary?period=${period}`);
    return res.data;
  }

  /**
   * Fetches progress summary for a specific member (for trainer/staff view).
   */
  static async getMemberProgress(memberId: string, period: string = '30D'): Promise<ProgressSummaryDto> {
    const res = await apiClient.get<ProgressSummaryDto>(`/members/${memberId}/progress?period=${period}`);
    return res.data;
  }

  /**
   * Records a new body measurement.
   */
  static async recordMeasurement(
    memberId: string,
    payload: {
      measurementType: string;
      value: number;
      unit: string;
      notes?: string;
    },
  ) {
    const res = await apiClient.post(`/members/${memberId}/measurements`, payload);
    return res.data;
  }

  /**
   * Fetches measurements history.
   */
  static async getMeasurements(memberId: string, measurementType?: string) {
    const query = measurementType ? `?measurementType=${measurementType}` : '';
    const res = await apiClient.get(`/members/${memberId}/measurements${query}`);
    return res.data;
  }

  /**
   * Fetches personal records.
   */
  static async getPersonalRecords(memberId: string) {
    const res = await apiClient.get(`/members/${memberId}/personal-records`);
    return res.data;
  }

  /**
   * Fetches assessments.
   */
  static async getAssessments(memberId: string) {
    const res = await apiClient.get(`/members/${memberId}/assessments`);
    return res.data;
  }
}
