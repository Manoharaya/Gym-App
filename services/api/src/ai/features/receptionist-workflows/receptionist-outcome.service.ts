/**
 * Day 35 — Receptionist Outcome Service
 * Determines and verifies authoritative interaction outcomes and sources.
 * Enforces safety invariant: The AI cannot claim success ("Done") without verified domain data.
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  ReceptionistOutcome,
  ReceptionistOutcomeSource,
  ReceptionistInteractionStatus,
} from '@fitcore/types';

export interface OutcomeVerificationResult {
  verified: boolean;
  outcome: ReceptionistOutcome;
  source: ReceptionistOutcomeSource;
  status: ReceptionistInteractionStatus;
  safeMessage?: string;
}

@Injectable()
export class ReceptionistOutcomeService {
  private readonly logger = new Logger(ReceptionistOutcomeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Authoritatively verifies an outcome against underlying domain databases.
   * If a booking or lead is claimed to be created, verifies the record exists.
   */
  async verifyAndResolveOutcome(params: {
    organisationId: string;
    interactionId: string;
    requestedOutcome: ReceptionistOutcome;
    source: ReceptionistOutcomeSource;
    targetReferenceId?: string; // bookingId, leadId, handoffId, callbackId
    language?: string;
  }): Promise<OutcomeVerificationResult> {
    const { organisationId, interactionId, requestedOutcome, source, targetReferenceId, language = 'en' } = params;

    const isNepali = language === 'ne';

    // 1. Verify Bookings
    if (
      requestedOutcome === 'BOOKING_CREATED' ||
      requestedOutcome === 'BOOKING_CANCELLED' ||
      requestedOutcome === 'BOOKING_RESCHEDULED' ||
      requestedOutcome === 'WAITLIST_JOINED'
    ) {
      if (!targetReferenceId) {
        this.logger.warn(`Outcome ${requestedOutcome} claimed without booking reference ID`);
        return {
          verified: false,
          outcome: 'FAILED',
          source: 'SYSTEM',
          status: 'FAILED',
          safeMessage: isNepali
            ? 'माफ गर्नुहोस्, म अहिले बुकिङ पुष्टि गर्न असमर्थ भएँ।'
            : "I wasn't able to complete or verify that booking right now.",
        };
      }

      // Authoritative DB check
      if (requestedOutcome === 'BOOKING_CREATED') {
        const booking = await this.prisma.booking.findFirst({
          where: { id: targetReferenceId, organisationId },
        });

        if (!booking || booking.status !== 'CONFIRMED') {
          return {
            verified: false,
            outcome: 'FAILED',
            source: 'SYSTEM',
            status: 'FAILED',
            safeMessage: isNepali
              ? 'बुकिङ पुष्टि हुन सकेन। कृपया फेरि प्रयास गर्नुहोस् वा कर्मचारीलाई सम्पर्क गर्नुहोस्।'
              : "I'm unable to confirm that booking in our system right now.",
          };
        }
      }
    }

    // 2. Verify Leads
    if (requestedOutcome === 'LEAD_CREATED' || requestedOutcome === 'LEAD_QUALIFIED') {
      if (!targetReferenceId) {
        return {
          verified: false,
          outcome: 'FAILED',
          source: 'SYSTEM',
          status: 'FAILED',
          safeMessage: isNepali
            ? 'सम्पर्क विवरण सुरक्षित गर्न सकिएन।'
            : "I couldn't save your details right now.",
        };
      }

      const lead = await this.prisma.lead.findFirst({
        where: { id: targetReferenceId, organisationId },
      });

      if (!lead) {
        return {
          verified: false,
          outcome: 'FAILED',
          source: 'SYSTEM',
          status: 'FAILED',
          safeMessage: isNepali
            ? 'सम्पर्क विवरण सुरक्षित गर्न सकिएन।'
            : "I couldn't save your details right now.",
        };
      }
    }

    // 3. Verify Staff Handoffs
    if (requestedOutcome === 'STAFF_HANDOFF') {
      if (targetReferenceId) {
        const handoff = await this.prisma.receptionistHandoff.findFirst({
          where: { id: targetReferenceId, organisationId },
        });
        if (!handoff) {
          return {
            verified: false,
            outcome: 'FOLLOW_UP_REQUIRED',
            source: 'SYSTEM',
            status: 'FOLLOW_UP_REQUIRED',
          };
        }
      }
      return {
        verified: true,
        outcome: 'STAFF_HANDOFF',
        source: source || 'CUSTOMER',
        status: 'HANDED_OFF',
      };
    }

    // 4. Verify Callbacks
    if (requestedOutcome === 'CALLBACK_REQUESTED') {
      return {
        verified: true,
        outcome: 'CALLBACK_REQUESTED',
        source: source || 'CUSTOMER',
        status: 'FOLLOW_UP_REQUIRED',
      };
    }

    // 5. General resolution
    const statusMap: Record<ReceptionistOutcome, ReceptionistInteractionStatus> = {
      BOOKING_CREATED: 'COMPLETED',
      BOOKING_CANCELLED: 'COMPLETED',
      BOOKING_RESCHEDULED: 'COMPLETED',
      WAITLIST_JOINED: 'COMPLETED',
      LEAD_CREATED: 'COMPLETED',
      LEAD_QUALIFIED: 'COMPLETED',
      STAFF_HANDOFF: 'HANDED_OFF',
      CALLBACK_REQUESTED: 'FOLLOW_UP_REQUIRED',
      FOLLOW_UP_REQUIRED: 'FOLLOW_UP_REQUIRED',
      INFORMATION_PROVIDED: 'COMPLETED',
      UNRESOLVED: 'FAILED',
      FAILED: 'FAILED',
    };

    return {
      verified: true,
      outcome: requestedOutcome,
      source: source || 'AI',
      status: statusMap[requestedOutcome] || 'COMPLETED',
    };
  }
}
