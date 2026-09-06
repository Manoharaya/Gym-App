import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { BookingsModule } from '../bookings/bookings.module';

// Controllers
import { ClassAttendanceController } from './controllers/class-attendance.controller';
import { TrainerAttendanceController } from './controllers/trainer-attendance.controller';

// Services
import { CheckInService } from './services/check-in.service';
import { WalkInService } from './services/walk-in.service';
import { RosterService } from './services/roster.service';
import { NoShowProcessorService } from './services/no-show-processor.service';
import { TrainerOperationsService } from './services/trainer-operations.service';

@Module({
  imports: [DatabaseModule, BookingsModule],
  controllers: [ClassAttendanceController, TrainerAttendanceController],
  providers: [
    CheckInService,
    WalkInService,
    RosterService,
    NoShowProcessorService,
    TrainerOperationsService,
  ],
  exports: [
    CheckInService,
    WalkInService,
    RosterService,
    NoShowProcessorService,
    TrainerOperationsService,
  ],
})
export class AttendanceModule {}
