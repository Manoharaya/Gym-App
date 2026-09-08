/**
 * Day 32 — Booking Waitlist Tool
 * Controlled receptionist mutation tool for joining waitlists when classes are full.
 * Strictly requires member identity and a valid single-use confirmation token.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ReceptionistBookingService } from '../booking/receptionist-booking.service';

@Injectable()
export class BookingWaitlistTool {
  private readonly logger = new Logger(BookingWaitlistTool.name);

  constructor(private readonly receptionistBookingService: ReceptionistBookingService) {}

  async joinWaitlist(
    organisationId: string,
    params: {
      memberProfileId: string;
      confirmationToken: string;
      notes?: string;
    },
  ) {
    this.logger.debug(
      `Executing join_waitlist for org ${organisationId}, member ${params.memberProfileId}, token: ${params.confirmationToken}`,
    );

    return this.receptionistBookingService.executeConfirmedBooking(
      organisationId,
      params.memberProfileId,
      {
        confirmationToken: params.confirmationToken,
        notes: params.notes,
      },
    );
  }
}
