import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';
import { CommonModule } from '../common/common.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { SaasBillingController } from './saas-billing.controller';
import { SaasBillingService } from './saas-billing.service';
import { SaasPlansService } from './plans/saas-plans.service';
import { SaasSubscriptionsService } from './subscriptions/saas-subscriptions.service';
import { SaasProrationService } from './proration/saas-proration.service';
import { SaasUsageLimitService } from './limits/saas-usage-limit.service';
import { SaasUsageService } from './usage/saas-usage.service';
import { SaasInvoicesService } from './invoices/saas-invoices.service';
import { SaasCreditsService } from './credits/saas-credits.service';
import { SaasDunningService } from './dunning/saas-dunning.service';
import { SaasReconciliationService } from './reconciliation/saas-reconciliation.service';
import { MockSaasBillingProvider } from './providers/mock-saas-billing.provider';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    CommonModule,
    TenancyModule,
    PermissionsModule,
  ],
  controllers: [SaasBillingController],
  providers: [
    SaasBillingService,
    SaasPlansService,
    SaasSubscriptionsService,
    SaasProrationService,
    SaasUsageLimitService,
    SaasUsageService,
    SaasInvoicesService,
    SaasCreditsService,
    SaasDunningService,
    SaasReconciliationService,
    MockSaasBillingProvider,
  ],
  exports: [
    SaasBillingService,
    SaasPlansService,
    SaasSubscriptionsService,
    SaasUsageLimitService,
    SaasUsageService,
    SaasInvoicesService,
    SaasCreditsService,
    SaasDunningService,
    SaasReconciliationService,
  ],
})
export class SaasBillingModule {}
