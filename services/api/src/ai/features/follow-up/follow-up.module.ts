/**
 * Day 39 — Automated Follow-Up Feature Module
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { AuditModule } from '../../../audit/audit.module';
import { CommunicationsModule } from '../../../communications/communications.module';
import { AIModule } from '../../ai.module';

// Controllers
import { FollowUpController } from './controllers/follow-up.controller';

// Services
import { FollowUpSequenceService } from './services/follow-up-sequence.service';
import { FollowUpEligibilityService } from './services/follow-up-eligibility.service';
import { FollowUpSuppressionService } from './services/follow-up-suppression.service';
import { FollowUpContextService } from './services/follow-up-context.service';
import { FollowUpAiService } from './services/follow-up-ai.service';
import { FollowUpExecutionService } from './services/follow-up-execution.service';
import { FollowUpSchedulerService } from './services/follow-up-scheduler.service';
import { FollowUpResponseService } from './services/follow-up-response.service';
import { FollowUpQueueService } from './services/follow-up-queue.service';

@Module({
  imports: [DatabaseModule, AuditModule, CommunicationsModule, AIModule],
  controllers: [FollowUpController],
  providers: [
    FollowUpSequenceService,
    FollowUpEligibilityService,
    FollowUpSuppressionService,
    FollowUpContextService,
    FollowUpAiService,
    FollowUpExecutionService,
    FollowUpSchedulerService,
    FollowUpResponseService,
    FollowUpQueueService,
  ],
  exports: [
    FollowUpSequenceService,
    FollowUpEligibilityService,
    FollowUpSuppressionService,
    FollowUpContextService,
    FollowUpAiService,
    FollowUpExecutionService,
    FollowUpSchedulerService,
    FollowUpResponseService,
    FollowUpQueueService,
  ],
})
export class FollowUpModule {}
