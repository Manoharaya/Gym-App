/**
 * Day 32 — Booking Details Tool
 * Controlled receptionist tool for reading member bookings and booking details.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ReceptionistBookingService } from '../booking/receptionist-booking.service';

@Injectable()
export class BookingDetailsTool {
  private readonly logger = new Logger(BookingDetailsTool.name);

  constructor(private readonly receptionistBookingService: ReceptionistBookingService) {}

  async getMemberBookings(
    organisationId: string,
    memberProfileId: string,
    options?: { upcomingOnly?: boolean },
  ) {
    this.logger.debug(
      `Executing get_member_bookings for org ${organisationId}, member ${memberProfileId}`,
    );
    return this.receptionistBookingService.getMemberBookings(
      organisationId,
      memberProfileId,
      options,
    );
  }

  async getBookingDetails(organisationId: string, bookingId: string, memberProfileId: string) {
    this.logger.debug(
      `Executing get_booking_details for org ${organisationId}, booking ${bookingId}, member ${memberProfileId}`,
    );
    return this.receptionistBookingService.getBookingDetails(
      organisationId,
      bookingId,
      memberProfileId,
    );
  }
}
