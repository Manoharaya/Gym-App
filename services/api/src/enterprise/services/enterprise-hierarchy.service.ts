import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface ScopedHierarchyContext {
  organisationId: string;
  brandId?: string | null;
  regionCode?: string | null; // e.g., state "WA", "NSW", "VIC"
  outletId?: string | null;
}

@Injectable()
export class EnterpriseHierarchyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves full hierarchy tree for an organisation:
   * Organisation -> Brands -> Outlets (with managers and staff counts)
   */
  async getHierarchyTree(organisationId: string) {
    const organisation = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
      include: {
        brands: {
          where: { deletedAt: null },
          include: {
            outlets: {
              where: { deletedAt: null },
              select: {
                id: true,
                name: true,
                slug: true,
                code: true,
                status: true,
                city: true,
                state: true,
                timezone: true,
                currency: true,
                managerUserId: true,
                managerUser: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    displayName: true,
                    email: true,
                  },
                },
                _count: {
                  select: {
                    staffOutletAssignments: true,
                    memberOutlets: true,
                  },
                },
              },
            },
          },
        },
        outlets: {
          where: { deletedAt: null, brandId: null },
          select: {
            id: true,
            name: true,
            slug: true,
            code: true,
            status: true,
            city: true,
            state: true,
            timezone: true,
            currency: true,
            managerUserId: true,
            managerUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                displayName: true,
                email: true,
              },
            },
            _count: {
              select: {
                staffOutletAssignments: true,
                memberOutlets: true,
              },
            },
          },
        },
      },
    });

    return organisation;
  }

  /**
   * Resolves hierarchy context for an outlet, including brand and region (state)
   */
  async resolveOutletContext(outletId: string): Promise<ScopedHierarchyContext | null> {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: {
        id: true,
        organisationId: true,
        brandId: true,
        state: true,
      },
    });

    if (!outlet) {
      return null;
    }

    return {
      organisationId: outlet.organisationId,
      brandId: outlet.brandId,
      regionCode: outlet.state,
      outletId: outlet.id,
    };
  }
}
