import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class MembershipEntitlementService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all entitlements attached to a membership plan catalog template.
   */
  async getPlanEntitlements(organisationId: string, planId: string) {
    const plan = await this.prisma.membershipPlan.findFirst({
      where: {
        id: planId,
        organisationId,
      },
      include: {
        entitlements: true,
      },
    });

    if (!plan) {
      throw new NotFoundException(
        `Membership plan with ID ${planId} not found in this organization`
      );
    }

    return plan.entitlements;
  }
}
