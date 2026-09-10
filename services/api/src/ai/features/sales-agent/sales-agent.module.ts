/**
 * Day 36 — AI Sales Agent Feature Module
 */

import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { AuditModule } from '../../../audit/audit.module';
import { LeadsModule } from '../../../leads/leads.module';
import { AIModule } from '../../ai.module';
import { LeadQualificationModule } from '../lead-qualification/lead-qualification.module';

// Tools
import { SalesBusinessTools } from './tools/sales-business-tools';
import { SalesLeadTools } from './tools/sales-lead-tools';
import { SalesActionTools } from './tools/sales-action-tools';
import { SalesToolRegistry } from './tools/sales-tool-registry';

// Application Services
import { SalesPolicyService } from './application/sales-policy.service';
import { SalesContextService } from './application/sales-context.service';
import { SalesRecommendationService } from './application/sales-recommendation.service';
import { SalesQualificationService } from './application/sales-qualification.service';
import { SalesHandoffService } from './application/sales-handoff.service';
import { SalesAgentService } from './application/sales-agent.service';

// Controller
import { SalesAgentController } from './controllers/sales-agent.controller';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    LeadsModule,
    LeadQualificationModule,
    forwardRef(() => AIModule),
  ],
  controllers: [SalesAgentController],
  providers: [
    SalesBusinessTools,
    SalesLeadTools,
    SalesActionTools,
    SalesToolRegistry,
    SalesPolicyService,
    SalesContextService,
    SalesRecommendationService,
    SalesQualificationService,
    SalesHandoffService,
    SalesAgentService,
  ],
  exports: [
    SalesAgentService,
    SalesRecommendationService,
    SalesToolRegistry,
    SalesHandoffService,
    SalesContextService,
    SalesPolicyService,
  ],
})
export class SalesAgentModule {}
