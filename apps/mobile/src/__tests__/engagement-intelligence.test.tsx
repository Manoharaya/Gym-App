import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MemberEngagementScreen } from '../features/engagement/screens/MemberEngagementScreen';
import { TrainerClientEngagementCard } from '../features/trainer/components/TrainerClientEngagementCard';
import { EngagementIntelligenceService } from '../features/engagement/services/engagementIntelligenceService';
import { apiClient } from '../services/api';
import type {
  MemberEngagementProfileDto,
  EngagementTrendItem,
  EngagementIntelligenceResponse,
  TrainerClientEngagementDto,
} from '@fitcore/types';

jest.mock('../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

describe('Member Engagement Intelligence — Mobile UI & Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('EngagementIntelligenceService', () => {
    it('getSummary calls /ai/engagement/summary', async () => {
      const mockProfile: MemberEngagementProfileDto = {
        memberId: 'mem-1',
        organisationId: 'org-1',
        attendanceFrequency: 2.5,
        workoutAdherence: 80,
        bookingFrequency: 1.5,
        appEngagement: 8.0,
        goalEngagement: 75,
        overallEngagement: 'HIGH',
        trend: 'IMPROVING',
        calculatedAt: '2026-09-08T00:00:00Z',
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockProfile });

      const res = await EngagementIntelligenceService.getSummary();
      expect(apiClient.get).toHaveBeenCalledWith('/ai/engagement/summary');
      expect(res.overallEngagement).toBe('HIGH');
      expect(res.trend).toBe('IMPROVING');
    });

    it('getTrends calls /ai/engagement/trends', async () => {
      const mockTrends: EngagementTrendItem[] = [
        {
          trendType: 'ATTENDANCE_IMPROVING',
          direction: 'IMPROVING',
          metric: 'Gym & Class Visits',
          baselineValue: 1.5,
          recentValue: 3.0,
          deltaPercent: 100,
          confidence: 'HIGH',
          description: 'Visits increased by 100%',
          observationCount: 8,
        },
      ];
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockTrends });

      const res = await EngagementIntelligenceService.getTrends();
      expect(apiClient.get).toHaveBeenCalledWith('/ai/engagement/trends');
      expect(res.length).toBe(1);
      expect(res[0]?.trendType).toBe('ATTENDANCE_IMPROVING');
    });

    it('recordAppEvent calls /ai/engagement/events', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true, eventId: 'evt-1' } });

      const res = await EngagementIntelligenceService.recordAppEvent('WORKOUT_COMPLETED', { workoutId: 'w-1' });
      expect(apiClient.post).toHaveBeenCalledWith('/ai/engagement/events', {
        eventType: 'WORKOUT_COMPLETED',
        metadata: { workoutId: 'w-1' },
      });
      expect(res.success).toBe(true);
    });
  });

  describe('MemberEngagementScreen (Member Experience)', () => {
    it('renders positive fitness momentum without any churn risk labels', async () => {
      const mockProfile: MemberEngagementProfileDto = {
        memberId: 'mem-1',
        organisationId: 'org-1',
        attendanceFrequency: 2.5,
        workoutAdherence: 85,
        bookingFrequency: 1.0,
        appEngagement: 12.0,
        goalEngagement: 70,
        overallEngagement: 'HIGH',
        trend: 'IMPROVING',
        calculatedAt: '2026-09-08T00:00:00Z',
      };

      const mockTrends: EngagementTrendItem[] = [
        {
          trendType: 'ATTENDANCE_IMPROVING',
          direction: 'IMPROVING',
          metric: 'Gym Visits',
          baselineValue: 1.0,
          recentValue: 2.5,
          deltaPercent: 150,
          confidence: 'HIGH',
          description: 'Gym visits increased by 150% over personal baseline.',
          observationCount: 10,
        },
      ];

      const mockInsight: EngagementIntelligenceResponse = {
        summary: 'You have been more consistent with your workouts over the last two weeks.',
        observedSignals: [],
        engagementInterpretation: { level: 'HIGH', trend: 'IMPROVING' },
        retentionRisk: { level: 'LOW', reasons: ['Consistent activity.'] },
        recommendedActions: [
          { type: 'TRAINING', recommendation: 'Keep up the momentum with your next scheduled session.' },
        ],
        confidence: 'HIGH',
      };

      (apiClient.get as jest.Mock)
        .mockResolvedValueOnce({ data: mockProfile }) // getSummary
        .mockResolvedValueOnce({ data: mockTrends }); // getTrends

      (apiClient.post as jest.Mock)
        .mockResolvedValueOnce({ data: { success: true } }) // recordAppEvent
        .mockResolvedValueOnce({ data: { insight: mockInsight } }); // generateInsight

      const { queryByText, findByText, findByTestId } = render(<MemberEngagementScreen />);

      // Verify header and momentum card
      expect(await findByText('Your Fitness Momentum')).toBeTruthy();
      expect(await findByTestId('momentum-card')).toBeTruthy();
      expect(await findByText('Accelerating')).toBeTruthy();
      expect(await findByText('85%')).toBeTruthy();

      // CRITICAL VERIFICATION: Member must NEVER see "CHURN RISK"
      expect(queryByText(/CHURN RISK/i)).toBeNull();
      expect(queryByText(/CHURN/i)).toBeNull();
      expect(queryByText(/RETENTION RISK/i)).toBeNull();
    });

    it('handles insufficient data state gracefully with encouraging onboarding message', async () => {
      const mockEmptyProfile: MemberEngagementProfileDto = {
        memberId: 'new-mem',
        organisationId: 'org-1',
        attendanceFrequency: 0,
        workoutAdherence: 0,
        bookingFrequency: 0,
        appEngagement: 0,
        goalEngagement: 0,
        overallEngagement: 'INSUFFICIENT_DATA',
        trend: 'INSUFFICIENT_DATA',
        calculatedAt: '2026-09-08T00:00:00Z',
      };

      (apiClient.get as jest.Mock)
        .mockResolvedValueOnce({ data: mockEmptyProfile })
        .mockResolvedValueOnce({ data: [] });
      (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true } });

      const { findByTestId, findByText } = render(<MemberEngagementScreen />);

      expect(await findByTestId('insufficient-data-card')).toBeTruthy();
      expect(await findByText('Welcome to FitCore!')).toBeTruthy();
    });

    it('navigates to relevant feature when quick action buttons are tapped', async () => {
      const mockProfile: MemberEngagementProfileDto = {
        memberId: 'mem-1',
        organisationId: 'org-1',
        attendanceFrequency: 2.0,
        workoutAdherence: 60,
        bookingFrequency: 1.0,
        appEngagement: 5.0,
        goalEngagement: 40,
        overallEngagement: 'MODERATE',
        trend: 'STABLE',
        calculatedAt: '2026-09-08T00:00:00Z',
      };

      (apiClient.get as jest.Mock)
        .mockResolvedValueOnce({ data: mockProfile })
        .mockResolvedValueOnce({ data: [] });
      (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true } });

      const { findByText } = render(<MemberEngagementScreen />);

      const bookButton = await findByText('Book a Class');
      fireEvent.press(bookButton);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('BookingHome');

      const resumeButton = await findByText('Resume Workout');
      fireEvent.press(resumeButton);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('WorkoutsHome');
    });
  });

  describe('TrainerClientEngagementCard (Trainer View)', () => {
    it('renders client engagement level, trend, observed signals, and suggested follow-up', () => {
      const mockTrainerDto: TrainerClientEngagementDto = {
        memberId: 'client-1',
        firstName: 'Sarah',
        lastName: 'Connor',
        engagementLevel: 'MODERATE',
        trend: 'DECLINING',
        lastGymVisit: '2026-09-01T10:00:00Z',
        lastWorkout: '2026-09-01T11:00:00Z',
        workoutsCompletedLast30d: 4,
        attendanceVisitsLast30d: 5,
        workoutAdherencePercent: 50,
        observedSignals: [
          { category: 'ATTENDANCE', observation: 'Gym visits decreased from 3/week to 1/week over the last 14 days.' },
          { category: 'BOOKINGS', observation: 'No class bookings in the last 14 days.' },
        ],
        suggestedFollowUp: 'Consider checking in with the member to discuss recent routine changes.',
      };

      const { getByText, getByTestId } = render(
        <TrainerClientEngagementCard engagement={mockTrainerDto} />,
      );

      expect(getByTestId('trainer-client-engagement-card')).toBeTruthy();
      expect(getByText('DECLINING')).toBeTruthy();
      expect(getByText('MODERATE')).toBeTruthy();
      expect(getByText('Gym visits decreased from 3/week to 1/week over the last 14 days.')).toBeTruthy();
      expect(getByText('Consider checking in with the member to discuss recent routine changes.')).toBeTruthy();
    });
  });
});
