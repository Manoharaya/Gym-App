/**
 * Day 32 — Booking Search Tool
 * Controlled receptionist tool for searching real-time class availability, capacities, and waitlists.
 */

import { Injectable, Logger } from '@nestjs/common';
import { BookingSearchService } from '../booking/booking-search.service';
import { ClassAvailabilityQueryDto, ClassAvailabilityResultDto } from '@fitcore/types';

@Injectable()
export class BookingSearchTool {
  private readonly logger = new Logger(BookingSearchTool.name);

  constructor(private readonly searchService: BookingSearchService) {}

  async searchClassAvailability(
    organisationId: string,
    params: {
      outletId?: string;
      className?: string;
      category?: string;
      date?: string;
      timeRange?: 'MORNING' | 'AFTERNOON' | 'EVENING';
      trainerName?: string;
      includeWaitlistOnly?: boolean;
    },
  ): Promise<ClassAvailabilityResultDto> {
    this.logger.debug(`Executing search_class_availability for org ${organisationId} with params: ${JSON.stringify(params)}`);

    const query: ClassAvailabilityQueryDto = {
      outletId: params.outletId,
      className: params.className,
      category: params.category,
      date: params.date,
      timeRange: params.timeRange,
      trainerName: params.trainerName,
      includeWaitlistOnly: params.includeWaitlistOnly,
    };

    return this.searchService.searchAvailability(organisationId, query);
  }
}
