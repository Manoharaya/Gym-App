import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';

// Controllers
import { FinancialIntelligenceController } from './controllers/financial-intelligence.controller';

// Services
import { FinancialMetricService } from './services/financial-metric.service';
import { FinancialCacheService } from './services/financial-cache.service';
import { FinancialAnalyticsService } from './services/financial-analytics.service';
import { FinancialReconciliationService } from './services/financial-reconciliation.service';
import { FinancialDataQualityService } from './services/financial-data-quality.service';
import { FinancialContextService } from './services/financial-context.service';
import { FinancialExportService } from './services/financial-export.service';
import { FinancialIntelligenceService } from './services/financial-intelligence.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [FinancialIntelligenceController],
  providers: [
    FinancialMetricService,
    FinancialCacheService,
    FinancialAnalyticsService,
    FinancialReconciliationService,
    FinancialDataQualityService,
    FinancialContextService,
    FinancialExportService,
    FinancialIntelligenceService,
  ],
  exports: [
    FinancialMetricService,
    FinancialCacheService,
    FinancialAnalyticsService,
    FinancialReconciliationService,
    FinancialDataQualityService,
    FinancialContextService,
    FinancialExportService,
    FinancialIntelligenceService,
  ],
})
export class FinancialIntelligenceModule {}
