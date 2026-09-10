/**
 * Day 35 — Receptionist Workflow Module
 * Registers operational workflow services, rule evaluations, staff routing,
 * handoff pipelines, follow-ups, callbacks, and controller endpoints.
 */

import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { AuditModule } from '../../../audit/audit.module';
import { CommunicationModule } from '../../../communication/communication.module';
import { AutomationModule } from '../../../automation/automation.module';
import { ReceptionistInteractionService } from './receptionist-interaction.service';
import { ReceptionistOutcomeService } from './receptionist-outcome.service';
import { ReceptionistSummaryService } from './receptionist-summary.service';
import { ReceptionistRoutingService } from './receptionist-routing.service';
import { ReceptionistHandoffWorkflowService } from './receptionist-handoff-workflow.service';
import { ReceptionistFollowUpService } from './receptionist-followup.service';
import { ReceptionistCallbackService } from './receptionist-callback.service';
import { ReceptionistEscalationService } from './receptionist-escalation.service';
import { ReceptionistMissedCallService } from './receptionist-missed-call.service';
import { ReceptionistNotificationService } from './receptionist-notification.service';
import { ReceptionistRuleService } from './receptionist-rule.service';
import { ReceptionistConfigService } from './receptionist-config.service';
import { ReceptionistEventService } from './receptionist-event.service';
import { ReceptionistAnalyticsService } from './receptionist-analytics.service';
import { ReceptionistWorkflowService } from './receptionist-workflow.service';
import { ReceptionistWorkflowController } from './receptionist-workflow.controller';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    forwardRef(() => CommunicationModule),
    forwardRef(() => AutomationModule),
  ],
  controllers: [ReceptionistWorkflowController],
  providers: [
    ReceptionistInteractionService,
    ReceptionistOutcomeService,
    ReceptionistSummaryService,
    ReceptionistRoutingService,
    ReceptionistHandoffWorkflowService,
    ReceptionistFollowUpService,
    ReceptionistCallbackService,
    ReceptionistEscalationService,
    ReceptionistMissedCallService,
    ReceptionistNotificationService,
    ReceptionistRuleService,
    ReceptionistConfigService,
    ReceptionistEventService,
    ReceptionistAnalyticsService,
    ReceptionistWorkflowService,
  ],
  exports: [
    ReceptionistInteractionService,
    ReceptionistOutcomeService,
    ReceptionistSummaryService,
    ReceptionistRoutingService,
    ReceptionistHandoffWorkflowService,
    ReceptionistFollowUpService,
    ReceptionistCallbackService,
    ReceptionistEscalationService,
    ReceptionistMissedCallService,
    ReceptionistNotificationService,
    ReceptionistRuleService,
    ReceptionistConfigService,
    ReceptionistEventService,
    ReceptionistAnalyticsService,
    ReceptionistWorkflowService,
  ],
})
export class ReceptionistWorkflowModule {}
