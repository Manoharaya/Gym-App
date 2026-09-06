import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MembershipsModule } from '../memberships/memberships.module';

// Controllers
import { ClassesController } from './controllers/classes.controller';
import { ClassSessionsController } from './controllers/class-sessions.controller';
import { BookingsController } from './controllers/bookings.controller';
import { StaffScheduleController } from './controllers/staff-schedule.controller';

// Services
import { BookingEligibilityService } from './services/booking-eligibility.service';
import { ClassSessionService } from './services/class-session.service';
import { BookingService } from './services/booking.service';
import { WaitlistService } from './services/waitlist.service';
import { TrainerAvailabilityService } from './services/trainer-availability.service';
import { RecurringScheduleService } from './services/recurring-schedule.service';
import { ResourceService } from './services/resource.service';

@Module({
  imports: [DatabaseModule, MembershipsModule],
  controllers: [
    ClassesController,
    ClassSessionsController,
    BookingsController,
    StaffScheduleController,
  ],
  providers: [
    BookingEligibilityService,
    ClassSessionService,
    BookingService,
    WaitlistService,
    TrainerAvailabilityService,
    RecurringScheduleService,
    ResourceService,
  ],
  exports: [
    BookingEligibilityService,
    BookingService,
    ClassSessionService,
    WaitlistService,
    TrainerAvailabilityService,
    ResourceService,
  ],
})
export class BookingsModule {}
