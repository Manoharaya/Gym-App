import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';
import { AuditModule } from '../audit/audit.module';

// Controllers
import { NutritionController } from './controllers/nutrition.controller';

// Services
import { NutritionProfileService } from './services/nutrition-profile.service';
import { NutritionTargetService } from './services/nutrition-target.service';
import { FoodLibraryService } from './services/food-library.service';
import { MealService } from './services/meal.service';
import { MealPlanService } from './services/meal-plan.service';
import { FoodLogService } from './services/food-log.service';
import { NutritionSummaryService } from './services/nutrition-summary.service';

// Processors
import { NutritionRollupProcessor } from './processors/nutrition-rollup.processor';

@Module({
  imports: [DatabaseModule, RedisModule, AuditModule],
  controllers: [NutritionController],
  providers: [
    NutritionProfileService,
    NutritionTargetService,
    FoodLibraryService,
    MealService,
    MealPlanService,
    FoodLogService,
    NutritionSummaryService,
    NutritionRollupProcessor,
  ],
  exports: [
    NutritionProfileService,
    NutritionTargetService,
    FoodLibraryService,
    MealService,
    MealPlanService,
    FoodLogService,
    NutritionSummaryService,
    NutritionRollupProcessor,
  ],
})
export class NutritionModule {}
