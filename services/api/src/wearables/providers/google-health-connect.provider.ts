import { Injectable, Logger } from '@nestjs/common';
import {
  IWearableProvider,
  ProviderAuthContext,
  ProviderAuthResult,
  ProviderFetchResult,
} from './wearable-provider.interface';
import {
  WearableProviderType,
  WearableCapability,
  SyncWearableRequestDto,
} from '@fitcore/types';
import { WearableCapabilitiesRegistry } from '../domain/wearable-capabilities.registry';

@Injectable()
export class GoogleHealthConnectProvider implements IWearableProvider {
  readonly providerType: WearableProviderType = 'GOOGLE_HEALTH_CONNECT';
  private readonly logger = new Logger(GoogleHealthConnectProvider.name);

  constructor(private readonly capabilitiesRegistry: WearableCapabilitiesRegistry) {}

  getCapabilities(): WearableCapability[] {
    return this.capabilitiesRegistry.getProviderCapabilities('GOOGLE_HEALTH_CONNECT');
  }

  async authorize(context: ProviderAuthContext): Promise<ProviderAuthResult> {
    this.logger.log(`Authorizing Google Health Connect for member ${context.memberId}`);
    return {
      providerUserReference: `health_connect_${context.memberId}`,
      scopes: context.scopes || [
        'STEPS',
        'DISTANCE',
        'ACTIVE_CALORIES',
        'HEART_RATE',
        'RESTING_HEART_RATE',
        'SLEEP',
        'WORKOUT',
        'WEIGHT',
      ],
    };
  }

  async revokeAuthorization(): Promise<void> {
    this.logger.log('Google Health Connect permissions revoked on client');
  }

  async fetchData(
    connection: { id: string; providerUserReference?: string | null; lastSuccessfulSyncAt?: Date | null },
    request: SyncWearableRequestDto,
  ): Promise<ProviderFetchResult> {
    // 1. Device-forwarded records from Android Health Connect
    if (request.records && request.records.length > 0) {
      return {
        records: request.records,
        rawPayload: { count: request.records.length, source: 'HEALTH_CONNECT_FORWARD' },
      };
    }

    // 2. Fallback / Test deterministic records
    const now = new Date();
    const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return {
      records: [
        {
          dataType: 'STEPS',
          sourceRecordId: `ghc_step_${connection.id}_${now.toISOString().split('T')[0]}`,
          startTime: startTime.toISOString(),
          endTime: now.toISOString(),
          value: 9150,
          unit: 'steps',
          sourceName: 'Pixel Watch 2',
          sourceDevice: 'Google_Pixel_Watch',
        },
        {
          dataType: 'DISTANCE',
          sourceRecordId: `ghc_dist_${connection.id}_${now.toISOString().split('T')[0]}`,
          startTime: startTime.toISOString(),
          endTime: now.toISOString(),
          value: 6.8,
          unit: 'km',
          sourceName: 'Pixel Watch 2',
        },
        {
          dataType: 'ACTIVE_CALORIES',
          sourceRecordId: `ghc_cal_${connection.id}_${now.toISOString().split('T')[0]}`,
          startTime: startTime.toISOString(),
          endTime: now.toISOString(),
          value: 580,
          unit: 'kcal',
          sourceName: 'Pixel Watch 2',
        },
        {
          dataType: 'RESTING_HEART_RATE',
          sourceRecordId: `ghc_rhr_${connection.id}_${now.toISOString().split('T')[0]}`,
          startTime: startTime.toISOString(),
          endTime: now.toISOString(),
          value: 61,
          unit: 'bpm',
          sourceName: 'Pixel Watch 2',
        },
      ],
      rawPayload: { generated: true, timestamp: now.toISOString() },
    };
  }
}
