/**
 * FitCore — Day 48: Integrations Platform Module
 *
 * Encapsulates the complete production-grade integrations infrastructure:
 * Providers, Connections, Credentials, Capabilities, Webhooks, Sync, Events, Retry, Health.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { IntegrationRegistry } from './core/integration-registry.service';
import { IntegrationCredentialService } from './core/integration-credential.service';
import { IntegrationOAuthService } from './core/integration-oauth.service';
import { IntegrationConnectionService } from './core/integration-connection.service';
import { IntegrationHealthService } from './core/integration-health.service';
import { IntegrationRateLimitService } from './core/integration-rate-limit.service';
import { IntegrationRetryService } from './core/integration-retry.service';
import { IntegrationSyncService } from './core/integration-sync.service';
import { IntegrationWebhookService } from './core/integration-webhook.service';
import { IntegrationPermissionService } from './core/integration-permission.service';
import { IntegrationAuditService } from './core/integration-audit.service';
import { IntegrationCacheService } from './core/integration-cache.service';

// Consolidated provider adapters
import { PaymentIntegrationAdapter } from './adapters/payment-integration.adapter';
import { AccountingIntegrationAdapter } from './adapters/accounting-integration.adapter';
import { CommunicationIntegrationAdapter } from './adapters/communication-integration.adapter';
import { WearableIntegrationAdapter } from './adapters/wearable-integration.adapter';
import { AccessIntegrationAdapter } from './adapters/access-integration.adapter';
import { CalendarIntegrationAdapter } from './adapters/calendar-integration.adapter';

@Module({
  imports: [ConfigModule],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    IntegrationRegistry,
    IntegrationCredentialService,
    IntegrationOAuthService,
    IntegrationConnectionService,
    IntegrationHealthService,
    IntegrationRateLimitService,
    IntegrationRetryService,
    IntegrationSyncService,
    IntegrationWebhookService,
    IntegrationPermissionService,
    IntegrationAuditService,
    IntegrationCacheService,
    // Adapters
    PaymentIntegrationAdapter,
    AccountingIntegrationAdapter,
    CommunicationIntegrationAdapter,
    WearableIntegrationAdapter,
    AccessIntegrationAdapter,
    CalendarIntegrationAdapter,
  ],
  exports: [
    IntegrationsService,
    IntegrationRegistry,
    IntegrationConnectionService,
    IntegrationCredentialService,
    IntegrationHealthService,
    IntegrationWebhookService,
    IntegrationSyncService,
    IntegrationRateLimitService,
    IntegrationRetryService,
  ],
})
export class IntegrationsModule {}
