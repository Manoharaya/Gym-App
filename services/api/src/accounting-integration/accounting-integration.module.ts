/**
 * FitCore — Day 43: Accounting Integration Module
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { RedisModule } from '../redis/redis.module';

// Controllers
import { AccountingController } from './controllers/accounting.controller';
import { AccountingWebhookController } from './controllers/accounting-webhook.controller';

// Security
import { AccountingCredentialService } from './security/accounting-credential.service';
import { OAuthStateService } from './security/oauth-state.service';

// Providers
import { AccountingProviderRegistry } from './providers/accounting-provider.registry';
import { XeroAccountingProvider } from './providers/xero.provider';
import { QuickBooksAccountingProvider } from './providers/quickbooks.provider';

// Services
import { AccountingConnectionService } from './services/accounting-connection.service';
import { AccountingMappingService } from './services/accounting-mapping.service';
import { AccountingNormalizerService } from './services/accounting-normalizer.service';
import { AccountingSyncService } from './services/accounting-sync.service';
import { AccountingReconciliationService } from './services/accounting-reconciliation.service';
import { AccountingConflictService } from './services/accounting-conflict.service';
import { AccountingHealthService } from './services/accounting-health.service';
import { AccountingExportService } from './services/accounting-export.service';
import { AccountingWebhookService } from './webhooks/accounting-webhook.service';

// Jobs
import { AccountingIncrementalSyncJob } from './jobs/accounting-incremental-sync.job';
import { AccountingRetryJob } from './jobs/accounting-retry.job';
import { AccountingReconciliationJob } from './jobs/accounting-reconciliation.job';

@Module({
  imports: [DatabaseModule, AuditModule, RedisModule],
  controllers: [AccountingController, AccountingWebhookController],
  providers: [
    AccountingCredentialService,
    OAuthStateService,
    XeroAccountingProvider,
    QuickBooksAccountingProvider,
    AccountingProviderRegistry,
    AccountingConnectionService,
    AccountingMappingService,
    AccountingNormalizerService,
    AccountingSyncService,
    AccountingReconciliationService,
    AccountingConflictService,
    AccountingHealthService,
    AccountingExportService,
    AccountingWebhookService,
    AccountingIncrementalSyncJob,
    AccountingRetryJob,
    AccountingReconciliationJob,
  ],
  exports: [
    AccountingCredentialService,
    AccountingProviderRegistry,
    AccountingConnectionService,
    AccountingMappingService,
    AccountingSyncService,
    AccountingReconciliationService,
    AccountingConflictService,
    AccountingHealthService,
    AccountingExportService,
    AccountingWebhookService,
  ],
})
export class AccountingIntegrationModule {}
