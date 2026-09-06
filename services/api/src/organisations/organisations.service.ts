import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/request-with-user.interface';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { PaginationQueryDto, calculatePagination } from '../common/dto/pagination.dto';

@Injectable()
export class OrganisationsService {
  private readonly logger = new Logger(OrganisationsService.name);

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

  private async generateUniqueSlug(baseName: string, requestedSlug?: string): Promise<string> {
    let candidate = requestedSlug ? this.slugify(requestedSlug) : this.slugify(baseName);
    if (!candidate) candidate = 'org';

    let uniqueSlug = candidate;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.organisation.findUnique({
        where: { slug: uniqueSlug },
      });

      if (!existing) {
        return uniqueSlug;
      }

      counter++;
      uniqueSlug = `${candidate}-${counter}`;
    }
  }

  async create(dto: CreateOrganisationDto, user: AuthenticatedUser) {
    const slug = await this.generateUniqueSlug(dto.name, dto.slug);

    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organisation.create({
        data: {
          name: dto.name.trim(),
          slug,
          timezone: dto.timezone || 'Australia/Perth',
          currency: dto.currency || 'AUD',
          country: dto.country || 'Australia',
          status: 'ACTIVE',
        },
      });

      let createdOwner: any = null;
      if (dto.owner) {
        const passwordHash = await bcrypt.hash(dto.owner.password, 10);
        const ownerUser = await tx.user.upsert({
          where: { email: dto.owner.email.toLowerCase().trim() },
          update: {
            firstName: dto.owner.firstName.trim(),
            lastName: dto.owner.lastName.trim(),
            displayName: `${dto.owner.firstName.trim()} ${dto.owner.lastName.trim()}`,
          },
          create: {
            email: dto.owner.email.toLowerCase().trim(),
            passwordHash,
            firstName: dto.owner.firstName.trim(),
            lastName: dto.owner.lastName.trim(),
            displayName: `${dto.owner.firstName.trim()} ${dto.owner.lastName.trim()}`,
            phone: dto.owner.phone,
            status: 'ACTIVE',
            emailVerifiedAt: new Date(),
          },
        });

        const ownerRole = await tx.role.findUnique({
          where: { name: 'ORGANISATION_OWNER' },
        });

        if (ownerRole) {
          await tx.userRole.create({
            data: {
              userId: ownerUser.id,
              roleId: ownerRole.id,
              organisationId: org.id,
            },
          });
        }

        createdOwner = {
          id: ownerUser.id,
          email: ownerUser.email,
          name: ownerUser.displayName,
        };
      }

      return { org, owner: createdOwner };
    });

    await this.auditService.log({
      userId: user.id,
      organisationId: result.org.id,
      action: 'organisation-created',
      resource: 'organisations',
      resourceId: result.org.id,
      metadata: { name: result.org.name, slug: result.org.slug, ownerEmail: dto.owner?.email },
    });

    return {
      ...result.org,
      owner: result.owner,
    };
  }

  async findAll(user: AuthenticatedUser, query: PaginationQueryDto) {
    const where: any = {
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (!user.isSuperAdmin) {
      const allowedOrgIds = Array.from(
        new Set(
          [user.primaryOrganisationId, ...user.roles.map((r) => r.organisationId)].filter(Boolean) as string[],
        ),
      );
      where.id = { in: allowedOrgIds };
    }

    const total = await this.prisma.organisation.count({ where });
    const pagination = calculatePagination(query.page, query.limit, total);

    const data = await this.prisma.organisation.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { outlets: true } },
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

  async findById(id: string, user: AuthenticatedUser) {
    const org = await this.prisma.organisation.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        deletedAt: null,
      },
      include: {
        outlets: {
          where: { deletedAt: null },
        },
        _count: { select: { outlets: true, userRoles: true } },
      },
    });

    if (!org) {
      throw new NotFoundException(`Organisation with identifier '${id}' not found`);
    }

    if (!user.isSuperAdmin) {
      const allowedOrgs = new Set([
        user.primaryOrganisationId,
        ...user.roles.map((r) => r.organisationId),
      ]);

      if (!allowedOrgs.has(org.id)) {
        throw new ForbiddenException(
          `Cross-tenant access forbidden: User ${user.email} cannot access organisation ${id}`,
        );
      }
    }

    return org;
  }

  async update(id: string, dto: UpdateOrganisationDto, user: AuthenticatedUser) {
    const existing = await this.findById(id, user);

    const updated = await this.prisma.organisation.update({
      where: { id: existing.id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        timezone: dto.timezone,
        currency: dto.currency,
        country: dto.country,
        status: dto.status,
      },
    });

    await this.auditService.log({
      userId: user.id,
      organisationId: updated.id,
      action: 'organisation-updated',
      resource: 'organisations',
      resourceId: updated.id,
      metadata: dto,
    });

    return updated;
  }

  async softDelete(id: string, user: AuthenticatedUser) {
    const existing = await this.findById(id, user);

    const deleted = await this.prisma.organisation.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
        status: 'DELETED',
      },
    });

    await this.auditService.log({
      userId: user.id,
      organisationId: deleted.id,
      action: 'organisation-deleted',
      resource: 'organisations',
      resourceId: deleted.id,
    });

    return { message: `Organisation '${existing.name}' soft-deleted successfully` };
  }
}
