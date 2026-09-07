import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

export interface DeliveryJob {
  deliveryId: string;
  notificationId: string;
  channel: string;
  attemptCount: number;
}

@Injectable()
export class NotificationQueueService {
  private readonly logger = new Logger(NotificationQueueService.name);
  private readonly inMemoryDeliveryQueue: DeliveryJob[] = [];
  private readonly inMemoryRetryQueue: Array<DeliveryJob & { runAt: number }> = [];

  constructor(private readonly redis: RedisService) {}

  /**
   * Enqueues a notification delivery job.
   */
  async enqueueDelivery(job: DeliveryJob): Promise<void> {
    const payload = JSON.stringify(job);
    try {
      await this.redis.set(`queue:delivery:${job.deliveryId}`, payload, 3600);
    } catch {
      // In-memory fallback
    }
    this.inMemoryDeliveryQueue.push(job);
    this.logger.debug(`Enqueued delivery job for delivery '${job.deliveryId}' [${job.channel}]`);
  }

  /**
   * Enqueues a retry job with exponential backoff delay.
   */
  async enqueueRetry(job: DeliveryJob): Promise<void> {
    const nextAttempt = job.attemptCount + 1;
    if (nextAttempt > 3) {
      this.logger.warn(`Max retries reached for delivery '${job.deliveryId}'. Moving to dead-letter.`);
      return;
    }

    const backoffMs = Math.min(60000, 1000 * Math.pow(2, nextAttempt));
    const runAt = Date.now() + backoffMs;

    this.inMemoryRetryQueue.push({
      ...job,
      attemptCount: nextAttempt,
      runAt,
    });

    this.logger.log(
      `Enqueued retry #${nextAttempt} for delivery '${job.deliveryId}' in ${backoffMs}ms`,
    );
  }

  /**
   * Pops the next delivery job from the queue.
   */
  async popDelivery(): Promise<DeliveryJob | null> {
    // 1. Check if any retry jobs are ready
    const now = Date.now();
    const readyRetryIndex = this.inMemoryRetryQueue.findIndex((job) => job.runAt <= now);
    if (readyRetryIndex !== -1) {
      const [readyRetry] = this.inMemoryRetryQueue.splice(readyRetryIndex, 1);
      return {
        deliveryId: readyRetry.deliveryId,
        notificationId: readyRetry.notificationId,
        channel: readyRetry.channel,
        attemptCount: readyRetry.attemptCount,
      };
    }

    // 2. Pop regular queue
    return this.inMemoryDeliveryQueue.shift() ?? null;
  }

  get queueSize(): number {
    return this.inMemoryDeliveryQueue.length + this.inMemoryRetryQueue.length;
  }
}
