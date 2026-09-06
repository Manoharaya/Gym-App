import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MembershipDateService } from './membership-date.service';
import { AuditService } from '../audit/audit.service';
import { LifecycleActor } from './membership-lifecycle.service';

@Injectable()
export class MembershipRenewalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dateService: MembershipDateService,
    private readonly audit: AuditService
  ) {}

  /**
   * Generates the next membership term from an existing membership.
   * Decoupled from payment collection (payment gateway integration happens in a future day).
   */
  async renewMembership(
    currentMembershipId: string,
    actor: LifecycleActor,
    reason: string = 'Membership manual/automatic renewal'
  ) {
    const existing = await this.prisma.memberMembership.findUnique({
      where: { id: currentMembershipId },
      include: {
        membershipPlan: true,
        accessOutlets: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Membership with ID ${currentMembershipId} not found`);
    }

    const plan = existing.membershipPlan;
    if (plan.status === 'ARCHIVED') {
      throw new BadRequestException(
        'Cannot renew membership: the associated plan has been archived'
      );
    }

    const now = new Date();
    // If the existing membership has not expired yet, the next term begins seamlessly when the current term ends.
    // Otherwise, it starts immediately.
    const nextStart = existing.endDate > now ? new Date(existing.endDate.getTime()) : now;
    const nextEnd = this.dateService.calculateEndDate(
      nextStart,
      plan.durationValue,
      plan.durationUnit
    );

    // Create the new membership with a commercial snapshot of current plan terms
    const newMembership = await this.prisma.$transaction(async (tx) => {
      const created = await tx.memberMembership.create({
        data: {
          organisationId: existing.organisationId,
          memberProfileId: existing.memberProfileId,
          membershipPlanId: plan.id,
          status: 'ACTIVE',
          accessScope: existing.accessScope,
          originOutletId: existing.originOutletId,
          startDate: nextStart,
          endDate: nextEnd,
          activatedAt: nextStart <= now ? now : nextStart,
          autoRenew: existing.autoRenew,
          planNameAtPurchase: plan.name,
          priceAtPurchase: plan.price,
          currencyAtPurchase: plan.currency,
          billingTypeAtPurchase: plan.billingType,
          durationValueAtPurchase: plan.durationValue,
          durationUnitAtPurchase: plan.durationUnit,
        },
      });

      // Copy outlet associations
      if (existing.accessOutlets.length > 0) {
        for (const ao of existing.accessOutlets) {
          await tx.memberMembershipOutlet.create({
            data: {
              memberMembershipId: created.id,
              outletId: ao.outletId,
            },
          });
        }
      }

      // Record renewal history
      await tx.memberMembershipHistory.create({
        data: {
          memberMembershipId: created.id,
          fromStatus: null,
          toStatus: 'ACTIVE',
          action: 'RENEW',
          reason,
          actorId: actor.id,
          actorRole: actor.role,
          metadata: { renewedFromMembershipId: existing.id },
        },
      });

      return created;
    });

    await this.audit.log({
      action: 'MEMBERSHIP_RENEWED',
      resource: 'member_membership',
      resourceId: newMembership.id,
      organisationId: existing.organisationId,
      userId: actor.id,
      metadata: {
        renewedFromId: existing.id,
        startDate: nextStart.toISOString(),
        endDate: nextEnd.toISOString(),
      },
    });

    return this.prisma.memberMembership.findUnique({
      where: { id: newMembership.id },
      include: {
        membershipPlan: true,
        accessOutlets: { include: { outlet: true } },
      },
    });
  }
}
