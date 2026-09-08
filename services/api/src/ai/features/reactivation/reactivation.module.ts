import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { AuditModule } from '../../../audit/audit.module';
import { RedisModule } from '../../../redis/redis.module';
import { AIModule } from '../../ai.module';
import { EngagementIntelligenceModule } from '../engagement-intelligence/engagement-intelligence.module';

import { ReactivationController } from './reactivation.controller';
import { ReactivationService } from './reactivation.service';
import { ReactivationAnalysisService } from './analysis/reactivation-analysis.service';
import { ReactivationEligibilityService } from './eligibility/reactivation-eligibility.service';
import { InactivityAnalysisService } from './analysis/inactivity-analysis.service';
import { RecoverySignalService } from './analysis/recovery-signal.service';
import { RecoveryStrategyService } from './analysis/recovery-strategy.service';
import { ReactivationContextService } from './context/reactivation-context.service';
import { ReactivationSafetyService } from './safety/reactivation-safety.service';
import { ReactivationWorkflowService } from './workflows/reactivation-workflow.service';
import { ReactivationToolsService } from './tools/reactivation-tools.service';
import { ReactivationJobService } from './jobs/reactivation-job.service';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    RedisModule,
    forwardRef(() => AIModule),
    forwardRef(() => EngagementIntelligenceModule),
  ],
  controllers: [ReactivationController],
  providers: [
    ReactivationEligibilityService,
    InactivityAnalysisService,
    RecoverySignalService,
    RecoveryStrategyService,
    ReactivationContextService,
    ReactivationSafetyService,
    ReactivationWorkflowService,
    ReactivationToolsService,
    ReactivationJobService,
    ReactivationAnalysisService,
    ReactivationService,
  ],
  exports: [
    ReactivationService,
    ReactivationAnalysisService,
    ReactivationWorkflowService,
    ReactivationJobService,
    InactivityAnalysisService,
    RecoverySignalService,
    RecoveryStrategyService,
    ReactivationEligibilityService,
  ],
})
export class ReactivationModule {}
