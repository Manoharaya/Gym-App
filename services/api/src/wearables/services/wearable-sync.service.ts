import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { UnitNormalizer } from '../domain/unit-normalizer';
import { HealthDataValidator } from '../domain/health-data-validator';
import { DeduplicationService } from '../domain/deduplication.service';
import { TokenEncryptionService } from '../security/token-encryption.service';
import { WearableConnectionService } from './wearable-connection.service';
import {
  SyncWearableRequestDto,
  SyncWearableResultDto,
  WearableProviderType,
  WearableSyncType,
  WearableSyncStatus,
  HealthDataType,
} from '@fitcore/types';

export const DEFAULT_INITIAL_SYNC_DAYS = 30;
export const INCREMENTAL_OVERLAP_WINDOW_MINUTES = 15;

@Injectable()
export class WearableSyncService {
  private readonly logger = new Logger(WearableSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly unitNormalizer: UnitNormalizer,
    private readonly validator: HealthDataValidator,
    private readonly deduplication: DeduplicationService,
    private readonly tokenEncryption: TokenEncryptionService,
    private readonly connectionService: WearableConnectionService,
  ) {}

  /**
   * Performs an idempotent synchronization for a wearable connection.
   */
  async sync(
    connectionId: string,
    memberId: string,
    organisationId: string,
    request: SyncWearableRequestDto = {},
    actorUserId?: string,
  ): Promise<SyncWearableResultDto> {
    const startTimeMs = Date.now();
    const startedAt = new Date();

    // 1. Fetch and validate connection
    const connection = await this.prisma.wearableConnection.findFirst({
      where: { id: connectionId, memberId, organisationId },
    });

    if (!connection) {
      throw new NotFoundException('Wearable connection not found');
    }

    if (connection.status === 'DISCONNECTED' || connection.status === 'REVOKED') {
      throw new BadRequestException(
        `Cannot sync disconnected connection (status: ${connection.status}). Please reconnect.`,
      );
    }

    // 2. Validate member consent
    await this.connectionService.assertWearableConsent(memberId);

    const providerType = connection.provider as WearableProviderType;
    const providerAdapter = this.providerRegistry.getProvider(providerType);

    // 3. Mark connection SYNCING
    await this.prisma.wearableConnection.update({
      where: { id: connectionId },
      data: { status: 'SYNCING', lastSyncAt: startedAt },
    });

    let recordsFetched = 0;
    let recordsInserted = 0;
    let duplicatesSkipped = 0;
    let validationFailures = 0;
    let syncStatus: WearableSyncStatus = 'SUCCESS';
    let errorCode: string | undefined;
    let errorMessage: string | undefined;

    try {
      // 4. Fetch data from provider adapter
      const fetchResult = await providerAdapter.fetchData(
        {
          id: connection.id,
          providerUserReference: connection.providerUserReference,
          lastSuccessfulSyncAt: request.forceFullSync ? null : connection.lastSuccessfulSyncAt,
        },
        request,
      );

      recordsFetched = fetchResult.records ? fetchResult.records.length : 0;

      // 5. Store raw payload if present with 7-day retention
      if (fetchResult.rawPayload) {
        try {
          const encryptedRaw = this.tokenEncryption.encrypt(
            JSON.stringify(fetchResult.rawPayload),
          );
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          await this.prisma.wearableRawData.create({
            data: {
              connectionId,
              memberId,
              organisationId,
              provider: providerType,
              encryptedPayload: encryptedRaw,
              recordCount: recordsFetched,
              expiresAt,
            },
          });
        } catch (rawErr: any) {
          this.logger.warn(`Failed to persist raw wearable debug payload: ${rawErr.message}`);
        }
      }

      // 6. Process, normalize, validate, and deduplicate each record
      if (fetchResult.records && fetchResult.records.length > 0) {
        for (const rawRecord of fetchResult.records) {
          try {
            const parsedStartTime = new Date(rawRecord.startTime);
            const parsedEndTime = rawRecord.endTime ? new Date(rawRecord.endTime) : undefined;

            // Unit normalization
            const normalized = this.unitNormalizer.normalize(
              rawRecord.dataType,
              rawRecord.value,
              rawRecord.unit,
            );

            // Health sanity validation
            const validation = this.validator.validate(
              rawRecord.dataType,
              normalized.value,
              parsedStartTime,
              parsedEndTime,
            );

            if (!validation.isValid) {
              validationFailures += 1;
              this.logger.debug(
                `Skipped invalid record (${rawRecord.dataType}): ${validation.reason}`,
              );
              continue;
            }

            // Deduplication check
            const dedupResult = await this.deduplication.isDuplicate({
              connectionId,
              provider: providerType,
              dataType: rawRecord.dataType,
              sourceRecordId: rawRecord.sourceRecordId,
              startTime: parsedStartTime,
              value: normalized.value,
              unit: normalized.unit,
            });

            if (dedupResult.isDuplicate) {
              duplicatesSkipped += 1;
              continue;
            }

            // Persist record
            await this.prisma.healthDataRecord.create({
              data: {
                organisationId,
                memberId,
                connectionId,
                provider: providerType,
                dataType: rawRecord.dataType,
                sourceRecordId: rawRecord.sourceRecordId,
                startTime: parsedStartTime,
                endTime: parsedEndTime,
                value: normalized.value,
                unit: normalized.unit,
                timezone: rawRecord.timezone || 'UTC',
                sourceName: rawRecord.sourceName,
                sourceDevice: rawRecord.sourceDevice,
                metadata: rawRecord.metadata || {},
                fingerprint: dedupResult.fingerprint,
                recordedAt: new Date(),
              },
            });

            recordsInserted += 1;
          } catch (err: any) {
            validationFailures += 1;
            this.logger.warn(`Failed processing record: ${err.message}`);
          }
        }
      }

      const completedAt = new Date();
      const durationMs = Date.now() - startTimeMs;

      // 7. Update connection status to CONNECTED
      await this.prisma.wearableConnection.update({
        where: { id: connectionId },
        data: {
          status: 'CONNECTED',
          lastSuccessfulSyncAt: completedAt,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      });

      // 8. Record sync log
      const syncType: WearableSyncType =
        request.syncType || (connection.lastSuccessfulSyncAt ? 'INCREMENTAL' : 'INITIAL');

      await this.prisma.wearableSyncLog.create({
        data: {
          connectionId,
          memberId,
          organisationId,
          provider: providerType,
          syncType,
          status: syncStatus,
          recordsFetched,
          recordsInserted,
          duplicatesSkipped,
          validationFailures,
          startedAt,
          completedAt,
          durationMs,
        },
      });

      // 9. Audit event
      if (actorUserId) {
        await this.audit.log({
          userId: actorUserId,
          organisationId,
          action: 'WEARABLE_SYNC_COMPLETED',
          resource: 'wearable_connections',
          resourceId: connectionId,
          metadata: {
            provider: providerType,
            recordsInserted,
            duplicatesSkipped,
            validationFailures,
            durationMs,
          },
        });
      }

      return {
        connectionId,
        provider: providerType,
        syncType,
        status: syncStatus,
        recordsFetched,
        recordsInserted,
        duplicatesSkipped,
        validationFailures,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs,
      };
    } catch (err: any) {
      const completedAt = new Date();
      const durationMs = Date.now() - startTimeMs;
      syncStatus = 'FAILED';
      errorCode = err.name || 'SYNC_ERROR';
      errorMessage = err.message || 'Unknown sync error';

      await this.prisma.wearableConnection.update({
        where: { id: connectionId },
        data: {
          status: 'SYNC_ERROR',
          lastFailedSyncAt: completedAt,
          lastErrorCode: errorCode,
          lastErrorMessage: errorMessage,
        },
      });

      await this.prisma.wearableSyncLog.create({
        data: {
          connectionId,
          memberId,
          organisationId,
          provider: providerType,
          syncType: request.syncType || 'INCREMENTAL',
          status: 'FAILED',
          recordsFetched,
          recordsInserted,
          duplicatesSkipped,
          validationFailures,
          startedAt,
          completedAt,
          durationMs,
          errorCode,
          errorMessage,
        },
      });

      throw err;
    }
  }
}
