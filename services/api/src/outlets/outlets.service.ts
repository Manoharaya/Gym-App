import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/request-with-user.interface';
import { CreateOutletDto } from './dto/create-outlet.dto';
import { UpdateOutletDto } from './dto/update-outlet.dto';
import { PaginationQueryDto, calculatePagination } from '../common/dto/pagination.dto';

@Injectable()
export class OutletsService {
  private readonly logger = new Logger(OutletsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

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

  async create(organisationId: string, dto: CreateOutletDto, user: AuthenticatedUser) {
    this.validateOrgAccess(organisationId, user);

    // Verify organisation exists
    const org = await this.prisma.organisation.findFirst({
      where: { id: organisationId, deletedAt: null },
    });
    if (!org) {
      throw new NotFoundException(`Organisation '${organisationId}' not found`);
    }

    // Check code collision within organisation
    const existingCode = await this.prisma.outlet.findUnique({
      where: {
        organisationId_code: {
          organisationId,
          code: dto.code.trim().toUpperCase(),
        },
      },
    });
    if (existingCode) {
      throw new ConflictException(
        `Outlet code '${dto.code}' already exists in organisation '${org.name}'`,
      );
    }

    // Generate unique slug within organisation
    let candidateSlug = dto.slug ? this.slugify(dto.slug) : this.slugify(dto.name);
    let uniqueSlug = candidateSlug;
    let counter = 1;

    while (true) {
      const existingSlug = await this.prisma.outlet.findUnique({
        where: {
          organisationId_slug: {
            organisationId,
            slug: uniqueSlug,
          },
        },
      });

      if (!existingSlug) break;
      counter++;
      uniqueSlug = `${candidateSlug}-${counter}`;
    }

    const outlet = await this.prisma.outlet.create({
      data: {
        organisationId,
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        slug: uniqueSlug,
        timezone: dto.timezone || org.timezone,
        address: dto.address.trim(),
        city: dto.city.trim(),
        state: dto.state.trim(),
        country: dto.country || org.country,
        postalCode: dto.postalCode.trim(),
        phone: dto.phone,
        email: dto.email,
        status: 'ACTIVE',
      },
      include: {
        organisation: { select: { id: true, name: true, slug: true } },
      },
    });

    await this.auditService.log({
      userId: user.id,
      organisationId,
      outletId: outlet.id,
      action: 'outlet-created',
      resource: 'outlets',
      resourceId: outlet.id,
      metadata: { name: outlet.name, code: outlet.code },
    });

    return outlet;
  }

  async findAll(organisationId: string, user: AuthenticatedUser, query?: PaginationQueryDto) {
    this.validateOrgAccess(organisationId, user);

    const isOrgWide =
      user.isSuperAdmin ||
      user.roles.some(
        (r) =>
          r.organisationId === organisationId &&
          ['ORGANISATION_OWNER', 'FINANCE'].includes(r.role),
      );

    const where: any = {
      organisationId,
      deletedAt: null,
    };

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (!isOrgWide) {
      const allowedOutletIds = Array.from(
        new Set(
          [
            user.primaryOutletId,
            ...user.roles
              .filter((r) => r.organisationId === organisationId)
              .map((r) => r.outletId),
          ].filter(Boolean) as string[],
        ),
      );
      where.id = { in: allowedOutletIds };
    }

    const total = await this.prisma.outlet.count({ where });
    const pagination = calculatePagination(query?.page, query?.limit, total);

    const data = await this.prisma.outlet.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        organisation: { select: { id: true, name: true, slug: true } },
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

  async findById(organisationId: string, outletId: string, user: AuthenticatedUser) {
    this.validateOrgAccess(organisationId, user);

    const outlet = await this.prisma.outlet.findFirst({
      where: {
        OR: [{ id: outletId }, { slug: outletId }],
        organisationId,
        deletedAt: null,
      },
      include: {
        organisation: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!outlet) {
      throw new NotFoundException(`Outlet '${outletId}' not found in organisation '${organisationId}'`);
    }

    // Branch scoping check
    const isOrgWide =
      user.isSuperAdmin ||
      user.roles.some(
        (r) =>
          r.organisationId === organisationId &&
          ['ORGANISATION_OWNER', 'FINANCE'].includes(r.role),
      );

    if (!isOrgWide) {
      const allowedOutletIds = new Set(
        [
          user.primaryOutletId,
          ...user.roles
            .filter((r) => r.organisationId === organisationId)
            .map((r) => r.outletId),
        ].filter(Boolean),
      );
      if (!allowedOutletIds.has(outlet.id)) {
        throw new ForbiddenException(
          `Access forbidden: User is not assigned to outlet '${outlet.name}'`,
        );
      }
    }

    return outlet;
  }

  async findByIdFlat(id: string, user: AuthenticatedUser) {
    const outlet = await this.prisma.outlet.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        deletedAt: null,
      },
      include: {
        organisation: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!outlet) {
      throw new NotFoundException(`Outlet with identifier '${id}' not found`);
    }

    this.validateOrgAccess(outlet.organisationId, user);

    const isOrgWide =
      user.isSuperAdmin ||
      user.roles.some(
        (r) =>
          r.organisationId === outlet.organisationId &&
          ['ORGANISATION_OWNER', 'FINANCE'].includes(r.role),
      );

    if (!isOrgWide) {
      const allowedOutletIds = new Set(
        [
          user.primaryOutletId,
          ...user.roles
            .filter((r) => r.organisationId === outlet.organisationId)
            .map((r) => r.outletId),
        ].filter(Boolean),
      );
      if (!allowedOutletIds.has(outlet.id)) {
        throw new ForbiddenException(
          `Access forbidden: User is not assigned to outlet '${outlet.name}'`,
        );
      }
    }

    return outlet;
  }

  async update(
    organisationId: string,
    outletId: string,
    dto: UpdateOutletDto,
    user: AuthenticatedUser,
  ) {
    const existing = await this.findById(organisationId, outletId, user);

    const updated = await this.prisma.outlet.update({
      where: { id: existing.id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        code: dto.code !== undefined ? dto.code.trim().toUpperCase() : undefined,
        timezone: dto.timezone,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        phone: dto.phone,
        email: dto.email,
        status: dto.status,
      },
      include: {
        organisation: { select: { id: true, name: true, slug: true } },
      },
    });

    await this.auditService.log({
      userId: user.id,
      organisationId,
      outletId: updated.id,
      action: 'outlet-updated',
      resource: 'outlets',
      resourceId: updated.id,
      metadata: dto,
    });

    return updated;
  }

  async softDelete(organisationId: string, outletId: string, user: AuthenticatedUser) {
    const existing = await this.findById(organisationId, outletId, user);

    const deleted = await this.prisma.outlet.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
        status: 'DELETED',
      },
    });

    await this.auditService.log({
      userId: user.id,
      organisationId,
      outletId: deleted.id,
      action: 'outlet-deleted',
      resource: 'outlets',
      resourceId: deleted.id,
    });

    return { message: `Outlet '${existing.name}' soft-deleted successfully` };
  }
}
