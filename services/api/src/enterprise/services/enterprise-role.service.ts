import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { PermissionsService, ROLE_HIERARCHY } from '../../permissions/permissions.service';
import {
  CreateRoleAssignmentDto,
  UpdateRoleAssignmentDto,
} from '../dto/create-role-assignment.dto';
import { EnterpriseResourceNotFoundException, EnterprisePrivilegeEscalationException } from '../domain/enterprise-errors';
import { EnterpriseEvent } from '../domain/enterprise-events';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';

@Injectable()
export class EnterpriseRoleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async assignRole(
    organisationId: string,
    dto: CreateRoleAssignmentDto,
    actor: AuthenticatedUser,
  ) {
    // 1. Privilege escalation check
    if (!actor.isSuperAdmin) {
      const actorOrgRoles = actor.roles.filter((r) => r.organisationId === organisationId);
      if (actorOrgRoles.length === 0) {
        throw new ForbiddenException(
          `Cross-tenant privilege escalation: You do not belong to organisation ${organisationId}`,
        );
      }

      const actorHighestLevel = Math.max(
        ...actorOrgRoles.map((r) => this.permissionsService.getRoleLevel(r.role)),
        0,
      );
      const targetLevel = this.permissionsService.getRoleLevel(dto.roleName);

      if (actorHighestLevel <= targetLevel) {
        throw new EnterprisePrivilegeEscalationException(
          actorOrgRoles[0]?.role || 'UNKNOWN',
          dto.roleName,
        );
      }
    }

    // 2. Ensure target user and role exist
    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!targetUser) {
      throw new EnterpriseResourceNotFoundException('User', dto.userId);
    }

    let role = await this.prisma.role.findUnique({
      where: { name: dto.roleName },
    });
    if (!role) {
      // Create role if it doesn't exist yet in the database
      role = await this.prisma.role.create({
        data: {
          name: dto.roleName,
          description: `Enterprise role ${dto.roleName}`,
          isSystemRole: true,
        },
      });
    }

    // 3. Validate scope references
    let brandId = dto.brandId;
    let outletId = dto.outletId;

    if (dto.scopeType === 'BRAND') {
      brandId = dto.scopeId || dto.brandId;
      if (!brandId) {
        throw new ForbiddenException('Brand ID is required for BRAND scoped role assignments');
      }
      const brand = await this.prisma.organisationBrand.findFirst({
        where: { id: brandId, organisationId, deletedAt: null },
      });
      if (!brand) {
        throw new EnterpriseResourceNotFoundException('Brand', brandId);
      }
    } else if (dto.scopeType === 'OUTLET') {
      outletId = dto.scopeId || dto.outletId;
      if (!outletId) {
        throw new ForbiddenException('Outlet ID is required for OUTLET scoped role assignments');
      }
      const outlet = await this.prisma.outlet.findFirst({
        where: { id: outletId, organisationId, deletedAt: null },
      });
      if (!outlet) {
        throw new EnterpriseResourceNotFoundException('Outlet', outletId);
      }
    }

    // 4. Create or update EnterpriseRoleAssignment
    const assignment = await this.prisma.enterpriseRoleAssignment.create({
      data: {
        organisationId,
        userId: dto.userId,
        roleId: role.id,
        scopeType: dto.scopeType,
        scopeId: dto.scopeId || brandId || outletId || null,
        brandId,
        outletId,
        status: 'ACTIVE',
        validFrom: dto.validFrom ? new Date(dto.validFrom) : new Date(),
        validTo: dto.validTo ? new Date(dto.validTo) : null,
        assignedById: actor.id,
        reason: dto.reason,
      },
      include: {
        role: true,
        brand: true,
        outlet: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    // 5. Synchronize with UserRole for core RBAC compatibility
    const existingUserRole = await this.prisma.userRole.findFirst({
      where: {
        userId: dto.userId,
        roleId: role.id,
        organisationId,
        outletId: outletId || null,
      },
    });

    if (!existingUserRole) {
      await this.prisma.userRole.create({
        data: {
          userId: dto.userId,
          roleId: role.id,
          organisationId,
          outletId: outletId || null,
        },
      });
    }

    await this.auditService.log({
      action: EnterpriseEvent.ROLE_ASSIGNED,
      resource: 'EnterpriseRoleAssignment',
      resourceId: assignment.id,
      organisationId,
      outletId: outletId || undefined,
      userId: actor.id,
      metadata: {
        assignedUserId: dto.userId,
        roleName: dto.roleName,
        scopeType: dto.scopeType,
        scopeId: assignment.scopeId,
      },
    });

    return assignment;
  }

  async getRoleAssignments(
    organisationId: string,
    filters?: {
      userId?: string;
      roleName?: string;
      scopeType?: string;
      scopeId?: string;
      status?: string;
    },
  ) {
    return this.prisma.enterpriseRoleAssignment.findMany({
      where: {
        organisationId,
        ...(filters?.userId ? { userId: filters.userId } : {}),
        ...(filters?.roleName ? { role: { name: filters.roleName } } : {}),
        ...(filters?.scopeType ? { scopeType: filters.scopeType } : {}),
        ...(filters?.scopeId ? { scopeId: filters.scopeId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: {
        role: true,
        brand: true,
        outlet: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeRoleAssignment(
    organisationId: string,
    assignmentId: string,
    actor: AuthenticatedUser,
    reason?: string,
  ) {
    const assignment = await this.prisma.enterpriseRoleAssignment.findFirst({
      where: { id: assignmentId, organisationId },
      include: { role: true },
    });

    if (!assignment) {
      throw new EnterpriseResourceNotFoundException('RoleAssignment', assignmentId);
    }

    // Privilege check
    if (!actor.isSuperAdmin) {
      const actorOrgRoles = actor.roles.filter((r) => r.organisationId === organisationId);
      const actorHighestLevel = Math.max(
        ...actorOrgRoles.map((r) => this.permissionsService.getRoleLevel(r.role)),
        0,
      );
      const targetLevel = this.permissionsService.getRoleLevel(assignment.role.name);

      if (actorHighestLevel <= targetLevel) {
        throw new EnterprisePrivilegeEscalationException(
          actorOrgRoles[0]?.role || 'UNKNOWN',
          assignment.role.name,
        );
      }
    }

    const updated = await this.prisma.enterpriseRoleAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'REVOKED',
        reason: reason || assignment.reason,
      },
    });

    await this.auditService.log({
      action: EnterpriseEvent.ROLE_REVOKED,
      resource: 'EnterpriseRoleAssignment',
      resourceId: assignmentId,
      organisationId,
      userId: actor.id,
      metadata: { roleName: assignment.role.name, userId: assignment.userId, reason },
    });

    return updated;
  }
}
