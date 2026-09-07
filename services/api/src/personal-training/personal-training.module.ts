import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { BookingsModule } from '../bookings/bookings.module';

// Controllers
import { TrainingProgramsController } from './controllers/training-programs.controller';
import { TrainingGoalsController } from './controllers/training-goals.controller';
import { TrainerNotesController } from './controllers/trainer-notes.controller';
import { PersonalTrainingSessionsController } from './controllers/personal-training-sessions.controller';

// Services
import { TrainingProgramService } from './services/training-program.service';
import { TrainingGoalService } from './services/training-goal.service';
import { TrainerNoteService } from './services/trainer-note.service';
import { PersonalTrainingSessionService } from './services/personal-training-session.service';

// Processors
import { PersonalTrainingProcessor } from './processors/personal-training.processor';

@Module({
  imports: [DatabaseModule, AuditModule, BookingsModule],
  controllers: [
    TrainingProgramsController,
    TrainingGoalsController,
    TrainerNotesController,
    PersonalTrainingSessionsController,
  ],
  providers: [
    TrainingProgramService,
    TrainingGoalService,
    TrainerNoteService,
    PersonalTrainingSessionService,
    PersonalTrainingProcessor,
  ],
  exports: [
    TrainingProgramService,
    TrainingGoalService,
    TrainerNoteService,
    PersonalTrainingSessionService,
    PersonalTrainingProcessor,
  ],
})
export class PersonalTrainingModule {}
