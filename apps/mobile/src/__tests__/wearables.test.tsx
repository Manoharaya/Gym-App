import { WearablesService } from '../features/wearables/services/wearablesService';
import { apiClient } from '../services/api';
import type {
  WearableProviderInfo,
  WearableConnectionDto,
  SyncWearableResultDto,
  HealthDataSummaryDto,
  WearablePrivacyViewDto,
} from '@fitcore/types';

jest.mock('../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('Day 23: Wearables Integration Mobile Service & Client Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WearablesService API Client', () => {
    it('getProviders calls /wearables/providers and returns available platforms', async () => {
      const mockProviders: WearableProviderInfo[] = [
        {
          provider: 'APPLE_HEALTH',
          name: 'Apple Health',
          description: 'Apple HealthKit integration',
          isEnabled: true,
          wave: 1,
          authType: 'NATIVE_SDK',
          capabilities: [],
          requiredPermissions: ['Read Steps', 'Read Heart Rate'],
          privacyNotice: 'Strict member data boundary',
        },
        {
          provider: 'GARMIN',
          name: 'Garmin Connect',
          description: 'Wave 2 integration',
          isEnabled: false,
          wave: 2,
          authType: 'OAUTH2',
          capabilities: [],
          requiredPermissions: ['Activity Summary'],
          privacyNotice: 'Coming in Wave 2',
        },
      ];
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockProviders });

      const res = await WearablesService.getProviders();

      expect(apiClient.get).toHaveBeenCalledWith('/wearables/providers');
      expect(res.length).toBe(2);
      expect(res[0]?.provider).toBe('APPLE_HEALTH');
      expect(res[0]?.isEnabled).toBe(true);
      expect(res[1]?.provider).toBe('GARMIN');
      expect(res[1]?.isEnabled).toBe(false);
    });

    it('getProvider calls /wearables/providers/:provider with specific provider', async () => {
      const mockDetail: Partial<WearableProviderInfo> = {
        provider: 'FITBIT',
        name: 'Fitbit',
        isEnabled: true,
        wave: 1,
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockDetail });

      const res = await WearablesService.getProvider('FITBIT');

      expect(apiClient.get).toHaveBeenCalledWith('/wearables/providers/FITBIT');
      expect(res.name).toBe('Fitbit');
    });

    it('connect sends ConnectWearableDto payload to /wearables/connect', async () => {
      const mockConn: WearableConnectionDto = {
        id: 'conn-apple-101',
        organisationId: 'org-001',
        memberId: 'mem-001',
        provider: 'APPLE_HEALTH',
        status: 'CONNECTED',
        scopes: ['STEPS', 'HEART_RATE'],
        connectedAt: '2026-09-07T10:00:00Z',
        lastSyncAt: null,
        createdAt: '2026-09-07T10:00:00Z',
        updatedAt: '2026-09-07T10:00:00Z',
      };
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockConn });

      const payload = {
        provider: 'APPLE_HEALTH' as const,
        scopes: ['STEPS', 'HEART_RATE'],
      };

      const res = await WearablesService.connect(payload);

      expect(apiClient.post).toHaveBeenCalledWith('/wearables/connect', payload);
      expect(res.id).toBe('conn-apple-101');
      expect(res.status).toBe('CONNECTED');
    });

    it('getConnections retrieves member active connections', async () => {
      const mockConnections: WearableConnectionDto[] = [
        {
          id: 'conn-1',
          organisationId: 'org-1',
          memberId: 'mem-1',
          provider: 'APPLE_HEALTH',
          status: 'CONNECTED',
          scopes: ['STEPS'],
          createdAt: '2026-09-07T10:00:00Z',
          updatedAt: '2026-09-07T10:00:00Z',
        },
      ];
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockConnections });

      const res = await WearablesService.getConnections();

      expect(apiClient.get).toHaveBeenCalledWith('/wearables/connections');
      expect(res.length).toBe(1);
      expect(res[0]?.provider).toBe('APPLE_HEALTH');
    });

    it('syncConnection triggers sync for given connectionId with optional records payload', async () => {
      const mockSyncResult: SyncWearableResultDto = {
        connectionId: 'conn-1',
        provider: 'APPLE_HEALTH',
        syncType: 'INCREMENTAL',
        status: 'SUCCESS',
        recordsFetched: 10,
        recordsInserted: 10,
        duplicatesSkipped: 0,
        validationFailures: 0,
        startedAt: '2026-09-07T10:00:00Z',
        completedAt: '2026-09-07T10:00:01Z',
        durationMs: 1000,
      };
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockSyncResult });

      const res = await WearablesService.syncConnection('conn-1', {
        syncType: 'INCREMENTAL',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/wearables/connections/conn-1/sync', {
        syncType: 'INCREMENTAL',
      });
      expect(res.status).toBe('SUCCESS');
      expect(res.recordsInserted).toBe(10);
    });

    it('disconnect posts to /wearables/connections/:id/disconnect', async () => {
      const mockDisconnected: Partial<WearableConnectionDto> = {
        id: 'conn-1',
        status: 'DISCONNECTED',
      };
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockDisconnected });

      const res = await WearablesService.disconnect('conn-1');

      expect(apiClient.post).toHaveBeenCalledWith('/wearables/connections/conn-1/disconnect', {});
      expect(res.status).toBe('DISCONNECTED');
    });

    it('getHealthData builds query string with filters and pagination', async () => {
      const mockData = {
        records: [],
        total: 0,
        page: 2,
        limit: 20,
        totalPages: 0,
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockData });

      const res = await WearablesService.getHealthData({
        dataType: 'STEPS',
        provider: 'APPLE_HEALTH',
        page: 2,
        limit: 20,
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/wearables/data?dataType=STEPS&provider=APPLE_HEALTH&page=2&limit=20',
      );
      expect(res.page).toBe(2);
    });

    it('getHealthSummary fetches daily and weekly aggregated metrics', async () => {
      const mockSummary: Partial<HealthDataSummaryDto> = {
        memberId: 'mem-001',
        totalSteps: 45000,
        avgDailySteps: 7500,
        totalActiveCaloriesKcal: 3200,
        dailySummaries: [],
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockSummary });

      const res = await WearablesService.getHealthSummary('2026-09-01', '2026-09-07');

      expect(apiClient.get).toHaveBeenCalledWith(
        '/wearables/data/summary?startDate=2026-09-01&endDate=2026-09-07',
      );
      expect(res.totalSteps).toBe(45000);
      expect(res.avgDailySteps).toBe(7500);
    });

    it('getPrivacyView retrieves member data ownership and trainer visibility boundaries', async () => {
      const mockPrivacy: WearablePrivacyViewDto = {
        memberId: 'mem-001',
        activeConsent: {
          consented: true,
          consentKey: 'WEARABLE_DATA',
          consentedAt: '2026-09-01T00:00:00Z',
          version: '1.0',
        },
        connectedProviders: [],
        storedDataCategories: [
          { dataType: 'STEPS', recordCount: 140 },
          { dataType: 'HEART_RATE', recordCount: 500 },
        ],
        trainerAccess: {
          isPermitted: true,
          assignedTrainerName: 'Marcus Vance',
          accessibleMetrics: ['Daily steps', 'Weekly workouts'],
          rawValuesExposed: false,
        },
        retentionPolicy: {
          normalizedHealthRecordsDays: 365,
          rawPayloadsDays: 7,
          selfServiceDeletionAllowed: true,
        },
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockPrivacy });

      const res = await WearablesService.getPrivacyView();

      expect(apiClient.get).toHaveBeenCalledWith('/wearables/privacy');
      expect(res.activeConsent.consented).toBe(true);
      expect(res.trainerAccess.rawValuesExposed).toBe(false);
      expect(res.trainerAccess.assignedTrainerName).toBe('Marcus Vance');
    });

    it('deleteWearableData sends delete request with target provider or connection', async () => {
      (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: { recordsDeleted: 45 } });

      const res = await WearablesService.deleteWearableData({ provider: 'FITBIT' });

      expect(apiClient.delete).toHaveBeenCalledWith('/wearables/data?provider=FITBIT');
      expect(res.recordsDeleted).toBe(45);
    });
  });
});
