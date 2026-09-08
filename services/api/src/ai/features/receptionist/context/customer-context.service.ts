/**
 * Day 31 — Customer Context Service
 * Resolves participant identity, membership status, home outlet, and interaction history.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { ConversationParticipantContext } from '../receptionist.types';

@Injectable()
export class CustomerContextService {
  private readonly logger = new Logger(CustomerContextService.name);

  constructor(private readonly prisma: PrismaService) {}

  async resolveCustomerContext(params: {
    organisationId: string;
    memberId?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    customerEmail?: string | null;
  }): Promise<ConversationParticipantContext> {
    const { organisationId, memberId, customerName, customerPhone, customerEmail } = params;

    if (!memberId) {
      return {
        isAuthenticated: false,
        customerName: customerName ?? undefined,
        customerPhone: customerPhone ?? undefined,
        customerEmail: customerEmail ?? undefined,
      };
    }

    const member = await this.prisma.memberProfile.findFirst({
      where: {
        id: memberId,
        organisationId,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            membershipPlan: true,
          },
          take: 1,
        },
        memberOutlets: {
          include: {
            outlet: true,
          },
        },
      },
    });

    if (!member) {
      return {
        isAuthenticated: false,
        customerName: customerName ?? undefined,
        customerPhone: customerPhone ?? undefined,
        customerEmail: customerEmail ?? undefined,
      };
    }

    const activeMembership = member.memberships[0];
    const fullName = [member.user.firstName, member.user.lastName].filter(Boolean).join(' ');
    const homeOutletObj = member.memberOutlets.find((mo: any) => mo.isHome)?.outlet || member.memberOutlets[0]?.outlet;

    return {
      memberId: member.id,
      isAuthenticated: true,
      customerName: fullName || (customerName ?? undefined),
      customerPhone: member.user.phone || (customerPhone ?? undefined),
      customerEmail: member.user.email || (customerEmail ?? undefined),
      membershipStatus: activeMembership ? 'ACTIVE' : 'NONE',
      membershipPlanName: activeMembership?.membershipPlan?.name || activeMembership?.planNameAtPurchase,
      homeOutletId: homeOutletObj?.id,
      homeOutletName: homeOutletObj?.name,
    };
  }
}
