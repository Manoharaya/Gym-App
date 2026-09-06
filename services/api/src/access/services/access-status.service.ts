import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AccessDecisionService } from './access-decision.service';
import { CheckInService } from './checkin.service';
import { MemberAccessStatusResponse, AccessDecisionReason } from '@fitcore/types';

@Injectable()
export class AccessStatusService {
  private readonly logger = new Logger(AccessStatusService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly decisionService: AccessDecisionService,
    private readonly checkinService: CheckInService
  ) {}

  /**
   * Aggregates live physical access status for a member.
   * Safe for member mobile clients (no sensitive internal or payment codes).
   */
  async getMemberAccessStatus(
    organisationId: string,
    memberProfileId: string,
    outletId?: string
  ): Promise<MemberAccessStatusResponse> {
    const member = await this.prisma.memberProfile.findFirst({
      where: { id: memberProfileId, organisationId },
      include: {
        memberships: {
          include: {
            membershipPlan: true,
            accessOutlets: {
              include: { outlet: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        accessCredentials: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!member) {
      return {
        memberProfileId,
        canAccessCurrentOutlet: false,
        authorizedOutlets: [],
        userFacingMessage: 'Member profile not found.',
      };
    }

    const now = new Date();

    // Find active membership
    const activeMembership = member.memberships.find(
      (m) =>
        (m.status === 'ACTIVE' || m.status === 'TRIAL') &&
        m.startDate <= now &&
        m.endDate >= now
    );

    // Determine authorized outlets
    let authorizedOutlets: Array<{ id: string; name: string; code: string }> = [];

    if (activeMembership) {
      if (activeMembership.accessScope === 'ALL_ORGANISATION_OUTLETS') {
        const allOutlets = await this.prisma.outlet.findMany({
          where: { organisationId, status: 'ACTIVE' },
          select: { id: true, name: true, code: true },
        });
        authorizedOutlets = allOutlets;
      } else {
        authorizedOutlets = activeMembership.accessOutlets.map((ao) => ({
          id: ao.outlet.id,
          name: ao.outlet.name,
          code: ao.outlet.code,
        }));
      }
    }

    // Default target outlet to first authorized outlet or queried outlet
    const targetOutletId = outletId || authorizedOutlets[0]?.id;
    let targetOutletInfo = undefined;
    let canAccess = false;
    let denialReason: AccessDecisionReason | undefined = undefined;

    if (targetOutletId) {
      const outletRecord = await this.prisma.outlet.findUnique({
        where: { id: targetOutletId },
        select: { id: true, name: true, code: true },
      });
      if (outletRecord) {
        targetOutletInfo = outletRecord;
      }

      const decision = await this.decisionService.canAccess({
        memberProfileId,
        outletId: targetOutletId,
        requestedAt: now,
      });

      canAccess = decision.allowed;
      if (!decision.allowed) {
        denialReason = decision.reason;
      }
    }

    // Get active visit
    const activeVisitRecord = await this.checkinService.getActiveVisit(
      organisationId,
      memberProfileId
    );

    let activeVisit = undefined;
    if (activeVisitRecord) {
      const durationMinutes = Math.round(
        (now.getTime() - activeVisitRecord.checkedInAt.getTime()) / (1000 * 60)
      );
      activeVisit = {
        id: activeVisitRecord.id,
        outletId: activeVisitRecord.outletId,
        outletName: activeVisitRecord.outlet?.name,
        checkedInAt: activeVisitRecord.checkedInAt.toISOString(),
        durationMinutes,
      };
    }

    // Primary credential
    const primaryCred = member.accessCredentials[0];
    const primaryCredential = primaryCred
      ? {
          id: primaryCred.id,
          type: primaryCred.type as any,
          status: primaryCred.status as any,
          displayIdentifier: primaryCred.displayIdentifier || undefined,
        }
      : undefined;

    // Friendly user-facing message
    const userFacingMessage = this.buildUserFacingMessage(
      canAccess,
      denialReason,
      activeMembership?.accessScope
    );

    return {
      memberProfileId,
      canAccessCurrentOutlet: canAccess,
      currentOutlet: targetOutletInfo,
      activeMembership: activeMembership
        ? {
            id: activeMembership.id,
            planName: activeMembership.planNameAtPurchase,
            status: activeMembership.status,
            accessScope: activeMembership.accessScope,
            startDate: activeMembership.startDate.toISOString(),
            endDate: activeMembership.endDate.toISOString(),
          }
        : undefined,
      authorizedOutlets,
      activeVisit,
      primaryCredential,
      denialReason,
      userFacingMessage,
    };
  }

  private buildUserFacingMessage(
    canAccess: boolean,
    denialReason?: AccessDecisionReason,
    accessScope?: string
  ): string {
    if (canAccess) {
      return 'Access Active. Present your dynamic QR code or pass at the turnstile.';
    }

    switch (denialReason) {
      case 'MEMBERSHIP_PENDING':
        return 'Your membership is pending activation. Please contact reception.';
      case 'MEMBERSHIP_EXPIRED':
        return 'Your membership has expired. Please renew your plan to regain entry.';
      case 'MEMBERSHIP_SUSPENDED':
        return 'Your membership is currently suspended. Please speak with club staff.';
      case 'OUTLET_NOT_AUTHORIZED':
        return 'Your current membership does not include access to this facility outlet.';
      case 'OUTSIDE_ALLOWED_HOURS':
        return 'The facility is currently closed. Entry is permitted during standard operating hours.';
      case 'NO_ACTIVE_MEMBERSHIP':
        return 'No active membership found. Please select a plan to activate physical access.';
      case 'CREDENTIAL_REVOKED':
        return 'Your access credential was revoked. Please generate a new pass in the app.';
      default:
        return 'Physical access is not available at this time.';
    }
  }
}
