import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ReactivationService } from '../features/reactivation/services/reactivationService';
import { MemberRecoveryCard } from '../features/reactivation/components/MemberRecoveryCard';
import { MemberRecoveryHubCard } from '../features/reactivation/components/MemberRecoveryHubCard';
import { apiClient } from '../services/api';

jest.mock('../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('Day 27: Mobile Reactivation & Member Recovery Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // 1. ReactivationService API Tests
  // ==========================================
  describe('ReactivationService API Client', () => {
    it('calls GET /ai/reactivation/summary', async () => {
      const mockSummary = {
        totalInactiveMembers: 25,
        totalReactivatingMembers: 10,
        totalInRecovery: 8,
        activeRecoveryPlans: 5,
        reengagementRate30d: 42,
        strategyDistribution: { TRAINING_RESTART: 3, GOAL_RESET: 2 },
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockSummary });

      const res = await ReactivationService.getSummary({ outletId: 'out-1' });
      expect(apiClient.get).toHaveBeenCalledWith('/ai/reactivation/summary', {
        params: { outletId: 'out-1' },
      });
      expect(res).toEqual(mockSummary);
    });

    it('calls GET /ai/reactivation/queue with filters', async () => {
      const mockQueue = {
        items: [
          {
            memberId: 'm1',
            memberName: 'Alex Mercer',
            recoveryState: 'INACTIVE',
            daysInactive: 21,
            recommendedStrategy: 'TRAINING_RESTART',
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockQueue });

      const res = await ReactivationService.getQueue({ recoveryState: 'INACTIVE' });
      expect(apiClient.get).toHaveBeenCalledWith('/ai/reactivation/queue', {
        params: { recoveryState: 'INACTIVE' },
      });
      expect(res.items.length).toBe(1);
      expect(res.items[0].memberId).toBe('m1');
    });

    it('calls POST /ai/reactivation/plans for human-approved plan creation', async () => {
      const mockPlan = {
        id: 'plan-101',
        memberId: 'm1',
        strategyType: 'GOAL_RESET',
        status: 'PENDING_APPROVAL',
      };
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockPlan });

      const res = await ReactivationService.createRecoveryPlan({
        memberId: 'm1',
        strategy: 'GOAL_RESET',
        reason: 'Restarting fitness journey',
        suggestedStaffMessage: 'Hey Alex, ready for a quick goal reset?',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/ai/reactivation/plans', expect.objectContaining({
        memberId: 'm1',
        strategyType: 'GOAL_RESET',
        draftMessage: 'Hey Alex, ready for a quick goal reset?',
      }));
      expect(res.id).toBe('plan-101');
    });

    it('calls POST /ai/reactivation/plans/:id/transition', async () => {
      const mockTransitioned = {
        id: 'plan-101',
        status: 'APPROVED',
      };
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockTransitioned });

      const res = await ReactivationService.transitionPlan('plan-101', 'APPROVED', undefined, 'Approved by trainer');
      expect(apiClient.post).toHaveBeenCalledWith('/ai/reactivation/plans/plan-101/transition', {
        targetStatus: 'APPROVED',
        dismissalReason: undefined,
        notes: 'Approved by trainer',
      });
      expect(res.status).toBe('APPROVED');
    });

    it('calls GET /ai/reactivation/member-state for member privacy', async () => {
      const mockSafeState = {
        recoveryState: 'RECOVERING',
        inactivityDays: 16,
        suggestedFocus: 'Light Cardio',
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockSafeState });

      const res = await ReactivationService.getMemberRecoveryState();
      expect(apiClient.get).toHaveBeenCalledWith('/ai/reactivation/member-state');
      expect(res.recoveryState).toBe('RECOVERING');
      expect(res.inactivityDays).toBe(16);
    });
  });

  // ==========================================
  // 2. MemberRecoveryCard (Staff Queue Component)
  // ==========================================
  describe('MemberRecoveryCard (Staff Queue View)', () => {
    it('renders member recovery details and triggers action callbacks', () => {
      const mockOnCreatePlan = jest.fn();

      const { getByText, getByTestId } = render(
        <MemberRecoveryCard
          memberId="m1"
          memberName="Alex Mercer"
          daysInactive={18}
          recoveryState="NO_RECOVERY_SIGNAL"
          recommendedStrategy="TRAINING_RESTART"
          onCreatePlan={mockOnCreatePlan}
        />,
      );

      expect(getByText('Alex Mercer')).toBeTruthy();
      expect(getByText('Inactive')).toBeTruthy();
      expect(getByText('18 days inactive')).toBeTruthy();
      expect(getByText('TRAINING RESTART')).toBeTruthy();

      const createBtn = getByTestId('create-recovery-plan-btn');
      fireEvent.press(createBtn);
      expect(mockOnCreatePlan).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================
  // 3. MemberRecoveryHubCard (Member Dashboard Component)
  // ==========================================
  describe('MemberRecoveryHubCard (Member Dashboard View)', () => {
    it('renders welcoming copy without any risk/churn/score indicators', () => {
      const mockExplore = jest.fn();
      const mockBook = jest.fn();
      const mockCheckIn = jest.fn();

      const { getByText, queryByText, getByTestId } = render(
        <MemberRecoveryHubCard
          daysAway={16}
          welcomeMessage="Welcome back! We are excited to support your return."
          onExploreWorkouts={mockExplore}
          onBookClass={mockBook}
          onCheckIn={mockCheckIn}
        />,
      );

      // Friendly welcoming content
      expect(getByText('👋 WELCOME BACK · 16 DAYS SINCE LAST VISIT')).toBeTruthy();
      expect(getByText('Ready to get back into your routine?')).toBeTruthy();
      expect(getByText('Welcome back! We are excited to support your return.')).toBeTruthy();

      // Zero internal churn, risk, or negative labels
      expect(queryByText('CHURN')).toBeNull();
      expect(queryByText('RISK')).toBeNull();
      expect(queryByText('HIGH RISK')).toBeNull();
      expect(queryByText('DISENGAGED')).toBeNull();
      expect(queryByText('INACTIVE')).toBeNull();

      // Test return shortcuts
      fireEvent.press(getByTestId('recovery-action-workout'));
      expect(mockExplore).toHaveBeenCalledTimes(1);

      fireEvent.press(getByTestId('recovery-action-class'));
      expect(mockBook).toHaveBeenCalledTimes(1);

      fireEvent.press(getByTestId('recovery-action-checkin'));
      expect(mockCheckIn).toHaveBeenCalledTimes(1);
    });
  });
});
