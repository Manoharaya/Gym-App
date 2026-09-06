import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BookingEligibilityService } from './booking-eligibility.service';

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eligibilityService: BookingEligibilityService,
  ) {}

  /**
   * Enqueues a member onto the session waitlist.
   */
  async addToWaitlist(
    tx: any,
    organisationId: string,
    outletId: string,
    classSessionId: string,
    memberProfileId: string,
    bookingId: string,
  ) {
    const currentWaitlistCount = await tx.waitlistEntry.count({
      where: {
        classSessionId,
        status: 'PENDING',
      },
    });

    const position = currentWaitlistCount + 1;

    const entry = await tx.waitlistEntry.create({
      data: {
        organisationId,
        outletId,
        classSessionId,
        memberProfileId,
        bookingId,
        position,
        status: 'PENDING',
      },
    });

    // Update booking with waitlist position
    await tx.booking.update({
      where: { id: bookingId },
      data: { waitlistPosition: position },
    });

    this.logger.log(
      `[WAITLIST] Member ${memberProfileId} joined waitlist for session ${classSessionId} at position #${position}`,
    );

    return entry;
  }

  /**
   * Promotes the next eligible candidate from the waitlist when a spot opens up.
   * If a candidate is no longer eligible (e.g. membership expired/suspended),
   * their entry is marked EXPIRED and the system advances to the next candidate.
   */
  async promoteNext(classSessionId: string) {
    const pendingEntries = await this.prisma.waitlistEntry.findMany({
      where: {
        classSessionId,
        status: 'PENDING',
      },
      orderBy: { position: 'asc' },
      include: {
        booking: true,
      },
    });

    if (pendingEntries.length === 0) {
      return null;
    }

    for (const entry of pendingEntries) {
      // Re-verify candidate eligibility
      const eligibility = await this.eligibilityService.checkEligibility(
        entry.memberProfileId,
        classSessionId,
        { isWaitlistPromotion: true, excludeBookingId: entry.bookingId ?? undefined },
      );

      if (!eligibility.eligible) {
        this.logger.warn(
          `[WAITLIST] Candidate ${entry.memberProfileId} in position #${entry.position} is no longer eligible: ${eligibility.reason}. Skipping candidate.`,
        );

        // Mark waitlist entry expired and cancel corresponding booking
        await this.prisma.$transaction(async (tx) => {
          await tx.waitlistEntry.update({
            where: { id: entry.id },
            data: { status: 'EXPIRED' },
          });

          if (entry.bookingId) {
            await tx.booking.update({
              where: { id: entry.bookingId },
              data: {
                status: 'CANCELLED',
                cancellationReason: `Ineligible for promotion: ${eligibility.reason}`,
                cancelledAt: new Date(),
              },
            });
          }
        });

        continue;
      }

      // Candidate is eligible -> Execute atomic promotion
      return this.prisma.$transaction(async (tx) => {
        // 1. Promote waitlist entry
        const promotedEntry = await tx.waitlistEntry.update({
          where: { id: entry.id },
          data: {
            status: 'PROMOTED',
            promotedAt: new Date(),
          },
        });

        // 2. Promote booking to CONFIRMED
        let promotedBooking = null;
        if (entry.bookingId) {
          promotedBooking = await tx.booking.update({
            where: { id: entry.bookingId },
            data: {
              status: 'CONFIRMED',
              waitlistPosition: null,
            },
          });
        }

        // 3. Re-sequence remaining pending entries
        const remaining = await tx.waitlistEntry.findMany({
          where: {
            classSessionId,
            status: 'PENDING',
          },
          orderBy: { position: 'asc' },
        });

        for (let i = 0; i < remaining.length; i++) {
          await tx.waitlistEntry.update({
            where: { id: remaining[i].id },
            data: { position: i + 1 },
          });
          if (remaining[i].bookingId) {
            await tx.booking.update({
              where: { id: remaining[i].bookingId! },
              data: { waitlistPosition: i + 1 },
            });
          }
        }

        this.logger.log(
          `[WAITLIST] Successfully promoted member ${entry.memberProfileId} to CONFIRMED for session ${classSessionId}`,
        );

        return {
          promotedEntry,
          promotedBooking,
        };
      });
    }

    return null;
  }

  /**
   * Leaves the waitlist voluntarily.
   */
  async leaveWaitlist(classSessionId: string, memberProfileId: string) {
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: {
        classSessionId,
        memberProfileId,
        status: 'PENDING',
      },
    });

    if (!entry) {
      return null;
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.waitlistEntry.update({
        where: { id: entry.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      if (entry.bookingId) {
        await tx.booking.update({
          where: { id: entry.bookingId },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancellationReason: 'Left waitlist',
          },
        });
      }

      // Re-sequence remaining
      const remaining = await tx.waitlistEntry.findMany({
        where: {
          classSessionId,
          status: 'PENDING',
        },
        orderBy: { position: 'asc' },
      });

      for (let i = 0; i < remaining.length; i++) {
        await tx.waitlistEntry.update({
          where: { id: remaining[i].id },
          data: { position: i + 1 },
        });
      }

      return entry;
    });
  }

  /**
   * Sweeps expired waitlist offers and triggers promotion for the next candidate.
   */
  async expireWaitlistOffers(classSessionId?: string) {
    const now = new Date();
    const expiredOffers = await this.prisma.waitlistEntry.findMany({
      where: {
        ...(classSessionId ? { classSessionId } : {}),
        status: 'OFFERED',
        offerExpiresAt: { lte: now },
      },
      include: { classSession: true },
    });

    const results = [];
    for (const offer of expiredOffers) {
      await this.prisma.$transaction(async (tx) => {
        await tx.waitlistEntry.update({
          where: { id: offer.id },
          data: { status: 'EXPIRED' },
        });

        if (offer.bookingId) {
          await tx.booking.update({
            where: { id: offer.bookingId },
            data: {
              status: 'CANCELLED',
              cancellationReason: 'Waitlist offer expired without acceptance',
              cancelledAt: now,
            },
          });
        }
      });

      // Promote next candidate
      const nextPromoted = await this.promoteNext(offer.classSessionId);
      results.push({ expiredOfferId: offer.id, nextPromoted });
    }

    return results;
  }
}

