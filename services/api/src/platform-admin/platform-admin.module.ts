import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';
import { AuditModule } from '../audit/audit.module';
import { SecurityModule } from '../security/security.module';
import { CommunicationsModule } from '../communications/communications.module';
import { PlatformAdminController } from './platform-admin.controller';
import { PlatformAdminService } from './platform-admin.service';
import { PlatformOrganisationsService } from './organisations/platform-organisations.service';
import { PlatformUsageService } from './usage/platform-usage.service';
import { PlatformAIUsageService } from './ai-usage/platform-ai-usage.service';
import { PlatformBillingService } from './billing/platform-billing.service';
import { PlatformSupportService } from './support/platform-support.service';
import { PlatformFeatureFlagsService } from './feature-flags/platform-feature-flags.service';
import { PlatformConfigurationService } from './configuration/platform-configuration.service';
import { PlatformHealthService } from './platform-health/platform-health.service';
import { PlatformIntegrationsService } from './integrations/platform-integrations.service';
import { PlatformSupportAccessService } from './support-access/platform-support-access.service';
import { PlatformAnnouncementsService } from './announcements/platform-announcements.service';
import { PlatformDataQualityService } from './data-quality/platform-data-quality.service';
import { PlatformPermissionGuard } from './permissions/platform-permission.guard';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    AuditModule,
    SecurityModule,
    CommunicationsModule,
  ],
  controllers: [PlatformAdminController],
  providers: [
    PlatformAdminService,
    PlatformOrganisationsService,
    PlatformUsageService,
    PlatformAIUsageService,
    PlatformBillingService,
    PlatformSupportService,
    PlatformFeatureFlagsService,
    PlatformConfigurationService,
    PlatformHealthService,
    PlatformIntegrationsService,
    PlatformSupportAccessService,
    PlatformAnnouncementsService,
    PlatformDataQualityService,
    PlatformPermissionGuard,
  ],
  exports: [
    PlatformAdminService,
    PlatformOrganisationsService,
    PlatformUsageService,
    PlatformAIUsageService,
    PlatformBillingService,
    PlatformSupportService,
    PlatformFeatureFlagsService,
    PlatformConfigurationService,
    PlatformHealthService,
    PlatformIntegrationsService,
    PlatformSupportAccessService,
    PlatformAnnouncementsService,
    PlatformDataQualityService,
    PlatformPermissionGuard,
  ],
})
export class PlatformAdminModule {}
