import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SecurityModule } from '../security/security.module';
import { AuditModule } from '../audit/audit.module';

// Catalog
import { PrivacyCatalogService } from './catalog/privacy-catalog.service';

// Consent
import { PrivacyConsentService } from './consent/privacy-consent.service';

// Preferences
import { PrivacyPreferencesService } from './preferences/privacy-preferences.service';

// Requests
import { PrivacyRequestService } from './requests/privacy-request.service';

// Access
import { PrivacyDataAccessService } from './access/privacy-data-access.service';

// Export
import { DomainExportersService } from './export/exporters/domain-exporters';
import { PrivacyExportService } from './export/privacy-export.service';

// Deletion & Anonymization
import { AnonymizationService } from './deletion/anonymization.service';
import { PrivacyDeletionOrchestratorService } from './deletion/privacy-deletion-orchestrator.service';
import { PrivacyDeletionService } from './deletion/privacy-deletion.service';

// Retention & Holds
import { PrivacyRetentionHoldService } from './retention/privacy-retention-hold.service';
import { PrivacyRetentionService } from './retention/privacy-retention.service';
import { PrivacyRetentionProcessorService } from './retention/privacy-retention-processor.service';

// Restrictions & Policies
import { PrivacyRestrictionService } from './restrictions/privacy-restriction.service';
import { PrivacyPolicyService } from './policies/privacy-policy.service';
import { PrivacyAIDataPolicyService } from './ai/privacy-ai-policy.service';

// Processors & Quality
import { PrivacyProcessorService } from './processors/privacy-processor.service';
import { PrivacyDataQualityService } from './quality/privacy-data-quality.service';

// Master Service & Controller
import { PrivacyService } from './privacy.service';
import { PrivacyController } from './privacy.controller';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => SecurityModule),
    AuditModule,
  ],
  controllers: [PrivacyController],
  providers: [
    PrivacyCatalogService,
    PrivacyConsentService,
    PrivacyPreferencesService,
    PrivacyRequestService,
    PrivacyDataAccessService,
    DomainExportersService,
    PrivacyExportService,
    AnonymizationService,
    PrivacyDeletionOrchestratorService,
    PrivacyDeletionService,
    PrivacyRetentionHoldService,
    PrivacyRetentionService,
    PrivacyRetentionProcessorService,
    PrivacyRestrictionService,
    PrivacyPolicyService,
    PrivacyAIDataPolicyService,
    PrivacyProcessorService,
    PrivacyDataQualityService,
    PrivacyService,
  ],
  exports: [
    PrivacyCatalogService,
    PrivacyConsentService,
    PrivacyPreferencesService,
    PrivacyRequestService,
    PrivacyDataAccessService,
    PrivacyExportService,
    PrivacyDeletionService,
    PrivacyRetentionHoldService,
    PrivacyRetentionService,
    PrivacyRetentionProcessorService,
    PrivacyRestrictionService,
    PrivacyPolicyService,
    PrivacyAIDataPolicyService,
    PrivacyProcessorService,
    PrivacyDataQualityService,
    PrivacyService,
  ],
})
export class PrivacyModule {}
