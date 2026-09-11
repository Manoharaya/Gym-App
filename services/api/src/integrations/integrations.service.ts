/**
 * FitCore — Day 48: Integrations Master Service
 *
 * Facade orchestrating provider discovery, connection lifecycle,
 * health status, sync execution, audit reporting, and SSRF security.
 */

import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { IntegrationRegistry } from './core/integration-registry.service';
import { IntegrationConnectionService } from './core/integration-connection.service';
import { IntegrationOAuthService } from './core/integration-oauth.service';
import { IntegrationHealthService } from './core/integration-health.service';
import { IntegrationSyncService } from './core/integration-sync.service';
import { IntegrationWebhookService } from './core/integration-webhook.service';
import { IntegrationAuditService } from './core/integration-audit.service';
import { IntegrationPermissionService, IntegrationAccessContext } from './core/integration-permission.service';
import {
  IntegrationOverviewSummaryDto,
  IntegrationMetadata,
  IntegrationCategory,
  IntegrationScope,
  IntegrationAuditDto,
  IntegrationErrorLogDto,
} from '@fitcore/types';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: IntegrationRegistry,
    private readonly connectionService: IntegrationConnectionService,
    private readonly oauthService: IntegrationOAuthService,
    private readonly healthService: IntegrationHealthService,
    private readonly syncService: IntegrationSyncService,
    private readonly webhookService: IntegrationWebhookService,
    private readonly auditService: IntegrationAuditService,
    private readonly permissionService: IntegrationPermissionService,
  ) {}

  /**
   * Generates management overview summary for the organisation.
   */
  async getOverviewSummary(ctx: IntegrationAccessContext): Promise<IntegrationOverviewSummaryDto> {
    const isAuthorized =
      ctx.roles.includes('SUPERADMIN') ||
      ctx.roles.includes('ORGANISATION_OWNER') ||
      ctx.roles.includes('ADMIN') ||
      ctx.roles.includes('OWNER') ||
      ctx.roles.includes('FINANCE') ||
      ctx.roles.includes('OUTLET_MANAGER');

    if (!isAuthorized) {
      throw new ForbiddenException('Insufficient permissions to view organisation integration overview');
    }
    const connections = await this.prisma.integrationConnection.findMany({
      where: { organisationId: ctx.organisationId },
    });

    const now = Date.now();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);

    const [syncsLast24h, webhooksLast24h] = await Promise.all([
      this.prisma.integrationSyncJob.count({
        where: { organisationId: ctx.organisationId, createdAt: { gte: twentyFourHoursAgo } },
      }),
      this.prisma.integrationWebhookEvent.count({
        where: { createdAt: { gte: twentyFourHoursAgo } },
      }),
    ]);

    const categories: Record<IntegrationCategory, number> = {
      PAYMENTS: 0,
      ACCOUNTING: 0,
      COMMUNICATION: 0,
      MESSAGING: 0,
      EMAIL: 0,
      SMS: 0,
      PUSH: 0,
      WEARABLE: 0,
      CALENDAR: 0,
      ACCESS_CONTROL: 0,
      ANALYTICS: 0,
      STORAGE: 0,
      OTHER: 0,
    };

    const providers: Record<string, number> = {};

    let connectedCount = 0;
    let healthyCount = 0;
    let degradedCount = 0;
    let attentionCount = 0;

    for (const conn of connections) {
      if (conn.status === 'CONNECTED' || conn.status === 'SYNCING') connectedCount++;
      if (conn.healthStatus === 'HEALTHY') healthyCount++;
      else if (conn.healthStatus === 'DEGRADED') degradedCount++;
      else if (conn.healthStatus === 'AUTHENTICATION_REQUIRED') attentionCount++;

      const cat = conn.category as IntegrationCategory;
      if (categories[cat] !== undefined) categories[cat]++;

      providers[conn.provider] = (providers[conn.provider] || 0) + 1;
    }

    return {
      totalConnections: connections.length,
      connectedCount,
      healthyCount,
      degradedCount,
      attentionCount,
      syncsLast24h,
      webhooksLast24h,
      categories,
      providers,
    };
  }

  /**
   * Validates target URLs to defend against Server-Side Request Forgery (SSRF).
   * Rejects private IP ranges, loopback addresses (127.0.0.1, localhost), and AWS metadata endpoints (169.254.169.254).
   */
  validateUrlForSsrf(targetUrl: string): void {
    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      throw new BadRequestException('Invalid URL format');
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new BadRequestException(`Protocol '${parsed.protocol}' is not permitted. Only HTTP(S) allowed.`);
    }

    const host = parsed.hostname.toLowerCase();

    // Block localhost and loopback
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      throw new BadRequestException('Targeting loopback addresses is strictly prohibited');
    }

    // Block AWS metadata service
    if (host === '169.254.169.254' || host === 'metadata.google.internal') {
      throw new BadRequestException('Targeting internal cloud metadata services is strictly prohibited');
    }

    // Block private RFC 1918 CIDRs
    const isPrivate =
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      (host.startsWith('172.') &&
        parseInt(host.split('.')[1], 10) >= 16 &&
        parseInt(host.split('.')[1], 10) <= 31);

    if (isPrivate) {
      throw new BadRequestException('Targeting private network destinations is strictly prohibited');
    }
  }

  /**
   * Retrieves security audit logs for the organisation's integrations.
   */
  async listAuditLogs(
    ctx: IntegrationAccessContext,
    filters?: { connectionId?: string; limit?: number },
  ): Promise<IntegrationAuditDto[]> {
    const where: any = { organisationId: ctx.organisationId };
    if (filters?.connectionId) where.connectionId = filters.connectionId;

    const logs = await this.prisma.integrationAuditLog.findMany({
      where,
      take: filters?.limit || 50,
      orderBy: { createdAt: 'desc' },
    });

    return logs.map((l) => ({
      id: l.id,
      organisationId: l.organisationId,
      connectionId: l.connectionId,
      userId: l.userId,
      action: l.action as any,
      resource: l.resource,
      resourceId: l.resourceId,
      status: l.status as any,
      metadata: l.metadata as any,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  /**
   * Retrieves normalized error log for management visibility.
   */
  async listErrors(
    ctx: IntegrationAccessContext,
    filters?: { connectionId?: string; limit?: number },
  ): Promise<IntegrationErrorLogDto[]> {
    // Collect from failed sync records and failed audit logs
    const failedRecords = await this.prisma.integrationSyncRecord.findMany({
      where: { organisationId: ctx.organisationId, status: 'FAILED' },
      take: filters?.limit || 20,
      orderBy: { createdAt: 'desc' },
    });

    return failedRecords.map((r) => ({
      id: r.id,
      connectionId: filters?.connectionId || null,
      provider: 'INTEGRATION',
      category: 'PROVIDER_UNAVAILABLE',
      message: r.errorMessage || 'Synchronization error',
      retryable: true,
      timestamp: r.createdAt.toISOString(),
      details: { entityType: r.entityType, fitcoreEntityId: r.fitcoreEntityId },
    }));
  }
}
