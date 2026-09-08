/**
 * Day 32 — Receptionist Booking Eligibility Service
 * Bridges AI Receptionist requests to the canonical BookingEligibilityService,
 * evaluates membership access rules, and returns normalized customer-safe explanations.
 */

import { Injectable, Logger } from '@nestjs/common';
import { BookingEligibilityService as CanonicalEligibilityService } from '../../../../bookings/services/booking-eligibility.service';

export interface ReceptionistEligibilityAssessment {
  eligible: boolean;
  status:
    | 'ELIGIBLE'
    | 'NOT_ELIGIBLE'
    | 'REQUIRES_AUTHENTICATION'
    | 'REQUIRES_MEMBERSHIP'
    | 'OUTLET_NOT_AUTHORIZED'
    | 'SESSION_FULL'
    | 'BOOKING_WINDOW_CLOSED'
    | 'DUPLICATE_BOOKING'
    | 'OVERLAPPING_BOOKING'
    | 'BOOKING_LIMIT_REACHED'
    | 'UNKNOWN';
  customerExplanation: string;
}

@Injectable()
export class ReceptionistBookingEligibilityService {
  private readonly logger = new Logger(ReceptionistBookingEligibilityService.name);

  constructor(private readonly canonicalEligibility: CanonicalEligibilityService) {}

  /**
   * Evaluates eligibility for an authenticated member to book a specific class session.
   */
  async assessEligibility(
    memberProfileId?: string,
    classSessionId?: string,
    options?: { requestedAt?: Date; excludeBookingId?: string },
  ): Promise<ReceptionistEligibilityAssessment> {
    if (!memberProfileId) {
      return {
        eligible: false,
        status: 'REQUIRES_AUTHENTICATION',
        customerExplanation:
          'Booking a session requires an active FitCore member account. You can sign up online or at our front desk.',
      };
    }

    if (!classSessionId) {
      return {
        eligible: false,
        status: 'UNKNOWN',
        customerExplanation: 'Please select a specific class session to check booking eligibility.',
      };
    }

    try {
      const result = await this.canonicalEligibility.checkEligibility(
        memberProfileId,
        classSessionId,
        options,
      );

      if (result.eligible) {
        return {
          eligible: true,
          status: 'ELIGIBLE',
          customerExplanation: 'You are eligible to book this session with your current membership plan.',
        };
      }

      // Map canonical reasons to normalized receptionist explanations
      switch (result.reason) {
        case 'MEMBERSHIP_REQUIRED':
        case 'MEMBERSHIP_INACTIVE':
        case 'MEMBERSHIP_SUSPENDED':
          return {
            eligible: false,
            status: 'REQUIRES_MEMBERSHIP',
            customerExplanation:
              'An active membership plan is required to book this class. Please contact our front desk to review your membership.',
          };
        case 'OUTLET_NOT_AUTHORIZED':
          return {
            eligible: false,
            status: 'OUTLET_NOT_AUTHORIZED',
            customerExplanation:
              'Your current membership tier does not include access to this specific outlet location.',
          };
        case 'MEMBERSHIP_ENTITLEMENT_REQUIRED':
          return {
            eligible: false,
            status: 'NOT_ELIGIBLE',
            customerExplanation:
              'This specialized group class is not included in your current membership tier.',
          };
        case 'BOOKING_NOT_OPEN':
        case 'BOOKING_CLOSED':
          return {
            eligible: false,
            status: 'BOOKING_WINDOW_CLOSED',
            customerExplanation:
              'Bookings for this session are currently closed or have not yet opened for registration.',
          };
        case 'ALREADY_BOOKED':
          return {
            eligible: false,
            status: 'DUPLICATE_BOOKING',
            customerExplanation: 'You are already registered for this class session.',
          };
        case 'ALREADY_WAITLISTED':
          return {
            eligible: false,
            status: 'DUPLICATE_BOOKING',
            customerExplanation: 'You are already on the waitlist for this class session.',
          };
        case 'BOOKING_TIME_CONFLICT':
          return {
            eligible: false,
            status: 'OVERLAPPING_BOOKING',
            customerExplanation:
              'You have another class scheduled at this same time. Would you like to view other sessions?',
          };
        case 'BOOKING_LIMIT_REACHED':
          return {
            eligible: false,
            status: 'BOOKING_LIMIT_REACHED',
            customerExplanation:
              'You have reached the maximum active advance class bookings allowed by your membership.',
          };
        default:
          return {
            eligible: false,
            status: 'NOT_ELIGIBLE',
            customerExplanation:
              result.message || 'This class session is currently not available for booking.',
          };
      }
    } catch (err: any) {
      this.logger.error(`Eligibility evaluation error: ${err.message}`);
      return {
        eligible: false,
        status: 'UNKNOWN',
        customerExplanation:
          'We were unable to verify your booking eligibility at this time. Please try again or check with front desk.',
      };
    }
  }
}
