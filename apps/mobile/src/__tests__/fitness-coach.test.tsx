import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  AIFitnessCoachSafetyNotice,
  AIFitnessCoachSuggestion,
  AIFitnessCoachMessage,
  AIFitnessCoachInput,
} from '../features/ai-coach/components';
import { fitnessCoachService } from '../features/ai-coach/services/fitnessCoachService';
import { apiClient } from '../services/api';
import type { FitnessCoachResponse } from '@fitcore/types';

jest.mock('../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('AI Fitness Coach UI Components & Service', () => {
  describe('AIFitnessCoachSafetyNotice', () => {
    it('renders standard clinical safety notice', () => {
      const { getByText } = render(<AIFitnessCoachSafetyNotice />);
      expect(getByText('Clinical & Safety Notice')).toBeTruthy();
      expect(
        getByText(/FitCore AI provides fitness guidance only. It is not authorized to diagnose injuries/i),
      ).toBeTruthy();
    });

    it('renders urgent medical escalation banner when urgent flag is true', () => {
      const { getByText } = render(
        <AIFitnessCoachSafetyNotice
          urgent={true}
          message="Immediate medical evaluation required for chest pain."
        />,
      );
      expect(getByText('Urgent Medical Notice')).toBeTruthy();
      expect(getByText('Immediate medical evaluation required for chest pain.')).toBeTruthy();
    });
  });

  describe('AIFitnessCoachSuggestion', () => {
    it('renders suggestion chips and triggers onSelect callback', () => {
      const onSelect = jest.fn();
      const suggestions = ['Analyze bench volume', 'Check my streak'];
      const { getByText } = render(
        <AIFitnessCoachSuggestion suggestions={suggestions} onSelect={onSelect} />,
      );

      const chip = getByText('Analyze bench volume');
      expect(chip).toBeTruthy();
      fireEvent.press(chip);
      expect(onSelect).toHaveBeenCalledWith('Analyze bench volume');
    });

    it('returns null when suggestions list is empty', () => {
      const { toJSON } = render(
        <AIFitnessCoachSuggestion suggestions={[]} onSelect={jest.fn()} />,
      );
      expect(toJSON()).toBeNull();
    });
  });

  describe('AIFitnessCoachMessage', () => {
    it('renders user message correctly', () => {
      const { getByText } = render(
        <AIFitnessCoachMessage
          id="msg-1"
          role="USER"
          content="How is my progressive overload?"
        />,
      );
      expect(getByText('How is my progressive overload?')).toBeTruthy();
    });

    it('renders assistant message with structured insights, recommendations, and actions', () => {
      const onActionPress = jest.fn();
      const structured: FitnessCoachResponse = {
        message: 'Your training adherence has been excellent this week.',
        insights: [
          {
            type: 'VOLUME',
            title: 'Volume Progression',
            description: 'Upper body volume increased by 8% over baseline.',
          },
        ],
        recommendations: [
          {
            title: 'Incline Dumbbell Press',
            description: 'Add 2 sets of 10-12 reps on Thursday.',
            priority: 'HIGH',
            type: 'TRAINING',
          },
        ],
        cautions: ['Monitor shoulder fatigue during overhead pressing.'],
        suggestedActions: [
          {
            action: 'VIEW_WORKOUT',
            label: 'View Thursday Workout',
            parameters: { workoutId: 'wk-123' },
          },
        ],
        followUpQuestion: 'Would you like form cues for dumbbell pressing?',
      };

      const { getByText } = render(
        <AIFitnessCoachMessage
          id="msg-2"
          role="ASSISTANT"
          content={structured.message}
          structuredOutput={structured}
          onActionPress={onActionPress}
        />,
      );

      expect(getByText('Your training adherence has been excellent this week.')).toBeTruthy();
      expect(getByText('💡 Volume Progression')).toBeTruthy();
      expect(getByText('Upper body volume increased by 8% over baseline.')).toBeTruthy();
      expect(getByText('Incline Dumbbell Press')).toBeTruthy();
      expect(getByText('⚠️ Monitor shoulder fatigue during overhead pressing.')).toBeTruthy();

      const actionBtn = getByText('👉 View Thursday Workout');
      expect(actionBtn).toBeTruthy();
      fireEvent.press(actionBtn);
      expect(onActionPress).toHaveBeenCalledWith(structured.suggestedActions![0]);
    });
  });

  describe('AIFitnessCoachInput', () => {
    it('calls onSend callback with trimmed input', () => {
      const onSend = jest.fn();
      const { getByPlaceholderText, getByText } = render(
        <AIFitnessCoachInput onSend={onSend} />,
      );

      const input = getByPlaceholderText('Ask your Fitness Coach about training, workouts, or goals...');
      fireEvent.changeText(input, 'What should I do today?');

      const sendBtn = getByText('↑');
      fireEvent.press(sendBtn);

      expect(onSend).toHaveBeenCalledWith('What should I do today?');
    });

    it('does not send empty input', () => {
      const onSend = jest.fn();
      const { getByText } = render(<AIFitnessCoachInput onSend={onSend} />);

      const sendBtn = getByText('↑');
      fireEvent.press(sendBtn);

      expect(onSend).not.toHaveBeenCalled();
    });
  });

  describe('fitnessCoachService', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('listConversations calls GET /ai/fitness-coach/conversations', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: [{ id: 'conv-1', title: 'Session 1' }], total: 1 },
      });

      const res = await fitnessCoachService.listConversations('ACTIVE');
      expect(apiClient.get).toHaveBeenCalledWith('/ai/fitness-coach/conversations', {
        params: { status: 'ACTIVE' },
      });
      expect(res.total).toBe(1);
    });

    it('sendMessage calls POST /ai/fitness-coach/conversations/:id/messages', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          userMessageId: 'm-1',
          assistantMessageId: 'm-2',
          response: { message: 'Guidance provided' },
        },
      });

      const res = await fitnessCoachService.sendMessage('conv-1', {
        content: 'Review my last session',
      });
      expect(apiClient.post).toHaveBeenCalledWith(
        '/ai/fitness-coach/conversations/conv-1/messages',
        { content: 'Review my last session' },
      );
      expect(res.assistantMessageId).toBe('m-2');
    });

    it('getContextSummary calls GET /ai/fitness-coach/context-summary', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: {
          training: { hasActivePlan: true, recentWorkoutsCount: 4 },
          privacyNotice: 'PAR-Q and medical data are redacted.',
        },
      });

      const res = await fitnessCoachService.getContextSummary();
      expect(apiClient.get).toHaveBeenCalledWith('/ai/fitness-coach/context-summary');
      expect(res.training.recentWorkoutsCount).toBe(4);
    });
  });
});
