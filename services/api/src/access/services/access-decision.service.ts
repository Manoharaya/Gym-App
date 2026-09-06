import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AccessPolicyService } from './access-policy.service';
import { AccessCredentialService } from './access-credential.service';
import { AccessOverrideService } from './access-override.service';
import { AccessDecisionResult, AccessDecisionReason } from '@fitcore/types';

export interface CanAccessParams {
  memberProfileId?: string;
  credentialReference?: string;
  outletId: string;
  credentialId?: string;
  accessPointId?: string;
  deviceId?: string;
  requestedAt?: Date;
}

@Injectable()
export class AccessDecisionService {
  private readonly logger = new Logger(AccessDecisionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly policyService: AccessPolicyService,
    private readonly credentialService: AccessCredentialService,
    private readonly overrideService: AccessOverrideService
  ) {}

  /**
   * The single authoritative decision engine for all physical access control.
   *
   * INVARIANTS ENFORCED:
   * - INVARIANT 1: Physical access must never be inferred solely from MemberOutlet.
   * - INVARIANT 2: Active membership is required unless a valid explicit access override exists.
   * - INVARIANT 3: Membership access scope determines outlet authorization.
   * - INVARIANT 4: Access decisions are centralised in AccessDecisionService.
   * - INVARIANT 5: Payment success alone does not grant physical access.
   * - INVARIANT 9: Cross-organisation access is always denied.
   * - INVARIANT 10: Unknown authorization state defaults to DENY.
   */
  async canAccess(params: CanAccessParams): Promise<AccessDecisionResult> {
    const timestamp = params.requestedAt || new Date();
    const { outletId, accessPointId, deviceId } = params;

    try {
      // 1. OUTLET VALIDATION
      const outlet = await this.prisma.outlet.findUnique({
        where: { id: outletId },
        select: { id: true, organisationId: true, status: true, timezone: true },
      });

      if (!outlet || outlet.status !== 'ACTIVE') {
        return this.deny('OUTLET_NOT_FOUND', {
          outletId,
          timestamp,
          details: 'Facility outlet is inactive or does not exist',
        });
      }

      // 2. HARDWARE DEVICE & ACCESS POINT VALIDATION
      if (deviceId) {
        const device = await this.prisma.accessDevice.findUnique({
          where: { id: deviceId },
        });

        if (!device || device.organisationId !== outlet.organisationId || device.outletId !== outletId) {
          return this.deny('ORGANISATION_MISMATCH', {
            outletId,
            deviceId,
            timestamp,
            details: 'Device does not match target outlet or organisation',
          });
        }

        if (device.status === 'DISABLED') {
          return this.deny('DEVICE_DISABLED', {
            outletId,
            deviceId,
            timestamp,
            details: 'Access device is currently disabled',
          });
        }

        if (device.status === 'OFFLINE') {
          return this.deny('DEVICE_OFFLINE', {
            outletId,
            deviceId,
            timestamp,
            details: 'Access device is currently offline',
          });
        }
      }

      if (accessPointId) {
        const point = await this.prisma.accessPoint.findUnique({
          where: { id: accessPointId },
        });
        if (!point || point.outletId !== outletId || point.status === 'DISABLED') {
          return this.deny('ACCESS_POINT_DISABLED', {
            outletId,
            accessPointId,
            timestamp,
            details: 'Access point is disabled or does not belong to this outlet',
          });
        }
      }

      // 3. RESOLVE CREDENTIAL & MEMBER
      let resolvedMemberProfileId = params.memberProfileId;
      let resolvedCredentialId = params.credentialId;

      if (params.credentialReference) {
        const resolved = await this.credentialService.resolveCredential(
          outlet.organisationId,
          params.credentialReference
        );

        if (!resolved.valid || !resolved.credential || !resolved.memberProfile) {
          return this.deny(resolved.reason as AccessDecisionReason, {
            outletId,
            timestamp,
            credentialId: resolved.credential?.id,
            details: 'Credential lookup failed or credential is not active',
          });
        }

        resolvedMemberProfileId = resolved.memberProfile.id;
        resolvedCredentialId = resolved.credential.id;
      }

      if (!resolvedMemberProfileId) {
        return this.deny('MEMBER_NOT_FOUND', {
          outletId,
          timestamp,
          details: 'No member identity or credential provided',
        });
      }

      // Query Member Profile with memberships
      const member = await this.prisma.memberProfile.findUnique({
        where: { id: resolvedMemberProfileId },
        include: {
          memberships: {
            include: {
              membershipPlan: {
                include: { entitlements: true },
              },
              accessOutlets: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!member) {
        return this.deny('MEMBER_NOT_FOUND', {
          outletId,
          memberProfileId: resolvedMemberProfileId,
          timestamp,
          details: 'Member profile does not exist',
        });
      }

      // Validate member belongs to organisation
      if (member.organisationId !== outlet.organisationId) {
        return this.deny('ORGANISATION_MISMATCH', {
          outletId,
          memberProfileId: resolvedMemberProfileId,
          timestamp,
          details: 'Member belongs to a different organisation',
        });
      }


      // Check explicit credential if specified by ID
      if (resolvedCredentialId) {
        const cred = await this.prisma.accessCredential.findFirst({
          where: { id: resolvedCredentialId, memberProfileId: member.id },
        });
        if (!cred) {
          return this.deny('CREDENTIAL_NOT_FOUND', {
            outletId,
            memberProfileId: member.id,
            credentialId: resolvedCredentialId,
            timestamp,
          });
        }
        if (cred.status === 'REVOKED') {
          return this.deny('CREDENTIAL_REVOKED', {
            outletId,
            memberProfileId: member.id,
            credentialId: cred.id,
            timestamp,
            details: 'Access credential has been permanently revoked',
          });
        }
        if (cred.status === 'SUSPENDED') {
          return this.deny('CREDENTIAL_SUSPENDED', {
            outletId,
            memberProfileId: member.id,
            credentialId: cred.id,
            timestamp,
          });
        }
        if (cred.status === 'EXPIRED' || (cred.expiresAt && cred.expiresAt < timestamp)) {
          return this.deny('CREDENTIAL_EXPIRED', {
            outletId,
            memberProfileId: member.id,
            credentialId: cred.id,
            timestamp,
          });
        }
      }

      // 4. CHECK STAFF ACCESS OVERRIDE (Section 25 & 26)
      // Staff override allows entry even if member is suspended, pending, or outside normal hours
      const activeOverride = await this.overrideService.getActiveOverride(
        outlet.organisationId,
        outletId,
        member.id,
        timestamp
      );

      if (activeOverride) {
        this.logger.log(
          `[ACCESS DECISION] Entry granted via staff override (${activeOverride.reason}) for member ${member.id} at outlet ${outletId}`
        );
        return {
          allowed: true,
          reason: 'ALLOWED_BY_OVERRIDE',
          memberProfileId: member.id,
          outletId,
          credentialId: resolvedCredentialId,
          accessPointId,
          deviceId,
          timestamp: timestamp.toISOString(),
          allowedByOverride: true,
          details: `Granted by staff override: ${activeOverride.reason}`,
        };
      }

      // 5. CHECK MEMBER STATUS (if no active override)
      if (member.status === 'SUSPENDED') {
        return this.deny('MEMBERSHIP_SUSPENDED', {
          outletId,
          memberProfileId: member.id,
          timestamp,
          details: 'Member account is suspended',
        });
      }

      if (member.status === 'INACTIVE' || member.status === 'ARCHIVED') {
        return this.deny('MEMBER_INACTIVE', {
          outletId,
          memberProfileId: member.id,
          timestamp,
          details: 'Member profile is inactive',
        });
      }

      // 6. MEMBERSHIP AUTHORITY & OUTLET SCOPE EVALUATION (Day 5 Ownership Model)
      const orgMemberships = member.memberships.filter(
        (m) => m.organisationId === outlet.organisationId
      );

      if (orgMemberships.length === 0) {
        return this.deny('ORGANISATION_MISMATCH', {
          outletId,
          memberProfileId: member.id,
          timestamp,
          details: 'No membership in this organisation',
        });
      }

      // Active / Trial memberships valid on requestedAt date
      const activeMemberships = orgMemberships.filter((m) => {
        const isActive = m.status === 'ACTIVE' || m.status === 'TRIAL';
        const isDateValid = m.startDate <= timestamp && m.endDate >= timestamp;
        return isActive && isDateValid;
      });

      if (activeMemberships.length === 0) {
        // Return exact descriptive denial reason
        const pending = orgMemberships.find((m) => m.status === 'PENDING');
        if (pending) {
          return this.deny('MEMBERSHIP_PENDING', {
            outletId,
            memberProfileId: member.id,
            membershipId: pending.id,
            timestamp,
            details: 'Membership is pending activation (e.g. initial onboarding or awaiting start date)',
          });
        }

        const expired = orgMemberships.find(
          (m) => m.status === 'EXPIRED' || m.endDate < timestamp
        );
        if (expired) {
          return this.deny('MEMBERSHIP_EXPIRED', {
            outletId,
            memberProfileId: member.id,
            membershipId: expired.id,
            timestamp,
            details: 'Membership has expired',
          });
        }

        const suspended = orgMemberships.find((m) => m.status === 'SUSPENDED');
        if (suspended) {
          return this.deny('MEMBERSHIP_SUSPENDED', {
            outletId,
            memberProfileId: member.id,
            membershipId: suspended.id,
            timestamp,
            details: 'Membership is suspended',
          });
        }

        const paused = orgMemberships.find((m) => m.status === 'PAUSED');
        if (paused) {
          return this.deny('MEMBERSHIP_PAUSED', {
            outletId,
            memberProfileId: member.id,
            membershipId: paused.id,
            timestamp,
            details: 'Membership is paused',
          });
        }

        const cancelled = orgMemberships.find((m) => m.status === 'CANCELLED');
        if (cancelled) {
          return this.deny('MEMBERSHIP_CANCELLED', {
            outletId,
            memberProfileId: member.id,
            membershipId: cancelled.id,
            timestamp,
            details: 'Membership was cancelled',
          });
        }

        return this.deny('NO_ACTIVE_MEMBERSHIP', {
          outletId,
          memberProfileId: member.id,
          timestamp,
          details: 'No active membership found for member in this organization',
        });
      }

      // Check outlet authorization across active memberships
      // INVARIANT 1: Physical access is NEVER inferred from MemberOutlet!
      let matchedMembership: (typeof activeMemberships)[0] | null = null;

      for (const membership of activeMemberships) {
        // Case E: ALL_ORGANISATION_OUTLETS -> Granted for all active outlets in organisation
        if (membership.accessScope === 'ALL_ORGANISATION_OUTLETS') {
          matchedMembership = membership;
          break;
        }

        // Case A, B, C: SINGLE_OUTLET or MULTI_OUTLET -> Must exist in MemberMembershipOutlet
        if (
          membership.accessScope === 'SINGLE_OUTLET' ||
          membership.accessScope === 'MULTI_OUTLET'
        ) {
          const isAuthorized = membership.accessOutlets.some(
            (mo) => mo.outletId === outletId
          );

          if (isAuthorized) {
            matchedMembership = membership;
            break;
          }
        }
      }

      // If no active membership authoritatively authorizes this outlet:
      if (!matchedMembership) {
        return this.deny('OUTLET_NOT_AUTHORIZED', {
          outletId,
          memberProfileId: member.id,
          membershipId: activeMemberships[0].id,
          timestamp,
          details: 'Active membership does not include physical access to this facility outlet',
        });
      }

      // 7. TIME-BASED ACCESS POLICY CHECK (Section 11 & 39)
      // Evaluated only after membership authorization is established
      const policy = await this.policyService.getEffectivePolicy(outlet.organisationId, outletId);
      const isWithinHours = this.policyService.isWithinAllowedHours(
        policy,
        timestamp,
        outlet.timezone
      );

      if (!isWithinHours) {
        return this.deny('OUTSIDE_ALLOWED_HOURS', {
          outletId,
          memberProfileId: member.id,
          membershipId: matchedMembership.id,
          timestamp,
          details: `Requested access at ${timestamp.toISOString()} is outside outlet allowed hours (${policy?.allowedStartTime} - ${policy?.allowedEndTime})`,
        });
      }

      // ALL CONDITIONS MET: ALLOW ACCESS
      return {
        allowed: true,
        reason: 'ALLOWED',
        memberProfileId: member.id,
        outletId,
        membershipId: matchedMembership.id,
        credentialId: resolvedCredentialId,
        accessPointId,
        deviceId,
        timestamp: timestamp.toISOString(),
        details: `Access granted via ${matchedMembership.accessScope.toLowerCase()} membership`,
      };
    } catch (err: any) {
      this.logger.error(`Error calculating access decision: ${err.message}`, err.stack);
      // INVARIANT 10: Unknown authorization state strictly defaults to DENY
      return this.deny('INVALID_REQUEST', {
        outletId,
        timestamp,
        details: 'Internal evaluation error defaulting to fail-safe DENY',
      });
    }
  }

  private deny(
    reason: AccessDecisionReason,
    context: {
      outletId: string;
      memberProfileId?: string;
      membershipId?: string;
      credentialId?: string;
      accessPointId?: string;
      deviceId?: string;
      timestamp: Date;
      details?: string;
    }
  ): AccessDecisionResult {
    return {
      allowed: false,
      reason,
      memberProfileId: context.memberProfileId,
      outletId: context.outletId,
      membershipId: context.membershipId,
      credentialId: context.credentialId,
      accessPointId: context.accessPointId,
      deviceId: context.deviceId,
      timestamp: context.timestamp.toISOString(),
      details: context.details,
    };
  }
}
