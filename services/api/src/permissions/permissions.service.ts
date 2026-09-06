import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../common/interfaces/request-with-user.interface';

export const ROLE_HIERARCHY: Record<string, number> = {
  SUPERADMIN: 100,
  ORGANISATION_OWNER: 80,
  OUTLET_MANAGER: 60,
  FINANCE: 50,
  RECEPTION: 40,
  TRAINER: 40,
  MEMBER: 10,
};

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  getRoleLevel(roleName: string): number {
    return ROLE_HIERARCHY[roleName.toUpperCase()] || 0;
  }

  /**
   * Validates that an actor has the authority to assign/revoke a specific target role
   * without violating privilege escalation or tenant boundary rules.
   */
  async validateRoleAssignment(
    actor: AuthenticatedUser,
    targetRoleName: string,
    targetOrgId: string,
    targetOutletId?: string | null,
  ): Promise<void> {
    // 1. Platform SuperAdmin can assign any role
    if (actor.isSuperAdmin) {
      return;
    }

    // 2. Tenant boundary: Actor must belong to target organisation
    const actorOrgRoles = actor.roles.filter((r) => r.organisationId === targetOrgId);
    if (actorOrgRoles.length === 0) {
      throw new ForbiddenException(
        `Cross-tenant privilege escalation: You do not belong to organisation ${targetOrgId}`,
      );
    }

    // 3. Find actor's highest role level within this organisation
    const actorHighestLevel = Math.max(
      ...actorOrgRoles.map((r) => this.getRoleLevel(r.role)),
      0,
    );

    const targetLevel = this.getRoleLevel(targetRoleName);

    // Reception, Trainer, Member have no administrative role assignment privileges
    if (actorHighestLevel <= ROLE_HIERARCHY.RECEPTION) {
      throw new ForbiddenException(
        `Privilege escalation: Role '${actorOrgRoles[0]?.role}' does not have authority to assign roles`,
      );
    }

    // Actor must strictly outrank the target role (strict hierarchy)
    if (actorHighestLevel <= targetLevel) {
      throw new ForbiddenException(
        `Privilege escalation: Your highest role level (${actorHighestLevel}) cannot assign or revoke role '${targetRoleName}' (level ${targetLevel})`,
      );
    }

    // 4. Outlet scoping check: If actor is OUTLET_MANAGER, they can only assign for their own outlet
    const isOrgWideAdmin = actorOrgRoles.some((r) =>
      ['ORGANISATION_OWNER', 'FINANCE'].includes(r.role),
    );

    if (!isOrgWideAdmin && targetOutletId) {
      const actorOutlets = new Set(
        [actor.primaryOutletId, ...actorOrgRoles.map((r) => r.outletId)].filter(Boolean),
      );
      if (!actorOutlets.has(targetOutletId)) {
        throw new ForbiddenException(
          `Privilege escalation: You cannot assign roles for an outlet (${targetOutletId}) you are not assigned to`,
        );
      }
    }
  }

  /**
   * Answers: Can user perform action on resource within optional context?
   */
  async can(
    userId: string,
    permission: { resource: string; action: string },
    context?: { organisationId?: string; outletId?: string },
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
      return false;
    }

    const isSuperAdmin = user.userRoles.some((ur) => ur.role.name === 'SUPERADMIN');
    if (isSuperAdmin) {
      return true;
    }

    for (const ur of user.userRoles) {
      // If context specified, verify tenant matching
      if (context?.organisationId && ur.organisationId !== context.organisationId) {
        continue;
      }
      if (context?.outletId && ur.outletId && ur.outletId !== context.outletId) {
        continue;
      }

      for (const rp of ur.role.permissions) {
        const p = rp.permission;
        const matchesResource = p.resource === permission.resource || p.resource === '*';
        const matchesAction = p.action === permission.action || p.action === 'MANAGE';

        if (matchesResource && matchesAction) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Returns all effective permissions for a user within an organisation.
   */
  async getUserEffectivePermissions(
    userId: string,
    organisationId?: string,
  ) {
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        ...(organisationId ? { organisationId } : {}),
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const perms = new Map<string, { resource: string; action: string; scope: string }>();
    userRoles.forEach((ur) => {
      ur.role.permissions.forEach((rp) => {
        const key = `${rp.permission.resource}:${rp.permission.action}:${rp.permission.scope}`;
        perms.set(key, {
          resource: rp.permission.resource,
          action: rp.permission.action,
          scope: rp.permission.scope,
        });
      });
    });

    return Array.from(perms.values());
  }
}
