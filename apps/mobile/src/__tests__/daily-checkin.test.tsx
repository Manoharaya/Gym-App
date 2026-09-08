import { dailyCheckInService } from '../features/check-ins/services/dailyCheckInService';
import { apiClient } from '../services/api';
import type {
  DailyCheckInDto,
  DailyCheckInHistoryResponseDto,
  DailyCheckInPrivacyViewDto,
} from '@fitcore/types';

jest.mock('../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('Day 22: AI Daily Check-In Mobile Client Service & Flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DailyCheckInService API Client Methods', () => {
    it('startCheckIn calls /ai/daily-checkin/start', async () => {
      const mockResult: Partial<DailyCheckInDto> = {
        id: 'chk-001',
        checkInDate: '2026-09-07',
        status: 'PENDING',
      };
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockResult });

      const res = await dailyCheckInService.startCheckIn({ date: '2026-09-07' });

      expect(apiClient.post).toHaveBeenCalledWith('/ai/daily-checkin/start', { date: '2026-09-07' });
      expect(res.id).toBe('chk-001');
      expect(res.status).toBe('PENDING');
    });

    it('submitCheckIn sends payload and idempotency-key header', async () => {
      const mockResult: Partial<DailyCheckInDto> = {
        id: 'chk-001',
        status: 'COMPLETED',
        readinessScore: 85,
        readinessCategory: 'OPTIMAL',
        todayFocus: 'Upper Body Progressive Overload',
      };
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockResult });

      const payload = {
        energyLevel: 'GOOD' as any,
        wellbeingMood: 'GOOD' as any,
        sleepQuality: 'EXCELLENT' as any,
        sorenessLevel: 'MILD' as any,
        stressLevel: 'LOW' as any,
        motivationLevel: 'GOOD' as any,
        yesterdayWorkoutCompleted: true,
        notes: 'Slept well, ready to lift.',
      };

      const res = await dailyCheckInService.submitCheckIn(payload, 'idempotency-key-abc-123');

      expect(apiClient.post).toHaveBeenCalledWith(
        '/ai/daily-checkin/submit',
        payload,
        { headers: { 'idempotency-key': 'idempotency-key-abc-123' } },
      );
      expect(res.status).toBe('COMPLETED');
      expect(res.readinessScore).toBe(85);
      expect(res.readinessCategory).toBe('OPTIMAL');
    });

    it('getTodayCheckIn calls /ai/daily-checkin/today', async () => {
      const mockResult: Partial<DailyCheckInDto> = {
        id: 'chk-today',
        checkInDate: '2026-09-07',
        status: 'COMPLETED',
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockResult });

      const res = await dailyCheckInService.getTodayCheckIn('2026-09-07');

      expect(apiClient.get).toHaveBeenCalledWith('/ai/daily-checkin/today?date=2026-09-07');
      expect(res?.id).toBe('chk-today');
    });

    it('getTodayCheckIn returns null gracefully if endpoint returns 404', async () => {
      (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Not found'));

      const res = await dailyCheckInService.getTodayCheckIn();

      expect(res).toBeNull();
    });

    it('getHistory calls /ai/daily-checkin/history with limit and offset', async () => {
      const mockHistory: DailyCheckInHistoryResponseDto = {
        items: [
          {
            id: 'chk-1',
            checkInDate: '2026-09-06',
            status: 'COMPLETED',
            readinessScore: 78,
            readinessCategory: 'OPTIMAL',
            safetyFlagged: false,
          },
        ],
        total: 1,
        detectedTrends: [],
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockHistory });

      const res = await dailyCheckInService.getHistory(14, 0);

      expect(apiClient.get).toHaveBeenCalledWith('/ai/daily-checkin/history?limit=14&offset=0');
      expect(res.items.length).toBe(1);
      expect(res.items[0]?.readinessScore).toBe(78);
    });

    it('getById calls /ai/daily-checkin/:id', async () => {
      const mockResult: Partial<DailyCheckInDto> = {
        id: 'chk-detail-001',
        checkInDate: '2026-09-05',
        status: 'COMPLETED',
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockResult });

      const res = await dailyCheckInService.getById('chk-detail-001');

      expect(apiClient.get).toHaveBeenCalledWith('/ai/daily-checkin/chk-detail-001');
      expect(res.id).toBe('chk-detail-001');
    });

    it('submitFeedback sends rating and comment', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, message: 'Thank you for your feedback!' },
      });

      const res = await dailyCheckInService.submitFeedback(
        'chk-detail-001',
        'HELPFUL',
        'Accurate recovery pacing advice',
      );

      expect(apiClient.post).toHaveBeenCalledWith(
        '/ai/daily-checkin/chk-detail-001/feedback',
        { rating: 'HELPFUL', comment: 'Accurate recovery pacing advice' },
      );
      expect(res.success).toBe(true);
    });

    it('getPrivacyView returns transparent data sources used and excluded', async () => {
      const mockPrivacy: DailyCheckInPrivacyViewDto = {
        checkInId: 'chk-detail-001',
        memberId: 'mem-123',
        date: '2026-09-07',
        dataSourcesUsed: ['Today Check-in Responses', 'Active Training Plan'],
        dataSourcesExcluded: ['Financial data', 'Medical records'],
        explanation: 'FitCore Daily Intelligence synthesizes authorized fitness data.',
        dataRetentionPolicy: 'Retained per FitCore privacy guidelines.',
        trainerVisibilityScope: 'Summarized indicators only.',
        consentStatus: 'ACTIVE',
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockPrivacy });

      const res = await dailyCheckInService.getPrivacyView('chk-detail-001');

      expect(apiClient.get).toHaveBeenCalledWith('/ai/daily-checkin/chk-detail-001/privacy');
      expect(res.dataSourcesUsed).toContain('Active Training Plan');
      expect(res.dataSourcesExcluded).toContain('Medical records');
    });
  });
});
