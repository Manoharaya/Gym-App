/**
 * FitCore — Day 43: Accounting Reconciliation Scheduled Job
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AccountingReconciliationService } from '../services/accounting-reconciliation.service';

@Injectable()
export class AccountingReconciliationJob {
  private readonly logger = new Logger(AccountingReconciliationJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reconciliationService: AccountingReconciliationService,
  ) {}

  /**
   * Runs reconciliation audit across all connected organisations.
   */
  async runDailyReconciliation(): Promise<{ organisationsReconciled: number }> {
    const connections = await this.prisma.accountingConnection.findMany({
      where: { status: 'CONNECTED' },
    });

    let organisationsReconciled = 0;

    for (const conn of connections) {
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        await this.reconciliationService.runReconciliation(
          conn.organisationId,
          thirtyDaysAgo,
          new Date(),
          'CRON_DAILY_RECONCILIATION',
        );
        organisationsReconciled++;
      } catch (err: any) {
        this.logger.error(
          `Daily reconciliation failed for organisation ${conn.organisationId}: ${err.message}`,
        );
      }
    }

    return { organisationsReconciled };
  }
}
