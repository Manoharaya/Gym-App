import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { RedisModule } from '../../../redis/redis.module';
import { AIModule } from '../../ai.module';

import { EngagementIntelligenceController } from './engagement-intelligence.controller';
import { AttendanceSignalsService } from './signals/attendance-signals.service';
import { BookingSignalsService } from './signals/booking-signals.service';
import { WorkoutSignalsService } from './signals/workout-signals.service';
import { MembershipSignalsService } from './signals/membership-signals.service';
import { AppEngagementService } from './signals/app-engagement.service';
import { CheckInSignalsService } from './signals/checkin-signals.service';
import { WearableSignalsService } from './signals/wearable-signals.service';
import { EngagementSignalService } from './signals/engagement-signal.service';
import { MemberEngagementBaselineService } from './profile/member-engagement-baseline.service';
import { MemberEngagementProfileService } from './profile/member-engagement-profile.service';
import { EngagementTrendService } from './trends/engagement-trend.service';
import { RiskExplanationService } from './risk/risk-explanation.service';
import { RetentionRiskService } from './risk/retention-risk.service';
import { EngagementAnalyticsService } from './analytics/engagement-analytics.service';
import { EngagementContextService } from './context/engagement-context.service';
import { EngagementSafetyService } from './safety/engagement-safety.service';
import { EngagementIntelligenceToolsService } from './tools/engagement-intelligence-tools.service';
import { EngagementIntelligenceCacheService } from './services/engagement-intelligence-cache.service';
import { EngagementIntelligenceJobService } from './services/engagement-intelligence-job.service';
import { EngagementIntelligenceService } from './services/engagement-intelligence.service';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    forwardRef(() => AIModule),
  ],
  controllers: [EngagementIntelligenceController],
  providers: [
    AttendanceSignalsService,
    BookingSignalsService,
    WorkoutSignalsService,
    MembershipSignalsService,
    AppEngagementService,
    CheckInSignalsService,
    WearableSignalsService,
    EngagementSignalService,
    MemberEngagementBaselineService,
    MemberEngagementProfileService,
    EngagementTrendService,
    RiskExplanationService,
    RetentionRiskService,
    EngagementAnalyticsService,
    EngagementContextService,
    EngagementSafetyService,
    EngagementIntelligenceToolsService,
    EngagementIntelligenceCacheService,
    EngagementIntelligenceJobService,
    EngagementIntelligenceService,
  ],
  exports: [
    EngagementIntelligenceService,
    EngagementSignalService,
    MemberEngagementProfileService,
    MemberEngagementBaselineService,
    EngagementTrendService,
    RetentionRiskService,
    EngagementAnalyticsService,
    AppEngagementService,
  ],
})
export class EngagementIntelligenceModule {}
