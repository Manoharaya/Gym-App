/**
 * FitCore — Day 43: Accounting Incremental Sync Background Job
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AccountingSyncService } from '../services/accounting-sync.service';

@Injectable()
export class AccountingIncrementalSyncJob {
  private readonly logger = new Logger(AccountingIncrementalSyncJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncService: AccountingSyncService,
  ) {}

  /**
   * Scans active connections and executes incremental sync for each organisation.
   */
  async runIncrementalSync(): Promise<{ organisationsSynced: number }> {
    const connections = await this.prisma.accountingConnection.findMany({
      where: { status: 'CONNECTED' },
    });

    let organisationsSynced = 0;

    for (const conn of connections) {
      try {
        const lastSync = conn.lastSuccessfulSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000);
        await this.syncService.triggerSync(
          conn.organisationId,
          'INCREMENTAL_SYNC',
          'CRON_INCREMENTAL_JOB',
          lastSync,
        );
        organisationsSynced++;
      } catch (err: any) {
        this.logger.error(
          `Incremental sync failed for organisation ${conn.organisationId}: ${err.message}`,
        );
      }
    }

    return { organisationsSynced };
  }
}
