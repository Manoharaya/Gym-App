import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../common/interfaces/request-with-user.interface';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        displayName: true,
        avatarUrl: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        userRoles: {
          include: {
            role: true,
            organisation: { select: { id: true, name: true, slug: true } },
            outlet: { select: { id: true, name: true, slug: true, code: true } },
          },
        },
        userOutlets: {
          include: {
            outlet: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return user;
  }

  async findAll(user: AuthenticatedUser, requestedOrgId?: string) {
    const targetOrgId = requestedOrgId || user.primaryOrganisationId;

    if (!user.isSuperAdmin && targetOrgId) {
      const allowedOrgs = new Set([
        user.primaryOrganisationId,
        ...user.roles.map((r) => r.organisationId),
      ]);
      if (!allowedOrgs.has(targetOrgId)) {
        throw new ForbiddenException(
          `Cross-tenant access forbidden: Cannot view users for organisation ${targetOrgId}`,
        );
      }
    }

    const where: any = {
      deletedAt: null,
    };

    if (targetOrgId) {
      where.userRoles = {
        some: {
          organisationId: targetOrgId,
        },
      };
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        userRoles: {
          include: {
            role: { select: { name: true } },
            organisation: { select: { id: true, name: true } },
            outlet: { select: { id: true, name: true } },
          },
        },
      },
      take: 50,
    });
  }
}
