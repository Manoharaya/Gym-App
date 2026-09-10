import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { AutomationModule } from '../automation/automation.module';
import { SalesPipelineController } from './controllers/sales-pipeline.controller';
import { SalesPipelinePolicyService } from './application/sales-pipeline-policy.service';
import { SalesPipelineEventService } from './application/sales-pipeline-event.service';
import { SalesPipelineService } from './application/sales-pipeline.service';
import { SalesStageTransitionService } from './application/sales-stage-transition.service';
import { SalesOpportunityService } from './application/sales-opportunity.service';
import { SalesActivityService } from './application/sales-activity.service';
import { SalesTaskService } from './application/sales-task.service';
import { SalesConversionService } from './application/sales-conversion.service';
import { SalesPipelineBoardService } from './application/sales-pipeline-board.service';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    forwardRef(() => AutomationModule),
  ],
  controllers: [SalesPipelineController],
  providers: [
    SalesPipelinePolicyService,
    SalesPipelineEventService,
    SalesPipelineService,
    SalesStageTransitionService,
    SalesOpportunityService,
    SalesActivityService,
    SalesTaskService,
    SalesConversionService,
    SalesPipelineBoardService,
  ],
  exports: [
    SalesPipelinePolicyService,
    SalesPipelineEventService,
    SalesPipelineService,
    SalesStageTransitionService,
    SalesOpportunityService,
    SalesActivityService,
    SalesTaskService,
    SalesConversionService,
    SalesPipelineBoardService,
  ],
})
export class SalesPipelineModule {}
