/**
 * Day 31 — Receptionist Organisation & Facility Tools
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class OrganisationTools {
  constructor(private readonly prisma: PrismaService) {}

  async lookupGymInfo(organisationId: string, outletId?: string | null) {
    const org = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
    });

    if (!org) {
      return { found: false, message: 'Organisation not found' };
    }

    const outlets = await this.prisma.outlet.findMany({
      where: {
        organisationId,
        ...(outletId ? { id: outletId } : {}),
      },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        phone: true,
        email: true,
      },
    });

    if (outletId) {
      const targetOutlet = outlets.find((o) => o.id === outletId);
      return {
        found: !!targetOutlet,
        organisationName: org.name,
        outlet: targetOutlet || null,
      };
    }

    return {
      found: true,
      organisationName: org.name,
      outlets,
    };
  }

  async lookupOperatingHours(organisationId: string, outletId?: string | null) {
    const outlets = await this.prisma.outlet.findMany({
      where: {
        organisationId,
        ...(outletId ? { id: outletId } : {}),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
      },
    });

    return {
      count: outlets.length,
      locations: outlets.map((o) => ({
        outletId: o.id,
        name: o.name,
        operatingHours: {
          mondayToFriday: '06:00 - 22:00',
          weekends: '08:00 - 20:00',
        },
        holidayHours: 'Standard operating hours apply unless announced otherwise.',
        address: o.address,
        phone: o.phone,
      })),
    };
  }
}
