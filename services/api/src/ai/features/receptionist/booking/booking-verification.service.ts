/**
 * Day 32 — Booking Verification Service
 * Authoritatively verifies database state following any booking mutation
 * before the AI Receptionist reports success to the customer.
 */

import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class BookingVerificationService {
  private readonly logger = new Logger(BookingVerificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifies that a booking was successfully created in the database with expected properties.
   */
  async verifyBookingCreated(params: {
    bookingId: string;
    organisationId: string;
    memberProfileId: string;
    classSessionId: string;
    expectedStatus?: string;
  }) {
    const { bookingId, organisationId, memberProfileId, classSessionId, expectedStatus } = params;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        classSession: {
          include: {
            classType: true,
            outlet: true,
            trainer: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!booking) {
      this.logger.error(`[VERIFICATION_FAILED] Booking ${bookingId} does not exist in database`);
      throw new BadGatewayException('Booking verification failed: record was not found after execution');
    }

    if (booking.organisationId !== organisationId) {
      throw new BadGatewayException('Booking verification failed: organisation mismatch');
    }

    if (booking.memberProfileId !== memberProfileId) {
      throw new BadGatewayException('Booking verification failed: member identity mismatch');
    }

    if (booking.classSessionId !== classSessionId) {
      throw new BadGatewayException('Booking verification failed: class session mismatch');
    }

    if (expectedStatus && booking.status !== expectedStatus) {
      throw new BadGatewayException(
        `Booking verification failed: expected status ${expectedStatus} but found ${booking.status}`,
      );
    }

    return booking;
  }

  /**
   * Verifies that a booking cancellation was persisted.
   */
  async verifyBookingCancelled(bookingId: string, memberProfileId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { classSession: true },
    });

    if (!booking) {
      throw new BadGatewayException('Cancellation verification failed: booking record not found');
    }

    if (booking.memberProfileId !== memberProfileId) {
      throw new BadGatewayException('Cancellation verification failed: member identity mismatch');
    }

    if (booking.status !== 'CANCELLED') {
      throw new BadGatewayException(
        `Cancellation verification failed: booking status is ${booking.status} instead of CANCELLED`,
      );
    }

    return booking;
  }

  /**
   * Verifies that a waitlist entry was created.
   */
  async verifyWaitlistJoined(classSessionId: string, memberProfileId: string) {
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: {
        classSessionId,
        memberProfileId,
        status: 'PENDING',
      },
      include: { classSession: true },
    });

    if (!entry) {
      throw new BadGatewayException('Waitlist verification failed: waitlist entry not found');
    }

    return entry;
  }
}
