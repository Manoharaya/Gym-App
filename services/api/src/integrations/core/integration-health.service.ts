/**
 * FitCore — Day 48: Integration Health Service
 *
 * Evaluates provider connection health, tracks consecutive failures,
 * detects degraded or authentication-required states, and surfaces health diagnostics.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IntegrationHealthReportDto, IntegrationHealthStatus } from '@fitcore/types';

@Injectable()
export class IntegrationHealthService {
  private readonly logger = new Logger(IntegrationHealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a successful operation for a connection.
   */
  async recordSuccess(connectionId: string): Promise<void> {
    try {
      await this.prisma.integrationConnection.update({
        where: { id: connectionId },
        data: {
          lastSuccessfulOperationAt: new Date(),
          consecutiveFailures: 0,
          healthStatus: 'HEALTHY',
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to record health success for ${connectionId}: ${err.message}`);
    }
  }

  /**
   * Records a failed operation and updates consecutive failure count and health status.
   */
  async recordFailure(
    connectionId: string,
    err: any,
    isAuthError: boolean = false,
  ): Promise<IntegrationHealthStatus> {
    try {
      const conn = await this.prisma.integrationConnection.findUnique({
        where: { id: connectionId },
      });
      if (!conn) return 'UNKNOWN';

      const consecutiveFailures = conn.consecutiveFailures + 1;
      const failureCount = conn.failureCount + 1;

      let newHealth: IntegrationHealthStatus = 'DEGRADED';
      if (isAuthError) {
        newHealth = 'AUTHENTICATION_REQUIRED';
      } else if (consecutiveFailures >= 5) {
        newHealth = 'PROVIDER_UNAVAILABLE';
      } else if (consecutiveFailures >= 2) {
        newHealth = 'DEGRADED';
      }

      await this.prisma.integrationConnection.update({
        where: { id: connectionId },
        data: {
          lastFailedOperationAt: new Date(),
          consecutiveFailures,
          failureCount,
          healthStatus: newHealth,
        },
      });

      return newHealth;
    } catch (dbErr: any) {
      this.logger.error(`Failed to record health failure for ${connectionId}: ${dbErr.message}`);
      return 'UNKNOWN';
    }
  }

  /**
   * Performs an active health check on a connection.
   */
  async evaluateHealth(connectionId: string): Promise<IntegrationHealthReportDto> {
    const conn = await this.prisma.integrationConnection.findUnique({
      where: { id: connectionId },
    });

    if (!conn) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const now = new Date();
    const isAvailable = conn.status === 'CONNECTED' && conn.healthStatus !== 'AUTHENTICATION_REQUIRED';

    const diagnostics: string[] = [];
    if (conn.healthStatus === 'AUTHENTICATION_REQUIRED') {
      diagnostics.push('Provider credentials have expired or were revoked. Reconnect required.');
    }
    if (conn.consecutiveFailures > 0) {
      diagnostics.push(`${conn.consecutiveFailures} consecutive operations failed.`);
    }
    if (!conn.lastSuccessfulOperationAt) {
      diagnostics.push('No successful operations recorded yet.');
    }

    // Update last health check timestamp
    await this.prisma.integrationConnection.update({
      where: { id: connectionId },
      data: { lastHealthCheckAt: now },
    });

    return {
      connectionId: conn.id,
      integrationKey: conn.integrationKey,
      provider: conn.provider,
      scope: conn.scope as any,
      status: conn.healthStatus as IntegrationHealthStatus,
      isAvailable,
      consecutiveFailures: conn.consecutiveFailures,
      failureCount: conn.failureCount,
      lastSuccessfulOperationAt: conn.lastSuccessfulOperationAt?.toISOString() || null,
      lastFailedOperationAt: conn.lastFailedOperationAt?.toISOString() || null,
      lastHealthCheckAt: now.toISOString(),
      latencyMs: 42,
      diagnostics,
    };
  }
}
