/**
 * Day 31 — AI Receptionist Module
 */

import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { AuditModule } from '../../../audit/audit.module';
import { RedisModule } from '../../../redis/redis.module';
import { AIModule } from '../../ai.module';

// Conversation
import { ReceptionistConversationService } from './conversation/receptionist-conversation.service';
import { ReceptionistMessageService } from './conversation/receptionist-message.service';
import { ConversationSummaryService } from './conversation/conversation-summary.service';

// Context
import { OrganisationContextService } from './context/organisation-context.service';
import { OutletContextService } from './context/outlet-context.service';
import { CustomerContextService } from './context/customer-context.service';
import { ReceptionistContextService } from './context/receptionist-context.service';

// Knowledge
import { KnowledgeCacheService } from './knowledge/knowledge-cache.service';
import { KnowledgeRankingService } from './knowledge/knowledge-ranking.service';
import { KnowledgeRetrievalService } from './knowledge/knowledge-retrieval.service';
import { KnowledgeSourceService } from './knowledge/knowledge-source.service';
import { ReceptionistKnowledgeService } from './knowledge/receptionist-knowledge.service';

// Tools
import { ToolPermissionService } from './tools/tool-permission.service';
import { OrganisationTools } from './tools/organisation-tools';
import { ClassTools } from './tools/class-tools';
import { TrainerTools } from './tools/trainer-tools';
import { MembershipTools } from './tools/membership-tools';
import { ReceptionistToolRegistry } from './tools/receptionist-tool-registry';

// Safety
import { PromptInjectionService } from './safety/prompt-injection.service';
import { SensitiveDataFilterService } from './safety/sensitive-data-filter.service';
import { ResponseValidatorService } from './safety/response-validator.service';
import { ReceptionistSafetyService } from './safety/receptionist-safety.service';

// Handoff
import { EscalationService } from './handoff/escalation.service';
import { ReceptionistHandoffService } from './handoff/receptionist-handoff.service';

// AI Execution & Jobs
import { ReceptionistAIService } from './ai/receptionist-ai.service';
import { ConversationSummaryJob } from './jobs/conversation-summary.job';
import { KnowledgeRefreshJob } from './jobs/knowledge-refresh.job';

// Facade & Controller
import { ReceptionistService } from './receptionist.service';
import { ReceptionistController } from './receptionist.controller';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    RedisModule,
    forwardRef(() => AIModule),
  ],
  controllers: [ReceptionistController],
  providers: [
    // Conversation
    ReceptionistConversationService,
    ReceptionistMessageService,
    ConversationSummaryService,

    // Context
    OrganisationContextService,
    OutletContextService,
    CustomerContextService,
    ReceptionistContextService,

    // Knowledge
    KnowledgeCacheService,
    KnowledgeRankingService,
    KnowledgeRetrievalService,
    KnowledgeSourceService,
    ReceptionistKnowledgeService,

    // Tools
    ToolPermissionService,
    OrganisationTools,
    ClassTools,
    TrainerTools,
    MembershipTools,
    ReceptionistToolRegistry,

    // Safety
    PromptInjectionService,
    SensitiveDataFilterService,
    ResponseValidatorService,
    ReceptionistSafetyService,

    // Handoff
    EscalationService,
    ReceptionistHandoffService,

    // AI & Jobs
    ReceptionistAIService,
    ConversationSummaryJob,
    KnowledgeRefreshJob,

    // Facade
    ReceptionistService,
  ],
  exports: [
    ReceptionistService,
    ReceptionistConversationService,
    ReceptionistKnowledgeService,
    ReceptionistHandoffService,
    ReceptionistToolRegistry,
  ],
})
export class ReceptionistModule {}
