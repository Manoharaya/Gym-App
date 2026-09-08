import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DeliveryService } from '../delivery/delivery.service';

@Injectable()
export class ScheduledCommunicationWorker {
  private readonly logger = new Logger(ScheduledCommunicationWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveryService: DeliveryService,
  ) {}

  /**
   * Scans for communications scheduled for delivery whose scheduledAt has arrived.
   */
  async processDueScheduledMessages(limit = 50): Promise<number> {
    const now = new Date();

    const dueMessages = await this.prisma.communication.findMany({
      where: {
        status: 'QUEUED',
        scheduledAt: { lte: now },
      },
      take: limit,
      orderBy: { scheduledAt: 'asc' },
    });

    if (dueMessages.length === 0) return 0;

    this.logger.log(`Processing ${dueMessages.length} due scheduled communications`);

    let processed = 0;
    for (const msg of dueMessages) {
      try {
        await this.deliveryService.dispatch(msg.id);
        processed++;
      } catch (err: any) {
        this.logger.error(`Error dispatching scheduled communication ${msg.id}: ${err.message}`);
      }
    }

    return processed;
  }
}
