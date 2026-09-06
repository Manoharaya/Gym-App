import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../common/interfaces/request-with-user.interface';

export interface CreateAuditLogParams {
  userId?: string;
  organisationId?: string;
  outletId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: CreateAuditLogParams) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: params.userId,
          organisationId: params.organisationId,
          outletId: params.outletId,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId,
          metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          requestId: params.requestId,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to record audit log: ${err.message}`);
    }
  }

  async findAll(user: AuthenticatedUser) {
    if (user.isSuperAdmin) {
      return this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    }

    const orgIds = Array.from(
      new Set([user.primaryOrganisationId, ...user.roles.map((r) => r.organisationId)].filter(Boolean) as string[]),
    );

    return this.prisma.auditLog.findMany({
      where: {
        organisationId: { in: orgIds },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
