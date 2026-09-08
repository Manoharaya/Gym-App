import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RetentionService } from '../features/retention/services/retentionService';
import { RetentionRiskCard } from '../features/retention/components/RetentionRiskCard';
import { FitnessMomentumCard } from '../features/retention/components/FitnessMomentumCard';
import { apiClient } from '../services/api';

jest.mock('../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('Day 26: Mobile Retention Intelligence Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // 1. RetentionService Tests
  // ==========================================
  describe('RetentionService API Client', () => {
    it('calls GET /ai/retention/summary', async () => {
      const mockSummary = {
        totalActiveMembers: 100,
        membersWithHighRisk: 5,
        membersWithElevatedRisk: 12,
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockSummary });

      const res = await RetentionService.getSummary();
      expect(apiClient.get).toHaveBeenCalledWith('/ai/retention/summary', { params: undefined });
      expect(res).toEqual(mockSummary);
    });

    it('calls GET /ai/retention/risk with memberId', async () => {
      const mockRisk = {
        memberId: 'm1',
        riskLevel: 'ELEVATED',
        trend: 'WORSENING',
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockRisk });

      const res = await RetentionService.getRisk('m1');
      expect(apiClient.get).toHaveBeenCalledWith('/ai/retention/risk', {
        params: { memberId: 'm1', refresh: false },
      });
      expect(res.riskLevel).toBe('ELEVATED');
    });

    it('calls POST /ai/retention/follow-ups', async () => {
      const mockTask = {
        id: 't1',
        status: 'OPEN',
        interventionType: 'TRAINER_CHECK_IN',
      };
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockTask });

      const res = await RetentionService.createFollowUpTask({
        memberId: 'm1',
        interventionType: 'TRAINER_CHECK_IN',
        priority: 'HIGH',
      });
      expect(apiClient.post).toHaveBeenCalledWith('/ai/retention/follow-ups', {
        memberId: 'm1',
        interventionType: 'TRAINER_CHECK_IN',
        priority: 'HIGH',
      });
      expect(res.id).toBe('t1');
    });
  });

  // ==========================================
  // 2. RetentionRiskCard (Trainer Component)
  // ==========================================
  describe('RetentionRiskCard (Trainer View)', () => {
    it('renders risk level, trend, and primary factors correctly', () => {
      const mockOnCreateTask = jest.fn();
      const { getByText, getByTestId } = render(
        <RetentionRiskCard
          memberId="m1"
          memberName="Alex Mercer"
          riskLevel="HIGH"
          riskTrend="WORSENING"
          primaryFactors={[
            {
              type: 'ATTENDANCE_DECLINE',
              severity: 'HIGH',
              observation: 'Gym visits dropped by 80%',
              evidence: ['1 visit last 14 days'],
            },
          ]}
          recommendedInterventions={[
            {
              type: 'TRAINER_CHECK_IN',
              priority: 'HIGH',
              reason: 'Needs workout consistency check-in',
            },
          ]}
          onCreateTask={mockOnCreateTask}
        />,
      );

      expect(getByText('HIGH')).toBeTruthy();
      expect(getByText('↘ Worsening')).toBeTruthy();
      expect(getByText('Gym visits dropped by 80%')).toBeTruthy();
      expect(getByText('TRAINER CHECK IN')).toBeTruthy();

      const taskButton = getByTestId('create-follow-up-task-button');
      fireEvent.press(taskButton);
      expect(mockOnCreateTask).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================
  // 3. FitnessMomentumCard (Member Component)
  // ==========================================
  describe('FitnessMomentumCard (Member Dashboard)', () => {
    it('renders positive momentum and streaks without churn/risk indicators', () => {
      const mockWorkouts = jest.fn();
      const mockClasses = jest.fn();

      const { getByText, queryByText, getByTestId } = render(
        <FitnessMomentumCard
          workoutsThisWeek={4}
          streakWeeks={3}
          momentumMessage="Great consistency this week! Keep it rolling."
          onNavigateWorkouts={mockWorkouts}
          onNavigateClasses={mockClasses}
        />,
      );

      // Positive member indicators
      expect(getByText('Your Fitness Momentum')).toBeTruthy();
      expect(getByText('🔥 3 wk streak')).toBeTruthy();
      expect(getByText('4')).toBeTruthy();
      expect(getByText('Workouts This Week')).toBeTruthy();
      expect(getByText('Great consistency this week! Keep it rolling.')).toBeTruthy();

      // Zero internal churn or risk labels
      expect(queryByText('HIGH')).toBeNull();
      expect(queryByText('CHURN')).toBeNull();
      expect(queryByText('RISK')).toBeNull();

      // Test navigation buttons
      fireEvent.press(getByTestId('momentum-action-workouts'));
      expect(mockWorkouts).toHaveBeenCalledTimes(1);

      fireEvent.press(getByTestId('momentum-action-classes'));
      expect(mockClasses).toHaveBeenCalledTimes(1);
    });
  });
});
