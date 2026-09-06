import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../common/interfaces/request-with-user.interface';

@Injectable()
export class OrganisationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthenticatedUser) {
    if (user.isSuperAdmin) {
      return this.prisma.organisation.findMany({
        where: { deletedAt: null },
        include: {
          _count: { select: { outlets: true } },
        },
      });
    }

    const orgIds = Array.from(
      new Set(
        [
          user.primaryOrganisationId,
          ...user.roles.map((r) => r.organisationId),
        ].filter(Boolean) as string[],
      ),
    );

    return this.prisma.organisation.findMany({
      where: {
        id: { in: orgIds },
        deletedAt: null,
      },
      include: {
        _count: { select: { outlets: true } },
      },
    });
  }

  async findById(id: string, user: AuthenticatedUser) {
    if (!user.isSuperAdmin) {
      const allowedOrgs = new Set([
        user.primaryOrganisationId,
        ...user.roles.map((r) => r.organisationId),
      ]);

      if (!allowedOrgs.has(id)) {
        throw new ForbiddenException(
          `Cross-tenant access forbidden: User ${user.email} cannot access organisation ${id}`,
        );
      }
    }

    const org = await this.prisma.organisation.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        deletedAt: null,
      },
      include: {
        outlets: {
          where: { deletedAt: null },
        },
      },
    });

    if (!org) {
      throw new NotFoundException(`Organisation with identifier '${id}' not found`);
    }

    return org;
  }
}
