import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { BookingSignals } from '../engagement-intelligence.types';

@Injectable()
export class BookingSignalsService {
  private readonly logger = new Logger(BookingSignalsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async collect(memberId: string, organisationId: string, now: Date = new Date()): Promise<BookingSignals> {
    const d7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d28Ago = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const bookings = await this.prisma.booking.findMany({
      where: {
        memberProfileId: memberId,
        organisationId,
        bookedAt: { gte: d28Ago, lte: now },
      },
      select: {
        id: true,
        status: true,
        bookedAt: true,
        cancelledAt: true,
      },
      orderBy: { bookedAt: 'desc' },
    });

    const waitlists = await this.prisma.waitlistEntry.findMany({
      where: {
        memberProfileId: memberId,
        organisationId,
        createdAt: { gte: d28Ago, lte: now },
      },
      select: { id: true },
    });

    const bookingsLast7d = bookings.filter((b) => b.bookedAt >= d7Ago).length;
    const bookingsLast28d = bookings.length;
    const cancellationsLast28d = bookings.filter((b) => b.status === 'CANCELLED' || b.cancelledAt).length;
    const waitlistCountLast28d = waitlists.length;

    const bookingFrequencyPerWeek = Number((bookingsLast28d / 4).toFixed(2));
    const lastBookingAt = bookings[0]?.bookedAt || null;

    const recentRate = bookingsLast7d;
    const baselineRate = bookingFrequencyPerWeek;
    let bookingDeltaPct = 0;
    if (baselineRate > 0) {
      bookingDeltaPct = Math.round(((recentRate - baselineRate) / baselineRate) * 100);
    } else if (recentRate > 0) {
      bookingDeltaPct = 100;
    }

    return {
      bookingsLast7d,
      bookingsLast28d,
      cancellationsLast28d,
      waitlistCountLast28d,
      bookingFrequencyPerWeek,
      lastBookingAt,
      bookingDeltaPct,
    };
  }
}
