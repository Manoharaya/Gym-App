import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { RedisModule } from '../../../redis/redis.module';
import { AIModule } from '../../ai.module';

import { WearableIntelligenceController } from './controllers/wearable-intelligence.controller';
import { WearableIntelligenceService } from './services/wearable-intelligence.service';
import { WearableMetricsService } from './metrics/wearable-metrics.service';
import { SleepMetricsService } from './metrics/sleep-metrics.service';
import { ActivityMetricsService } from './metrics/activity-metrics.service';
import { HeartMetricsService } from './metrics/heart-metrics.service';
import { RecoveryMetricsService } from './metrics/recovery-metrics.service';
import { WearableBaselineService } from './trends/baseline.service';
import { WearableTrendService } from './trends/wearable-trend.service';
import { TrainingCorrelationService } from './correlation/training-correlation.service';
import { WearableIntelligenceContextService } from './context/wearable-intelligence-context.service';
import { WearableIntelligenceSafetyService } from './safety/wearable-intelligence-safety.service';
import { WearableIntelligenceToolsService } from './tools/wearable-intelligence-tools.service';
import { WearableIntelligenceCacheService } from './services/wearable-intelligence-cache.service';
import { WearableIntelligenceJobService } from './services/wearable-intelligence-job.service';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    forwardRef(() => AIModule),
  ],
  controllers: [WearableIntelligenceController],
  providers: [
    WearableIntelligenceService,
    WearableMetricsService,
    SleepMetricsService,
    ActivityMetricsService,
    HeartMetricsService,
    RecoveryMetricsService,
    WearableBaselineService,
    WearableTrendService,
    TrainingCorrelationService,
    WearableIntelligenceContextService,
    WearableIntelligenceSafetyService,
    WearableIntelligenceToolsService,
    WearableIntelligenceCacheService,
    WearableIntelligenceJobService,
  ],
  exports: [
    WearableIntelligenceService,
    WearableMetricsService,
    RecoveryMetricsService,
    WearableBaselineService,
    WearableTrendService,
    TrainingCorrelationService,
    WearableIntelligenceSafetyService,
  ],
})
export class WearableIntelligenceModule {}
