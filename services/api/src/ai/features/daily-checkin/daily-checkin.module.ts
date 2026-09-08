import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { AuditModule } from '../../../audit/audit.module';
import { AIModule } from '../../ai.module';

import { DailyCheckInController } from './controllers/daily-checkin.controller';
import { DailyCheckInService } from './services/daily-checkin.service';
import { DailyCheckInScoringService } from './services/daily-checkin-scoring.service';
import { DailyCheckInSafetyService } from './services/daily-checkin-safety.service';
import { DailyCheckInSummaryService } from './services/daily-checkin-summary.service';
import { DailyCheckInContextService } from './services/daily-checkin-context.service';
import { DailyCheckInRecommendationService } from './services/daily-checkin-recommendation.service';
import { DailyCheckInToolsService } from './tools/daily-checkin-tools.service';
import { DailyCheckInJobService } from './services/daily-checkin-job.service';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    forwardRef(() => AIModule),
  ],
  controllers: [DailyCheckInController],
  providers: [
    DailyCheckInService,
    DailyCheckInScoringService,
    DailyCheckInSafetyService,
    DailyCheckInSummaryService,
    DailyCheckInContextService,
    DailyCheckInRecommendationService,
    DailyCheckInToolsService,
    DailyCheckInJobService,
  ],
  exports: [
    DailyCheckInService,
    DailyCheckInScoringService,
    DailyCheckInSafetyService,
    DailyCheckInJobService,
  ],
})
export class DailyCheckInModule {}
