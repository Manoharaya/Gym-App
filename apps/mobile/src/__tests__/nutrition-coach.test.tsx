import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  NutritionSafetyNotice,
  DailyNutritionSummaryCard,
  NutritionCoachSuggestion,
  NutritionCoachInput,
  FoodLogProposalCard,
  MealSuggestionCard,
  FoodAlternativeCard,
  NutritionCoachMessage,
} from '../features/nutrition/components';
import { nutritionCoachService } from '../features/nutrition/services/nutritionCoachService';
import { apiClient } from '../services/api';
import type {
  NutritionCoachResponse,
  ParsedFoodLogProposal,
  AINutritionCoachMessageDto,
} from '@fitcore/types';

jest.mock('../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('AI Nutrition Coach UI Components & Service', () => {
  describe('NutritionSafetyNotice', () => {
    it('renders standard clinical & dietary safety notice', () => {
      const { getByText } = render(<NutritionSafetyNotice />);
      expect(getByText('Nutrition Safety & Medical Boundary')).toBeTruthy();
      expect(
        getByText(/FitCore AI provides nutritional guidance for educational purposes only/i),
      ).toBeTruthy();
    });

    it('renders urgent medical escalation banner when urgent flag is true', () => {
      const { getByText } = render(
        <NutritionSafetyNotice
          urgent={true}
          message="Immediate medical evaluation required for clinical symptom."
        />,
      );
      expect(getByText('Clinical Safety Intervention')).toBeTruthy();
      expect(getByText('Immediate medical evaluation required for clinical symptom.')).toBeTruthy();
    });
  });

  describe('NutritionCoachSuggestion', () => {
    it('renders suggestion chips and triggers onSelect callback', () => {
      const onSelect = jest.fn();
      const suggestions = ['Explain my macros', 'Post-workout snack'];
      const { getByText } = render(
        <NutritionCoachSuggestion suggestions={suggestions} onSelect={onSelect} />,
      );

      const chip = getByText('Explain my macros');
      expect(chip).toBeTruthy();
      fireEvent.press(chip);
      expect(onSelect).toHaveBeenCalledWith('Explain my macros');
    });

    it('returns null when suggestions list is empty', () => {
      const { toJSON } = render(
        <NutritionCoachSuggestion suggestions={[]} onSelect={jest.fn()} />,
      );
      expect(toJSON()).toBeNull();
    });
  });

  describe('DailyNutritionSummaryCard', () => {
    it('renders progress bars and adherence percentage badge', () => {
      const { getByText } = render(
        <DailyNutritionSummaryCard
          calories={{ consumed: 1800, target: 2400, adherencePct: 75 }}
          protein={{ consumed: 135, target: 180, adherencePct: 75 }}
          carbohydrates={{ consumed: 190, target: 260, adherencePct: 73 }}
          fat={{ consumed: 55, target: 70, adherencePct: 78 }}
          water={{ consumed: 2500, target: 3000, adherencePct: 83 }}
          adherenceMessage="Great protein pacing today!"
        />,
      );

      expect(getByText("Today's Nutrition Summary")).toBeTruthy();
      expect(getByText('75% Target')).toBeTruthy();
      expect(getByText('1800 / 2400 kcal')).toBeTruthy();
      expect(getByText('135 / 180 g')).toBeTruthy();
      expect(getByText('Great protein pacing today!')).toBeTruthy();
    });
  });

  describe('FoodLogProposalCard', () => {
    const mockProposal: ParsedFoodLogProposal = {
      mealType: 'BREAKFAST',
      items: [
        {
          foodName: 'Scrambled Eggs',
          quantity: 2,
          unit: 'large',
          mealType: 'BREAKFAST',
          calories: 144,
          protein: 12.6,
          carbohydrates: 0.8,
          fat: 9.8,
          confidence: 0.95,
        },
        {
          foodName: 'Whole Wheat Toast',
          quantity: 1,
          unit: 'slice',
          mealType: 'BREAKFAST',
          calories: 82,
          protein: 4,
          carbohydrates: 13.8,
          fat: 1.1,
          confidence: 0.92,
        },
      ],
      totalCalories: 226,
      totalProtein: 16.6,
      totalCarbohydrates: 14.6,
      totalFat: 10.9,
      requiresConfirmation: true,
    };

    it('renders proposed items, macros, and handles confirmation callback', async () => {
      const onConfirm = jest.fn().mockResolvedValue(undefined);
      const { getByText } = render(
        <FoodLogProposalCard proposal={mockProposal} onConfirm={onConfirm} />,
      );

      expect(getByText('PROPOSED FOOD LOG')).toBeTruthy();
      expect(getByText('BREAKFAST')).toBeTruthy();
      expect(getByText('Scrambled Eggs')).toBeTruthy();
      expect(getByText('Whole Wheat Toast')).toBeTruthy();
      expect(getByText(/226\s*kcal/i)).toBeTruthy();

      const confirmBtn = getByText('Confirm & Save to Log');
      expect(confirmBtn).toBeTruthy();
      fireEvent.press(confirmBtn);
      expect(onConfirm).toHaveBeenCalledWith(mockProposal);
    });
  });

  describe('MealSuggestionCard', () => {
    it('renders meal details, ingredients, and allergy safety notes', () => {
      const { getByText } = render(
        <MealSuggestionCard
          suggestion={{
            name: 'Grilled Salmon & Quinoa Bowl',
            ingredients: ['Salmon Fillet (150g)', 'Cooked Quinoa (1 cup)', 'Steamed Broccoli (100g)'],
            estimatedCalories: 520,
            estimatedProtein: 42,
            estimatedCarbs: 45,
            estimatedFat: 18,
            whyItFits: 'High-protein meal rich in omega-3 fatty acids.',
            allergySafetyNote: 'Allergen-free: No Peanuts, No Dairy',
            isAiSuggestion: true,
          }}
        />,
      );

      expect(getByText('Grilled Salmon & Quinoa Bowl')).toBeTruthy();
      expect(getByText('High-protein meal rich in omega-3 fatty acids.')).toBeTruthy();
      expect(getByText(/520\s*kcal/i)).toBeTruthy();
      expect(getByText(/42\s*g/i)).toBeTruthy();
      expect(getByText(/Allergen-free: No Peanuts, No Dairy/i)).toBeTruthy();
    });
  });

  describe('FoodAlternativeCard', () => {
    it('renders alternative food and confidence badge', () => {
      const { getByText } = render(
        <FoodAlternativeCard
          alternative={{
            originalFood: 'Chicken Breast',
            substituteFood: 'Tempeh (Organic)',
            reason: 'Plant-based high protein alternative providing complete amino acid profile.',
            confidence: 'HIGH',
            nutritionalComparison: 'Similar protein content with additional prebiotic fiber.',
          }}
        />,
      );

      expect(getByText('Chicken Breast')).toBeTruthy();
      expect(getByText('Tempeh (Organic)')).toBeTruthy();
      expect(getByText('Plant-based high protein alternative providing complete amino acid profile.')).toBeTruthy();
      expect(getByText('Confidence: HIGH')).toBeTruthy();
    });
  });

  describe('NutritionCoachMessage', () => {
    it('renders user message', () => {
      const userMessage: AINutritionCoachMessageDto = {
        id: 'msg-u1',
        conversationId: 'c-1',
        role: 'USER',
        content: 'How can I increase my protein intake?',
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
      };

      const { getByText } = render(<NutritionCoachMessage message={userMessage} />);
      expect(getByText('You')).toBeTruthy();
      expect(getByText('How can I increase my protein intake?')).toBeTruthy();
    });

    it('renders assistant message with structured output and feedback triggers', () => {
      const onFeedback = jest.fn();
      const onFollowUpPress = jest.fn();

      const structured: NutritionCoachResponse = {
        answer: 'You can increase protein with lean meats, Greek yogurt, or plant-based protein powders.',
        responseType: 'EXPLANATION',
        confidence: 'HIGH',
        recommendations: [
          {
            type: 'MACRONUTRIENT_BALANCE' as any,
            title: 'Include Protein with Every Meal',
            description: 'Aim for 25-35g of protein per main meal to stimulate muscle protein synthesis.',
            priority: 'HIGH',
          },
        ],
        warnings: ['FitCore AI provides nutritional guidance only.'],
        followUpQuestions: ['Would you like some high-protein snack ideas?'],
        requiresProfessionalReview: false,
      };

      const assistantMessage: AINutritionCoachMessageDto = {
        id: 'msg-a1',
        conversationId: 'c-1',
        role: 'ASSISTANT',
        content: structured.answer,
        structuredOutput: structured,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
      };

      const { getByText } = render(
        <NutritionCoachMessage
          message={assistantMessage}
          onFeedback={onFeedback}
          onFollowUpPress={onFollowUpPress}
        />,
      );

      expect(getByText('AI Nutrition Coach')).toBeTruthy();
      expect(
        getByText('You can increase protein with lean meats, Greek yogurt, or plant-based protein powders.'),
      ).toBeTruthy();
      expect(getByText('Include Protein with Every Meal')).toBeTruthy();
      expect(getByText('⚠️ FitCore AI provides nutritional guidance only.')).toBeTruthy();

      const followUpBtn = getByText(/Would you like some high-protein snack ideas/i);
      expect(followUpBtn).toBeTruthy();
      fireEvent.press(followUpBtn);
      expect(onFollowUpPress).toHaveBeenCalledWith('Would you like some high-protein snack ideas?');

      const helpfulBtn = getByText('👍');
      expect(helpfulBtn).toBeTruthy();
      fireEvent.press(helpfulBtn);
      expect(onFeedback).toHaveBeenCalledWith('HELPFUL', 'msg-a1');
    });
  });

  describe('NutritionCoachInput', () => {
    it('calls onSend callback with trimmed input', () => {
      const onSend = jest.fn();
      const { getByPlaceholderText, getByText } = render(
        <NutritionCoachInput onSend={onSend} />,
      );

      const input = getByPlaceholderText('Ask about meals, targets, or log food...');
      fireEvent.changeText(input, 'What should I eat after my evening workout?');

      const sendBtn = getByText('➤');
      fireEvent.press(sendBtn);

      expect(onSend).toHaveBeenCalledWith('What should I eat after my evening workout?');
    });

    it('does not send empty input', () => {
      const onSend = jest.fn();
      const { getByText } = render(<NutritionCoachInput onSend={onSend} />);

      const sendBtn = getByText('➤');
      fireEvent.press(sendBtn);

      expect(onSend).not.toHaveBeenCalled();
    });
  });

  describe('nutritionCoachService', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('listConversations calls GET /ai/nutrition/conversations', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: [{ id: 'nc-1', title: 'Session 1' }], total: 1 },
      });

      const res = await nutritionCoachService.listConversations();
      expect(apiClient.get).toHaveBeenCalledWith('/ai/nutrition/conversations', {
        params: { status: undefined },
      });
      expect(res.total).toBe(1);
    });

    it('sendMessage calls POST /ai/nutrition/conversations/:id/messages', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          userMessageId: 'm-1',
          assistantMessageId: 'm-2',
          response: { answer: 'Nutrition response provided' },
        },
      });

      const res = await nutritionCoachService.sendMessage('nc-1', {
        content: 'Review today nutrition progress',
      });
      expect(apiClient.post).toHaveBeenCalledWith(
        '/ai/nutrition/conversations/nc-1/messages',
        { content: 'Review today nutrition progress' },
      );
      expect(res.assistantMessageId).toBe('m-2');
    });

    it('parseFoodLog calls POST /ai/nutrition/food-log/parse', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          mealType: 'LUNCH',
          items: [],
          totalCalories: 350,
          totalProtein: 28,
          requiresConfirmation: true,
        },
      });

      const res = await nutritionCoachService.parseFoodLog(
        'Chicken salad with olive oil dressing',
        'LUNCH',
      );
      expect(apiClient.post).toHaveBeenCalledWith('/ai/nutrition/food-log/parse', {
        text: 'Chicken salad with olive oil dressing',
        mealType: 'LUNCH',
      });
      expect(res.requiresConfirmation).toBe(true);
      expect(res.totalCalories).toBe(350);
    });

    it('getTodaySummary calls GET /ai/nutrition/summary/today', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: {
          date: '2026-09-07',
          summary: { totalCalories: 2100 },
          insights: ['On track for protein'],
          adherenceMessage: 'Great work!',
        },
      });

      const res = await nutritionCoachService.getTodaySummary();
      expect(apiClient.get).toHaveBeenCalledWith('/ai/nutrition/summary/today');
      expect(res.date).toBe('2026-09-07');
    });

    it('submitFeedback calls POST /ai/nutrition/feedback', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, feedbackId: 'fb-1' },
      });

      const res = await nutritionCoachService.submitFeedback(
        'HELPFUL',
        'm-2',
        undefined,
        'Accurate macro count',
      );
      expect(apiClient.post).toHaveBeenCalledWith('/ai/nutrition/feedback', {
        messageId: 'm-2',
        rating: 'HELPFUL',
        reason: undefined,
        comment: 'Accurate macro count',
      });
      expect(res.success).toBe(true);
    });
  });
});
