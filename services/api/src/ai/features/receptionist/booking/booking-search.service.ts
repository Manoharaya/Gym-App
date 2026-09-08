/**
 * Day 32 — Booking Search Service
 * Discovers live class sessions, parses relative natural-language dates, resolves outlet timezones,
 * and dynamically calculates real-time capacity and waitlist status.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import {
  ClassAvailabilityQueryDto,
  ClassAvailabilityResultDto,
  SessionAvailabilityItemDto,
  SessionAvailabilityStatus,
} from '@fitcore/types';

@Injectable()
export class BookingSearchService {
  private readonly logger = new Logger(BookingSearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Parses natural language query filters and relative date expressions.
   */
  parseRelativeDateFilter(
    queryText: string = '',
    timezone: string = 'UTC',
  ): { startDate?: Date; endDate?: Date; timeFilter?: 'MORNING' | 'AFTERNOON' | 'EVENING' } {
    const lower = queryText.toLowerCase();
    const now = new Date();

    let startDate = new Date(now);
    let endDate: Date | undefined;
    let timeFilter: 'MORNING' | 'AFTERNOON' | 'EVENING' | undefined;

    // Detect Time of Day
    if (lower.includes('morning') || lower.includes('early')) {
      timeFilter = 'MORNING';
    } else if (lower.includes('afternoon') || lower.includes('lunch')) {
      timeFilter = 'AFTERNOON';
    } else if (lower.includes('evening') || lower.includes('after work') || lower.includes('tonight') || lower.includes('night')) {
      timeFilter = 'EVENING';
    }

    // Detect Relative Dates
    if (lower.includes('tomorrow')) {
      startDate = new Date(now.getTime() + 24 * 3600 * 1000);
      startDate.setUTCHours(0, 0, 0, 0);
      endDate = new Date(startDate.getTime() + 24 * 3600 * 1000);
    } else if (lower.includes('today') || lower.includes('tonight') || lower.includes('this evening')) {
      startDate.setUTCHours(0, 0, 0, 0);
      endDate = new Date(startDate.getTime() + 24 * 3600 * 1000);
    } else if (lower.includes('this weekend') || lower.includes('weekend')) {
      // Find upcoming Saturday
      const day = now.getUTCDay();
      const daysUntilSaturday = (6 - day + 7) % 7 || 7;
      startDate = new Date(now.getTime() + daysUntilSaturday * 24 * 3600 * 1000);
      startDate.setUTCHours(0, 0, 0, 0);
      endDate = new Date(startDate.getTime() + 2 * 24 * 3600 * 1000); // Sat + Sun
    } else if (lower.includes('next week')) {
      startDate = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
      startDate.setUTCHours(0, 0, 0, 0);
      endDate = new Date(startDate.getTime() + 7 * 24 * 3600 * 1000);
    } else {
      // Default: today through next 7 days
      startDate.setUTCHours(0, 0, 0, 0);
      endDate = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    }

    return { startDate, endDate, timeFilter };
  }

  /**
   * Authoritatively searches live class session availability across outlets.
   */
  async searchAvailability(
    organisationId: string,
    query: ClassAvailabilityQueryDto,
    memberProfileId?: string,
  ): Promise<ClassAvailabilityResultDto> {
    const now = new Date();

    // 1. Resolve Target Date Range
    const parsedDates = this.parseRelativeDateFilter('', 'UTC');
    const startRange = query.startDate ? new Date(query.startDate) : parsedDates.startDate || now;
    const endRange = query.endDate ? new Date(query.endDate) : parsedDates.endDate || new Date(now.getTime() + 7 * 24 * 3600 * 1000);

    // 2. Multi-Outlet Context Resolution
    const organisationOutlets = await this.prisma.outlet.findMany({
      where: { organisationId, status: 'ACTIVE' },
      select: { id: true, name: true, timezone: true },
    });

    const isMultiOutletOrg = organisationOutlets.length > 1;
    const selectedOutlet = query.outletId
      ? organisationOutlets.find((o) => o.id === query.outletId)
      : organisationOutlets.length === 1
        ? organisationOutlets[0]
        : undefined;

    // 3. Query Sessions from DB
    const whereClause: any = {
      organisationId,
      startsAt: {
        gte: startRange,
        lte: endRange,
      },
      status: { not: 'CANCELLED' },
    };

    if (selectedOutlet) {
      whereClause.outletId = selectedOutlet.id;
    }

    if (query.classTypeId) {
      whereClause.classTypeId = query.classTypeId;
    }

    if (query.trainerId) {
      whereClause.trainerId = query.trainerId;
    }

    const sessions = await this.prisma.classSession.findMany({
      where: whereClause,
      include: {
        classType: true,
        outlet: { select: { id: true, name: true, timezone: true } },
        trainer: { select: { id: true, firstName: true, lastName: true, email: true } },
        bookingPolicy: true,
      },
      orderBy: { startsAt: 'asc' },
      take: Math.min(query.limit || 10, 20),
    });

    // 4. Calculate Live Dynamic Capacity for each session
    const sessionDtos: SessionAvailabilityItemDto[] = await Promise.all(
      sessions.map(async (session) => {
        const confirmedBookingCount = await this.prisma.booking.count({
          where: { classSessionId: session.id, status: 'CONFIRMED' },
        });

        const waitlistCount = await this.prisma.waitlistEntry.count({
          where: { classSessionId: session.id, status: 'PENDING' },
        });

        const spotsRemaining = Math.max(0, session.capacity - confirmedBookingCount);
        const allowWaitlist = session.bookingPolicy?.allowWaitlist ?? true;

        let status: SessionAvailabilityStatus = 'AVAILABLE';
        if (session.status === 'CANCELLED') {
          status = 'CANCELLED';
        } else if (now > session.startsAt) {
          status = 'BOOKING_CLOSED';
        } else if (spotsRemaining === 0) {
          status = allowWaitlist ? 'WAITLIST_AVAILABLE' : 'FULL';
        } else if (spotsRemaining <= 3) {
          status = 'LIMITED';
        } else {
          status = 'AVAILABLE';
        }

        // Member personal booking check if authenticated
        let userBookingStatus: string | null = null;
        let userWaitlistPosition: number | null = null;
        if (memberProfileId) {
          const userBooking = await this.prisma.booking.findFirst({
            where: {
              classSessionId: session.id,
              memberProfileId,
              status: { in: ['CONFIRMED', 'WAITLISTED', 'CHECKED_IN'] },
            },
          });
          if (userBooking) {
            userBookingStatus = userBooking.status;
            userWaitlistPosition = userBooking.waitlistPosition;
          }
        }

        const trainerName = session.trainer
          ? `${session.trainer.firstName} ${session.trainer.lastName}`.trim()
          : null;

        return {
          sessionId: session.id,
          classTypeId: session.classTypeId,
          className: session.name || session.classType.name,
          category: session.classType.category,
          description: session.classType.description || undefined,
          outletId: session.outletId,
          outletName: session.outlet.name,
          trainerId: session.trainerId,
          trainerName,
          startsAt: session.startsAt.toISOString(),
          endsAt: session.endsAt.toISOString(),
          durationMinutes: session.classType.durationMinutes,
          capacity: session.capacity,
          confirmedBookingCount,
          spotsRemaining,
          waitlistCount,
          status,
          userBookingStatus,
          userWaitlistPosition,
        };
      }),
    );

    // Filter by Time of Day if requested
    let filteredSessions = sessionDtos;
    if (query.timeOfDay) {
      filteredSessions = sessionDtos.filter((s) => {
        const hour = new Date(s.startsAt).getUTCHours();
        if (query.timeOfDay === 'MORNING') return hour < 12;
        if (query.timeOfDay === 'AFTERNOON') return hour >= 12 && hour < 17;
        if (query.timeOfDay === 'EVENING') return hour >= 17;
        return true;
      });
    }

    // Check Multi-Outlet Ambiguity
    const requiresOutletClarification = isMultiOutletOrg && !query.outletId;

    return {
      outletId: selectedOutlet?.id,
      outletName: selectedOutlet?.name,
      queryDateRange: {
        start: startRange.toISOString(),
        end: endRange.toISOString(),
      },
      totalFound: filteredSessions.length,
      sessions: filteredSessions,
      requiresOutletClarification,
      availableOutlets: organisationOutlets.map((o) => ({ id: o.id, name: o.name })),
    };
  }
}
