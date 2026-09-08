import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { AuditModule } from '../../../audit/audit.module';
import { RedisModule } from '../../../redis/redis.module';
import { AIModule } from '../../ai.module';
import { EngagementIntelligenceModule } from '../engagement-intelligence/engagement-intelligence.module';
import { RetentionIntelligenceModule } from '../retention-intelligence/retention-intelligence.module';
import { ReactivationModule } from '../reactivation/reactivation.module';
import { CommunicationsModule } from '../../../communications/communications.module';

import { RetentionAgentContextService } from './context/retention-agent-context.service';
import { RetentionPriorityService } from './analysis/retention-priority.service';
import { RetentionMemberSelectorService } from './analysis/retention-member-selector.service';
import { TimingRecommendationService } from './recommendations/timing-recommendation.service';
import { InterventionRecommendationService } from './recommendations/intervention-recommendation.service';
import { MessageSafetyService } from './messaging/message-safety.service';
import { MessagePersonalizationService } from './messaging/message-personalization.service';
import { RetentionMessageService } from './messaging/retention-message.service';
import { RetentionApprovalService } from './workflows/retention-approval.service';
import { RetentionOutcomeService } from './workflows/retention-outcome.service';
import { RetentionAnalysisService } from './analysis/retention-analysis.service';
import { RetentionWorkflowService } from './workflows/retention-workflow.service';
import { RetentionAgentToolsService } from './tools/retention-agent-tools.service';
import { RetentionAgentAnalysisJob } from './jobs/retention-agent-analysis.job';
import { RetentionOutcomeJob } from './jobs/retention-outcome.job';
import { RetentionMetricsEngineService } from './metrics/retention-metrics-engine.service';
import { RetentionAgentService } from './retention-agent.service';
import { RetentionAgentController } from './retention-agent.controller';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    RedisModule,
    forwardRef(() => AIModule),
    forwardRef(() => EngagementIntelligenceModule),
    forwardRef(() => RetentionIntelligenceModule),
    forwardRef(() => ReactivationModule),
    forwardRef(() => CommunicationsModule),
  ],
  controllers: [RetentionAgentController],
  providers: [
    RetentionAgentContextService,
    RetentionPriorityService,
    RetentionMemberSelectorService,
    TimingRecommendationService,
    InterventionRecommendationService,
    MessageSafetyService,
    MessagePersonalizationService,
    RetentionMessageService,
    RetentionApprovalService,
    RetentionOutcomeService,
    RetentionAnalysisService,
    RetentionWorkflowService,
    RetentionAgentToolsService,
    RetentionAgentAnalysisJob,
    RetentionOutcomeJob,
    RetentionMetricsEngineService,
    RetentionAgentService,
  ],
  exports: [
    RetentionAgentService,
    RetentionWorkflowService,
    RetentionApprovalService,
    RetentionAnalysisService,
    RetentionOutcomeService,
    RetentionMemberSelectorService,
    RetentionAgentToolsService,
    RetentionMetricsEngineService,
  ],
})
export class RetentionAgentModule {}
