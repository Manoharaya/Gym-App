/**
 * Day 30 — Workflow Evaluator Service
 *
 * Evaluates incoming trigger events against active workflows, checking:
 * 1. Active status & tenant boundary
 * 2. Trigger conditions & criteria
 * 3. Member audience eligibility
 * 4. Cooldown & safety policies
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import { EligibilityService } from './eligibility.service';
import { CooldownService } from '../safeguards/cooldown.service';
import { WorkflowSafetyService } from '../safeguards/workflow-safety.service';
import { FrequencyLimitService } from '../safeguards/frequency-limit.service';
import {
  WorkflowTriggerEvent,
  WorkflowConditionEvaluationResult,
  WorkflowActionDefinition,
  WorkflowDryRunResultDto,
} from '@fitcore/types';

export interface WorkflowMatchResult {
  workflowId: string;
  workflowVersionId: string;
  workflowName: string;
  matched: boolean;
  reasons: string[];
  conditionsEvaluated: WorkflowConditionEvaluationResult[];
  actions: WorkflowActionDefinition[];
  scheduledResumeAt?: Date;
  requiresApproval: boolean;
  blockReason?: string;
}

@Injectable()
export class WorkflowEvaluatorService {
  private readonly logger = new Logger(WorkflowEvaluatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly conditionEvaluator: ConditionEvaluatorService,
    private readonly eligibilityService: EligibilityService,
    private readonly cooldownService: CooldownService,
    private readonly safetyService: WorkflowSafetyService,
    private readonly frequencyLimitService: FrequencyLimitService,
  ) {}

  /**
   * Evaluates a trigger event against all active workflows for the organisation.
   */
  async evaluateEvent(event: WorkflowTriggerEvent): Promise<WorkflowMatchResult[]> {
    const { organisationId, outletId, memberId, eventType, payload = {} } = event;

    // 1. Fetch all active, enabled workflows with matching triggerType
    const workflows = await this.prisma.engagementWorkflow.findMany({
      where: {
        organisationId,
        triggerType: eventType,
        status: 'ACTIVE',
        enabled: true,
        OR: [{ outletId: null }, { outletId: outletId || undefined }],
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    const results: WorkflowMatchResult[] = [];

    for (const workflow of workflows) {
      const activeVersion = workflow.versions[0];
      if (!activeVersion) {
        this.logger.warn(`Workflow ${workflow.id} has no published version; skipping.`);
        continue;
      }

      const matchRes = await this.evaluateSingleWorkflow(workflow, activeVersion, memberId, payload);
      results.push(matchRes);
    }

    return results;
  }

  /**
   * Evaluates a single workflow against a member and trigger event context.
   */
  async evaluateSingleWorkflow(
    workflow: any,
    version: any,
    memberId: string,
    payload: Record<string, any>,
  ): Promise<WorkflowMatchResult> {
    const reasons: string[] = [];
    const triggerDef = (version.triggerDefinition as Record<string, any>) || {};
    const conditionDef = (version.conditionDefinition as Record<string, any>) || null;
    const actionDefs = (version.actionDefinition as WorkflowActionDefinition[]) || [];
    const settings = (version.settings as Record<string, any>) || {};
    const audienceFilter = triggerDef.audienceFilter || settings.audienceFilter;
    const safetyPolicy = settings.safetyPolicy || {};

    // 1. Trigger condition evaluation
    const conditionsEvaluated: WorkflowConditionEvaluationResult[] = [];
    if (conditionDef && Object.keys(conditionDef).length > 0) {
      const evalRes = this.conditionEvaluator.evaluateCondition(conditionDef as any, {
        payload,
        memberId,
      });
      conditionsEvaluated.push(evalRes);
      if (!evalRes.passed) {
        reasons.push(`Trigger condition not met: ${evalRes.reason}`);
      }
    }

    // 2. Audience eligibility check
    const eligibility = await this.eligibilityService.evaluateEligibility(
      workflow.organisationId,
      workflow.outletId,
      memberId,
      audienceFilter,
      { payload },
    );
    if (!eligibility.eligible) {
      reasons.push(...eligibility.reasons);
    }

    // 3. Cooldown & Frequency safeguard check
    const safeguardResults = await this.cooldownService.checkSafeguards(
      workflow.organisationId,
      workflow.id,
      memberId,
      safetyPolicy,
    );
    const failedSafeguard = safeguardResults.find((s) => !s.passed);
    if (failedSafeguard) {
      reasons.push(`Safeguard blocked: ${failedSafeguard.detail}`);
    }

    if (this.frequencyLimitService) {
      const frequencyResult = await this.frequencyLimitService.evaluateLimits(
        workflow.organisationId,
        memberId,
        safetyPolicy?.frequencyLimit,
        workflow.category,
      );
      if (!frequencyResult.allowed) {
        reasons.push(`Safeguard blocked: ${frequencyResult.reason}`);
      }
    }

    // 4. Quiet hours check
    const quietHoursCheck = this.safetyService.checkQuietHours(safetyPolicy);

    const matched = reasons.length === 0;

    return {
      workflowId: workflow.id,
      workflowVersionId: version.id,
      workflowName: workflow.name,
      matched,
      reasons: matched ? ['All criteria and safety checks passed.'] : reasons,
      conditionsEvaluated,
      actions: actionDefs,
      scheduledResumeAt: quietHoursCheck.isQuietHour ? quietHoursCheck.resumeAt : undefined,
      requiresApproval: workflow.approvalMode === 'ALWAYS_REQUIRED',
      blockReason: matched ? undefined : reasons.join('; '),
    };
  }

  /**
   * Performs a simulation dry-run for a workflow and member.
   */
  async dryRun(
    workflowId: string,
    memberId: string,
    payload: Record<string, any> = {},
  ): Promise<WorkflowDryRunResultDto> {
    const workflow = await this.prisma.engagementWorkflow.findUnique({
      where: { id: workflowId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found.`);
    }

    const version = workflow.versions[0];
    if (!version) {
      throw new Error(`Workflow ${workflowId} has no version configured.`);
    }

    const matchRes = await this.evaluateSingleWorkflow(workflow, version, memberId, payload);
    const settings = (version.settings as Record<string, any>) || {};
    const safeguards = await this.cooldownService.checkSafeguards(
      workflow.organisationId,
      workflow.id,
      memberId,
      settings.safetyPolicy,
    );

    if (this.frequencyLimitService) {
      const freqCheck = await this.frequencyLimitService.evaluateLimits(
        workflow.organisationId,
        memberId,
        settings.safetyPolicy?.frequencyLimit,
        workflow.category,
      );
      safeguards.push({
        check: 'FREQUENCY_LIMITS',
        passed: freqCheck.allowed,
        detail: freqCheck.reason || 'Frequency limits passed',
      });
    }

    let outcome: WorkflowDryRunResultDto['outcome'] = 'DID_NOT_MATCH';
    if (matchRes.matched) {
      if (matchRes.requiresApproval) {
        outcome = 'WOULD_REQUIRE_APPROVAL';
      } else {
        outcome = 'WOULD_EXECUTE';
      }
    } else if (matchRes.blockReason?.includes('Safeguard blocked')) {
      outcome = 'WOULD_BE_BLOCKED';
    }

    return {
      workflowId,
      memberId,
      triggered: matchRes.matched,
      triggerReason: matchRes.matched ? 'Matched trigger criteria' : matchRes.reasons[0],
      conditionsEvaluated: matchRes.conditionsEvaluated,
      actionsPlanned: matchRes.actions.map((act, idx) => ({
        stepIndex: idx,
        actionType: act.type,
        params: act.params,
        delayMinutes: act.delayMinutes,
        willRequireApproval: workflow.approvalMode === 'ALWAYS_REQUIRED' || act.requireApproval === true,
        approvalRole: act.approvalRole,
      })),
      safeguardChecks: safeguards.map((s) => ({
        check: s.check,
        passed: s.passed,
        detail: s.detail,
      })),
      outcome,
      blockReason: matchRes.blockReason,
    };
  }
}
