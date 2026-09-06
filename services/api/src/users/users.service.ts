import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PermissionsService } from '../permissions/permissions.service';
import { AuthenticatedUser } from '../common/interfaces/request-with-user.interface';
import {
  UpdateUserDto,
  CreateInvitationDto,
  AssignRoleDto,
} from './dto/user-management.dto';
import { PaginationQueryDto, calculatePagination } from '../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly permissionsService: PermissionsService,
  ) {}

  private validateOrgAccess(organisationId: string, user: AuthenticatedUser) {
    if (user.isSuperAdmin) {
      return;
    }

    const allowedOrgs = new Set([
      user.primaryOrganisationId,
      ...user.roles.map((r) => r.organisationId),
    ]);

    if (!allowedOrgs.has(organisationId)) {
      throw new ForbiddenException(
        `Cross-tenant access forbidden: User ${user.email} cannot access organisation ${organisationId}`,
      );
    }
  }

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

  async findAll(
    organisationId: string,
    user: AuthenticatedUser,
    query?: PaginationQueryDto,
    roleFilter?: string,
  ) {
    this.validateOrgAccess(organisationId, user);

    const where: any = {
      deletedAt: null,
      userRoles: {
        some: {
          organisationId,
          ...(roleFilter ? { role: { name: roleFilter.toUpperCase() } } : {}),
        },
      },
    };

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const total = await this.prisma.user.count({ where });
    const pagination = calculatePagination(query?.page, query?.limit, total);

    const data = await this.prisma.user.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: 'desc' },
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
          where: { organisationId },
          include: {
            role: { select: { name: true, description: true } },
            outlet: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    return {
      data,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: pagination.totalPages,
      },
    };
  }

  async findById(userId: string, caller: AuthenticatedUser) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        avatarUrl: true,
        phone: true,
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
    });

    if (!targetUser) {
      throw new NotFoundException(`User '${userId}' not found`);
    }

    // IDOR Protection: Caller must be superadmin, target user themselves, or share an organisation
    if (!caller.isSuperAdmin && caller.id !== targetUser.id) {
      const callerOrgIds = new Set(caller.roles.map((r) => r.organisationId));
      const targetOrgIds = targetUser.userRoles.map((r) => r.organisation.id);

      const sharesOrg = targetOrgIds.some((id) => callerOrgIds.has(id));
      if (!sharesOrg) {
        throw new ForbiddenException(
          `IDOR Access Denied: User ${caller.email} cannot inspect user from another organisation`,
        );
      }
    }

    return targetUser;
  }

  async update(userId: string, dto: UpdateUserDto, caller: AuthenticatedUser) {
    // Validate target user exists and caller has authority
    await this.findById(userId, caller);

    // If status is being modified, caller must be an admin
    if (dto.status !== undefined) {
      const isSelf = caller.id === userId;
      const isAdmin =
        caller.isSuperAdmin ||
        caller.roles.some((r) => ['ORGANISATION_OWNER', 'OUTLET_MANAGER'].includes(r.role));

      if (isSelf && !caller.isSuperAdmin) {
        throw new ForbiddenException('Cannot modify your own account status');
      }

      if (!isAdmin) {
        throw new ForbiddenException('Insufficient privileges to modify account status');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName !== undefined ? dto.firstName.trim() : undefined,
        lastName: dto.lastName !== undefined ? dto.lastName.trim() : undefined,
        displayName:
          dto.firstName || dto.lastName
            ? `${(dto.firstName || '').trim()} ${(dto.lastName || '').trim()}`.trim()
            : undefined,
        phone: dto.phone,
        avatarUrl: dto.avatarUrl,
        status: dto.status,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        avatarUrl: true,
        phone: true,
        status: true,
        updatedAt: true,
      },
    });

    await this.auditService.log({
      userId: caller.id,
      action: 'user-updated',
      resource: 'users',
      resourceId: updated.id,
      metadata: dto,
    });

    return updated;
  }

  async createInvitation(
    organisationId: string,
    dto: CreateInvitationDto,
    caller: AuthenticatedUser,
  ) {
    this.validateOrgAccess(organisationId, caller);

    const targetRoleName = dto.role.trim().toUpperCase();

    // Prevent inviting SUPERADMIN via tenant invitation
    if (targetRoleName === 'SUPERADMIN') {
      throw new ForbiddenException('Cannot invite platform superadministrators via tenant route');
    }

    // Role hierarchy & privilege escalation check
    await this.permissionsService.validateRoleAssignment(
      caller,
      targetRoleName,
      organisationId,
      dto.outletId,
    );

    const role = await this.prisma.role.findUnique({
      where: { name: targetRoleName },
    });
    if (!role) {
      throw new NotFoundException(`Role '${targetRoleName}' does not exist`);
    }

    // If outletId specified, ensure it belongs to this organisation
    if (dto.outletId) {
      const outlet = await this.prisma.outlet.findFirst({
        where: { id: dto.outletId, organisationId, deletedAt: null },
      });
      if (!outlet) {
        throw new NotFoundException(`Outlet '${dto.outletId}' not found in organisation '${organisationId}'`);
      }
    }

    // Generate secure raw invitation token and SHA-256 hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await this.prisma.invitation.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        organisationId,
        outletId: dto.outletId,
        roleId: role.id,
        tokenHash,
        status: 'PENDING',
        expiresAt,
        invitedById: caller.id,
      },
      include: {
        role: { select: { name: true } },
        organisation: { select: { id: true, name: true } },
        outlet: { select: { id: true, name: true } },
      },
    });

    await this.auditService.log({
      userId: caller.id,
      organisationId,
      outletId: dto.outletId,
      action: 'invitation-created',
      resource: 'invitations',
      resourceId: invitation.id,
      metadata: { email: dto.email, role: targetRoleName },
    });

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role.name,
      organisationId: invitation.organisationId,
      organisationName: invitation.organisation.name,
      outletId: invitation.outletId,
      outletName: invitation.outlet?.name || null,
      expiresAt: invitation.expiresAt,
      invitationToken: rawToken, // Expose raw token for email/SMS delivery and test execution
    };
  }

  async listInvitations(organisationId: string, caller: AuthenticatedUser) {
    this.validateOrgAccess(organisationId, caller);

    return this.prisma.invitation.findMany({
      where: { organisationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        status: true,
        expiresAt: true,
        acceptedAt: true,
        createdAt: true,
        role: { select: { name: true } },
        outlet: { select: { id: true, name: true } },
      },
    });
  }

  async assignRole(
    organisationId: string,
    userId: string,
    dto: AssignRoleDto,
    caller: AuthenticatedUser,
  ) {
    this.validateOrgAccess(organisationId, caller);

    const targetRoleName = dto.roleName.trim().toUpperCase();

    // Privilege escalation check
    await this.permissionsService.validateRoleAssignment(
      caller,
      targetRoleName,
      organisationId,
      dto.outletId,
    );

    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!targetUser) {
      throw new NotFoundException(`User '${userId}' not found`);
    }

    const role = await this.prisma.role.findUnique({
      where: { name: targetRoleName },
    });
    if (!role) {
      throw new NotFoundException(`Role '${targetRoleName}' does not exist`);
    }

    // Check if role is already assigned
    const existing = await this.prisma.userRole.findFirst({
      where: {
        userId,
        roleId: role.id,
        organisationId,
        outletId: dto.outletId || null,
      },
    });

    if (existing) {
      throw new ConflictException(`User already has role '${targetRoleName}' in this context`);
    }

    const userRole = await this.prisma.userRole.create({
      data: {
        userId,
        roleId: role.id,
        organisationId,
        outletId: dto.outletId,
      },
      include: {
        role: { select: { name: true } },
        organisation: { select: { id: true, name: true } },
        outlet: { select: { id: true, name: true } },
      },
    });

    // If outlet-scoped, also register in UserOutlet
    if (dto.outletId) {
      await this.prisma.userOutlet.upsert({
        where: {
          userId_outletId: {
            userId,
            outletId: dto.outletId,
          },
        },
        update: {},
        create: {
          userId,
          outletId: dto.outletId,
        },
      });
    }

    await this.auditService.log({
      userId: caller.id,
      organisationId,
      outletId: dto.outletId,
      action: 'role-assigned',
      resource: 'user_roles',
      resourceId: userRole.id,
      metadata: { targetUserId: userId, role: targetRoleName },
    });

    return userRole;
  }

  async revokeRole(
    organisationId: string,
    userId: string,
    roleIdOrName: string,
    caller: AuthenticatedUser,
  ) {
    this.validateOrgAccess(organisationId, caller);

    const userRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        organisationId,
        OR: [{ id: roleIdOrName }, { roleId: roleIdOrName }, { role: { name: roleIdOrName.toUpperCase() } }],
      },
      include: {
        role: true,
      },
    });

    if (!userRole) {
      throw new NotFoundException('Specified user role assignment not found');
    }

    // Privilege escalation check on revocation
    await this.permissionsService.validateRoleAssignment(
      caller,
      userRole.role.name,
      organisationId,
      userRole.outletId,
    );

    await this.prisma.userRole.delete({
      where: { id: userRole.id },
    });

    await this.auditService.log({
      userId: caller.id,
      organisationId,
      outletId: userRole.outletId || undefined,
      action: 'role-revoked',
      resource: 'user_roles',
      resourceId: userRole.id,
      metadata: { targetUserId: userId, role: userRole.role.name },
    });

    return { message: `Role '${userRole.role.name}' revoked successfully` };
  }

  async listRoles(organisationId: string, userId: string, caller: AuthenticatedUser) {
    this.validateOrgAccess(organisationId, caller);

    return this.prisma.userRole.findMany({
      where: { userId, organisationId },
      include: {
        role: true,
        outlet: { select: { id: true, name: true, code: true } },
      },
    });
  }
}
