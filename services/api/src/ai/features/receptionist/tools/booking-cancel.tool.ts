/**
 * Day 32 — Booking Cancel Tool
 * Controlled receptionist mutation tool for cancelling existing bookings.
 * Strictly requires member identity and a valid single-use confirmation token.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ReceptionistBookingService } from '../booking/receptionist-booking.service';

@Injectable()
export class BookingCancelTool {
  private readonly logger = new Logger(BookingCancelTool.name);

  constructor(private readonly receptionistBookingService: ReceptionistBookingService) {}

  async cancelBooking(
    organisationId: string,
    params: {
      memberProfileId: string;
      confirmationToken: string;
      reason?: string;
    },
  ) {
    this.logger.debug(
      `Executing cancel_booking for org ${organisationId}, member ${params.memberProfileId}, token: ${params.confirmationToken}`,
    );

    return this.receptionistBookingService.executeConfirmedCancellation(
      organisationId,
      params.memberProfileId,
      params.confirmationToken,
      params.reason,
    );
  }
}
