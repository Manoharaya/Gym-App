import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { AIModule } from '../ai/ai.module';

// Controllers
import { SalesIntelligenceController } from './controllers/sales-intelligence.controller';

// Services
import { SalesMetricService } from './services/sales-metric.service';
import { SalesCacheService } from './services/sales-cache.service';
import { SalesAnalyticsService } from './services/sales-analytics.service';
import { SalesExportService } from './services/sales-export.service';
import { SalesAiInsightService } from './services/sales-ai-insight.service';
import { SalesIntelligenceService } from './services/sales-intelligence.service';

@Module({
  imports: [DatabaseModule, AuditModule, AIModule],
  controllers: [SalesIntelligenceController],
  providers: [
    SalesMetricService,
    SalesCacheService,
    SalesAnalyticsService,
    SalesExportService,
    SalesAiInsightService,
    SalesIntelligenceService,
  ],
  exports: [
    SalesMetricService,
    SalesCacheService,
    SalesAnalyticsService,
    SalesExportService,
    SalesAiInsightService,
    SalesIntelligenceService,
  ],
})
export class SalesIntelligenceModule {}
