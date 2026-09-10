/**
 * FitCore — Day 43: Accounting Health Service
 *
 * Evaluates provider connection status, token validity, sync failures,
 * and reconciliation health.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AccountingHealthDto } from '@fitcore/types';

@Injectable()
export class AccountingHealthService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates overall accounting system health for an organisation.
   */
  async getHealth(organisationId: string): Promise<AccountingHealthDto> {
    const connection = await this.prisma.accountingConnection.findFirst({
      where: { organisationId },
      orderBy: { updatedAt: 'desc' },
    });

    if (!connection || connection.status === 'DISCONNECTED' || connection.status === 'REVOKED') {
      return {
        organisationId,
        provider: (connection?.provider as any) || null,
        status: (connection?.status as any) || 'DISCONNECTED',
        isTokenValid: false,
        tokenExpiresInSeconds: null,
        lastSuccessfulSyncAt: connection?.lastSuccessfulSyncAt?.toISOString() || null,
        failedSyncsCount: 0,
        unresolvedConflictsCount: 0,
        reconciliationMismatchCount: 0,
        systemHealthRating: 'DISCONNECTED',
      };
    }

    const now = new Date();
    const isTokenValid =
      connection.tokenExpiresAt ? connection.tokenExpiresAt > now : true;
    const tokenExpiresInSeconds = connection.tokenExpiresAt
      ? Math.max(0, Math.floor((connection.tokenExpiresAt.getTime() - now.getTime()) / 1000))
      : null;

    const failedSyncsCount = await this.prisma.accountingSyncJob.count({
      where: { organisationId, status: 'FAILED' },
    });

    const unresolvedConflictsCount = await this.prisma.accountingConflict.count({
      where: { organisationId, status: 'UNRESOLVED' },
    });

    const latestReport = await this.prisma.accountingReconciliationReport.findFirst({
      where: { organisationId },
      orderBy: { runAt: 'desc' },
    });

    const reconciliationMismatchCount = latestReport
      ? latestReport.missingExternalCount + latestReport.amountMismatchCount + latestReport.statusMismatchCount
      : 0;

    let systemHealthRating: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DISCONNECTED' = 'HEALTHY';

    if (!isTokenValid || connection.status === 'AUTHENTICATION_REQUIRED' || connection.status === 'ERROR') {
      systemHealthRating = 'CRITICAL';
    } else if (unresolvedConflictsCount > 5 || failedSyncsCount > 3 || reconciliationMismatchCount > 0) {
      systemHealthRating = 'WARNING';
    }

    return {
      organisationId,
      provider: connection.provider as any,
      status: connection.status as any,
      isTokenValid,
      tokenExpiresInSeconds,
      lastSuccessfulSyncAt: connection.lastSuccessfulSyncAt?.toISOString() || null,
      failedSyncsCount,
      unresolvedConflictsCount,
      reconciliationMismatchCount,
      systemHealthRating,
    };
  }
}
