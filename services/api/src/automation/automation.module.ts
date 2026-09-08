/**
 * Day 30 — Automated Engagement Workflows Module
 */

import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { AIModule } from '../ai/ai.module';
import { CommunicationsModule } from '../communications/communications.module';
import { EngagementModule } from '../engagement/engagement.module';

import { WorkflowStateService } from './workflows/workflow-state.service';
import { WorkflowDelayService } from './scheduling/workflow-delay.service';
import { FrequencyLimitService } from './safeguards/frequency-limit.service';
import { WorkflowEventJob } from './jobs/workflow-event.job';
import { WorkflowSchedulerJob } from './jobs/workflow-scheduler.job';
import { WorkflowExpirationJob } from './jobs/workflow-expiration.job';
import { WorkflowRetryJob } from './jobs/workflow-retry.job';

import { ConditionEvaluatorService } from './engine/condition-evaluator.service';
import { EligibilityService } from './engine/eligibility.service';
import { CooldownService } from './safeguards/cooldown.service';
import { WorkflowSafetyService } from './safeguards/workflow-safety.service';
import { CommunicationActionService } from './integrations/communication-action.service';
import { TaskActionService } from './integrations/task-action.service';
import { NotificationActionService } from './integrations/notification-action.service';
import { ActionExecutorService } from './engine/action-executor.service';
import { WorkflowEvaluatorService } from './engine/workflow-evaluator.service';
import { WorkflowEngineService } from './engine/workflow-engine.service';
import { WorkflowDefinitionService } from './workflows/workflow-definition.service';
import { WorkflowTemplateService } from './workflows/workflow-template.service';
import { WorkflowInstanceService } from './workflows/workflow-instance.service';
import { WorkflowSchedulerService } from './scheduling/workflow-scheduler.service';
import { AutomationAIAssistantService } from './ai/automation-ai-assistant.service';
import { AutomationService } from './automation.service';
import { AutomationController } from './automation.controller';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    forwardRef(() => AIModule),
    forwardRef(() => CommunicationsModule),
    forwardRef(() => EngagementModule),
  ],
  controllers: [AutomationController],
  providers: [
    ConditionEvaluatorService,
    EligibilityService,
    CooldownService,
    WorkflowSafetyService,
    FrequencyLimitService,
    CommunicationActionService,
    TaskActionService,
    NotificationActionService,
    ActionExecutorService,
    WorkflowEvaluatorService,
    WorkflowEngineService,
    WorkflowDefinitionService,
    WorkflowTemplateService,
    WorkflowInstanceService,
    WorkflowStateService,
    WorkflowDelayService,
    WorkflowSchedulerService,
    WorkflowEventJob,
    WorkflowSchedulerJob,
    WorkflowExpirationJob,
    WorkflowRetryJob,
    AutomationAIAssistantService,
    AutomationService,
  ],
  exports: [
    AutomationService,
    WorkflowEngineService,
    WorkflowEvaluatorService,
    WorkflowDefinitionService,
    WorkflowTemplateService,
    ConditionEvaluatorService,
    WorkflowStateService,
    FrequencyLimitService,
    WorkflowDelayService,
    WorkflowEventJob,
    WorkflowSchedulerJob,
    WorkflowExpirationJob,
    WorkflowRetryJob,
  ],
})
export class AutomationModule {}
