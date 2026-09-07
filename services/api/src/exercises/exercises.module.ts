import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { ExercisesController } from './controllers/exercises.controller';
import { ExercisesService } from './services/exercises.service';

@Module({
  imports: [DatabaseModule, AuditModule, StorageModule],
  controllers: [ExercisesController],
  providers: [ExercisesService],
  exports: [ExercisesService],
})
export class ExercisesModule {}
