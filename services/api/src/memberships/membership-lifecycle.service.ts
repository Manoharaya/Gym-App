import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface LifecycleActor {
  id: string;
  role: string;
}

@Injectable()
export class MembershipLifecycleService {
  // Centralized State Machine Transition Map
  private readonly validTransitions: Record<string, string[]> = {
    PENDING: ['ACTIVE', 'CANCELLED'],
    ACTIVE: ['PAUSED', 'SUSPENDED', 'CANCELLED', 'EXPIRED'],
    TRIAL: ['ACTIVE', 'CANCELLED', 'EXPIRED'],
    PAUSED: ['ACTIVE', 'CANCELLED'],
    SUSPENDED: ['ACTIVE', 'CANCELLED'],
    EXPIRED: [], // Terminal state. Requires renewal to create a new membership.
    CANCELLED: [], // Terminal state.
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  /**
   * Validates whether a state transition is legal in the FitCore membership lifecycle state machine.
   */
  canTransition(currentStatus: string, targetStatus: string): boolean {
    const allowed = this.validTransitions[currentStatus.toUpperCase()];
    return allowed ? allowed.includes(targetStatus.toUpperCase()) : false;
  }

  /**
   * Performs an authoritative state transition on a member membership.
   */
  async transitionStatus(
    membershipId: string,
    targetStatus: string,
    action: string,
    actor: LifecycleActor,
    reason?: string,
    metadata?: Record<string, any>
  ) {
    const membership = await this.prisma.memberMembership.findUnique({
      where: { id: membershipId },
    });

    if (!membership) {
      throw new NotFoundException(`Membership with ID ${membershipId} not found`);
    }

    if (!this.canTransition(membership.status, targetStatus)) {
      throw new BadRequestException(
        `Invalid membership state transition: cannot transition from ${membership.status} to ${targetStatus}`
      );
    }

    const now = new Date();
    const updateData: any = {
      status: targetStatus,
    };

    if (targetStatus === 'ACTIVE' && !membership.activatedAt) {
      updateData.activatedAt = now;
    }
    if (targetStatus === 'PAUSED') {
      updateData.pausedAt = now;
    }
    if (targetStatus === 'SUSPENDED') {
      updateData.suspendedAt = now;
    }
    if (targetStatus === 'CANCELLED') {
      updateData.cancelledAt = now;
      updateData.cancelledReason = reason ?? 'Member requested cancellation';
    }

    // Execute state update and historical audit entry in transaction
    const [updatedMembership] = await this.prisma.$transaction([
      this.prisma.memberMembership.update({
        where: { id: membershipId },
        data: updateData,
        include: {
          membershipPlan: true,
          accessOutlets: { include: { outlet: true } },
        },
      }),
      this.prisma.memberMembershipHistory.create({
        data: {
          memberMembershipId: membershipId,
          fromStatus: membership.status,
          toStatus: targetStatus,
          action,
          reason,
          actorId: actor.id,
          actorRole: actor.role,
          metadata: metadata ?? {},
        },
      }),
    ]);

    // Audit log
    await this.audit.log({
      action: `MEMBERSHIP_${action.toUpperCase()}`,
      resource: 'member_membership',
      resourceId: membershipId,
      organisationId: membership.organisationId,
      userId: actor.id,
      metadata: {
        fromStatus: membership.status,
        toStatus: targetStatus,
        reason,
      },
    });

    return updatedMembership;
  }

  async activate(membershipId: string, actor: LifecycleActor, reason?: string) {
    return this.transitionStatus(membershipId, 'ACTIVE', 'ACTIVATE', actor, reason);
  }

  async pause(membershipId: string, actor: LifecycleActor, reason?: string) {
    return this.transitionStatus(membershipId, 'PAUSED', 'PAUSE', actor, reason);
  }

  async resume(membershipId: string, actor: LifecycleActor, reason?: string) {
    return this.transitionStatus(membershipId, 'ACTIVE', 'RESUME', actor, reason);
  }

  async suspend(membershipId: string, actor: LifecycleActor, reason?: string) {
    return this.transitionStatus(membershipId, 'SUSPENDED', 'SUSPEND', actor, reason);
  }

  async cancel(membershipId: string, actor: LifecycleActor, reason?: string) {
    return this.transitionStatus(membershipId, 'CANCELLED', 'CANCEL', actor, reason);
  }

  async expire(membershipId: string, reason: string = 'Term ended without renewal') {
    return this.transitionStatus(
      membershipId,
      'EXPIRED',
      'EXPIRE',
      { id: 'SYSTEM', role: 'SYSTEM' },
      reason
    );
  }
}
