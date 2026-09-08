/**
 * Day 32 — Receptionist Booking Service
 * Main facade coordinating availability searches, member bookings, confirmation lifecycle,
 * transactional mutations (create, cancel, reschedule, waitlist), and dry-run simulations.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { BookingService } from '../../../../bookings/services/booking.service';
import { BookingSearchService } from './booking-search.service';
import { ReceptionistBookingEligibilityService } from './booking-eligibility.service';
import { ConfirmationStateService } from '../confirmation/confirmation-state.service';
import { BookingVerificationService } from './booking-verification.service';
import { ReceptionistMemberIdentityService } from '../identity/receptionist-member-identity.service';
import { AuditService } from '../../../../audit/audit.service';
import {
  ClassAvailabilityQueryDto,
  ClassAvailabilityResultDto,
  CreateBookingConfirmationDto,
  BookingConfirmationStateDto,
  ExecuteBookingConfirmationDto,
  ReceptionistBookingDryRunResultDto,
  ReceptionistBookingMetricsDto,
} from '@fitcore/types';
import { RECEPTIONIST_AUDIT_EVENTS } from '../receptionist.constants';

@Injectable()
export class ReceptionistBookingService {
  private readonly logger = new Logger(ReceptionistBookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingService: BookingService,
    private readonly searchService: BookingSearchService,
    private readonly eligibilityService: ReceptionistBookingEligibilityService,
    private readonly confirmationService: ConfirmationStateService,
    private readonly verificationService: BookingVerificationService,
    private readonly identityService: ReceptionistMemberIdentityService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * 1. Search availability across class sessions
   */
  async searchAvailability(
    organisationId: string,
    query: ClassAvailabilityQueryDto,
    memberProfileId?: string,
  ): Promise<ClassAvailabilityResultDto> {
    const result = await this.searchService.searchAvailability(
      organisationId,
      query,
      memberProfileId,
    );

    // If memberProfileId provided, attach eligibility status to candidate sessions
    if (memberProfileId) {
      result.sessions = await Promise.all(
        result.sessions.map(async (session) => {
          const eligibility = await this.eligibilityService.assessEligibility(
            memberProfileId,
            session.sessionId,
          );
          return {
            ...session,
            eligibility: {
              eligible: eligibility.eligible,
              reason: eligibility.status,
              message: eligibility.customerExplanation,
            },
          };
        }),
      );
    }

    return result;
  }

  /**
   * 2. View upcoming & past bookings for an authenticated member
   */
  async getMemberBookings(
    organisationId: string,
    memberProfileId: string,
    options?: { upcomingOnly?: boolean },
  ) {
    const bookings = await this.bookingService.listMemberBookings(memberProfileId, {
      upcomingOnly: options?.upcomingOnly,
    });

    // Ensure organisation scope
    const scopedBookings = bookings.filter((b) => b.organisationId === organisationId);

    return scopedBookings.map((b) => ({
      id: b.id,
      status: b.status,
      bookedAt: b.bookedAt.toISOString(),
      cancelledAt: b.cancelledAt ? b.cancelledAt.toISOString() : null,
      cancellationReason: b.cancellationReason,
      waitlistPosition: b.waitlistPosition,
      classSession: {
        id: b.classSession.id,
        name: b.classSession.name,
        startsAt: b.classSession.startsAt.toISOString(),
        endsAt: b.classSession.endsAt.toISOString(),
        outlet: b.classSession.outlet,
        trainer: b.classSession.trainer,
        classType: b.classSession.classType,
      },
    }));
  }

  /**
   * 3. Get single booking details with cancellation policy evaluation
   */
  async getBookingDetails(organisationId: string, bookingId: string, memberProfileId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        classSession: {
          include: {
            classType: true,
            outlet: true,
            trainer: { select: { id: true, firstName: true, lastName: true, email: true } },
            bookingPolicy: true,
          },
        },
      },
    });

    if (!booking || booking.organisationId !== organisationId) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: 'Booking record not found',
      });
    }

    // Member ownership verification
    if (booking.memberProfileId !== memberProfileId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Cannot view details for another member booking',
      });
    }

    const now = new Date();
    const cancellationClosesAt = booking.classSession.cancellationClosesAt;
    const canCancel =
      booking.status === 'CONFIRMED' && (!cancellationClosesAt || now <= cancellationClosesAt);

    return {
      booking: {
        id: booking.id,
        status: booking.status,
        bookedAt: booking.bookedAt.toISOString(),
        cancelledAt: booking.cancelledAt?.toISOString(),
        cancellationReason: booking.cancellationReason,
        waitlistPosition: booking.waitlistPosition,
      },
      classSession: {
        id: booking.classSession.id,
        name: booking.classSession.name,
        startsAt: booking.classSession.startsAt.toISOString(),
        endsAt: booking.classSession.endsAt.toISOString(),
        outlet: booking.classSession.outlet,
        trainer: booking.classSession.trainer,
        classType: booking.classSession.classType,
      },
      cancellationPolicy: {
        canCancel,
        cancellationDeadline: cancellationClosesAt?.toISOString(),
        policyWindowHours:
          booking.classSession.bookingPolicy?.minimumCancellationNoticeHours ??
          booking.classSession.bookingPolicy?.lateCancellationWindowHours ??
          2,
        requiresStaffAssistance: !canCancel && booking.status === 'CONFIRMED',
      },
    };
  }

  /**
   * 4. Generate two-step confirmation state
   */
  async createBookingConfirmation(
    organisationId: string,
    memberProfileId: string,
    outletId: string | undefined,
    dto: CreateBookingConfirmationDto,
  ): Promise<BookingConfirmationStateDto> {
    return this.confirmationService.createConfirmationState(
      organisationId,
      memberProfileId,
      outletId,
      dto,
    );
  }

  /**
   * 5. Execute confirmed class booking
   */
  async executeConfirmedBooking(
    organisationId: string,
    memberProfileId: string,
    dto: ExecuteBookingConfirmationDto,
  ) {
    // A. Validate & consume confirmation token atomically
    const confirmation = await this.confirmationService.validateAndConsumeToken(
      dto.confirmationToken,
      ['CREATE_BOOKING', 'JOIN_WAITLIST'],
      memberProfileId,
      organisationId,
    );

    const classSessionId = confirmation.classSessionId;

    // B. Re-check capacity & session status in real-time (race condition defense)
    const session = await this.prisma.classSession.findUnique({
      where: { id: classSessionId },
      include: { bookingPolicy: true, classType: true, outlet: true },
    });

    if (!session || session.status === 'CANCELLED') {
      throw new BadRequestException({
        code: 'SESSION_UNAVAILABLE',
        message: 'This class session is no longer available for booking.',
      });
    }

    // C. Authoritatively create booking via canonical BookingService
    const createdBooking = await this.bookingService.bookSession(
      organisationId,
      memberProfileId,
      classSessionId,
      {
        idempotencyKey: dto.idempotencyKey,
        notes: dto.notes,
      },
    );

    // D. Post-execution verification
    const verified = await this.verificationService.verifyBookingCreated({
      bookingId: createdBooking.id,
      organisationId,
      memberProfileId,
      classSessionId,
    });

    // E. Telemetry & Audit Event
    await this.auditService.log({
      organisationId,
      outletId: session.outletId,
      action: RECEPTIONIST_AUDIT_EVENTS.RECEPTIONIST_BOOKING_CREATED,
      resource: 'RECEPTIONIST_BOOKING',
      resourceId: verified.id,
      metadata: {
        bookingId: verified.id,
        sessionId: classSessionId,
        memberProfileId,
        confirmationToken: dto.confirmationToken,
        status: verified.status,
      },
    });

    // Record interaction
    await this.prisma.receptionistBookingInteraction.create({
      data: {
        organisationId,
        outletId: session.outletId,
        conversationId: confirmation.conversationId,
        memberProfileId,
        action: 'BOOKING_CREATED',
        classSessionId,
        bookingId: verified.id,
        confirmationId: confirmation.id,
        status: 'SUCCESS',
        metadata: { status: verified.status },
      },
    });

    return {
      bookingId: verified.id,
      status: verified.status,
      className: verified.classSession.name,
      startsAt: verified.classSession.startsAt.toISOString(),
      endsAt: verified.classSession.endsAt.toISOString(),
      outletName: verified.classSession.outlet.name,
      trainerName: verified.classSession.trainer
        ? `${verified.classSession.trainer.firstName} ${verified.classSession.trainer.lastName}`.trim()
        : null,
      isWaitlisted: verified.status === 'WAITLISTED',
      waitlistPosition: verified.waitlistPosition,
    };
  }

  /**
   * 6. Execute confirmed cancellation
   */
  async executeConfirmedCancellation(
    organisationId: string,
    memberProfileId: string,
    confirmationToken: string,
    reason?: string,
  ) {
    const confirmation = await this.confirmationService.validateAndConsumeToken(
      confirmationToken,
      'CANCEL_BOOKING',
      memberProfileId,
      organisationId,
    );

    if (!confirmation.existingBookingId) {
      throw new BadRequestException('Confirmation missing existing booking identifier');
    }

    const cancelledBooking = await this.bookingService.cancelBooking(
      confirmation.existingBookingId,
      memberProfileId,
      { reason: reason || 'Cancelled via AI Receptionist' },
    );

    // Verify cancellation
    await this.verificationService.verifyBookingCancelled(cancelledBooking.id, memberProfileId);

    // Record audit event
    await this.auditService.log({
      organisationId,
      outletId: confirmation.outletId || undefined,
      action: RECEPTIONIST_AUDIT_EVENTS.RECEPTIONIST_BOOKING_CANCELLED,
      resource: 'RECEPTIONIST_BOOKING',
      resourceId: cancelledBooking.id,
      metadata: {
        bookingId: cancelledBooking.id,
        memberProfileId,
        confirmationToken,
      },
    });

    return {
      bookingId: cancelledBooking.id,
      status: 'CANCELLED',
      message: 'Your booking has been successfully cancelled.',
    };
  }

  /**
   * 7. Execute confirmed atomic rescheduling
   * Checks destination eligibility and capacity before cancelling the existing booking.
   */
  async executeConfirmedReschedule(
    organisationId: string,
    memberProfileId: string,
    confirmationToken: string,
  ) {
    const confirmation = await this.confirmationService.validateAndConsumeToken(
      confirmationToken,
      'RESCHEDULE_BOOKING',
      memberProfileId,
      organisationId,
    );

    const oldBookingId = confirmation.existingBookingId;
    const targetSessionId = confirmation.classSessionId;

    if (!oldBookingId) {
      throw new BadRequestException('Confirmation missing existing booking ID for reschedule');
    }

    // A. Verify Old Booking Ownership & Status
    const oldBooking = await this.prisma.booking.findUnique({
      where: { id: oldBookingId },
      include: { classSession: true },
    });

    if (!oldBooking || oldBooking.memberProfileId !== memberProfileId) {
      throw new ForbiddenException('Cannot reschedule another member booking');
    }

    // B. Check Destination Eligibility & Capacity FIRST (preserve original booking on failure)
    const destinationEligibility = await this.eligibilityService.assessEligibility(
      memberProfileId,
      targetSessionId,
      { excludeBookingId: oldBookingId },
    );

    if (!destinationEligibility.eligible) {
      throw new ConflictException({
        code: 'RESCHEDULE_TARGET_NOT_ELIGIBLE',
        message: destinationEligibility.customerExplanation,
      });
    }

    // C. Perform Atomic Rescheduling
    const { newBooking } = await this.prisma.$transaction(async (tx) => {
      // 1. Cancel old booking
      await tx.booking.update({
        where: { id: oldBookingId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: 'Rescheduled to new session via AI Receptionist',
        },
      });

      // 2. Count confirmed spots in target session
      const targetConfirmed = await tx.booking.count({
        where: { classSessionId: targetSessionId, status: 'CONFIRMED' },
      });

      const targetSession = await tx.classSession.findUnique({
        where: { id: targetSessionId },
      });

      if (!targetSession || targetConfirmed >= targetSession.capacity) {
        throw new ConflictException({
          code: 'TARGET_SESSION_FULL',
          message: 'The requested reschedule session has filled up. Your original booking has been preserved.',
        });
      }

      // 3. Create new booking
      const created = await tx.booking.create({
        data: {
          organisationId,
          outletId: targetSession.outletId,
          memberProfileId,
          classSessionId: targetSessionId,
          status: 'CONFIRMED',
          metadata: { rescheduledFromBookingId: oldBookingId },
        },
        include: {
          classSession: {
            include: { classType: true, outlet: true, trainer: true },
          },
        },
      });

      return { newBooking: created };
    });

    // D. Verify new booking
    await this.verificationService.verifyBookingCreated({
      bookingId: newBooking.id,
      organisationId,
      memberProfileId,
      classSessionId: targetSessionId,
    });

    return {
      oldBookingId,
      newBookingId: newBooking.id,
      status: 'CONFIRMED',
      className: newBooking.classSession.name,
      startsAt: newBooking.classSession.startsAt.toISOString(),
      outletName: newBooking.classSession.outlet.name,
    };
  }

  /**
   * 8. Dry-run simulation mode (zero production side-effects)
   */
  async runDryRun(
    organisationId: string,
    memberProfileId: string | undefined,
    classSessionId: string,
  ): Promise<ReceptionistBookingDryRunResultDto> {
    const session = await this.prisma.classSession.findUnique({
      where: { id: classSessionId },
      include: { classType: true, outlet: true, trainer: true, bookingPolicy: true },
    });

    if (!session || session.organisationId !== organisationId) {
      throw new NotFoundException('Class session not found');
    }

    const confirmedCount = await this.prisma.booking.count({
      where: { classSessionId, status: 'CONFIRMED' },
    });

    const spotsRemaining = Math.max(0, session.capacity - confirmedCount);
    const allowWaitlist = session.bookingPolicy?.allowWaitlist ?? true;

    let availabilityStatus: any = 'AVAILABLE';
    if (session.status === 'CANCELLED') availabilityStatus = 'CANCELLED';
    else if (spotsRemaining === 0) availabilityStatus = allowWaitlist ? 'WAITLIST_AVAILABLE' : 'FULL';
    else if (spotsRemaining <= 3) availabilityStatus = 'LIMITED';

    const identityStatus = memberProfileId ? 'VERIFIED' : 'PROSPECT_ONLY';

    let eligibilityStatus: any = 'REQUIRES_AUTH';
    const reasons: string[] = [];

    if (memberProfileId) {
      const eligibility = await this.eligibilityService.assessEligibility(
        memberProfileId,
        classSessionId,
      );
      eligibilityStatus = eligibility.eligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE';
      reasons.push(eligibility.customerExplanation);
    } else {
      reasons.push('Unauthenticated prospect: booking mutations require member sign-up.');
    }

    return {
      identityStatus,
      availabilityStatus,
      eligibilityStatus,
      confirmationRequired: true,
      proposedAction: spotsRemaining > 0 ? 'CREATE_BOOKING' : 'JOIN_WAITLIST',
      productionSideEffect: 'NONE',
      reasons,
      sessionSnapshot: {
        sessionId: session.id,
        className: session.name || undefined,
        outletName: session.outlet.name,
        startsAt: session.startsAt.toISOString(),
        capacity: session.capacity,
        spotsRemaining,
      },
    };
  }

  /**
   * 9. Booking telemetry & funnel metrics for admin console
   */
  async getBookingMetrics(
    organisationId: string,
    outletId?: string,
  ): Promise<ReceptionistBookingMetricsDto> {
    const whereOrgOutlet = {
      organisationId,
      ...(outletId ? { outletId } : {}),
    };

    const [conversationsCount, confirmationsCount, interactions] = await Promise.all([
      this.prisma.receptionistConversation.count({ where: whereOrgOutlet }),
      this.prisma.bookingConfirmationState.count({ where: whereOrgOutlet }),
      this.prisma.receptionistBookingInteraction.findMany({
        where: whereOrgOutlet,
        select: { action: true, status: true },
      }),
    ]);

    let availabilitySearches = 0;
    let confirmedBookings = 0;
    let cancellations = 0;
    let reschedules = 0;
    let waitlistJoins = 0;
    let bookingFailures = 0;

    for (const item of interactions) {
      if (item.action === 'AVAILABILITY_SEARCH') availabilitySearches++;
      else if (item.action === 'BOOKING_CREATED') {
        if (item.status === 'SUCCESS') confirmedBookings++;
        else bookingFailures++;
      } else if (item.action === 'BOOKING_CANCELLED') cancellations++;
      else if (item.action === 'BOOKING_RESCHEDULED') reschedules++;
      else if (item.action === 'WAITLIST_JOINED') waitlistJoins++;
      else if (item.status === 'FAILED') bookingFailures++;
    }

    const bookingAttempts = confirmedBookings + bookingFailures;

    return {
      availabilitySearches,
      bookingAttempts,
      confirmedBookings,
      cancellations,
      reschedules,
      waitlistJoins,
      bookingFailures,
      conversionFunnel: {
        conversations: conversationsCount,
        searches: availabilitySearches,
        confirmations: confirmationsCount,
        completedBookings: confirmedBookings,
      },
    };
  }
}
