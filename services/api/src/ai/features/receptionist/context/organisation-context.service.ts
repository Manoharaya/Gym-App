/**
 * Day 31 — Organisation Context Service
 * Retrieves organisation-level metadata, branding, and outlet network topology.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { OrganisationContextData } from '../receptionist.types';

@Injectable()
export class OrganisationContextService {
  private readonly logger = new Logger(OrganisationContextService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOrganisationContext(organisationId: string): Promise<OrganisationContextData> {
    const org = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
      include: {
        outlets: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            phone: true,
          },
        },
      },
    });

    if (!org) {
      return {
        id: organisationId,
        name: 'FitCore Partner Gym',
        slug: 'fitcore',
        outletsCount: 0,
        outlets: [],
      };
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      outletsCount: org.outlets.length,
      outlets: org.outlets.map((o) => ({
        id: o.id,
        name: o.name,
        address: o.address ?? undefined,
        city: o.city ?? undefined,
        phone: o.phone ?? undefined,
      })),
    };
  }
}
