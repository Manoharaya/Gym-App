/**
 * Day 32 — Booking Reschedule Tool
 * Controlled receptionist mutation tool for atomic rescheduling.
 * Strictly requires member identity and a valid single-use confirmation token.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ReceptionistBookingService } from '../booking/receptionist-booking.service';

@Injectable()
export class BookingRescheduleTool {
  private readonly logger = new Logger(BookingRescheduleTool.name);

  constructor(private readonly receptionistBookingService: ReceptionistBookingService) {}

  async rescheduleBooking(
    organisationId: string,
    params: {
      memberProfileId: string;
      confirmationToken: string;
    },
  ) {
    this.logger.debug(
      `Executing reschedule_booking for org ${organisationId}, member ${params.memberProfileId}, token: ${params.confirmationToken}`,
    );

    return this.receptionistBookingService.executeConfirmedReschedule(
      organisationId,
      params.memberProfileId,
      params.confirmationToken,
    );
  }
}
