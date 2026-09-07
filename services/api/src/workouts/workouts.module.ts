import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { WorkoutTemplatesController } from './controllers/workout-templates.controller';
import { WorkoutsController } from './controllers/workouts.controller';
import { WorkoutTemplateService } from './services/workout-template.service';
import { WorkoutsService } from './services/workouts.service';
import { WorkoutPerformanceService } from './services/workout-performance.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [WorkoutTemplatesController, WorkoutsController],
  providers: [WorkoutTemplateService, WorkoutsService, WorkoutPerformanceService],
  exports: [WorkoutTemplateService, WorkoutsService, WorkoutPerformanceService],
})
export class WorkoutsModule {}
