import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PermissionsService } from '../permissions/permissions.service';
import { AuthenticatedUser } from '../common/interfaces/request-with-user.interface';
import {
  CreateStaffDto,
  UpdateStaffDto,
  StaffStatusTransitionDto,
  InviteStaffDto,
  AcceptStaffInvitationDto,
  StaffOutletAssignmentDto,
  QueryStaffDto,
  StaffEmploymentStatusEnum,
} from './dto/staff-domain.dto';

// Valid status transitions
const VALID_TRANSITIONS: Record<StaffEmploymentStatusEnum, StaffEmploymentStatusEnum[]> = {
  INVITED: ['ACTIVE', 'INACTIVE', 'TERMINATED'],
  ACTIVE: ['ON_LEAVE', 'SUSPENDED', 'INACTIVE', 'TERMINATED'],
  ON_LEAVE: ['ACTIVE', 'INACTIVE', 'TERMINATED'],
  SUSPENDED: ['ACTIVE', 'INACTIVE', 'TERMINATED'],
  INACTIVE: ['ACTIVE', 'TERMINATED'],
  TERMINATED: [], // Terminal state
};

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * Creates a new StaffProfile, optionally creating the associated User identity.
   */
  async createStaff(organisationId: string, dto: CreateStaffDto, actor: AuthenticatedUser) {
    let targetUserId = dto.userId;

    // If no userId, create a new User identity
    if (!targetUserId) {
      if (!dto.email || !dto.firstName || !dto.lastName) {
        throw new BadRequestException('email, firstName, and lastName are required when creating a new staff user');
      }

      // Check if user with email already exists
      let user = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (!user) {
        const defaultPasswordHash = await bcrypt.hash('FitCoreDev2026!', 10);
        user = await this.prisma.user.create({
          data: {
            email: dto.email,
            firstName: dto.firstName,
            lastName: dto.lastName,
            displayName: dto.displayName || `${dto.firstName} ${dto.lastName}`,
            phone: dto.phone,
            passwordHash: defaultPasswordHash,
            status: 'ACTIVE',
          },
        });
      }
      targetUserId = user.id;
    }

    // Prevent duplicate StaffProfile for the same user in this organisation
    const existing = await this.prisma.staffProfile.findUnique({
      where: { userId: targetUserId },
    });
    if (existing) {
      throw new ConflictException(`Staff profile already exists for user ${targetUserId}`);
    }

    // Check employeeReference uniqueness within organisation
    if (dto.employeeReference) {
      const duplicateRef = await this.prisma.staffProfile.findUnique({
        where: {
          organisationId_employeeReference: {
            organisationId,
            employeeReference: dto.employeeReference,
          },
        },
      });
      if (duplicateRef) {
        throw new ConflictException(`Employee reference '${dto.employeeReference}' is already in use`);
      }
    }

    // Verify initial outlet if supplied
    if (dto.initialOutletId) {
      const outlet = await this.prisma.outlet.findFirst({
        where: { id: dto.initialOutletId, organisationId },
      });
      if (!outlet) {
        throw new BadRequestException(`Outlet '${dto.initialOutletId}' does not belong to organisation`);
      }
    }

    // Assign Role if supplied
    if (dto.roleName) {
      const role = await this.prisma.role.findUnique({ where: { name: dto.roleName } });
      if (role) {
        const existingUserRole = await this.prisma.userRole.findFirst({
          where: { userId: targetUserId, roleId: role.id, organisationId },
        });
        if (!existingUserRole) {
          await this.prisma.userRole.create({
            data: {
              userId: targetUserId,
              roleId: role.id,
              organisationId,
              outletId: dto.initialOutletId,
            },
          });
        }
      }
    }

    // Create StaffProfile
    const staff = await this.prisma.staffProfile.create({
      data: {
        userId: targetUserId,
        organisationId,
        displayName: dto.displayName || `${dto.firstName || ''} ${dto.lastName || ''}`.trim() || 'Staff Member',
        jobTitle: dto.jobTitle,
        employeeReference: dto.employeeReference,
        phone: dto.phone,
        workEmail: dto.workEmail || dto.email,
        bio: dto.bio,
        profilePhotoUrl: dto.profilePhotoUrl,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : new Date(),
        employmentStatus: 'ACTIVE',
      },
      include: {
        user: true,
        outletAssignments: true,
      },
    });

    // Create initial outlet assignment if specified
    if (dto.initialOutletId) {
      await this.prisma.staffOutletAssignment.create({
        data: {
          staffProfileId: staff.id,
          outletId: dto.initialOutletId,
          roleScope: dto.roleName,
          status: 'ACTIVE',
          isPrimary: true,
          assignedById: actor.id,
        },
      });

      // Ensure UserOutlet exists
      await this.prisma.userOutlet.upsert({
        where: { userId_outletId: { userId: targetUserId, outletId: dto.initialOutletId } },
        update: {},
        create: { userId: targetUserId, outletId: dto.initialOutletId },
      });
    }

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      outletId: dto.initialOutletId,
      action: 'STAFF_CREATED',
      resource: 'staff',
      resourceId: staff.id,
      metadata: { employeeReference: dto.employeeReference, jobTitle: dto.jobTitle },
    });

    return this.findStaffById(organisationId, staff.id, actor);
  }

  /**
   * Retrieves paginated staff directory with filtering and searching.
   */
  async findAllStaff(organisationId: string, query: QueryStaffDto, actor: AuthenticatedUser) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      organisationId,
      deletedAt: null,
    };

    // Filter by outlet if specified
    if (query.outletId) {
      where.outletAssignments = {
        some: {
          outletId: query.outletId,
          status: 'ACTIVE',
        },
      };
    }

    // Filter by status
    if (query.status) {
      where.employmentStatus = query.status;
    }

    // Filter by trainer
    if (query.isTrainer !== undefined) {
      where.trainerProfile = query.isTrainer ? { isNot: null } : null;
    }

    // Filter by roleName
    if (query.roleName) {
      where.user = {
        userRoles: {
          some: {
            organisationId,
            role: { name: query.roleName },
          },
        },
      };
    }

    // Search query
    if (query.search) {
      where.OR = [
        { displayName: { contains: query.search, mode: 'insensitive' } },
        { jobTitle: { contains: query.search, mode: 'insensitive' } },
        { employeeReference: { contains: query.search, mode: 'insensitive' } },
        { workEmail: { contains: query.search, mode: 'insensitive' } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.staffProfile.count({ where }),
      this.prisma.staffProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              status: true,
              userRoles: {
                where: { organisationId },
                include: { role: true },
              },
            },
          },
          outletAssignments: {
            include: { outlet: true },
          },
          trainerProfile: true,
        },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves single staff profile with complete relational context.
   */
  async findStaffById(organisationId: string, staffId: string, actor: AuthenticatedUser) {
    const staff = await this.prisma.staffProfile.findFirst({
      where: { id: staffId, organisationId, deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            status: true,
            userRoles: {
              where: { organisationId },
              include: { role: true, outlet: true },
            },
          },
        },
        outletAssignments: {
          include: { outlet: true },
        },
        trainerProfile: {
          include: { certifications: true },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException(`Staff member '${staffId}' not found in organisation`);
    }

    return staff;
  }

  /**
   * Updates staff profile details.
   */
  async updateStaff(
    organisationId: string,
    staffId: string,
    dto: UpdateStaffDto,
    actor: AuthenticatedUser,
  ) {
    const staff = await this.findStaffById(organisationId, staffId, actor);

    if (dto.employeeReference && dto.employeeReference !== staff.employeeReference) {
      const duplicate = await this.prisma.staffProfile.findUnique({
        where: {
          organisationId_employeeReference: {
            organisationId,
            employeeReference: dto.employeeReference,
          },
        },
      });
      if (duplicate) {
        throw new ConflictException(`Employee reference '${dto.employeeReference}' is already in use`);
      }
    }

    const updated = await this.prisma.staffProfile.update({
      where: { id: staffId },
      data: {
        displayName: dto.displayName,
        jobTitle: dto.jobTitle,
        phone: dto.phone,
        workEmail: dto.workEmail,
        bio: dto.bio,
        profilePhotoUrl: dto.profilePhotoUrl,
        employeeReference: dto.employeeReference,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
        terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : undefined,
      },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'STAFF_UPDATED',
      resource: 'staff',
      resourceId: staffId,
      metadata: { changes: dto },
    });

    return updated;
  }

  /**
   * Controlled employment status lifecycle transitions.
   */
  async transitionStatus(
    organisationId: string,
    staffId: string,
    targetStatus: StaffEmploymentStatusEnum,
    reason?: string,
    actor?: AuthenticatedUser,
  ) {
    const staff = await this.findStaffById(organisationId, staffId, actor!);
    const currentStatus = staff.employmentStatus as StaffEmploymentStatusEnum;

    if (currentStatus === targetStatus) {
      return staff;
    }

    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Invalid status transition: Cannot transition staff status from '${currentStatus}' to '${targetStatus}'. Allowed transitions: ${allowed.join(', ') || 'None (Terminal state)'}`,
      );
    }

    // Execute state transition in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.staffProfile.update({
        where: { id: staffId },
        data: {
          employmentStatus: targetStatus,
          terminationDate: targetStatus === 'TERMINATED' ? new Date() : staff.terminationDate,
        },
      });

      // If terminated or suspended, deactivate outlet assignments
      if (['TERMINATED', 'SUSPENDED', 'INACTIVE'].includes(targetStatus)) {
        await tx.staffOutletAssignment.updateMany({
          where: { staffProfileId: staffId, status: 'ACTIVE' },
          data: { status: 'INACTIVE', endDate: new Date() },
        });

        // If this staff has a trainer profile, close active client assignments
        const trainer = await tx.trainerProfile.findUnique({ where: { staffProfileId: staffId } });
        if (trainer) {
          await tx.trainerClientAssignment.updateMany({
            where: { trainerProfileId: trainer.id, status: 'ACTIVE' },
            data: { status: 'TERMINATED', endDate: new Date() },
          });

          await tx.trainerProfile.update({
            where: { id: trainer.id },
            data: { status: targetStatus === 'SUSPENDED' ? 'SUSPENDED' : 'INACTIVE' },
          });
        }
      }

      return updated;
    });

    await this.auditService.log({
      userId: actor?.id,
      organisationId,
      action: 'STAFF_STATUS_CHANGED',
      resource: 'staff',
      resourceId: staffId,
      metadata: { from: currentStatus, to: targetStatus, reason },
    });

    return result;
  }

  /**
   * Deactivates staff, revoking active sessions and closing trainer assignments.
   */
  async deactivateStaff(
    organisationId: string,
    staffId: string,
    reason: string,
    actor: AuthenticatedUser,
  ) {
    const staff = await this.findStaffById(organisationId, staffId, actor);

    // Transition status to INACTIVE
    await this.transitionStatus(organisationId, staffId, 'INACTIVE', reason, actor);

    // Revoke all active sessions for the user
    await this.prisma.session.updateMany({
      where: { userId: staff.userId, isValid: true },
      data: { isValid: false, revokedAt: new Date() },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'STAFF_DEACTIVATED',
      resource: 'staff',
      resourceId: staffId,
      metadata: { reason },
    });

    return { success: true, message: `Staff member ${staffId} successfully deactivated` };
  }

  /**
   * Assigns staff to an outlet within permitted tenant scope.
   */
  async assignOutlet(
    organisationId: string,
    staffId: string,
    dto: StaffOutletAssignmentDto,
    actor: AuthenticatedUser,
  ) {
    const staff = await this.findStaffById(organisationId, staffId, actor);

    // Verify outlet belongs to organisation
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: dto.outletId, organisationId },
    });
    if (!outlet) {
      throw new BadRequestException(`Outlet '${dto.outletId}' does not belong to organisation`);
    }

    // Check outlet manager scope
    const isOrgAdmin = actor.isSuperAdmin || actor.roles.some((r) =>
      r.organisationId === organisationId && ['ORGANISATION_OWNER', 'FINANCE'].includes(r.role),
    );
    if (!isOrgAdmin) {
      const actorOutlets = [actor.primaryOutletId, ...actor.roles.map((r) => r.outletId)].filter(Boolean);
      if (!actorOutlets.includes(dto.outletId)) {
        throw new ForbiddenException(`You do not have administrative authority over outlet ${dto.outletId}`);
      }
    }

    const assignment = await this.prisma.staffOutletAssignment.upsert({
      where: {
        staffProfileId_outletId: {
          staffProfileId: staffId,
          outletId: dto.outletId,
        },
      },
      update: {
        roleScope: dto.roleScope,
        isPrimary: dto.isPrimary ?? false,
        status: dto.status || 'ACTIVE',
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
      create: {
        staffProfileId: staffId,
        outletId: dto.outletId,
        roleScope: dto.roleScope,
        isPrimary: dto.isPrimary ?? false,
        status: dto.status || 'ACTIVE',
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        assignedById: actor.id,
      },
    });

    // Ensure UserOutlet exists
    await this.prisma.userOutlet.upsert({
      where: { userId_outletId: { userId: staff.userId, outletId: dto.outletId } },
      update: {},
      create: { userId: staff.userId, outletId: dto.outletId },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      outletId: dto.outletId,
      action: 'STAFF_OUTLET_ASSIGNED',
      resource: 'staff',
      resourceId: staffId,
      metadata: { outletId: dto.outletId, roleScope: dto.roleScope },
    });

    return assignment;
  }

  /**
   * Removes or deactivates an outlet assignment.
   */
  async removeOutlet(
    organisationId: string,
    staffId: string,
    outletId: string,
    actor: AuthenticatedUser,
  ) {
    await this.findStaffById(organisationId, staffId, actor);

    await this.prisma.staffOutletAssignment.deleteMany({
      where: { staffProfileId: staffId, outletId },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      outletId,
      action: 'STAFF_OUTLET_REMOVED',
      resource: 'staff',
      resourceId: staffId,
      metadata: { outletId },
    });

    return { success: true };
  }

  /**
   * Invites new staff member with single-use cryptographic token.
   */
  async inviteStaff(organisationId: string, dto: InviteStaffDto, actor: AuthenticatedUser) {
    const role = await this.prisma.role.findUnique({ where: { name: dto.roleName } });
    if (!role) {
      throw new NotFoundException(`Role '${dto.roleName}' does not exist`);
    }

    // Role assignment hierarchy check
    await this.permissionsService.validateRoleAssignment(
      actor,
      dto.roleName,
      organisationId,
      dto.outletId,
    );

    if (dto.outletId) {
      const outlet = await this.prisma.outlet.findFirst({
        where: { id: dto.outletId, organisationId },
      });
      if (!outlet) {
        throw new BadRequestException(`Outlet '${dto.outletId}' does not belong to organisation`);
      }
    }

    // Generate secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await this.prisma.invitation.create({
      data: {
        email: dto.email,
        organisationId,
        outletId: dto.outletId,
        roleId: role.id,
        tokenHash,
        status: 'PENDING',
        expiresAt,
        invitedById: actor.id,
      },
      include: { role: true, outlet: true },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      outletId: dto.outletId,
      action: 'STAFF_INVITED',
      resource: 'staff',
      resourceId: invitation.id,
      metadata: { email: dto.email, role: dto.roleName, jobTitle: dto.jobTitle },
    });

    return {
      invitationId: invitation.id,
      email: invitation.email,
      role: role.name,
      outletId: invitation.outletId,
      expiresAt: invitation.expiresAt,
      invitationToken: rawToken, // Delivered for email link creation
    };
  }

  /**
   * Accepts invitation and initializes active StaffProfile and User identity.
   */
  async acceptInvitation(token: string, dto: AcceptStaffInvitationDto) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
      include: { role: true, organisation: true, outlet: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invalid invitation token');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(`Invitation has already been ${invitation.status.toLowerCase()}`);
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Invitation has expired');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create or link user
      let user = await tx.user.findUnique({ where: { email: invitation.email } });
      if (!user) {
        user = await tx.user.create({
          data: {
            email: invitation.email,
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            displayName: `${dto.firstName} ${dto.lastName}`,
            phone: dto.phone,
            status: 'ACTIVE',
            emailVerifiedAt: new Date(),
          },
        });
      }

      // 2. Grant role
      await tx.userRole.upsert({
        where: { id: `role_${user.id}_${invitation.organisationId}` },
        update: { roleId: invitation.roleId, outletId: invitation.outletId },
        create: {
          userId: user.id,
          roleId: invitation.roleId,
          organisationId: invitation.organisationId,
          outletId: invitation.outletId,
        },
      });

      // 3. Create outlet mapping if outlet specified
      if (invitation.outletId) {
        await tx.userOutlet.upsert({
          where: { userId_outletId: { userId: user.id, outletId: invitation.outletId } },
          update: {},
          create: { userId: user.id, outletId: invitation.outletId },
        });
      }

      // 4. Create StaffProfile
      const staff = await tx.staffProfile.upsert({
        where: { userId: user.id },
        update: { employmentStatus: 'ACTIVE' },
        create: {
          userId: user.id,
          organisationId: invitation.organisationId,
          displayName: `${dto.firstName} ${dto.lastName}`,
          jobTitle: invitation.role.name.replace(/_/g, ' '),
          employmentStatus: 'ACTIVE',
          phone: dto.phone,
          workEmail: invitation.email,
          hireDate: new Date(),
        },
      });

      // 5. Create StaffOutletAssignment
      if (invitation.outletId) {
        await tx.staffOutletAssignment.upsert({
          where: {
            staffProfileId_outletId: {
              staffProfileId: staff.id,
              outletId: invitation.outletId,
            },
          },
          update: { status: 'ACTIVE' },
          create: {
            staffProfileId: staff.id,
            outletId: invitation.outletId,
            roleScope: invitation.role.name,
            status: 'ACTIVE',
            isPrimary: true,
          },
        });
      }

      // 6. If role is TRAINER, create TrainerProfile automatically
      if (invitation.role.name === 'TRAINER') {
        await tx.trainerProfile.upsert({
          where: { staffProfileId: staff.id },
          update: { status: 'ACTIVE' },
          create: {
            staffProfileId: staff.id,
            organisationId: invitation.organisationId,
            professionalName: `${dto.firstName} ${dto.lastName}`,
            status: 'ACTIVE',
          },
        });
      }

      // 7. Mark invitation accepted
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });

      return {
        userId: user.id,
        staffProfileId: staff.id,
        email: user.email,
        organisationId: invitation.organisationId,
        role: invitation.role.name,
      };
    });
  }
}
