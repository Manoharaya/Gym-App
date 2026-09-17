import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { ExercisesController } from './controllers/exercises.controller';
import { ExerciseMediaController } from './controllers/exercise-media.controller';
import { ExerciseInstructionsController } from './controllers/exercise-instructions.controller';
import { ExerciseMovementController } from './controllers/exercise-movement.controller';
import { ExerciseMetadataController } from './controllers/exercise-metadata.controller';
import { ExerciseDiscoveryController } from './controllers/exercise-discovery.controller';
import { ExerciseCollectionsController } from './controllers/exercise-collections.controller';
import { LearningPathsController } from './controllers/learning-paths.controller';
import { LearningDashboardController } from './controllers/learning-dashboard.controller';
import { KnowledgeCheckController } from './controllers/knowledge-check.controller';
import { AcademyController } from './controllers/academy.controller';
import { ExercisesService } from './services/exercises.service';
import { ExerciseKnowledgeService } from './services/exercise-knowledge.service';
import { ExerciseMediaService } from './services/exercise-media.service';
import { ExerciseMediaValidatorService } from './services/exercise-media-validator.service';
import { ExerciseMediaStorageService } from './services/exercise-media-storage.service';
import { ExerciseInstructionsService } from './services/exercise-instructions.service';
import { ExerciseMovementService } from './services/exercise-movement.service';
import { ExerciseMetadataService } from './services/exercise-metadata.service';
import { ExercisePersonalizationService } from './services/exercise-personalization.service';
import { ExerciseVisualDiscoveryService } from './services/exercise-visual-discovery.service';
import { ExerciseCollectionsLearningPathsService } from './services/exercise-collections-learning-paths.service';
import { LearningDashboardService } from './services/learning-dashboard.service';
import { KnowledgeCheckService } from './services/knowledge-check.service';
import { AcademyService } from './services/academy.service';

@Module({
  imports: [DatabaseModule, AuditModule, StorageModule],
  controllers: [
    ExercisesController,
    ExerciseMediaController,
    ExerciseInstructionsController,
    ExerciseMovementController,
    ExerciseMetadataController,
    ExerciseDiscoveryController,
    ExerciseCollectionsController,
    LearningPathsController,
    LearningDashboardController,
    KnowledgeCheckController,
    AcademyController,
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
    ExercisePersonalizationService,
    ExerciseVisualDiscoveryService,
    ExerciseCollectionsLearningPathsService,
    LearningDashboardService,
    KnowledgeCheckService,
    AcademyService,
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
    ExercisePersonalizationService,
    ExerciseVisualDiscoveryService,
    ExerciseCollectionsLearningPathsService,
    LearningDashboardService,
    KnowledgeCheckService,
    AcademyService,
  ],
})
export class ExercisesModule {}

