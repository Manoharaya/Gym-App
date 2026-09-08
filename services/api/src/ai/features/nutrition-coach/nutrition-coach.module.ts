import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { AuditModule } from '../../../audit/audit.module';
import { NutritionModule } from '../../../nutrition/nutrition.module';
import { AIModule } from '../../ai.module';

import { NutritionCoachController } from './controllers/nutrition-coach.controller';
import { NutritionCoachService } from './services/nutrition-coach.service';
import { NutritionContextBuilder } from './nutrition-context/nutrition-context.builder';
import { NutritionContextPolicy } from './nutrition-context/nutrition-context.policy';
import { NutritionSafetyService } from './safety/nutrition-safety.service';
import { NutritionCoachToolsService } from './tools/nutrition-coach-tools.service';
import { NutritionCoachJobService } from './jobs/nutrition-coach-job.service';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    NutritionModule,
    forwardRef(() => AIModule),
  ],
  controllers: [NutritionCoachController],
  providers: [
    NutritionCoachService,
    NutritionContextBuilder,
    NutritionContextPolicy,
    NutritionSafetyService,
    NutritionCoachToolsService,
    NutritionCoachJobService,
  ],
  exports: [
    NutritionCoachService,
    NutritionContextBuilder,
    NutritionSafetyService,
    NutritionCoachJobService,
  ],
})
export class NutritionCoachModule {}
