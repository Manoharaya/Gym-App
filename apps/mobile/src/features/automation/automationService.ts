/**
 * Day 30 — Mobile Staff Automation Service
 *
 * Client service connecting mobile staff users to the Automated Engagement Workflows Engine.
 */

import { apiClient } from '../../services/api';
import type {
  EngagementWorkflowSummaryDto,
  EngagementWorkflowDetailDto,
  WorkflowAnalyticsDto,
  AIAssistWorkflowResponseDto,
  WorkflowDryRunResultDto,
} from '@fitcore/types';

export interface WorkflowTemplateItem {
  templateKey: string;
  name: string;
  description: string;
  triggerType: string;
  tags: string[];
}

export interface PendingApprovalItem {
  instanceId: string;
  workflowId: string;
  workflowName: string;
  memberId: string;
  memberName: string;
  stepId: string;
  actionType: string;
  actionDetails: Record<string, any>;
  queuedAt: string;
}

export class AutomationService {
  /**
   * Lists active and configured workflows.
   */
  static async listWorkflows(params?: { status?: string; triggerType?: string; search?: string }): Promise<EngagementWorkflowSummaryDto[]> {
    const res = await apiClient.get<EngagementWorkflowSummaryDto[]>('/automation/workflows', { params });
    return res.data;
  }

  /**
   * Retrieves single workflow details.
   */
  static async getWorkflow(id: string): Promise<EngagementWorkflowDetailDto> {
    const res = await apiClient.get<EngagementWorkflowDetailDto>(`/automation/workflows/${id}`);
    return res.data;
  }

  /**
   * Activates a workflow.
   */
  static async activateWorkflow(id: string): Promise<EngagementWorkflowDetailDto> {
    const res = await apiClient.post<EngagementWorkflowDetailDto>(`/automation/workflows/${id}/activate`);
    return res.data;
  }

  /**
   * Pauses an active workflow.
   */
  static async pauseWorkflow(id: string): Promise<EngagementWorkflowDetailDto> {
    const res = await apiClient.post<EngagementWorkflowDetailDto>(`/automation/workflows/${id}/pause`);
    return res.data;
  }

  /**
   * Lists seed workflow templates.
   */
  static async listTemplates(): Promise<WorkflowTemplateItem[]> {
    const res = await apiClient.get<WorkflowTemplateItem[]>('/automation/templates');
    return res.data;
  }

  /**
   * Instantiates a seed template.
   */
  static async instantiateTemplate(templateKey: string, customName?: string): Promise<EngagementWorkflowDetailDto> {
    const res = await apiClient.post<EngagementWorkflowDetailDto>('/automation/templates/instantiate', {
      templateKey,
      customName,
    });
    return res.data;
  }

  /**
   * Fetches pending action approvals for staff review.
   */
  static async getPendingApprovals(): Promise<PendingApprovalItem[]> {
    const res = await apiClient.get<PendingApprovalItem[]>('/automation/approvals');
    return res.data;
  }

  /**
   * Approves a pending workflow action.
   */
  static async approveAction(instanceId: string, notes?: string): Promise<{ success: boolean }> {
    const res = await apiClient.post<{ success: boolean }>(`/automation/instances/${instanceId}/approve`, {
      approved: true,
      notes,
    });
    return res.data;
  }

  /**
   * Rejects a pending workflow action.
   */
  static async rejectAction(instanceId: string, reason: string): Promise<{ success: boolean }> {
    const res = await apiClient.post<{ success: boolean }>(`/automation/instances/${instanceId}/reject`, {
      reason,
    });
    return res.data;
  }

  /**
   * Performs a dry-run simulation of a workflow on a member.
   */
  static async dryRun(workflowId: string, memberId: string): Promise<WorkflowDryRunResultDto> {
    const res = await apiClient.post<WorkflowDryRunResultDto>(`/automation/workflows/${workflowId}/dry-run`, {
      memberId,
    });
    return res.data;
  }

  /**
   * Fetches non-causal outcome analytics following workflow execution.
   */
  static async getWorkflowAnalytics(workflowId: string): Promise<WorkflowAnalyticsDto> {
    const res = await apiClient.get<WorkflowAnalyticsDto>(`/automation/workflows/${workflowId}/analytics`);
    return res.data;
  }

  /**
   * Uses AI assistant to draft a workflow configuration from staff intent.
   */
  static async draftWithAI(intent: string, preferredTone?: string, language?: 'en' | 'ne'): Promise<AIAssistWorkflowResponseDto> {
    const res = await apiClient.post<AIAssistWorkflowResponseDto>('/automation/ai/draft', {
      intent,
      preferredTone,
      language,
    });
    return res.data;
  }
}
