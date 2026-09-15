import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { ExercisesController } from './controllers/exercises.controller';
import { ExerciseMediaController } from './controllers/exercise-media.controller';
import { ExercisesService } from './services/exercises.service';
import { ExerciseKnowledgeService } from './services/exercise-knowledge.service';
import { ExerciseMediaService } from './services/exercise-media.service';
import { ExerciseMediaValidatorService } from './services/exercise-media-validator.service';
import { ExerciseMediaStorageService } from './services/exercise-media-storage.service';

@Module({
  imports: [DatabaseModule, AuditModule, StorageModule],
  controllers: [ExercisesController, ExerciseMediaController],
  providers: [
    ExercisesService,
    ExerciseKnowledgeService,
    ExerciseMediaService,
    ExerciseMediaValidatorService,
    ExerciseMediaStorageService,
  ],
  exports: [
    ExercisesService,
    ExerciseKnowledgeService,
    ExerciseMediaService,
    ExerciseMediaValidatorService,
    ExerciseMediaStorageService,
  ],
})
export class ExercisesModule {}
