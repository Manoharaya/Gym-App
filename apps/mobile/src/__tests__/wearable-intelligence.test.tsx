import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { WearableIntelligenceService } from '../features/wearables/services/wearableIntelligenceService';
import { WearableIntelligenceScreen } from '../features/wearables/screens/WearableIntelligenceScreen';
import { apiClient } from '../services/api';
import type {
  WearableIntelligenceSummaryDto,
  WearableIntelligenceResponseDto,
  RecoverySummaryDto,
  WearableTrendDto,
  SleepMetricsDto,
  ActivityMetricsDto,
  TrainingCorrelationDto,
  WearablePrivacyViewDto,
} from '@fitcore/types';

jest.mock('../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

describe('Day 24: AI Wearable Intelligence Mobile Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.setTimeout(15000);
  });

  describe('WearableIntelligenceService', () => {
    it('getSummary calls /ai/wearables/summary without refresh by default', async () => {
      const mockSummary: Partial<WearableIntelligenceSummaryDto> = {
        memberId: 'mem-1',
        dataQuality: 'NORMAL_DATA',
        dataDaysCount: 7,
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockSummary });

      const result = await WearableIntelligenceService.getSummary();

      expect(apiClient.get).toHaveBeenCalledWith('/ai/wearables/summary');
      expect(result.memberId).toBe('mem-1');
    });

    it('getSummary appends ?refresh=true when force refresh requested', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: {} });

      await WearableIntelligenceService.getSummary(true);

      expect(apiClient.get).toHaveBeenCalledWith('/ai/wearables/summary?refresh=true');
    });

    it('getRecovery calls /ai/wearables/recovery', async () => {
      const mockRecovery: Partial<RecoverySummaryDto> = {
        category: 'GOOD',
        explanation: 'Steady recovery capacity observed.',
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockRecovery });

      const result = await WearableIntelligenceService.getRecovery();

      expect(apiClient.get).toHaveBeenCalledWith('/ai/wearables/recovery');
      expect(result.category).toBe('GOOD');
    });

    it('getTrends calls /ai/wearables/trends', async () => {
      const mockTrends: WearableTrendDto[] = [
        {
          trendType: 'SLEEP_IMPROVING',
          metric: 'Sleep Duration',
          direction: 'UP',
          strength: 'MODERATE',
          confidence: 'HIGH',
          dataPointsUsed: 7,
          observationWindowDays: 14,
          summaryText: 'Sleep duration improving',
          calculatedAt: new Date().toISOString(),
        },
      ];
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockTrends });

      const result = await WearableIntelligenceService.getTrends();

      expect(apiClient.get).toHaveBeenCalledWith('/ai/wearables/trends');
      expect(result.length).toBe(1);
      expect(result[0]?.direction).toBe('UP');
    });

    it('getSleep calls /ai/wearables/sleep', async () => {
      const mockSleep: Partial<SleepMetricsDto> = {
        availability: 'AVAILABLE',
        lastSleepDurationMinutes: 450,
        sevenDayAverageMinutes: 440,
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockSleep });

      const result = await WearableIntelligenceService.getSleep();

      expect(apiClient.get).toHaveBeenCalledWith('/ai/wearables/sleep');
      expect(result.lastSleepDurationMinutes).toBe(450);
    });

    it('getActivity calls /ai/wearables/activity', async () => {
      const mockActivity: Partial<ActivityMetricsDto> = {
        availability: 'AVAILABLE',
        todaySteps: 9200,
        sevenDayAverageSteps: 8700,
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockActivity });

      const result = await WearableIntelligenceService.getActivity();

      expect(apiClient.get).toHaveBeenCalledWith('/ai/wearables/activity');
      expect(result.todaySteps).toBe(9200);
    });

    it('getTrainingCorrelation calls /ai/wearables/training-correlation', async () => {
      const mockCorrelations: TrainingCorrelationDto[] = [
        {
          pattern: 'SUSTAINED_SLEEP_AND_TRAINING_MOMENTUM',
          correlationSummary: 'Higher workout completion on weeks with 7+ hours sleep.',
          dataPointsUsed: 14,
          observedSignals: {
            wearableSignal: '7.5h avg sleep',
            trainingSignal: '4 workouts logged',
          },
          disclaimer: 'Correlations represent observable patterns and do not imply direct causation.',
        },
      ];
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockCorrelations });

      const result = await WearableIntelligenceService.getTrainingCorrelation();

      expect(apiClient.get).toHaveBeenCalledWith('/ai/wearables/training-correlation');
      expect(result.length).toBe(1);
    });

    it('generateInsight sends POST /ai/wearables/insight with headers', async () => {
      const mockInsightResult = {
        insight: {
          summary: 'Your recovery indicators reflect solid training capacity.',
          dataHighlights: [],
          recoveryInterpretation: {
            category: 'GOOD' as const,
            explanation: 'Telemetry reflects steady sleep balance.',
          },
          trainingGuidance: [
            {
              type: 'TRAIN' as const,
              recommendation: 'Proceed with today’s session.',
              reason: 'Resting HR stable.',
            },
          ],
          confidence: 'HIGH' as const,
          sourceSummary: ['WEARABLES'],
        },
        insightId: 'ins-123',
        cached: false,
      };
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockInsightResult });

      const result = await WearableIntelligenceService.generateInsight(
        { prompt: 'How ready am I today?' },
        'idem-key-abc',
      );

      expect(apiClient.post).toHaveBeenCalledWith(
        '/ai/wearables/insight',
        { prompt: 'How ready am I today?' },
        { headers: { 'idempotency-key': 'idem-key-abc' } },
      );
      expect(result.insightId).toBe('ins-123');
    });

    it('submitFeedback sends POST /ai/wearables/feedback', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, message: 'Thank you for your feedback.' },
      });

      const result = await WearableIntelligenceService.submitFeedback({
        insightId: 'ins-123',
        rating: 'HELPFUL',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/ai/wearables/feedback', {
        insightId: 'ins-123',
        rating: 'HELPFUL',
      });
      expect(result.success).toBe(true);
    });

    it('getPrivacyView calls /ai/wearables/privacy', async () => {
      const mockPrivacy: Partial<WearablePrivacyViewDto> = {
        memberId: 'mem-1',
        activeConsent: {
          consented: true,
          consentKey: 'WEARABLE_DATA',
          consentedAt: '2026-09-01T00:00:00Z',
          version: '1.0',
        },
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockPrivacy });

      const result = await WearableIntelligenceService.getPrivacyView();

      expect(apiClient.get).toHaveBeenCalledWith('/ai/wearables/privacy');
      expect(result.activeConsent?.consented).toBe(true);
    });
  });

  describe('WearableIntelligenceScreen Component Rendering & Interactivity', () => {
    const mockTelemetrySummary: WearableIntelligenceSummaryDto = {
      memberId: 'mem-1',
      dataQuality: 'NORMAL_DATA',
      dataDaysCount: 7,
      connectedProviders: ['APPLE_HEALTH'],
      sleep: {
        availability: 'AVAILABLE',
        lastSleepDurationMinutes: 465, // 7h 45m
        sevenDayAverageMinutes: 440,
        dataDaysCount: 7,
      },
      activity: {
        availability: 'AVAILABLE',
        todaySteps: 8400,
        sevenDayAverageSteps: 7900,
        todayActiveCaloriesKcal: 450,
        sevenDayAverageCaloriesKcal: 420,
        todayDistanceKm: 6.2,
        activityFrequencyPerWeek: 4,
        weeklyTotalSteps: 58000,
        dataDaysCount: 7,
      },
      heart: {
        restingHeartRateAvailability: 'AVAILABLE',
        latestRestingHeartRateBpm: 60,
        sevenDayAverageRestingHeartRateBpm: 62,
        hrvAvailability: 'AVAILABLE',
        dataDaysCount: 7,
      },
      recovery: {
        category: 'GOOD',
        explanation: 'Resting heart rate is favorable compared to your 7-day average.',
        contributingSignals: ['Sleep duration +25m vs baseline'],
        caveats: [],
        confidence: 'HIGH',
        disclaimer: 'Non-medical recovery indicators.',
      },
      trends: [],
      correlations: [
        {
          pattern: 'SUSTAINED_SLEEP_AND_TRAINING_MOMENTUM',
          correlationSummary: 'Sustained 7h+ sleep associated with scheduled session completion.',
          dataPointsUsed: 7,
          observedSignals: { wearableSignal: '7h 45m sleep', trainingSignal: '4 sessions' },
          disclaimer: 'Correlations represent observable patterns, not clinical diagnoses.',
        },
      ],
    };

    const mockAIResponse: WearableIntelligenceResponseDto = {
      summary: 'Your recovery indicators look solid. Proceed with your planned workout program.',
      dataHighlights: [{ metric: 'Sleep Duration', value: '7h 45m', trend: 'Stable' }],
      recoveryInterpretation: {
        category: 'GOOD',
        explanation: 'Resting heart rate and sleep volume reflect stable recovery capacity.',
      },
      trainingGuidance: [
        {
          type: 'TRAIN',
          recommendation: 'Complete planned strength training today.',
          reason: 'Recovery indicators are within optimal baseline ranges.',
        },
      ],
      caution: 'Wearable data is for fitness guidance only.',
      escalation: { required: false },
      sourceSummary: ['WEARABLES'],
      confidence: 'HIGH',
    };

    it('renders recovery readiness card, metric highlights, and non-medical disclaimer', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockTelemetrySummary });
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { insight: mockAIResponse, insightId: 'ins-test-1', cached: false },
      });

      const { getByText, findByText } = render(<WearableIntelligenceScreen />);

      // Verify Recovery Readiness
      expect(await findByText('Recovery Status')).toBeTruthy();
      expect(getByText('Favorable Recovery')).toBeTruthy();
      expect(getByText('Resting heart rate is favorable compared to your 7-day average.')).toBeTruthy();

      // Verify Metrics Highlights
      expect(getByText('7h 45m')).toBeTruthy();
      expect(getByText('60')).toBeTruthy();
      expect(getByText('8,400')).toBeTruthy();
      expect(getByText('4x')).toBeTruthy();

      // Verify AI Synthesized Insights & Training Guidance
      expect(getByText('Your recovery indicators look solid. Proceed with your planned workout program.')).toBeTruthy();
      expect(getByText('Complete planned strength training today.')).toBeTruthy();

      // Verify Non-Medical Disclaimer Banner
      expect(
        getByText(
          'Wearable data is used for fitness tracking and recovery insights only. This is not medical advice, diagnosis, or clinical evaluation.',
        ),
      ).toBeTruthy();
    }, 15000);

    it('submits helpful feedback when Helpful button is pressed', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockTelemetrySummary });
      (apiClient.post as jest.Mock)
        .mockResolvedValueOnce({
          data: { insight: mockAIResponse, insightId: 'ins-test-feedback', cached: false },
        })
        .mockResolvedValueOnce({
          data: { success: true, message: 'Thank you for your feedback.' },
        });

      const { findByText } = render(<WearableIntelligenceScreen />);

      const helpfulBtn = await findByText('Helpful');
      expect(helpfulBtn).toBeTruthy();

      fireEvent.press(helpfulBtn);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/ai/wearables/feedback', {
          insightId: 'ins-test-feedback',
          rating: 'HELPFUL',
        });
      });
    });
  });
});
