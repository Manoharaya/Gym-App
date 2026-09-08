/**
 * Day 32 — Receptionist Member Identity Service
 * Resolves trusted member identity, enforces prospect/member boundary, and guards against IDOR/cross-tenant access.
 */

import { Injectable, Logger, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';

export interface VerifiedMemberIdentity {
  isMember: boolean;
  memberProfileId?: string;
  userId?: string;
  customerName?: string;
  email?: string;
  homeOutletId?: string;
  status?: string;
  isSuspended?: boolean;
}

@Injectable()
export class ReceptionistMemberIdentityService {
  private readonly logger = new Logger(ReceptionistMemberIdentityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves trusted member identity from authenticated user context.
   */
  async resolveMemberIdentity(
    organisationId: string,
    authenticatedUser?: any,
    conversationCustomerId?: string,
  ): Promise<VerifiedMemberIdentity> {
    let targetMemberId = authenticatedUser?.memberProfileId || conversationCustomerId;

    if (!targetMemberId && (authenticatedUser?.id || authenticatedUser?.sub)) {
      const uid = authenticatedUser.id || authenticatedUser.sub;
      const profile = await this.prisma.memberProfile.findFirst({
        where: { userId: uid, organisationId },
      });
      if (profile) {
        targetMemberId = profile.id;
      }
    }

    if (!targetMemberId) {
      return {
        isMember: false,
      };
    }

    const memberProfile = await this.prisma.memberProfile.findUnique({
      where: { id: targetMemberId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        memberOutlets: { include: { outlet: { select: { id: true, name: true } } } },
      },
    });

    if (!memberProfile) {
      this.logger.warn(`MemberProfile not found: ${targetMemberId}`);
      return { isMember: false };
    }

    // Strict Tenant Boundary Isolation
    if (memberProfile.organisationId !== organisationId) {
      this.logger.error(
        `Cross-tenant identity violation: member ${targetMemberId} (org ${memberProfile.organisationId}) requested in org ${organisationId}`,
      );
      throw new ForbiddenException('Cross-tenant identity access violation');
    }

    return {
      isMember: true,
      memberProfileId: memberProfile.id,
      userId: memberProfile.userId,
      customerName: `${memberProfile.user.firstName} ${memberProfile.user.lastName}`.trim(),
      email: memberProfile.user.email,
      homeOutletId: memberProfile.memberOutlets?.[0]?.outletId || undefined,
      status: memberProfile.status,
      isSuspended: memberProfile.status === 'SUSPENDED',
    };
  }

  /**
   * Asserts that the request originates from a verified member.
   * Throws UnauthorizedException with customer-friendly explanation if prospect or unauthenticated.
   */
  assertVerifiedMember(identity: VerifiedMemberIdentity): asserts identity is Required<VerifiedMemberIdentity> {
    if (!identity.isMember || !identity.memberProfileId) {
      throw new UnauthorizedException(
        'I can help you browse class schedules and facilities, but class bookings and reservations require an active FitCore member account. Please log in or speak with our front desk.',
      );
    }

    if (identity.isSuspended) {
      throw new ForbiddenException(
        'Your membership account is currently suspended. Please contact the front desk team to reactivate your booking privileges.',
      );
    }
  }
}
