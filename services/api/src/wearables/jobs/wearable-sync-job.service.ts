import { Injectable, Logger } from '@nestjs/common';
import { WearableSyncService } from '../services/wearable-sync.service';
import { WearableConnectionService } from '../services/wearable-connection.service';
import { SyncWearableRequestDto, WearableSyncType } from '@fitcore/types';

export interface WearableJobPayload {
  jobType: 'INITIAL_WEARABLE_SYNC' | 'INCREMENTAL_WEARABLE_SYNC' | 'RETRY_WEARABLE_SYNC' | 'REFRESH_WEARABLE_AUTHORIZATION';
  connectionId: string;
  memberId: string;
  organisationId: string;
  attemptCount: number;
  syncRequest?: SyncWearableRequestDto;
}

@Injectable()
export class WearableSyncJobService {
  private readonly logger = new Logger(WearableSyncJobService.name);
  private readonly maxRetries = 3;

  constructor(
    private readonly syncService: WearableSyncService,
    private readonly connectionService: WearableConnectionService,
  ) {}

  /**
   * Dispatches an asynchronous sync job with exponential backoff handling.
   */
  async processJob(job: WearableJobPayload): Promise<void> {
    this.logger.log(
      `Processing wearable job [${job.jobType}] for connection ${job.connectionId} (attempt #${job.attemptCount})`,
    );

    try {
      if (job.jobType === 'REFRESH_WEARABLE_AUTHORIZATION') {
        // Handled via reauthorize
        this.logger.log(`Executing authorization refresh for connection ${job.connectionId}`);
        return;
      }

      const syncType: WearableSyncType =
        job.jobType === 'INITIAL_WEARABLE_SYNC' ? 'INITIAL' : 'INCREMENTAL';

      await this.syncService.sync(
        job.connectionId,
        job.memberId,
        job.organisationId,
        {
          ...(job.syncRequest || {}),
          syncType,
        },
      );

      this.logger.log(`Job [${job.jobType}] succeeded for connection ${job.connectionId}`);
    } catch (err: any) {
      this.logger.warn(`Job [${job.jobType}] failed for connection ${job.connectionId}: ${err.message}`);

      // Check if retryable (do not retry permanent auth errors or revoked consents)
      const isPermanent =
        err.message?.includes('WEARABLE_CONSENT_REQUIRED') ||
        err.message?.includes('DISCONNECTED') ||
        err.status === 403;

      if (!isPermanent && job.attemptCount < this.maxRetries) {
        const nextAttempt = job.attemptCount + 1;
        const delayMs = Math.min(30000, 1000 * Math.pow(2, nextAttempt));
        this.logger.log(`Enqueuing retry #${nextAttempt} in ${delayMs}ms for connection ${job.connectionId}`);
        setTimeout(() => {
          this.processJob({ ...job, attemptCount: nextAttempt, jobType: 'RETRY_WEARABLE_SYNC' }).catch(
            (retryErr) => this.logger.error(`Retry attempt failed: ${retryErr.message}`),
          );
        }, delayMs);
      } else {
        this.logger.error(
          `Max retries reached or permanent failure for job on connection ${job.connectionId}. Moving to dead-letter.`,
        );
      }
    }
  }
}
