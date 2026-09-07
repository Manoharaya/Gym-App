import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { TrainingPlansController } from './controllers/training-plans.controller';
import { TrainingPlansService } from './services/training-plans.service';
import { TrainingPlanGenerationService } from './services/training-plan-generation.service';
import { TrainingAdherenceService } from './services/training-adherence.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [TrainingPlansController],
  providers: [
    TrainingPlansService,
    TrainingPlanGenerationService,
    TrainingAdherenceService,
  ],
  exports: [
    TrainingPlansService,
    TrainingPlanGenerationService,
    TrainingAdherenceService,
  ],
})
export class TrainingPlansModule {}
