import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { AuditModule } from '../../../audit/audit.module';
import { RedisModule } from '../../../redis/redis.module';
import { AIModule } from '../../ai.module';
import { EngagementIntelligenceModule } from '../engagement-intelligence/engagement-intelligence.module';

import { RetentionIntelligenceController } from './retention-intelligence.controller';
import { RetentionIntelligenceService } from './retention-intelligence.service';
import { RetentionAnalysisService } from './analysis/retention-analysis.service';
import { RiskFactorService } from './analysis/risk-factor.service';
import { InterventionSelectionService } from './analysis/intervention-selection.service';
import { RetentionContextService } from './context/retention-context.service';
import { RetentionSafetyService } from './safety/retention-safety.service';
import { RetentionIntelligenceToolsService } from './tools/retention-intelligence-tools.service';
import { RetentionJobService } from './jobs/retention-job.service';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    RedisModule,
    forwardRef(() => AIModule),
    forwardRef(() => EngagementIntelligenceModule),
  ],
  controllers: [RetentionIntelligenceController],
  providers: [
    RiskFactorService,
    InterventionSelectionService,
    RetentionContextService,
    RetentionSafetyService,
    RetentionAnalysisService,
    RetentionIntelligenceToolsService,
    RetentionJobService,
    RetentionIntelligenceService,
  ],
  exports: [
    RetentionIntelligenceService,
    RetentionAnalysisService,
    RiskFactorService,
    InterventionSelectionService,
    RetentionJobService,
  ],
})
export class RetentionIntelligenceModule {}
