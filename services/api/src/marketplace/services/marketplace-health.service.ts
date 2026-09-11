import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MarketplaceAuditService } from './marketplace-audit.service';
import { MARKETPLACE_ACTIONS } from '../domain/marketplace-events';

@Injectable()
export class MarketplaceHealthService {
  private readonly logger = new Logger(MarketplaceHealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: MarketplaceAuditService,
  ) {}

  /**
   * Updates health check status for an installation.
   */
  async recordHealthCheck(
    installationId: string,
    healthStatus: 'HEALTHY' | 'DEGRADED' | 'FAILING',
    details?: Record<string, any>,
  ) {
    const installation = await this.prisma.marketplaceInstallation.findUnique({
      where: { id: installationId },
    });

    if (!installation) {
      return null;
    }

    const updated = await this.prisma.marketplaceInstallation.update({
      where: { id: installationId },
      data: {
        healthStatus,
        healthDetails: details || {},
        lastHealthCheckAt: new Date(),
      },
    });

    if (healthStatus === 'FAILING' && installation.healthStatus !== 'FAILING') {
      await this.audit.log({
        organisationId: installation.organisationId,
        installationId: installation.id,
        listingId: installation.listingId,
        action: MARKETPLACE_ACTIONS.HEALTH_CHECK_FAILED,
        resource: 'MarketplaceInstallation',
        resourceId: installation.id,
        details: { healthStatus, details },
      });
      this.logger.warn(`Marketplace installation ${installationId} entered FAILING state`);
    }

    return updated;
  }

  /**
   * Probes health status for all active installations of an organisation.
   */
  async getTenantHealthSummary(organisationId: string) {
    const installations = await this.prisma.marketplaceInstallation.findMany({
      where: { organisationId, status: 'ACTIVE' },
      select: {
        id: true,
        listingId: true,
        listing: { select: { title: true, slug: true } },
        healthStatus: true,
        lastHealthCheckAt: true,
        healthDetails: true,
      },
    });

    const healthy = installations.filter((i) => i.healthStatus === 'HEALTHY').length;
    const degraded = installations.filter((i) => i.healthStatus === 'DEGRADED').length;
    const failing = installations.filter((i) => i.healthStatus === 'FAILING').length;

    return {
      totalActive: installations.length,
      healthy,
      degraded,
      failing,
      installations,
    };
  }
}
