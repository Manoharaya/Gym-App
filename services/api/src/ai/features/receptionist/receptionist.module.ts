/**
 * Day 31 & 32 — AI Receptionist Module
 */

import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { AuditModule } from '../../../audit/audit.module';
import { RedisModule } from '../../../redis/redis.module';
import { BookingsModule } from '../../../bookings/bookings.module';
import { LeadsModule } from '../../../leads/leads.module';
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

// Day 32 Booking Tools
import { BookingSearchTool } from './tools/booking-search.tool';
import { BookingDetailsTool } from './tools/booking-details.tool';
import { BookingCreateTool } from './tools/booking-create.tool';
import { BookingCancelTool } from './tools/booking-cancel.tool';
import { BookingRescheduleTool } from './tools/booking-reschedule.tool';
import { BookingWaitlistTool } from './tools/booking-waitlist.tool';
import { LeadTools } from './tools/lead-tools';

// Day 32 Booking Domain Services
import { ReceptionistMemberIdentityService } from './identity/receptionist-member-identity.service';
import { ConfirmationStateService } from './confirmation/confirmation-state.service';
import { BookingSearchService } from './booking/booking-search.service';
import { ReceptionistBookingEligibilityService } from './booking/booking-eligibility.service';
import { BookingVerificationService } from './booking/booking-verification.service';
import { ReceptionistBookingService } from './booking/receptionist-booking.service';

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

// Facades & Controllers
import { ReceptionistService } from './receptionist.service';
import { ReceptionistController } from './receptionist.controller';
import { ReceptionistBookingController } from './receptionist-booking.controller';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    RedisModule,
    BookingsModule,
    LeadsModule,
    forwardRef(() => AIModule),
  ],
  controllers: [ReceptionistController, ReceptionistBookingController],
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

    // Day 32 Booking Tools
    BookingSearchTool,
    BookingDetailsTool,
    BookingCreateTool,
    BookingCancelTool,
    BookingRescheduleTool,
    BookingWaitlistTool,
    LeadTools,

    // Day 32 Booking Services
    ReceptionistMemberIdentityService,
    ConfirmationStateService,
    BookingSearchService,
    ReceptionistBookingEligibilityService,
    BookingVerificationService,
    ReceptionistBookingService,

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
    ReceptionistBookingService,
    ConfirmationStateService,
    ReceptionistMemberIdentityService,
    BookingSearchService,
    ReceptionistBookingEligibilityService,
    BookingVerificationService,
    LeadTools,
    ReceptionistSafetyService,
  ],
})
export class ReceptionistModule {}
