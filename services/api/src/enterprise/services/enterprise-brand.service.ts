import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateBrandDto, UpdateBrandDto } from '../dto/create-brand.dto';
import { EnterpriseResourceNotFoundException } from '../domain/enterprise-errors';
import { EnterpriseEvent } from '../domain/enterprise-events';

@Injectable()
export class EnterpriseBrandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createBrand(organisationId: string, dto: CreateBrandDto, actorUserId?: string) {
    const existing = await this.prisma.organisationBrand.findFirst({
      where: {
        organisationId,
        OR: [{ slug: dto.slug }, { code: dto.code }],
      },
    });

    if (existing) {
      throw new ConflictException(
        `A brand with slug '${dto.slug}' or code '${dto.code}' already exists in this organisation`,
      );
    }

    const brand = await this.prisma.organisationBrand.create({
      data: {
        organisationId,
        name: dto.name,
        code: dto.code.toUpperCase(),
        slug: dto.slug.toLowerCase(),
        description: dto.description,
        logoUrl: dto.logoUrl,
        website: dto.website,
        primaryColor: dto.primaryColor,
        secondaryColor: dto.secondaryColor,
        accentColor: dto.accentColor,
      },
    });

    await this.auditService.log({
      action: EnterpriseEvent.BRAND_CREATED,
      resource: 'EnterpriseBrand',
      resourceId: brand.id,
      organisationId,
      userId: actorUserId,
      metadata: { brandName: brand.name, code: brand.code },
    });

    return brand;
  }

  async getBrands(organisationId: string, includeArchived = false) {
    return this.prisma.organisationBrand.findMany({
      where: {
        organisationId,
        ...(includeArchived ? {} : { deletedAt: null, status: { not: 'ARCHIVED' } }),
      },
      include: {
        _count: {
          select: {
            outlets: true,
            enterpriseRoleAssignments: true,
            enterprisePolicies: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getBrandById(organisationId: string, brandId: string) {
    const brand = await this.prisma.organisationBrand.findFirst({
      where: { id: brandId, organisationId },
      include: {
        outlets: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
            state: true,
            status: true,
          },
        },
        _count: {
          select: {
            enterprisePolicies: true,
            enterpriseRoleAssignments: true,
          },
        },
      },
    });

    if (!brand) {
      throw new EnterpriseResourceNotFoundException('Brand', brandId);
    }

    return brand;
  }

  async updateBrand(
    organisationId: string,
    brandId: string,
    dto: UpdateBrandDto,
    actorUserId?: string,
  ) {
    await this.getBrandById(organisationId, brandId);

    const updated = await this.prisma.organisationBrand.update({
      where: { id: brandId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
        ...(dto.website !== undefined ? { website: dto.website } : {}),
        ...(dto.primaryColor !== undefined ? { primaryColor: dto.primaryColor } : {}),
        ...(dto.secondaryColor !== undefined ? { secondaryColor: dto.secondaryColor } : {}),
        ...(dto.accentColor !== undefined ? { accentColor: dto.accentColor } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });

    await this.auditService.log({
      action: EnterpriseEvent.BRAND_UPDATED,
      resource: 'EnterpriseBrand',
      resourceId: brandId,
      organisationId,
      userId: actorUserId,
      metadata: dto,
    });

    return updated;
  }

  async archiveBrand(organisationId: string, brandId: string, actorUserId?: string) {
    const brand = await this.getBrandById(organisationId, brandId);

    // Reassign outlets or disassociate them before archiving
    if (brand.outlets.length > 0) {
      await this.prisma.outlet.updateMany({
        where: { brandId: brand.id },
        data: { brandId: null },
      });
    }

    const archived = await this.prisma.organisationBrand.update({
      where: { id: brandId },
      data: {
        status: 'ARCHIVED',
        deletedAt: new Date(),
      },
    });

    await this.auditService.log({
      action: EnterpriseEvent.BRAND_ARCHIVED,
      resource: 'EnterpriseBrand',
      resourceId: brandId,
      organisationId,
      userId: actorUserId,
      metadata: { reassignedOutletsCount: brand.outlets.length },
    });

    return archived;
  }
}
