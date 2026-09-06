import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MembershipAccessService } from '../../memberships/membership-access.service';
import { BookingEligibilityResult, BookingDenialReason } from '@fitcore/types';

@Injectable()
export class BookingEligibilityService {
  private readonly logger = new Logger(BookingEligibilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly membershipAccessService: MembershipAccessService,
  ) {}

  /**
   * Authoritatively evaluates whether a member is eligible to book a specific class session.
   *
   * Core Architectural Invariants:
   * 1. MemberOutlet is NEVER used to infer eligibility.
   * 2. Eligibility is determined via Member -> Active MemberMembership -> MembershipPlan -> Entitlement (GROUP_CLASSES) -> MembershipAccessScope -> Outlet.
   * 3. Booking windows, active booking limits, and scheduling conflicts are verified.
   */
  async checkEligibility(
    memberProfileId: string,
    classSessionId: string,
    options?: {
      requestedAt?: Date;
      isStaffOverride?: boolean;
      isWaitlistPromotion?: boolean;
      excludeBookingId?: string;
    },
  ): Promise<BookingEligibilityResult> {
    const now = options?.requestedAt || new Date();

    // 1. Fetch Session with ClassType, BookingPolicy, and Outlet
    const session = await this.prisma.classSession.findUnique({
      where: { id: classSessionId },
      include: {
        classType: true,
        bookingPolicy: true,
        outlet: true,
      },
    });

    if (!session) {
      return {
        eligible: false,
        reason: 'CLASS_SESSION_NOT_FOUND',
        message: 'Class session does not exist',
      };
    }

    if (session.status === 'CANCELLED') {
      return {
        eligible: false,
        reason: 'CLASS_SESSION_CANCELLED',
        message: 'Class session has been cancelled',
      };
    }

    // 2. Fetch Member Profile
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberProfileId },
    });

    if (!member) {
      return {
        eligible: false,
        reason: 'BOOKING_NOT_ALLOWED',
        message: 'Member profile not found',
      };
    }

    // Validate Organisation Matching
    if (member.organisationId !== session.organisationId) {
      return {
        eligible: false,
        reason: 'ORGANISATION_MISMATCH',
        message: 'Member belongs to a different organisation',
      };
    }

    if (member.status === 'SUSPENDED') {
      return {
        eligible: false,
        reason: 'MEMBERSHIP_SUSPENDED',
        message: 'Member profile is currently suspended',
      };
    }

    if (member.status === 'INACTIVE' || member.status === 'ARCHIVED') {
      return {
        eligible: false,
        reason: 'MEMBERSHIP_INACTIVE',
        message: 'Member profile is inactive',
      };
    }

    // 3. Delegate Membership, Entitlement & Outlet Scope Evaluation to Membership Domain
    const entitlementKey = session.classType.membershipEntitlementKey || 'GROUP_CLASSES';
    const accessResult = await this.membershipAccessService.canAccessOutlet(
      memberProfileId,
      session.outletId,
      entitlementKey,
    );

    if (!accessResult.allowed) {
      let mappedReason: BookingDenialReason = 'MEMBERSHIP_REQUIRED';

      switch (accessResult.reason) {
        case 'NO_ACTIVE_MEMBERSHIP':
        case 'MEMBER_NOT_FOUND':
          mappedReason = 'MEMBERSHIP_REQUIRED';
          break;
        case 'MEMBERSHIP_EXPIRED':
          mappedReason = 'MEMBERSHIP_INACTIVE';
          break;
        case 'MEMBERSHIP_SUSPENDED':
          mappedReason = 'MEMBERSHIP_SUSPENDED';
          break;
        case 'OUTLET_NOT_INCLUDED':
        case 'OUTLET_NOT_IN_SCOPE':
          mappedReason = 'OUTLET_NOT_AUTHORIZED';
          break;
        case 'MISSING_ENTITLEMENT':
        case 'NO_GYM_ACCESS_ENTITLEMENT':
          mappedReason = 'MEMBERSHIP_ENTITLEMENT_REQUIRED';
          break;
        case 'ORGANISATION_MISMATCH':
          mappedReason = 'ORGANISATION_MISMATCH';
          break;
        default:
          mappedReason = 'BOOKING_NOT_ALLOWED';
      }

      return {
        eligible: false,
        reason: mappedReason,
        message: accessResult.details || `Membership access denied: ${accessResult.reason}`,
      };
    }

    // 4. Booking Windows Evaluation
    if (!options?.isStaffOverride) {
      if (session.bookingOpensAt && now < session.bookingOpensAt) {
        return {
          eligible: false,
          reason: 'BOOKING_NOT_OPEN',
          message: `Booking has not opened yet (opens at ${session.bookingOpensAt.toISOString()})`,
        };
      }

      if (session.bookingClosesAt && now > session.bookingClosesAt) {
        return {
          eligible: false,
          reason: 'BOOKING_CLOSED',
          message: `Booking has closed for this session (closed at ${session.bookingClosesAt.toISOString()})`,
        };
      }
    }

    // 5. Check Duplicate Booking for Same Session
    if (!options?.isWaitlistPromotion) {
      const existingBooking = await this.prisma.booking.findFirst({
        where: {
          memberProfileId,
          classSessionId,
          status: { in: ['CONFIRMED', 'WAITLISTED'] },
          ...(options?.excludeBookingId ? { id: { not: options.excludeBookingId } } : {}),
        },
      });

      if (existingBooking) {
        if (existingBooking.status === 'CONFIRMED') {
          return {
            eligible: false,
            reason: 'ALREADY_BOOKED',
            message: 'Member already has a confirmed booking for this session',
          };
        }
        if (existingBooking.status === 'WAITLISTED') {
          return {
            eligible: false,
            reason: 'ALREADY_WAITLISTED',
            message: 'Member is already on the waitlist for this session',
          };
        }
      }
    } else {
      // If evaluating for waitlist promotion, ensure candidate does not already have another CONFIRMED booking
      const confirmedBooking = await this.prisma.booking.findFirst({
        where: {
          memberProfileId,
          classSessionId,
          status: 'CONFIRMED',
          ...(options?.excludeBookingId ? { id: { not: options.excludeBookingId } } : {}),
        },
      });

      if (confirmedBooking) {
        return {
          eligible: false,
          reason: 'ALREADY_BOOKED',
          message: 'Member already has a confirmed booking for this session',
        };
      }
    }

    // 6. Check Active Future Bookings Limit (Policy Enforced)
    const policy =
      session.bookingPolicy ||
      (await this.prisma.bookingPolicy.findFirst({
        where: { organisationId: session.organisationId, isDefault: true },
      }));

    if (policy && policy.maxActiveBookings > 0 && !options?.isStaffOverride) {
      const activeFutureBookingsCount = await this.prisma.booking.count({
        where: {
          memberProfileId,
          organisationId: session.organisationId,
          status: 'CONFIRMED',
          classSession: {
            startsAt: { gte: now },
            status: { not: 'CANCELLED' },
          },
        },
      });

      if (activeFutureBookingsCount >= policy.maxActiveBookings) {
        return {
          eligible: false,
          reason: 'BOOKING_LIMIT_REACHED',
          message: `Booking limit reached: maximum ${policy.maxActiveBookings} active future bookings permitted`,
        };
      }
    }

    // 7. Check Member Time Conflicts (Overlapping Confirmed Classes)
    const overlappingBooking = await this.prisma.booking.findFirst({
      where: {
        memberProfileId,
        organisationId: session.organisationId,
        status: 'CONFIRMED',
        classSessionId: { not: classSessionId },
        classSession: {
          status: { not: 'CANCELLED' },
          startsAt: { lt: session.endsAt },
          endsAt: { gt: session.startsAt },
        },
      },
      include: {
        classSession: { select: { id: true, name: true, startsAt: true, endsAt: true } },
      },
    });

    if (overlappingBooking) {
      return {
        eligible: false,
        reason: 'BOOKING_TIME_CONFLICT',
        message: `Time conflict with existing booking for "${overlappingBooking.classSession.name}" (${overlappingBooking.classSession.startsAt.toISOString()} - ${overlappingBooking.classSession.endsAt.toISOString()})`,
      };
    }

    // Eligible!
    return {
      eligible: true,
      memberMembershipId: accessResult.membershipId,
      message: 'Member is eligible to book this class session',
    };
  }
}
