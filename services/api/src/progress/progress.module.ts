import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';
import { AuditModule } from '../audit/audit.module';

// Controllers
import { ProgressController } from './controllers/progress.controller';

// Services
import { BodyMeasurementService } from './services/body-measurement.service';
import { FitnessAssessmentService } from './services/fitness-assessment.service';
import { PersonalRecordService } from './services/personal-record.service';
import { AdherenceAnalyticsService } from './services/adherence-analytics.service';
import { GoalProgressService } from './services/goal-progress.service';
import { ProgressAnalyticsService } from './services/progress-analytics.service';

// Processors
import { ProgressAggregationProcessor } from './processors/progress-aggregation.processor';

@Module({
  imports: [DatabaseModule, RedisModule, AuditModule],
  controllers: [ProgressController],
  providers: [
    BodyMeasurementService,
    FitnessAssessmentService,
    PersonalRecordService,
    AdherenceAnalyticsService,
    GoalProgressService,
    ProgressAnalyticsService,
    ProgressAggregationProcessor,
  ],
  exports: [
    BodyMeasurementService,
    FitnessAssessmentService,
    PersonalRecordService,
    AdherenceAnalyticsService,
    GoalProgressService,
    ProgressAnalyticsService,
    ProgressAggregationProcessor,
  ],
})
export class ProgressModule {}
