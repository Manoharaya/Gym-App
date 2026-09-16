import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { ExercisesController } from './controllers/exercises.controller';
import { ExerciseMediaController } from './controllers/exercise-media.controller';
import { ExerciseInstructionsController } from './controllers/exercise-instructions.controller';
import { ExerciseMovementController } from './controllers/exercise-movement.controller';
import { ExerciseMetadataController } from './controllers/exercise-metadata.controller';
import { ExercisesService } from './services/exercises.service';
import { ExerciseKnowledgeService } from './services/exercise-knowledge.service';
import { ExerciseMediaService } from './services/exercise-media.service';
import { ExerciseMediaValidatorService } from './services/exercise-media-validator.service';
import { ExerciseMediaStorageService } from './services/exercise-media-storage.service';
import { ExerciseInstructionsService } from './services/exercise-instructions.service';
import { ExerciseMovementService } from './services/exercise-movement.service';
import { ExerciseMetadataService } from './services/exercise-metadata.service';

@Module({
  imports: [DatabaseModule, AuditModule, StorageModule],
  controllers: [
    ExercisesController,
    ExerciseMediaController,
    ExerciseInstructionsController,
    ExerciseMovementController,
    ExerciseMetadataController,
  ],
  providers: [
    ExercisesService,
    ExerciseKnowledgeService,
    ExerciseMediaService,
    ExerciseMediaValidatorService,
    ExerciseMediaStorageService,
    ExerciseInstructionsService,
    ExerciseMovementService,
    ExerciseMetadataService,
  ],
  exports: [
    ExercisesService,
    ExerciseKnowledgeService,
    ExerciseMediaService,
    ExerciseMediaValidatorService,
    ExerciseMediaStorageService,
    ExerciseInstructionsService,
    ExerciseMovementService,
    ExerciseMetadataService,
  ],
})
export class ExercisesModule {}

