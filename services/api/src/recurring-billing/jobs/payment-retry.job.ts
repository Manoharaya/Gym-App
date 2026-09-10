/**
 * FitCore — Day 42: Payment Retry Background Job
 *
 * Scans failed billing cycles with scheduled retry timestamps
 * and triggers automated retry collection attempts.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RecurringPaymentService } from '../services/recurring-payment.service';

@Injectable()
export class PaymentRetryJob {
  private readonly logger = new Logger(PaymentRetryJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: RecurringPaymentService,
  ) {}

  /**
   * Scans and executes scheduled payment retries for an organisation.
   */
  async runRetryTick(
    organisationId: string,
    batchSize: number = 25,
  ): Promise<{ retriesAttempted: number }> {
    const now = new Date();

    // Find cycles that are FAILED with a latest attempt having nextRetryAt <= now
    const cyclesDueRetry = await this.prisma.billingCycle.findMany({
      where: {
        organisationId,
        status: 'FAILED',
        paymentAttempts: {
          some: {
            nextRetryAt: { lte: now },
          },
        },
      },
      take: batchSize,
    });

    let retriesAttempted = 0;

    for (const cycle of cyclesDueRetry) {
      try {
        await this.paymentService.collectPaymentForCycle(cycle.id, 'JOB_RETRY');
        retriesAttempted++;
      } catch (err: any) {
        this.logger.error(
          `[Job:PaymentRetry] Retry failed for cycle ${cycle.id}: ${err.message}`,
          err.stack,
        );
      }
    }

    if (retriesAttempted > 0) {
      this.logger.log(`[Job:PaymentRetry] Attempted ${retriesAttempted} payment retries.`);
    }

    return { retriesAttempted };
  }
}
