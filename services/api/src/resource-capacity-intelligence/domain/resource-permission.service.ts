import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface ResolvedResourceScope {
  organisationId: string;
  outletId?: string;
  isOrganisationWide: boolean;
  role: string;
  trainerId?: string;
}

@Injectable()
export class ResourcePermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves caller's authorized scope and enforces multi-tenant boundaries.
   */
  async resolveScope(
    user: any,
    requestedOutletId?: string,
  ): Promise<ResolvedResourceScope> {
    const roleName = this.extractRole(user);

    // 1. Members are strictly forbidden from resource intelligence
    if (roleName === 'MEMBER') {
      throw new ForbiddenException('Forbidden: Members cannot access resource & capacity intelligence');
    }

    const organisationId = user.organisationId || user.primaryOrganisationId || user.roles?.[0]?.organisationId;
    if (!organisationId) {
      throw new ForbiddenException('User is not associated with an organisation');
    }

    // 2. SuperAdmin / Owner / Admin have organisation-wide access
    if (
      roleName === 'SUPERADMIN' ||
      roleName === 'SUPER_ADMIN' ||
      roleName === 'ORGANISATION_OWNER' ||
      roleName === 'OWNER' ||
      roleName === 'ADMIN'
    ) {
      if (requestedOutletId) {
        await this.verifyOutletBelongsToOrg(requestedOutletId, organisationId);
        return {
          organisationId,
          outletId: requestedOutletId,
          isOrganisationWide: false,
          role: roleName,
        };
      }
      return {
        organisationId,
        outletId: undefined,
        isOrganisationWide: true,
        role: roleName,
      };
    }

    // 3. Outlet Manager is constrained to assigned outlet
    if (roleName === 'OUTLET_MANAGER') {
      const assignedOutletId = user.outletId;
      if (!assignedOutletId) {
        throw new ForbiddenException('Outlet Manager has no assigned outlet');
      }

      if (requestedOutletId && requestedOutletId !== assignedOutletId) {
        throw new ForbiddenException(
          'Forbidden: Outlet Manager can only access their assigned outlet',
        );
      }

      return {
        organisationId,
        outletId: assignedOutletId,
        isOrganisationWide: false,
        role: roleName,
      };
    }

    // 4. Trainer is constrained to their own operational data
    if (roleName === 'TRAINER') {
      if (requestedOutletId && user.outletId && requestedOutletId !== user.outletId) {
        throw new ForbiddenException('Forbidden: Trainer cannot access other outlet data');
      }

      return {
        organisationId,
        outletId: user.outletId || undefined,
        isOrganisationWide: false,
        role: roleName,
        trainerId: user.id,
      };
    }

    // 5. Reception staff constrained to their assigned outlet
    if (roleName === 'RECEPTION' || roleName === 'STAFF') {
      const assignedOutletId = user.outletId;
      if (!assignedOutletId) {
        throw new ForbiddenException('Staff member has no assigned outlet');
      }

      if (requestedOutletId && requestedOutletId !== assignedOutletId) {
        throw new ForbiddenException('Forbidden: Staff can only access their assigned outlet');
      }

      return {
        organisationId,
        outletId: assignedOutletId,
        isOrganisationWide: false,
        role: roleName,
      };
    }

    throw new ForbiddenException(`Forbidden: Role ${roleName} cannot access resource intelligence`);
  }

  /**
   * Asserts caller can access a specific resource (IDOR Defense).
   */
  async assertCanAccessResource(user: any, resourceId: string): Promise<any> {
    const scope = await this.resolveScope(user);

    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      include: { outlet: true },
    });

    if (!resource || resource.organisationId !== scope.organisationId) {
      throw new NotFoundException(`Resource ${resourceId} not found`);
    }

    if (scope.outletId && resource.outletId !== scope.outletId) {
      throw new ForbiddenException('Forbidden: Resource belongs to a different outlet');
    }

    return resource;
  }

  /**
   * Asserts caller can access a specific trainer's capacity data (IDOR Defense).
   */
  async assertCanAccessTrainer(user: any, trainerId: string): Promise<any> {
    const scope = await this.resolveScope(user);

    // If caller is trainer, they can only view their own capacity
    if (scope.role === 'TRAINER' && scope.trainerId !== trainerId) {
      throw new ForbiddenException('Forbidden: Trainers can only access their own capacity analytics');
    }

    const trainer = await this.prisma.user.findFirst({
      where: {
        id: trainerId,
        userRoles: { some: { organisationId: scope.organisationId } },
      },
      include: {
        staffProfile: { include: { trainerProfile: true } },
        userRoles: true,
      },
    });

    if (!trainer) {
      throw new NotFoundException(`Trainer ${trainerId} not found`);
    }

    // If outlet manager, verify trainer is assigned or active in that outlet
    if (scope.outletId) {
      const isAssigned = trainer.userRoles.some((ur: any) => ur.outletId === scope.outletId);
      if (!isAssigned) {
        throw new ForbiddenException('Forbidden: Trainer is assigned to a different outlet');
      }
    }

    return trainer;
  }

  /**
   * Asserts caller can access a specific outlet (IDOR Defense).
   */
  async assertCanAccessOutlet(user: any, outletId: string): Promise<void> {
    const scope = await this.resolveScope(user, outletId);
    if (scope.outletId && scope.outletId !== outletId) {
      throw new ForbiddenException('Forbidden: Cannot access different outlet');
    }
  }

  private extractRole(user: any): string {
    if (user.role) {
      return String(user.role).toUpperCase();
    }
    if (Array.isArray(user.roles) && user.roles.length > 0) {
      const firstRole = user.roles[0];
      return String(firstRole?.role || firstRole?.name || firstRole || '').toUpperCase();
    }
    if (Array.isArray(user.userRoles) && user.userRoles.length > 0) {
      const firstRole = user.userRoles[0];
      return String(firstRole?.role?.name || firstRole?.role || '').toUpperCase();
    }
    if (user.isSuperAdmin) {
      return 'SUPERADMIN';
    }
    return '';
  }

  private async verifyOutletBelongsToOrg(outletId: string, organisationId: string) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: outletId, organisationId },
    });
    if (!outlet) {
      throw new NotFoundException(`Outlet ${outletId} not found in this organisation`);
    }
  }
}
