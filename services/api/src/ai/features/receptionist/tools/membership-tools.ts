/**
 * Day 31 — Receptionist Membership & Pricing Tools
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class MembershipTools {
  constructor(private readonly prisma: PrismaService) {}

  async lookupMembershipPlans(organisationId: string) {
    const plans = await this.prisma.membershipPlan.findMany({
      where: {
        organisationId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        currency: true,
        membershipType: true,
        durationValue: true,
        durationUnit: true,
      },
    });

    return {
      count: plans.length,
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        currency: p.currency,
        billingPeriod: `${p.durationValue} ${p.durationUnit.toLowerCase()}`,
        tier: p.membershipType,
        features: [],
      })),
    };
  }

  async lookupPricing(organisationId: string) {
    const plans = await this.lookupMembershipPlans(organisationId);
    return {
      organisationId,
      membershipOptions: plans.plans,
      trialPolicy: 'Complimentary 1-day pass available for first-time visitors upon registration.',
      guestPolicy: 'Premium members may bring 1 guest per month complimentary. Additional guest passes are $15/day.',
    };
  }
}
