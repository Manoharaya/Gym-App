/**
 * FitCore AI Lead Qualification & Sales Discovery Module (Day 38)
 */

import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { AuditModule } from '../../../audit/audit.module';
import { AIModule } from '../../ai.module';

// Application Services
import { QualificationValidationService } from './application/qualification-validation.service';
import { QualificationScoringService } from './application/qualification-scoring.service';
import { QualificationHistoryService } from './application/qualification-history.service';
import { ObjectionService } from './application/objection.service';
import { QualificationQuestionService } from './application/qualification-question.service';
import { QualificationExtractionService } from './application/qualification-extraction.service';
import { LeadQualificationService } from './application/lead-qualification.service';

// Tools
import { LeadQualificationTools } from './tools/lead-qualification-tools';

// Controller
import { LeadQualificationController } from './controllers/lead-qualification.controller';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    forwardRef(() => AIModule),
  ],
  controllers: [LeadQualificationController],
  providers: [
    QualificationValidationService,
    QualificationScoringService,
    QualificationHistoryService,
    ObjectionService,
    QualificationQuestionService,
    QualificationExtractionService,
    LeadQualificationService,
    LeadQualificationTools,
  ],
  exports: [
    LeadQualificationService,
    ObjectionService,
    QualificationHistoryService,
    QualificationScoringService,
    QualificationValidationService,
    QualificationQuestionService,
    LeadQualificationTools,
  ],
})
export class LeadQualificationModule {}
