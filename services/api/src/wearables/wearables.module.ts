import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';

// Controllers
import { WearablesController } from './controllers/wearables.controller';

// Security
import { TokenEncryptionService } from './security/token-encryption.service';
import { WearableRateLimiterService } from './security/wearable-rate-limiter.service';
import { WearableDataDeletionService } from './security/wearable-data-deletion.service';

// Domain
import { WearableCapabilitiesRegistry } from './domain/wearable-capabilities.registry';
import { UnitNormalizer } from './domain/unit-normalizer';
import { HealthDataValidator } from './domain/health-data-validator';
import { DeduplicationService } from './domain/deduplication.service';

// Providers
import { AppleHealthProvider } from './providers/apple-health.provider';
import { GoogleHealthConnectProvider } from './providers/google-health-connect.provider';
import { FitbitProvider } from './providers/fitbit.provider';
import { ProviderRegistryService } from './providers/provider-registry.service';

// Services
import { WearableConnectionService } from './services/wearable-connection.service';
import { WearableSyncService } from './services/wearable-sync.service';
import { HealthDataService } from './services/health-data.service';
import { HealthDataSummaryService } from './services/health-data-summary.service';
import { WearablePrivacyService } from './services/wearable-privacy.service';
import { WearableTrainerService } from './services/wearable-trainer.service';
import { WearableProgressDataService } from './services/wearable-progress-data.service';

// Jobs
import { WearableSyncJobService } from './jobs/wearable-sync-job.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [WearablesController],
  providers: [
    // Security
    TokenEncryptionService,
    WearableRateLimiterService,
    WearableDataDeletionService,

    // Domain
    WearableCapabilitiesRegistry,
    UnitNormalizer,
    HealthDataValidator,
    DeduplicationService,

    // Provider Adapters
    AppleHealthProvider,
    GoogleHealthConnectProvider,
    FitbitProvider,
    ProviderRegistryService,

    // Services
    WearableConnectionService,
    WearableSyncService,
    HealthDataService,
    HealthDataSummaryService,
    WearablePrivacyService,
    WearableTrainerService,
    WearableProgressDataService,

    // Jobs
    WearableSyncJobService,
  ],
  exports: [
    WearableConnectionService,
    WearableSyncService,
    HealthDataSummaryService,
    HealthDataService,
    WearableCapabilitiesRegistry,
    TokenEncryptionService,
    WearablePrivacyService,
    WearableTrainerService,
    WearableDataDeletionService,
    WearableProgressDataService,
  ],
})
export class WearablesModule {}

