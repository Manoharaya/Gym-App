import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { RedisModule } from '../redis/redis.module';
import { AIModule } from '../ai/ai.module';
import { BusinessIntelligenceModule } from '../business-intelligence/business-intelligence.module';

// Controllers
import { MultiOutletIntelligenceController } from './controllers/multi-outlet-intelligence.controller';

// Services
import { MultiOutletIntelligenceService } from './services/multi-outlet-intelligence.service';
import { OutletMetricService } from './services/outlet-metric.service';
import { OutletNormalisationService } from './services/outlet-normalisation.service';
import { OutletBenchmarkService } from './services/outlet-benchmark.service';
import { OutletRankingService } from './services/outlet-ranking.service';
import { OutletComparisonService } from './services/outlet-comparison.service';
import { OutletTrendService } from './services/outlet-trend.service';
import { OutletHealthService } from './services/outlet-health.service';
import { OutletDataQualityService } from './services/outlet-data-quality.service';
import { OutletCacheService } from './services/outlet-cache.service';
import { OutletInsightService } from './services/outlet-insight.service';
import { OutletMetricRegistryService } from './domain/outlet-metric-registry';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    RedisModule,
    AIModule,
    BusinessIntelligenceModule,
  ],
  controllers: [MultiOutletIntelligenceController],
  providers: [
    OutletMetricRegistryService,
    OutletMetricService,
    OutletNormalisationService,
    OutletBenchmarkService,
    OutletRankingService,
    OutletComparisonService,
    OutletTrendService,
    OutletHealthService,
    OutletDataQualityService,
    OutletCacheService,
    OutletInsightService,
    MultiOutletIntelligenceService,
  ],
  exports: [
    MultiOutletIntelligenceService,
    OutletMetricService,
    OutletNormalisationService,
    OutletBenchmarkService,
    OutletRankingService,
    OutletComparisonService,
    OutletTrendService,
    OutletHealthService,
    OutletDataQualityService,
    OutletCacheService,
    OutletInsightService,
    OutletMetricRegistryService,
  ],
})
export class MultiOutletIntelligenceModule {}
