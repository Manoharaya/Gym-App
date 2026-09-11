import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AssignStaffOutletDto, TransferStaffDto } from '../dto/staff-assignment.dto';
import { EnterpriseResourceNotFoundException } from '../domain/enterprise-errors';
import { EnterpriseEvent } from '../domain/enterprise-events';

@Injectable()
export class EnterpriseStaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async assignStaffOutlet(
    organisationId: string,
    dto: AssignStaffOutletDto,
    actorUserId?: string,
  ) {
    const staff = await this.prisma.staffProfile.findFirst({
      where: { id: dto.staffProfileId, organisationId, deletedAt: null },
    });
    if (!staff) {
      throw new EnterpriseResourceNotFoundException('StaffProfile', dto.staffProfileId);
    }

    const outlet = await this.prisma.outlet.findFirst({
      where: { id: dto.outletId, organisationId, deletedAt: null },
    });
    if (!outlet) {
      throw new EnterpriseResourceNotFoundException('Outlet', dto.outletId);
    }

    // If setting as primary, demote existing primary assignments
    if (dto.isPrimary) {
      await this.prisma.staffOutletAssignment.updateMany({
        where: { staffProfileId: dto.staffProfileId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const assignment = await this.prisma.staffOutletAssignment.upsert({
      where: {
        staffProfileId_outletId: {
          staffProfileId: dto.staffProfileId,
          outletId: dto.outletId,
        },
      },
      update: {
        roleScope: dto.roleScope,
        status: 'ACTIVE',
        assignmentType: dto.assignmentType || 'PRIMARY',
        isPrimary: dto.isPrimary ?? false,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        assignedById: actorUserId,
      },
      create: {
        staffProfileId: dto.staffProfileId,
        outletId: dto.outletId,
        roleScope: dto.roleScope,
        status: 'ACTIVE',
        assignmentType: dto.assignmentType || 'PRIMARY',
        isPrimary: dto.isPrimary ?? false,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        assignedById: actorUserId,
      },
      include: {
        outlet: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    await this.auditService.log({
      action: 'enterprise.staff.assigned',
      resource: 'StaffOutletAssignment',
      resourceId: assignment.id,
      organisationId,
      outletId: dto.outletId,
      userId: actorUserId,
      metadata: {
        staffProfileId: dto.staffProfileId,
        assignmentType: dto.assignmentType,
        isPrimary: dto.isPrimary,
      },
    });

    return assignment;
  }

  async transferStaff(
    organisationId: string,
    dto: TransferStaffDto,
    actorUserId?: string,
  ) {
    const staff = await this.prisma.staffProfile.findFirst({
      where: { id: dto.staffProfileId, organisationId, deletedAt: null },
    });
    if (!staff) {
      throw new EnterpriseResourceNotFoundException('StaffProfile', dto.staffProfileId);
    }

    const fromOutlet = await this.prisma.outlet.findFirst({
      where: { id: dto.fromOutletId, organisationId },
    });
    if (!fromOutlet) {
      throw new EnterpriseResourceNotFoundException('Origin Outlet', dto.fromOutletId);
    }

    const toOutlet = await this.prisma.outlet.findFirst({
      where: { id: dto.toOutletId, organisationId },
    });
    if (!toOutlet) {
      throw new EnterpriseResourceNotFoundException('Destination Outlet', dto.toOutletId);
    }

    // 1. Update previous assignment
    const previousAssignment = await this.prisma.staffOutletAssignment.findUnique({
      where: {
        staffProfileId_outletId: {
          staffProfileId: dto.staffProfileId,
          outletId: dto.fromOutletId,
        },
      },
    });

    if (previousAssignment) {
      if (dto.retainSecondaryAccess) {
        await this.prisma.staffOutletAssignment.update({
          where: { id: previousAssignment.id },
          data: {
            isPrimary: false,
            assignmentType: 'SECONDARY',
          },
        });
      } else {
        await this.prisma.staffOutletAssignment.update({
          where: { id: previousAssignment.id },
          data: {
            status: 'INACTIVE',
            isPrimary: false,
            endDate: new Date(),
          },
        });
      }
    }

    // 2. Set new assignment at target outlet as primary
    const newAssignment = await this.prisma.staffOutletAssignment.upsert({
      where: {
        staffProfileId_outletId: {
          staffProfileId: dto.staffProfileId,
          outletId: dto.toOutletId,
        },
      },
      update: {
        status: 'ACTIVE',
        assignmentType: 'PRIMARY',
        isPrimary: true,
        roleScope: dto.newRoleScope || previousAssignment?.roleScope,
        startDate: new Date(),
        endDate: null,
        assignedById: actorUserId,
      },
      create: {
        staffProfileId: dto.staffProfileId,
        outletId: dto.toOutletId,
        status: 'ACTIVE',
        assignmentType: 'PRIMARY',
        isPrimary: true,
        roleScope: dto.newRoleScope || previousAssignment?.roleScope,
        startDate: new Date(),
        assignedById: actorUserId,
      },
    });

    await this.auditService.log({
      action: EnterpriseEvent.STAFF_OUTLET_TRANSFERRED,
      resource: 'StaffOutletAssignment',
      resourceId: newAssignment.id,
      organisationId,
      outletId: dto.toOutletId,
      userId: actorUserId,
      metadata: {
        staffProfileId: dto.staffProfileId,
        fromOutletId: dto.fromOutletId,
        toOutletId: dto.toOutletId,
        retainSecondaryAccess: dto.retainSecondaryAccess,
        transferReason: dto.transferReason,
      },
    });

    return newAssignment;
  }

  async getStaffAssignments(organisationId: string, staffProfileId: string) {
    return this.prisma.staffOutletAssignment.findMany({
      where: {
        staffProfileId,
        staffProfile: { organisationId },
      },
      include: {
        outlet: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
            state: true,
          },
        },
      },
      orderBy: { isPrimary: 'desc' },
    });
  }
}
