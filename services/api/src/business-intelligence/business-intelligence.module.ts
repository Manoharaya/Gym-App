import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { RedisModule } from '../redis/redis.module';
import { AIModule } from '../ai/ai.module';

// Controllers
import { BusinessIntelligenceController } from './controllers/business-intelligence.controller';

// Services
import { MetricDefinitionService } from './services/metric-definition.service';
import { MetricRegistryService } from './services/metric-registry.service';
import { MetricQueryService } from './services/metric-query.service';
import { AggregationService } from './services/aggregation.service';
import { ComparisonService } from './services/comparison.service';
import { BusinessTrendService } from './services/trend.service';
import { BusinessInsightService } from './services/insight.service';
import { BusinessAiInsightService } from './services/ai-insight.service';
import { DataQualityService } from './services/data-quality.service';
import { ProjectionService } from './services/projection.service';
import { BusinessCacheService } from './services/cache.service';
import { BusinessExportService } from './services/export.service';
import { BusinessPreferenceService } from './services/preference.service';
import { BusinessIntelligenceService } from './services/business-intelligence.service';

@Module({
  imports: [DatabaseModule, AuditModule, RedisModule, AIModule],
  controllers: [BusinessIntelligenceController],
  providers: [
    MetricDefinitionService,
    MetricRegistryService,
    MetricQueryService,
    AggregationService,
    ComparisonService,
    BusinessTrendService,
    BusinessInsightService,
    BusinessAiInsightService,
    DataQualityService,
    ProjectionService,
    BusinessCacheService,
    BusinessExportService,
    BusinessPreferenceService,
    BusinessIntelligenceService,
  ],
  exports: [
    MetricDefinitionService,
    MetricRegistryService,
    MetricQueryService,
    AggregationService,
    ComparisonService,
    BusinessTrendService,
    BusinessInsightService,
    BusinessAiInsightService,
    DataQualityService,
    ProjectionService,
    BusinessCacheService,
    BusinessExportService,
    BusinessPreferenceService,
    BusinessIntelligenceService,
  ],
})
export class BusinessIntelligenceModule {}
