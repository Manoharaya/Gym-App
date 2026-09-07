import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AIJobService {
  private readonly logger = new Logger(AIJobService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Schedules an asynchronous AI background job.
   */
  async scheduleAsyncJob(requestId: string, processorFn: () => Promise<void>): Promise<void> {
    this.logger.log(`Enqueuing background AI job for request '${requestId}'`);

    // Execute in background via microtask / setImmediate
    setImmediate(async () => {
      try {
        await this.prisma.aIRequest.update({
          where: { id: requestId },
          data: { status: 'PROCESSING' },
        });

        await processorFn();
      } catch (err: any) {
        this.logger.error(`Background AI job '${requestId}' failed: ${err.message}`, err.stack);
        await this.prisma.aIRequest.update({
          where: { id: requestId },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
          },
        });
      }
    });
  }
}
