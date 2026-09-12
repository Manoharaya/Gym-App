import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PlatformIntegrationsService {
  private readonly logger = new Logger(PlatformIntegrationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves integration health across all connected organisations.
   * Strips all credentials, secrets, client keys, and tokens.
   */
  async getIntegrationHealthSummary(query?: { organisationId?: string; provider?: string }) {
    const where: any = {};
    if (query?.organisationId) where.organisationId = query.organisationId;
    if (query?.provider) where.provider = query.provider;

    const connections = await this.prisma.integrationConnection.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: {
        organisation: { select: { id: true, name: true } },
      },
    });

    const [totalConnections, activeConnections, errorConnections] = await Promise.all([
      this.prisma.integrationConnection.count(),
      this.prisma.integrationConnection.count({ where: { status: 'CONNECTED' } }),
      this.prisma.integrationConnection.count({ where: { status: 'ERROR' } }),
    ]);

    return {
      summary: {
        totalConnections,
        activeConnections,
        errorConnections,
        healthRatio: totalConnections > 0 ? Number(((activeConnections / totalConnections) * 100).toFixed(1)) : 100,
      },
      connections: connections.map((c) => ({
        id: c.id,
        organisationId: c.organisationId,
        organisationName: c.organisation.name,
        provider: c.provider,
        category: c.category,
        status: c.status,
        lastSyncAt: c.lastSyncAt,
        lastError: (c.metadata as any)?.lastError || null,
        failureCount: c.failureCount,
        consecutiveFailures: c.consecutiveFailures,
        lastSuccessfulSyncAt: c.lastSuccessfulOperationAt,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    };
  }

  /**
   * Platform-level developer platform health (Day 49 reuse).
   */
  async getDeveloperPlatformHealth() {
    const [totalApps, totalWebhooks, totalDeliveries, failedDeliveries] = await Promise.all([
      this.prisma.developerApplication.count(),
      this.prisma.webhookSubscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.webhookDelivery.count(),
      this.prisma.webhookDelivery.count({ where: { status: 'FAILED' } }),
    ]);

    const deliverySuccessRate =
      totalDeliveries > 0
        ? Number((((totalDeliveries - failedDeliveries) / totalDeliveries) * 100).toFixed(2))
        : 100;

    return {
      totalApplications: totalApps,
      activeWebhookSubscriptions: totalWebhooks,
      webhookDeliveriesTotal: totalDeliveries,
      webhookDeliveriesFailed: failedDeliveries,
      deliverySuccessRate,
      status: failedDeliveries > 50 ? 'WARNING' : 'HEALTHY',
    };
  }

  /**
   * Platform-level marketplace health (Day 50 reuse).
   */
  async getMarketplaceHealth() {
    const [publishedListings, activeInstallations, reviewsCount] = await Promise.all([
      this.prisma.marketplaceListing.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.marketplaceInstallation.count({ where: { status: 'ACTIVE' } }),
      this.prisma.marketplaceReview.count(),
    ]);

    return {
      publishedListings,
      activeInstallations,
      reviewsCount,
      status: 'HEALTHY',
    };
  }
}
