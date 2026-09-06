import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../common/interfaces/request-with-user.interface';

@Injectable()
export class OutletsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthenticatedUser, requestedOrgId?: string) {
    let targetOrgId = requestedOrgId || user.primaryOrganisationId;

    if (!user.isSuperAdmin && targetOrgId) {
      const allowedOrgs = new Set([
        user.primaryOrganisationId,
        ...user.roles.map((r) => r.organisationId),
      ]);
      if (!allowedOrgs.has(targetOrgId)) {
        throw new ForbiddenException(`Cross-tenant access forbidden: Cannot query outlets for organisation ${targetOrgId}`);
      }
    }

    // Check if user is restricted to specific outlets
    const isOrgWide = user.isSuperAdmin || user.roles.some((r) =>
      ['ORGANISATION_OWNER', 'FINANCE'].includes(r.role),
    );

    const where: any = {
      deletedAt: null,
    };

    if (targetOrgId) {
      where.organisationId = targetOrgId;
    }

    if (!isOrgWide) {
      const allowedOutletIds = Array.from(
        new Set(
          [
            user.primaryOutletId,
            ...user.roles.map((r) => r.outletId),
          ].filter(Boolean) as string[],
        ),
      );
      if (allowedOutletIds.length > 0) {
        where.id = { in: allowedOutletIds };
      }
    }

    return this.prisma.outlet.findMany({
      where,
      include: {
        organisation: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  async findById(id: string, user: AuthenticatedUser) {
    const outlet = await this.prisma.outlet.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        deletedAt: null,
      },
      include: {
        organisation: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!outlet) {
      throw new NotFoundException(`Outlet with identifier '${id}' not found`);
    }

    if (!user.isSuperAdmin) {
      const allowedOrgs = new Set([
        user.primaryOrganisationId,
        ...user.roles.map((r) => r.organisationId),
      ]);
      if (!allowedOrgs.has(outlet.organisationId)) {
        throw new ForbiddenException(
          `Cross-tenant access forbidden: User cannot access outlet belonging to another organisation`,
        );
      }

      // Check outlet-level restriction
      const isOrgWide = user.roles.some((r) =>
        r.organisationId === outlet.organisationId &&
        ['ORGANISATION_OWNER', 'FINANCE'].includes(r.role),
      );

      if (!isOrgWide) {
        const allowedOutletIds = new Set(
          [
            user.primaryOutletId,
            ...user.roles.map((r) => r.outletId),
          ].filter(Boolean),
        );
        if (!allowedOutletIds.has(outlet.id)) {
          throw new ForbiddenException(
            `Access forbidden: User is not assigned to this outlet`,
          );
        }
      }
    }

    return outlet;
  }
}
