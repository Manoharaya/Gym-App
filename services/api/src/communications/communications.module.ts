import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { CommunicationsController } from './communications.controller';
import { CommunicationsService } from './communications.service';
import { CommunicationOrchestratorService } from './orchestrator/communication-orchestrator.service';
import { ChannelSelectionService } from './orchestrator/channel-selection.service';
import { DeliveryPolicyService } from './orchestrator/delivery-policy.service';
import { TemplateService } from './templates/template.service';
import { TemplateVersionService } from './templates/template-version.service';
import { TemplateRendererService } from './templates/template-renderer.service';
import { ConsentPolicyService } from './preferences/consent-policy.service';
import { CommunicationPreferenceService } from './preferences/communication-preference.service';
import { DeliveryService } from './delivery/delivery.service';
import { DeliveryStatusService } from './delivery/delivery-status.service';
import { RetryPolicyService } from './delivery/retry-policy.service';
import { CommunicationHistoryService } from './history/communication-history.service';
import { CommunicationProviderFactory } from './providers/provider-factory.service';
import { DevelopmentCommunicationProvider } from './providers/development/development-provider.adapter';
import { EmailProviderAdapter } from './providers/email/email-provider.adapter';
import { SmsProviderAdapter } from './providers/sms/sms-provider.adapter';
import { WhatsAppProviderAdapter } from './providers/whatsapp/whatsapp-provider.adapter';
import { PushProviderAdapter } from './providers/push/push-provider.adapter';
import { CommunicationWorker } from './jobs/communication-worker';
import { RetryWorker } from './jobs/retry-worker';
import { ScheduledCommunicationWorker } from './jobs/scheduled-communication-worker';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [CommunicationsController],
  providers: [
    CommunicationsService,
    CommunicationOrchestratorService,
    ChannelSelectionService,
    DeliveryPolicyService,
    TemplateService,
    TemplateVersionService,
    TemplateRendererService,
    ConsentPolicyService,
    CommunicationPreferenceService,
    DeliveryService,
    DeliveryStatusService,
    RetryPolicyService,
    CommunicationHistoryService,
    CommunicationProviderFactory,
    DevelopmentCommunicationProvider,
    EmailProviderAdapter,
    SmsProviderAdapter,
    WhatsAppProviderAdapter,
    PushProviderAdapter,
    CommunicationWorker,
    RetryWorker,
    ScheduledCommunicationWorker,
  ],
  exports: [
    CommunicationsService,
    CommunicationOrchestratorService,
    TemplateService,
    TemplateVersionService,
    TemplateRendererService,
    ConsentPolicyService,
    CommunicationPreferenceService,
    DeliveryService,
    DeliveryStatusService,
    RetryPolicyService,
    CommunicationHistoryService,
    CommunicationProviderFactory,
    DevelopmentCommunicationProvider,
    CommunicationWorker,
    RetryWorker,
    ScheduledCommunicationWorker,
  ],
})
export class CommunicationsModule {}
