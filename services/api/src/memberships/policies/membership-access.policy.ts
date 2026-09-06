import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export type AccessReasonCode =
  | 'ACTIVE_MEMBERSHIP'
  | 'NO_ACTIVE_MEMBERSHIP'
  | 'OUTLET_NOT_INCLUDED'
  | 'OUTLET_NOT_IN_SCOPE'
  | 'NO_GYM_ACCESS_ENTITLEMENT'
  | 'MISSING_ENTITLEMENT'
  | 'MEMBERSHIP_EXPIRED'
  | 'MEMBERSHIP_SUSPENDED'
  | 'MEMBERSHIP_CANCELLED'
  | 'MEMBERSHIP_PAUSED'
  | 'MEMBERSHIP_PENDING'
  | 'ORGANISATION_MISMATCH'
  | 'MEMBER_NOT_FOUND'
  | 'OUTLET_NOT_FOUND';

export interface AccessDecisionResult {
  allowed: boolean;
  reason: AccessReasonCode;
  membershipId?: string;
  accessScope?: string;
  details?: string;
}

@Injectable()
export class MembershipAccessPolicy {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Authoritatively determines whether a member can access a specific facility outlet
   * for a requested entitlement (default: GYM_ACCESS).
   *
   * Separation of concerns:
   * - MemberProfile & MemberOutlet define relationship and history.
   * - MemberMembership and its accessScope/entitlements determine access.
   */
  async canAccessOutlet(
    memberProfileId: string,
    outletId: string,
    entitlementType: string = 'GYM_ACCESS'
  ): Promise<AccessDecisionResult> {
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberProfileId },
      include: {
        memberships: {
          include: {
            membershipPlan: {
              include: {
                entitlements: true,
              },
            },
            accessOutlets: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!member) {
      return {
        allowed: false,
        reason: 'MEMBER_NOT_FOUND',
        details: 'Member profile not found',
      };
    }

    if (member.status === 'SUSPENDED') {
      return {
        allowed: false,
        reason: 'MEMBERSHIP_SUSPENDED',
        details: 'Member account is currently suspended',
      };
    }

    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { id: true, organisationId: true, status: true },
    });

    if (!outlet || outlet.status !== 'ACTIVE') {
      return {
        allowed: false,
        reason: 'OUTLET_NOT_FOUND',
        details: 'Requested facility outlet is not active or does not exist',
      };
    }

    const now = new Date();
    const memberships = member.memberships;

    // Check cross-organisation boundary
    const orgMemberships = memberships.filter((m) => m.organisationId === outlet.organisationId);
    if (orgMemberships.length === 0) {
      return {
        allowed: false,
        reason: 'ORGANISATION_MISMATCH',
        details: 'Member does not have any membership in the requested outlet organisation',
      };
    }

    // Filter active or trial memberships within valid date range
    const activeMemberships = orgMemberships.filter((m) => {
      const isActiveStatus = m.status === 'ACTIVE' || m.status === 'TRIAL';
      const isDateValid = m.startDate <= now && m.endDate >= now;
      return isActiveStatus && isDateValid;
    });

    if (activeMemberships.length === 0) {
      // Find descriptive rejection reason from existing records in this organisation
      const paused = orgMemberships.find((m) => m.status === 'PAUSED');
      if (paused) {
        return {
          allowed: false,
          reason: 'MEMBERSHIP_PAUSED',
          membershipId: paused.id,
          details: 'Membership is currently paused',
        };
      }

      const suspended = orgMemberships.find((m) => m.status === 'SUSPENDED');
      if (suspended) {
        return {
          allowed: false,
          reason: 'MEMBERSHIP_SUSPENDED',
          membershipId: suspended.id,
          details: 'Membership is currently suspended',
        };
      }

      const cancelled = orgMemberships.find((m) => m.status === 'CANCELLED');
      if (cancelled) {
        return {
          allowed: false,
          reason: 'MEMBERSHIP_CANCELLED',
          membershipId: cancelled.id,
          details: 'Membership has been cancelled',
        };
      }

      const pending = orgMemberships.find((m) => m.status === 'PENDING');
      if (pending) {
        return {
          allowed: false,
          reason: 'MEMBERSHIP_PENDING',
          membershipId: pending.id,
          details: 'Membership is pending activation',
        };
      }

      const expired = orgMemberships.find((m) => m.status === 'EXPIRED' || m.endDate < now);
      if (expired) {
        return {
          allowed: false,
          reason: 'MEMBERSHIP_EXPIRED',
          membershipId: expired.id,
          details: 'Membership has expired',
        };
      }

      return {
        allowed: false,
        reason: 'NO_ACTIVE_MEMBERSHIP',
        details: 'No active membership found for member in this organization',
      };
    }

    // Evaluate active memberships for entitlement and outlet scope
    let missingEntitlement = false;

    for (const membership of activeMemberships) {
      // 1. Verify required entitlement exists on plan
      const hasEntitlement = membership.membershipPlan.entitlements.some(
        (e) => e.type.toUpperCase() === entitlementType.toUpperCase()
      );

      if (!hasEntitlement) {
        missingEntitlement = true;
        continue;
      }

      // 2. Verify outlet access scope
      if (membership.accessScope === 'ALL_ORGANISATION_OUTLETS') {
        return {
          allowed: true,
          reason: 'ACTIVE_MEMBERSHIP',
          membershipId: membership.id,
          accessScope: membership.accessScope,
          details: 'Access granted under all-organisation plan',
        };
      }

      if (
        membership.accessScope === 'SINGLE_OUTLET' ||
        membership.accessScope === 'MULTI_OUTLET'
      ) {
        const isOutletGranted = membership.accessOutlets.some(
          (mo) => mo.outletId === outletId
        );

        if (isOutletGranted) {
          return {
            allowed: true,
            reason: 'ACTIVE_MEMBERSHIP',
            membershipId: membership.id,
            accessScope: membership.accessScope,
            details: 'Access granted under facility-specific membership',
          };
        }
      }
    }

    if (missingEntitlement) {
      return {
        allowed: false,
        reason: 'NO_GYM_ACCESS_ENTITLEMENT',
        details: `Active membership does not include entitlement: ${entitlementType}`,
      };
    }

    return {
      allowed: false,
      reason: 'OUTLET_NOT_INCLUDED',
      details: 'Active membership does not grant access to this specific facility outlet',
    };
  }
}
