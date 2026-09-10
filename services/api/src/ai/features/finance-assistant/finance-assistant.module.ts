/**
 * FitCore — Day 44: AI Finance Assistant Feature Module
 */

import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { AuditModule } from '../../../audit/audit.module';
import { RedisModule } from '../../../redis/redis.module';
import { PaymentsModule } from '../../../payments/payments.module';
import { FinancialIntelligenceModule } from '../../../financial-intelligence/financial-intelligence.module';
import { RecurringBillingModule } from '../../../recurring-billing/recurring-billing.module';
import { AccountingIntegrationModule } from '../../../accounting-integration/accounting-integration.module';
import { AIModule } from '../../ai.module';

// Controllers
import { FinanceAssistantController } from './controllers/finance-assistant.controller';

// Services
import { FinanceAssistantService } from './services/finance-assistant.service';
import { FinancePermissionService } from './domain/finance-permission.service';
import { FinanceQueryService } from './services/finance-query.service';
import { FinanceContextService } from './services/finance-context.service';
import { FinanceComparisonService } from './services/finance-comparison.service';
import { FinanceExplanationService } from './services/finance-explanation.service';
import { FinanceRecommendationService } from './services/finance-recommendation.service';
import { FinanceSafetyService } from './services/finance-safety.service';
import { FinanceGroundingService } from './services/finance-grounding.service';
import { FinanceCacheService } from './services/finance-cache.service';
import { FinanceToolRegistry } from './tools/finance-tool-registry';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    RedisModule,
    PaymentsModule,
    FinancialIntelligenceModule,
    RecurringBillingModule,
    AccountingIntegrationModule,
    forwardRef(() => AIModule),
  ],
  controllers: [FinanceAssistantController],
  providers: [
    FinancePermissionService,
    FinanceQueryService,
    FinanceComparisonService,
    FinanceExplanationService,
    FinanceRecommendationService,
    FinanceSafetyService,
    FinanceGroundingService,
    FinanceCacheService,
    FinanceToolRegistry,
    FinanceContextService,
    FinanceAssistantService,
  ],
  exports: [
    FinanceAssistantService,
    FinanceToolRegistry,
    FinancePermissionService,
    FinanceContextService,
    FinanceComparisonService,
    FinanceExplanationService,
    FinanceRecommendationService,
    FinanceSafetyService,
    FinanceGroundingService,
    FinanceCacheService,
  ],
})
export class FinanceAssistantModule {}
