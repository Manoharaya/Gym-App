/**
 * Day 30 — Automation Facade Service
 *
 * Unified application service exposing automated engagement workflow capabilities.
 */

import { Injectable, Logger } from '@nestjs/common';
import { WorkflowDefinitionService } from './workflows/workflow-definition.service';
import { WorkflowInstanceService } from './workflows/workflow-instance.service';
import { WorkflowTemplateService } from './workflows/workflow-template.service';
import { WorkflowEvaluatorService } from './engine/workflow-evaluator.service';
import { WorkflowEngineService } from './engine/workflow-engine.service';
import { WorkflowSchedulerService } from './scheduling/workflow-scheduler.service';
import { AutomationAIAssistantService } from './ai/automation-ai-assistant.service';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowTriggerEvent,
  WorkflowDryRunResultDto,
  WorkflowAnalyticsDto,
  AIAssistWorkflowPromptDto,
  AIAssistWorkflowResponseDto,
  EngagementWorkflowSummaryDto,
  EngagementWorkflowDetailDto,
} from '@fitcore/types';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly definitions: WorkflowDefinitionService,
    private readonly instances: WorkflowInstanceService,
    private readonly templates: WorkflowTemplateService,
    private readonly evaluator: WorkflowEvaluatorService,
    private readonly engine: WorkflowEngineService,
    private readonly scheduler: WorkflowSchedulerService,
    private readonly aiAssistant: AutomationAIAssistantService,
  ) {}

  // Workflows CRUD & Lifecycle
  async createWorkflow(orgId: string, dto: CreateWorkflowDto, userId?: string): Promise<EngagementWorkflowDetailDto> {
    return this.definitions.createWorkflow(orgId, dto, userId);
  }

  async updateWorkflow(id: string, orgId: string, dto: UpdateWorkflowDto, userId?: string): Promise<EngagementWorkflowDetailDto> {
    return this.definitions.updateWorkflow(id, orgId, dto, userId);
  }

  async activateWorkflow(id: string, orgId: string): Promise<EngagementWorkflowDetailDto> {
    return this.definitions.activateWorkflow(id, orgId);
  }

  async publishWorkflow(id: string, orgId: string): Promise<EngagementWorkflowDetailDto> {
    return this.definitions.publishWorkflow(id, orgId);
  }

  async pauseWorkflow(id: string, orgId: string): Promise<EngagementWorkflowDetailDto> {
    return this.definitions.pauseWorkflow(id, orgId);
  }

  async archiveWorkflow(id: string, orgId: string): Promise<EngagementWorkflowDetailDto> {
    return this.definitions.archiveWorkflow(id, orgId);
  }

  async getWorkflow(id: string, orgId: string): Promise<EngagementWorkflowDetailDto> {
    return this.definitions.getWorkflow(id, orgId);
  }

  async listWorkflows(orgId: string, query: any): Promise<EngagementWorkflowSummaryDto[]> {
    return this.definitions.listWorkflows(orgId, query);
  }

  // Templates
  listTemplates() {
    return this.templates.listTemplates();
  }

  async instantiateTemplate(
    templateKey: string,
    orgId: string,
    outletId?: string | null,
    customName?: string,
    userId?: string,
  ): Promise<EngagementWorkflowDetailDto> {
    return this.templates.instantiateTemplate(templateKey, orgId, outletId, customName, userId);
  }

  // Event Ingestion & Simulation
  async ingestEvent(event: WorkflowTriggerEvent): Promise<string[]> {
    return this.engine.handleEvent(event);
  }

  async dryRunWorkflow(workflowId: string, memberId: string, payload: Record<string, any> = {}): Promise<WorkflowDryRunResultDto> {
    return this.evaluator.dryRun(workflowId, memberId, payload);
  }

  async testWorkflow(workflowId: string, memberId: string, payload: Record<string, any> = {}): Promise<WorkflowDryRunResultDto> {
    return this.evaluator.dryRun(workflowId, memberId, payload);
  }

  // Instances & Approvals
  async listInstances(orgId: string, query: any) {
    return this.instances.listInstances(orgId, query);
  }

  async getInstance(id: string, orgId: string) {
    return this.instances.getInstance(id, orgId);
  }

  async getPendingApprovals(orgId: string, trainerId?: string) {
    return this.instances.getPendingApprovals(orgId, trainerId);
  }

  async approveAction(instanceId: string, userId: string, notes?: string): Promise<{ success: boolean }> {
    await this.engine.approveStep(instanceId, userId, notes);
    return { success: true };
  }

  async rejectAction(instanceId: string, userId: string, reason: string): Promise<{ success: boolean }> {
    await this.engine.rejectStep(instanceId, userId, reason);
    return { success: true };
  }

  async cancelInstance(instanceId: string, orgId: string, reason?: string): Promise<{ success: boolean }> {
    await this.instances.cancelInstance(instanceId, orgId, reason);
    return { success: true };
  }

  // Member Automation Profile
  async getMemberAutomationProfile(orgId: string, memberId: string) {
    return this.instances.getMemberAutomationProfile(orgId, memberId);
  }

  // Outcomes & Analytics
  async getWorkflowAnalytics(workflowId: string, orgId: string): Promise<WorkflowAnalyticsDto> {
    return this.instances.getWorkflowAnalytics(workflowId, orgId);
  }

  async getAggregateAnalytics(orgId: string) {
    return this.instances.getAggregateAnalytics(orgId);
  }

  // AI Assistant
  async draftWithAI(dto: AIAssistWorkflowPromptDto, user?: any): Promise<AIAssistWorkflowResponseDto> {
    return this.aiAssistant.draftWorkflow(dto, user);
  }

  // Scheduler Queue
  async processScheduledQueue(): Promise<number> {
    return this.scheduler.processScheduledWorkflows();
  }
}
