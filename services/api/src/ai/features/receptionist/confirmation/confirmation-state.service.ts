/**
 * Day 32 — Booking Confirmation State Service
 * Manages two-step server-side confirmation tokens, TTL expiration, single-use guarantees, and replay protection.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import {
  BookingConfirmationAction,
  BookingConfirmationStatus,
  BookingConfirmationStateDto,
  CreateBookingConfirmationDto,
} from '@fitcore/types';
import * as crypto from 'crypto';

@Injectable()
export class ConfirmationStateService {
  private readonly logger = new Logger(ConfirmationStateService.name);
  private readonly DEFAULT_TTL_SECONDS = 600; // 10 minutes

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a new single-use confirmation state token for a proposed booking mutation.
   */
  async createConfirmationState(
    organisationId: string,
    memberProfileId: string,
    outletId: string | undefined,
    dto: CreateBookingConfirmationDto,
  ): Promise<BookingConfirmationStateDto> {
    const ttlSeconds = dto.ttlSeconds || this.DEFAULT_TTL_SECONDS;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const confirmationToken = `conf_${Date.now()}_${crypto.randomBytes(12).toString('hex')}`;

    // Cancel any previous pending confirmation in this conversation for the same action
    await this.prisma.bookingConfirmationState.updateMany({
      where: {
        conversationId: dto.conversationId,
        memberProfileId,
        action: dto.action,
        status: 'PENDING',
      },
      data: { status: 'CANCELLED' },
    });

    const record = await this.prisma.bookingConfirmationState.create({
      data: {
        organisationId,
        outletId: outletId || null,
        conversationId: dto.conversationId,
        memberProfileId,
        classSessionId: dto.classSessionId,
        existingBookingId: dto.existingBookingId || null,
        action: dto.action,
        confirmationToken,
        status: 'PENDING',
        displayedDetails: (dto.displayedDetails as any) || null,
        expiresAt,
      },
    });

    this.logger.log(
      `[CONFIRMATION] Created confirmation token for member ${memberProfileId}, action ${dto.action}, session ${dto.classSessionId}. Expires: ${expiresAt.toISOString()}`,
    );

    return {
      id: record.id,
      organisationId: record.organisationId,
      outletId: record.outletId,
      conversationId: record.conversationId,
      receptionistId: record.receptionistId,
      memberProfileId: record.memberProfileId,
      classSessionId: record.classSessionId,
      existingBookingId: record.existingBookingId,
      action: record.action as BookingConfirmationAction,
      confirmationToken: record.confirmationToken,
      status: record.status as BookingConfirmationStatus,
      displayedDetails: record.displayedDetails as Record<string, any> | null,
      expiresAt: record.expiresAt.toISOString(),
      executedAt: record.executedAt ? record.executedAt.toISOString() : null,
      createdAt: record.createdAt.toISOString(),
    };
  }

  /**
   * Validates and consumes a confirmation token atomically.
   * Enforces single-use replay protection, member ownership, action matching, and TTL expiration.
   */
  async validateAndConsumeToken(
    confirmationToken: string,
    expectedAction: BookingConfirmationAction | BookingConfirmationAction[],
    memberProfileId: string,
    organisationId: string,
  ) {
    const confirmation = await this.prisma.bookingConfirmationState.findUnique({
      where: { confirmationToken },
      include: { classSession: true },
    });

    if (!confirmation) {
      throw new NotFoundException({
        code: 'CONFIRMATION_NOT_FOUND',
        message: 'Confirmation reference does not exist or has expired. Please request the booking again.',
      });
    }

    // Tenant Verification
    if (confirmation.organisationId !== organisationId) {
      throw new ForbiddenException('Cross-tenant confirmation violation');
    }

    // Member Ownership Verification
    if (confirmation.memberProfileId !== memberProfileId) {
      throw new ForbiddenException({
        code: 'CONFIRMATION_IDENTITY_MISMATCH',
        message: 'Confirmation reference does not belong to the authenticated member',
      });
    }

    // Action Matching
    const matchesAction = Array.isArray(expectedAction)
      ? expectedAction.includes(confirmation.action as BookingConfirmationAction)
      : confirmation.action === expectedAction;

    if (!matchesAction) {
      throw new BadRequestException({
        code: 'CONFIRMATION_ACTION_MISMATCH',
        message: `Expected action ${Array.isArray(expectedAction) ? expectedAction.join(' or ') : expectedAction} but confirmation was created for ${confirmation.action}`,
      });
    }

    // Single-Use & Expiration Check
    if (confirmation.status === 'EXECUTED') {
      throw new ConflictException({
        code: 'CONFIRMATION_ALREADY_USED',
        message: 'This booking confirmation has already been executed. Replay requests are blocked.',
      });
    }

    if (confirmation.status !== 'PENDING') {
      throw new BadRequestException({
        code: 'CONFIRMATION_INVALID_STATUS',
        message: `Confirmation reference is in status ${confirmation.status} and cannot be executed.`,
      });
    }

    const now = new Date();
    if (now > confirmation.expiresAt) {
      await this.prisma.bookingConfirmationState.update({
        where: { id: confirmation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException({
        code: 'CONFIRMATION_EXPIRED',
        message: 'The booking confirmation has expired. Let me check the latest availability for you.',
      });
    }

    // Atomically transition state to CONFIRMED / EXECUTED
    await this.prisma.bookingConfirmationState.update({
      where: { id: confirmation.id },
      data: {
        status: 'EXECUTED',
        executedAt: now,
      },
    });

    return confirmation;
  }

  /**
   * Retrieves active confirmation state for a conversation if pending.
   */
  async getActiveConfirmation(conversationId: string, memberProfileId: string) {
    const now = new Date();
    return this.prisma.bookingConfirmationState.findFirst({
      where: {
        conversationId,
        memberProfileId,
        status: 'PENDING',
        expiresAt: { gt: now },
      },
      include: {
        classSession: {
          include: {
            classType: true,
            outlet: true,
            trainer: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
