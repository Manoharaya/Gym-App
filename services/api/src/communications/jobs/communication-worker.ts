import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DeliveryService } from '../delivery/delivery.service';

@Injectable()
export class CommunicationWorker {
  private readonly logger = new Logger(CommunicationWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveryService: DeliveryService,
  ) {}

  /**
   * Processes unscheduled queued messages.
   */
  async processQueuedMessages(limit = 50): Promise<number> {
    const messages = await this.prisma.communication.findMany({
      where: {
        status: 'QUEUED',
        scheduledAt: null,
      },
      take: limit,
      orderBy: { queuedAt: 'asc' },
    });

    let count = 0;
    for (const msg of messages) {
      try {
        await this.deliveryService.dispatch(msg.id);
        count++;
      } catch (err: any) {
        this.logger.error(`Failed to process queued communication ${msg.id}: ${err.message}`);
      }
    }

    return count;
  }
}
