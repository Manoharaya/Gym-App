/**
 * FitCore Qualification Question Service (Day 38)
 *
 * Generates smart, high-leverage sales discovery questions.
 * Capped at 1-2 questions per interaction to prevent prospect interrogation.
 * Multilingual support: English & Nepali.
 */

import { Injectable } from '@nestjs/common';
import { SmartDiscoveryQuestionDto } from '@fitcore/types';

export interface QuestionGenerationContext {
  primaryGoal?: string | null;
  serviceInterests?: string[] | null;
  preferredSchedule?: string | null;
  preferredDays?: string[] | null;
  preferredTimes?: string[] | null;
  preferredOutletId?: string | null;
  experienceLevel?: string | null;
  budgetSensitivity?: string | null;
  readiness?: string | null;
  timeline?: string | null;
  language?: string;
  limit?: number;
}

@Injectable()
export class QualificationQuestionService {
  /**
   * Generates prioritized, conversational discovery questions for missing profile dimensions.
   */
  generateQuestions(ctx: QuestionGenerationContext): SmartDiscoveryQuestionDto[] {
    const questions: SmartDiscoveryQuestionDto[] = [];
    const isNepali = (ctx.language || 'en').toLowerCase().startsWith('ne');
    const maxQuestions = Math.min(ctx.limit || 2, 2); // strictly capped at 2

    // 1. Goal missing (Highest Priority)
    if (!ctx.primaryGoal || ctx.primaryGoal === 'UNKNOWN') {
      questions.push({
        targetDimension: 'primaryGoal',
        question: isNepali
          ? 'तपाईंको मुख्य फिटनेस लक्ष्य के हो—तौल घटाउने, शक्ति बढाउने, वा सामान्य स्वास्थ्य सुधार?'
          : 'What is your primary fitness focus right now—e.g. building strength, weight management, or general wellness?',
        rationale: 'Clarifying the primary goal enables personalized facility & service matching.',
        priority: 1,
      });
    }

    // 2. Service Interest missing
    if (questions.length < maxQuestions && (!ctx.serviceInterests || ctx.serviceInterests.length === 0)) {
      questions.push({
        targetDimension: 'serviceInterests',
        question: isNepali
          ? 'तपाईंलाई विशेष रूपमा व्यक्तिगत प्रशिक्षण (PT), सामूहिक कक्षाहरू (Classes), वा खुला जिम (Open Gym) मा रुचि छ?'
          : 'Are you mostly looking for open gym workouts, small group classes, or dedicated 1-on-1 personal training?',
        rationale: 'Directs the sales conversation to relevant package types and tour previews.',
        priority: 2,
      });
    }

    // 3. Schedule missing
    if (
      questions.length < maxQuestions &&
      (!ctx.preferredDays || ctx.preferredDays.length === 0) &&
      (!ctx.preferredTimes || ctx.preferredTimes.length === 0)
    ) {
      questions.push({
        targetDimension: 'preferredSchedule',
        question: isNepali
          ? 'तपाईंको कसरतको लागि कुन समय सबैभन्दा अनुकूल हुन्छ—बिहान, दिउँसो वा साँझ?'
          : 'What times of day usually work best for your workout schedule—mornings, afternoons, or evenings?',
        rationale: 'Identifies schedule compatibility with peak hours and trainer availability.',
        priority: 3,
      });
    }

    // 4. Experience missing
    if (questions.length < maxQuestions && (!ctx.experienceLevel || ctx.experienceLevel === 'UNKNOWN')) {
      questions.push({
        targetDimension: 'experienceLevel',
        question: isNepali
          ? 'के तपाईं जिममा नयाँ हुनुहुन्छ वा पहिले पनि नियमित अभ्यास गर्नुभएको छ?'
          : 'Have you worked out in a gym recently, or are you looking for guidance getting started?',
        rationale: 'Determines whether an onboarding consultation or beginner induction is appropriate.',
        priority: 4,
      });
    }

    // 5. Readiness / Timeline missing
    if (
      questions.length < maxQuestions &&
      (!ctx.readiness || ctx.readiness === 'UNKNOWN') &&
      (!ctx.timeline || ctx.timeline === 'UNKNOWN')
    ) {
      questions.push({
        targetDimension: 'readiness',
        question: isNepali
          ? 'के तपाईं यसै हप्ता निःशुल्क ट्रायल वा भ्रमण (Tour) गरेर हेर्न चाहनुहुन्छ?'
          : 'Would you like to come in for a quick facility tour or trial session this week to see if it feels right?',
        rationale: 'Establishes buying readiness and initiates trial/tour conversion.',
        priority: 5,
      });
    }

    return questions.slice(0, maxQuestions);
  }
}
