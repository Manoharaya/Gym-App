import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  AIStatusIndicator,
  AIThinkingState,
  AIErrorState,
  AIFeedbackControl,
  AIConfirmationDialog,
  AIResponseCard,
} from '../components/ai';
import { aiService } from '../features/ai/services/aiService';

describe('AI Platform Mobile Components & Services', () => {
  describe('AIStatusIndicator', () => {
    it('renders READY status', () => {
      const { getByText } = render(<AIStatusIndicator status="AVAILABLE" />);
      expect(getByText('AI Ready')).toBeTruthy();
    });

    it('renders THINKING status', () => {
      const { getByText } = render(<AIStatusIndicator status="THINKING" />);
      expect(getByText('AI Thinking...')).toBeTruthy();
    });

    it('renders OFFLINE status', () => {
      const { getByText } = render(<AIStatusIndicator status="OFFLINE" />);
      expect(getByText('AI Offline')).toBeTruthy();
    });
  });

  describe('AIThinkingState', () => {
    it('renders thinking state message', () => {
      const { getByText } = render(
        <AIThinkingState message="Synthesizing workout analysis..." />,
      );
      expect(getByText('Synthesizing workout analysis...')).toBeTruthy();
    });
  });

  describe('AIErrorState', () => {
    it('renders safety error message with disclaimer and retry button', () => {
      const onRetry = jest.fn();
      const { getByText } = render(
        <AIErrorState
          message="Prompt violates clinical boundaries."
          onRetry={onRetry}
        />,
      );
      expect(getByText('AI Request Unsuccessful')).toBeTruthy();
      expect(getByText('Prompt violates clinical boundaries.')).toBeTruthy();

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('AIFeedbackControl', () => {
    it('allows submitting helpful rating', () => {
      const onFeedback = jest.fn();
      const { getByText } = render(
        <AIFeedbackControl onFeedback={onFeedback} />,
      );

      const helpfulBtn = getByText('👍 Helpful');
      fireEvent.press(helpfulBtn);

      expect(onFeedback).toHaveBeenCalledWith('HELPFUL');
      expect(getByText('Thank you for your feedback!')).toBeTruthy();
    });
  });

  describe('AIConfirmationDialog', () => {
    it('renders required confirmation dialog for write actions', () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      const { getByText } = render(
        <AIConfirmationDialog
          visible={true}
          title="Confirm AI Action"
          description="Are you sure you want to schedule this test workout?"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />,
      );

      expect(getByText('Confirm AI Action')).toBeTruthy();
      expect(getByText('Are you sure you want to schedule this test workout?')).toBeTruthy();

      fireEvent.press(getByText('Confirm Action'));
      expect(onConfirm).toHaveBeenCalledTimes(1);

      fireEvent.press(getByText('Cancel'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('AIResponseCard', () => {
    it('renders AI response with safety disclaimer and model tag', () => {
      const { getByText } = render(
        <AIResponseCard
          content="Here is your verified test response."
          model="dev-mock-v1"
        />,
      );

      expect(getByText('Here is your verified test response.')).toBeTruthy();
      expect(getByText('dev-mock-v1')).toBeTruthy();
      expect(getByText('FitCore AI is for fitness guidance only and does not provide medical advice.')).toBeTruthy();
    });
  });

  describe('aiService API Contract', () => {
    it('provides all gateway methods', () => {
      expect(typeof aiService.executeTestPrompt).toBe('function');
      expect(typeof aiService.getFeatures).toBe('function');
      expect(typeof aiService.getUsage).toBe('function');
      expect(typeof aiService.submitFeedback).toBe('function');
      expect(typeof aiService.getHealth).toBe('function');
      expect(typeof aiService.confirmAction).toBe('function');
    });
  });
});
