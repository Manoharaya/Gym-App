import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { AuditModule } from '../../../audit/audit.module';
import { AIModule } from '../../ai.module';

import { FitnessCoachController } from './controllers/fitness-coach.controller';
import { FitnessCoachService } from './services/fitness-coach.service';
import { FitnessCoachContextBuilderService } from './context/fitness-coach-context-builder.service';
import { FitnessSafetyPolicyService } from './policies/fitness-safety-policy.service';
import { FitnessCoachToolsService } from './tools/fitness-coach-tools.service';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    forwardRef(() => AIModule),
  ],
  controllers: [FitnessCoachController],
  providers: [
    FitnessCoachService,
    FitnessCoachContextBuilderService,
    FitnessSafetyPolicyService,
    FitnessCoachToolsService,
  ],
  exports: [
    FitnessCoachService,
    FitnessCoachContextBuilderService,
    FitnessSafetyPolicyService,
  ],
})
export class FitnessCoachModule {}
