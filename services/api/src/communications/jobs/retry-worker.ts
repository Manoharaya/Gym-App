import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DeliveryService } from '../delivery/delivery.service';
import { RetryPolicyService } from '../delivery/retry-policy.service';

@Injectable()
export class RetryWorker {
  private readonly logger = new Logger(RetryWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveryService: DeliveryService,
    private readonly retryPolicy: RetryPolicyService,
  ) {}

  /**
   * Scans for failed messages that are eligible for retry.
   */
  async processRetries(limit = 20): Promise<number> {
    const failedMessages = await this.prisma.communication.findMany({
      where: {
        status: 'FAILED',
        attemptCount: { lt: 3 },
      },
      take: limit,
      orderBy: { failedAt: 'asc' },
    });

    let retried = 0;
    for (const msg of failedMessages) {
      if (!this.retryPolicy.shouldRetry(msg.attemptCount, msg.suppressionReason || undefined, msg.maxAttempts)) {
        continue;
      }

      try {
        await this.deliveryService.dispatch(msg.id);
        retried++;
      } catch (err: any) {
        this.logger.error(`Error retrying communication ${msg.id}: ${err.message}`);
      }
    }

    return retried;
  }
}
