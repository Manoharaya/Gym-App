import { apiClient } from '../../../services/api';
import type {
  ReactivationSummaryDto,
  ReactivationQueueItemDto,
  MemberReactivationProfileDto,
  MemberRecoveryPlanDto,
  CreateRecoveryPlanDto,
  UpdateRecoveryPlanDto,
  ReactivationFeedbackDto,
  RecoveryPlanStatus,
} from '@fitcore/types';

export class ReactivationService {
  /**
   * Aggregate reactivation dashboard summary & distribution metrics.
   */
  static async getSummary(params?: {
    outletId?: string;
  }): Promise<ReactivationSummaryDto> {
    const res = await apiClient.get<ReactivationSummaryDto>('/ai/reactivation/summary', {
      params,
    });
    return res.data;
  }

  /**
   * Staff reactivation queue with filters.
   */
  static async getQueue(params?: {
    outletId?: string;
    lifecycleState?: string;
    reactivationStatus?: string;
    recoveryState?: string;
    strategyType?: string;
    assignedStaffId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: ReactivationQueueItemDto[]; total: number; limit: number; offset: number }> {
    const res = await apiClient.get<{
      items: ReactivationQueueItemDto[];
      total: number;
      limit: number;
      offset: number;
    }>('/ai/reactivation/queue', { params });
    return res.data;
  }

  /**
   * Fetches member reactivation profile and active recovery plan.
   */
  static async getMemberReactivation(
    memberId: string,
  ): Promise<{ profile: MemberReactivationProfileDto | null; activePlan: MemberRecoveryPlanDto | null }> {
    const res = await apiClient.get<{
      profile: MemberReactivationProfileDto | null;
      activePlan: MemberRecoveryPlanDto | null;
    }>(`/ai/reactivation/members/${memberId}`);
    return res.data;
  }

  /**
   * Triggers or retrieves grounded AI reactivation analysis.
   */
  static async analyzeMember(dto: {
    memberId: string;
    forceRefresh?: boolean;
    includeAIAssessment?: boolean;
  }) {
    const res = await apiClient.post('/ai/reactivation/analyze', dto);
    return res.data;
  }

  /**
   * Creates a human-approved MemberRecoveryPlan.
   */
  static async createRecoveryPlan(
    dto: CreateRecoveryPlanDto,
  ): Promise<MemberRecoveryPlanDto> {
    const res = await apiClient.post<MemberRecoveryPlanDto>('/ai/reactivation/plans', {
      memberId: dto.memberId,
      strategyType: dto.strategy,
      targetChannel: 'TRAINER_MESSAGE',
      recommendedAction: dto.reason || dto.suggestedNextStep || 'Recovery follow-up',
      draftMessage: dto.suggestedStaffMessage,
      staffNotes: dto.notes,
      assignedStaffId: dto.assignedStaffId,
    });
    return res.data;
  }

  /**
   * Fetches recovery plan details by ID.
   */
  static async getRecoveryPlan(planId: string): Promise<MemberRecoveryPlanDto> {
    const res = await apiClient.get<MemberRecoveryPlanDto>(`/ai/reactivation/plans/${planId}`);
    return res.data;
  }

  /**
   * Updates recovery plan metadata or transitions status.
   */
  static async updateRecoveryPlan(
    planId: string,
    dto: UpdateRecoveryPlanDto,
  ): Promise<MemberRecoveryPlanDto> {
    const res = await apiClient.patch<MemberRecoveryPlanDto>(
      `/ai/reactivation/plans/${planId}`,
      dto,
    );
    return res.data;
  }

  /**
   * Transitions recovery plan status through state machine.
   */
  static async transitionPlan(
    planId: string,
    targetStatus: RecoveryPlanStatus,
    dismissalReason?: string,
    notes?: string,
  ): Promise<MemberRecoveryPlanDto> {
    const res = await apiClient.post<MemberRecoveryPlanDto>(
      `/ai/reactivation/plans/${planId}/transition`,
      { targetStatus, dismissalReason, notes },
    );
    return res.data;
  }

  /**
   * Member-facing safe recovery state (zero risk/churn exposure).
   */
  static async getMemberRecoveryState(): Promise<{
    recoveryState: string;
    inactivityDays: number;
    suggestedFocus?: string;
  }> {
    const res = await apiClient.get<{
      recoveryState: string;
      inactivityDays: number;
      suggestedFocus?: string;
    }>('/ai/reactivation/member-state');
    return res.data;
  }

  /**
   * Submits staff feedback on AI recovery recommendation.
   */
  static async submitFeedback(dto: ReactivationFeedbackDto): Promise<{ success: boolean }> {
    const res = await apiClient.post<{ success: boolean }>('/ai/reactivation/feedback', {
      feedback: dto.rating === 'HELPFUL' ? 'ACCEPTED' : 'REJECTED',
      comments: dto.comment,
      memberRecoveryPlanId: dto.planId,
    });
    return res.data;
  }
}

export const reactivationService = ReactivationService;

