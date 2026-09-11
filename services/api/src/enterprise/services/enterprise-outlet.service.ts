import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  CreateEnterpriseOutletDto,
  UpdateEnterpriseOutletDto,
  TransferOutletDto,
} from '../dto/create-outlet-enterprise.dto';
import { EnterpriseResourceNotFoundException } from '../domain/enterprise-errors';
import { EnterpriseEvent } from '../domain/enterprise-events';

@Injectable()
export class EnterpriseOutletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createOutlet(
    organisationId: string,
    dto: CreateEnterpriseOutletDto,
    actorUserId?: string,
  ) {
    const existing = await this.prisma.outlet.findFirst({
      where: {
        organisationId,
        OR: [{ slug: dto.slug }, { code: dto.code }],
      },
    });

    if (existing) {
      throw new ConflictException(
        `An outlet with slug '${dto.slug}' or code '${dto.code}' already exists in this organisation`,
      );
    }

    if (dto.brandId) {
      const brand = await this.prisma.organisationBrand.findFirst({
        where: { id: dto.brandId, organisationId, deletedAt: null },
      });
      if (!brand) {
        throw new EnterpriseResourceNotFoundException('Brand', dto.brandId);
      }
    }

    const outlet = await this.prisma.outlet.create({
      data: {
        organisationId,
        name: dto.name,
        slug: dto.slug.toLowerCase(),
        code: dto.code.toUpperCase(),
        brandId: dto.brandId,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country || 'Australia',
        postalCode: dto.postalCode,
        timezone: dto.timezone || 'Australia/Perth',
        currency: dto.currency || 'AUD',
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        managerUserId: dto.managerUserId,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    await this.auditService.log({
      action: 'enterprise.outlet.created',
      resource: 'EnterpriseOutlet',
      resourceId: outlet.id,
      organisationId,
      outletId: outlet.id,
      userId: actorUserId,
      metadata: { outletName: outlet.name, code: outlet.code, brandId: dto.brandId },
    });

    return outlet;
  }

  async getOutlets(
    organisationId: string,
    filters?: {
      brandId?: string;
      region?: string;
      status?: string;
      search?: string;
    },
  ) {
    return this.prisma.outlet.findMany({
      where: {
        organisationId,
        deletedAt: null,
        ...(filters?.brandId ? { brandId: filters.brandId } : {}),
        ...(filters?.region ? { state: filters.region } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { code: { contains: filters.search, mode: 'insensitive' } },
                { city: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            code: true,
            primaryColor: true,
          },
        },
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
      orderBy: { name: 'asc' },
    });
  }

  async getOutletById(organisationId: string, outletId: string) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: outletId, organisationId, deletedAt: null },
      include: {
        brand: true,
        managerUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            email: true,
          },
        },
        staffOutletAssignments: {
          where: { status: 'ACTIVE' },
          include: {
            staffProfile: {
              include: {
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
            },
          },
        },
        _count: {
          select: {
            memberOutlets: true,
            bookings: true,
          },
        },
      },
    });

    if (!outlet) {
      throw new EnterpriseResourceNotFoundException('Outlet', outletId);
    }

    return outlet;
  }

  async updateOutlet(
    organisationId: string,
    outletId: string,
    dto: UpdateEnterpriseOutletDto,
    actorUserId?: string,
  ) {
    await this.getOutletById(organisationId, outletId);

    if (dto.brandId) {
      const brand = await this.prisma.organisationBrand.findFirst({
        where: { id: dto.brandId, organisationId, deletedAt: null },
      });
      if (!brand) {
        throw new EnterpriseResourceNotFoundException('Brand', dto.brandId);
      }
    }

    const updated = await this.prisma.outlet.update({
      where: { id: outletId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.brandId !== undefined ? { brandId: dto.brandId } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.state !== undefined ? { state: dto.state } : {}),
        ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.website !== undefined ? { website: dto.website } : {}),
        ...(dto.managerUserId !== undefined ? { managerUserId: dto.managerUserId } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });

    await this.auditService.log({
      action: 'enterprise.outlet.updated',
      resource: 'EnterpriseOutlet',
      resourceId: outletId,
      organisationId,
      outletId,
      userId: actorUserId,
      metadata: dto,
    });

    return updated;
  }

  async transferOutletBrand(
    organisationId: string,
    outletId: string,
    dto: TransferOutletDto,
    actorUserId?: string,
  ) {
    const outlet = await this.getOutletById(organisationId, outletId);
    const targetBrand = await this.prisma.organisationBrand.findFirst({
      where: { id: dto.targetBrandId, organisationId, deletedAt: null },
    });

    if (!targetBrand) {
      throw new EnterpriseResourceNotFoundException('Target Brand', dto.targetBrandId);
    }

    const previousBrandId = outlet.brandId;

    const updated = await this.prisma.outlet.update({
      where: { id: outletId },
      data: { brandId: dto.targetBrandId },
    });

    await this.auditService.log({
      action: EnterpriseEvent.OUTLET_TRANSFERRED,
      resource: 'EnterpriseOutlet',
      resourceId: outletId,
      organisationId,
      outletId,
      userId: actorUserId,
      metadata: {
        previousBrandId,
        targetBrandId: dto.targetBrandId,
        reason: dto.reason,
      },
    });

    return updated;
  }

  async archiveOutlet(organisationId: string, outletId: string, actorUserId?: string) {
    const outlet = await this.getOutletById(organisationId, outletId);

    // Soft-deactivate outlet to preserve historical data
    const updated = await this.prisma.outlet.update({
      where: { id: outletId },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
      },
    });

    await this.auditService.log({
      action: EnterpriseEvent.OUTLET_ARCHIVED,
      resource: 'EnterpriseOutlet',
      resourceId: outletId,
      organisationId,
      outletId,
      userId: actorUserId,
      metadata: { previousStatus: outlet.status },
    });

    return updated;
  }
}
