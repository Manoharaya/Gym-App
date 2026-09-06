import type { WearableConnection, WearableMetric } from '@fitcore/types';
import { apiClient } from '../api';
import { logger } from '../logging';

/**
 * FitCore Wearable Service Abstraction
 * Manages connections and telemetry sync for third-party devices (Garmin, Whoop, Oura, Fitbit).
 */
export class WearableService {
  public async getConnections(): Promise<WearableConnection[]> {
    logger.debug('Fetching connected wearable devices');
    const response = await apiClient.get<WearableConnection[]>('/wearables/connections');
    return response.data;
  }

  public async connectDevice(provider: string, authCode: string): Promise<WearableConnection> {
    logger.info(`Connecting wearable device: ${provider}`);
    const response = await apiClient.post<WearableConnection>('/wearables/connect', {
      provider,
      authCode,
    });
    return response.data;
  }

  public async disconnectDevice(connectionId: string): Promise<void> {
    logger.info(`Disconnecting wearable device: ${connectionId}`);
    await apiClient.delete(`/wearables/connections/${connectionId}`);
  }

  public async syncMetrics(metrics: WearableMetric[]): Promise<void> {
    logger.debug(`Syncing ${metrics.length} wearable metrics`);
    await apiClient.post('/wearables/sync', { metrics });
  }
}

export const wearableService = new WearableService();
