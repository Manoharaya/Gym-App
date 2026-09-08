/**
 * Day 32 — Booking Create Tool
 * Controlled receptionist mutation tool for creating confirmed bookings.
 * Strictly requires member identity and a valid single-use confirmation token.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ReceptionistBookingService } from '../booking/receptionist-booking.service';

@Injectable()
export class BookingCreateTool {
  private readonly logger = new Logger(BookingCreateTool.name);

  constructor(private readonly receptionistBookingService: ReceptionistBookingService) {}

  async createBooking(
    organisationId: string,
    params: {
      memberProfileId: string;
      confirmationToken: string;
      notes?: string;
      idempotencyKey?: string;
    },
  ) {
    this.logger.debug(
      `Executing create_booking for org ${organisationId}, member ${params.memberProfileId}, token: ${params.confirmationToken}`,
    );

    return this.receptionistBookingService.executeConfirmedBooking(
      organisationId,
      params.memberProfileId,
      {
        confirmationToken: params.confirmationToken,
        notes: params.notes,
        idempotencyKey: params.idempotencyKey,
      },
    );
  }
}
