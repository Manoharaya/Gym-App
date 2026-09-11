import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface RecordMarketplaceAuditParams {
  organisationId?: string | null;
  listingId?: string | null;
  installationId?: string | null;
  userId?: string | null;
  action: string;
  resource?: string;
  resourceId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class MarketplaceAuditService {
  private readonly logger = new Logger(MarketplaceAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: RecordMarketplaceAuditParams): Promise<void> {
    try {
      await this.prisma.marketplaceAuditLog.create({
        data: {
          organisationId: params.organisationId || null,
          listingId: params.listingId || null,
          installationId: params.installationId || null,
          userId: params.userId || null,
          action: params.action,
          resource: params.resource || 'Marketplace',
          resourceId: params.resourceId,
          details: params.details || {},
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to record marketplace audit log: ${err.message}`, err.stack);
    }
  }

  async getLogsForListing(listingId: string, limit: number = 50) {
    return this.prisma.marketplaceAuditLog.findMany({
      where: { listingId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getLogsForOrganisation(organisationId: string, limit: number = 50) {
    return this.prisma.marketplaceAuditLog.findMany({
      where: { organisationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
