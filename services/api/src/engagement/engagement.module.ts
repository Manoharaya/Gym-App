import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { CommunicationModule } from '../communication/communication.module';

// Controllers
import { EngagementController } from './controllers/engagement.controller';
import { HabitsController } from './controllers/habits.controller';
import { ChallengesController } from './controllers/challenges.controller';
import { RewardsController } from './controllers/rewards.controller';
import { EngagementStaffController } from './controllers/engagement-staff.controller';
import { EngagementAdminController } from './controllers/engagement-admin.controller';

// Services
import { StreakService } from './services/streak.service';
import { EngagementScoreService } from './services/engagement-score.service';
import { EngagementLevelService } from './services/engagement-level.service';
import { EngagementEventService } from './services/engagement-event.service';
import { HabitService } from './services/habit.service';
import { ChallengeService } from './services/challenge.service';
import { RewardService } from './services/reward.service';
import { EngagementNotificationService } from './services/engagement-notification.service';
import { EngagementAnalyticsService } from './services/engagement-analytics.service';
import { EngagementContextService } from './services/engagement-context.service';

// Processors
import { EngagementEventProcessor } from './processors/engagement-event.processor';
import { DailyEngagementProcessor } from './processors/daily-engagement.processor';

@Module({
  imports: [DatabaseModule, AuditModule, CommunicationModule],
  controllers: [
    EngagementController,
    HabitsController,
    ChallengesController,
    RewardsController,
    EngagementStaffController,
    EngagementAdminController,
  ],
  providers: [
    StreakService,
    EngagementScoreService,
    EngagementLevelService,
    EngagementEventService,
    HabitService,
    ChallengeService,
    RewardService,
    EngagementNotificationService,
    EngagementAnalyticsService,
    EngagementContextService,
    EngagementEventProcessor,
    DailyEngagementProcessor,
  ],
  exports: [
    StreakService,
    EngagementScoreService,
    EngagementLevelService,
    EngagementEventService,
    HabitService,
    ChallengeService,
    RewardService,
    EngagementNotificationService,
    EngagementAnalyticsService,
    EngagementContextService,
    EngagementEventProcessor,
    DailyEngagementProcessor,
  ],
})
export class EngagementModule {}
