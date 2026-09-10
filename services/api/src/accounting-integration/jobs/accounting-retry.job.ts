/**
 * FitCore — Day 43: Accounting Retry Background Job
 *
 * Retries failed synchronization records that are marked RETRYING.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AccountingSyncService } from '../services/accounting-sync.service';
import { AccountingConnectionService } from '../services/accounting-connection.service';
import { ACCOUNTING_DEFAULTS } from '../domain/accounting.constants';

@Injectable()
export class AccountingRetryJob {
  private readonly logger = new Logger(AccountingRetryJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncService: AccountingSyncService,
    private readonly connectionService: AccountingConnectionService,
  ) {}

  /**
   * Scans for retryable failed sync records and attempts re-execution.
   */
  async runRetryScan(): Promise<{ retriedCount: number; succeededCount: number }> {
    const failedRecords = await this.prisma.accountingSyncRecord.findMany({
      where: {
        status: 'RETRYING',
        attemptCount: { lt: ACCOUNTING_DEFAULTS.MAX_RETRY_ATTEMPTS },
      },
      take: 20,
    });

    let retriedCount = 0;
    let succeededCount = 0;

    for (const record of failedRecords) {
      retriedCount++;
      try {
        const { connection, provider, accessToken } =
          await this.connectionService.getValidAccessToken(record.organisationId);

        if (record.entityType === 'INVOICE') {
          await this.syncService.syncSingleInvoice(
            record.fitcoreEntityId,
            record.organisationId,
            connection.id,
            connection.externalOrganisationId || '',
            provider,
            accessToken,
            record.syncJobId,
          );
          succeededCount++;
        } else if (record.entityType === 'PAYMENT') {
          await this.syncService.syncSinglePayment(
            record.fitcoreEntityId,
            record.organisationId,
            connection.id,
            connection.externalOrganisationId || '',
            provider,
            accessToken,
            record.syncJobId,
          );
          succeededCount++;
        }
      } catch (err: any) {
        this.logger.error(`Retry attempt failed for record ${record.id}: ${err.message}`);
        await this.prisma.accountingSyncRecord.update({
          where: { id: record.id },
          data: {
            attemptCount: record.attemptCount + 1,
            status:
              record.attemptCount + 1 >= ACCOUNTING_DEFAULTS.MAX_RETRY_ATTEMPTS
                ? 'FAILED'
                : 'RETRYING',
            lastAttemptedAt: new Date(),
            errorMessage: err.message,
          },
        });
      }
    }

    return { retriedCount, succeededCount };
  }
}
