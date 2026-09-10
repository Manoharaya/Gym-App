/**
 * Day 33 — Leads Module
 */

import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { AIModule } from '../ai/ai.module';
import { LeadsService } from './leads.service';
import { LeadDuplicateService } from './lead-duplicate.service';
import { LeadScoringService } from './lead-scoring.service';
import { LeadNextActionService } from './lead-next-action.service';
import { LeadQualificationService } from './lead-qualification.service';
import { LeadsController } from './leads.controller';

@Module({
  imports: [DatabaseModule, AuditModule, forwardRef(() => AIModule)],
  controllers: [LeadsController],
  providers: [
    LeadsService,
    LeadDuplicateService,
    LeadScoringService,
    LeadNextActionService,
    LeadQualificationService,
  ],
  exports: [
    LeadsService,
    LeadDuplicateService,
    LeadScoringService,
    LeadNextActionService,
    LeadQualificationService,
  ],
})
export class LeadsModule {}
