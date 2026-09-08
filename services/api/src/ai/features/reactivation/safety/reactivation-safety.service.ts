import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  ReactivationIntelligenceResponse,
  ReactivationStrategyType,
  REACTIVATION_STRATEGIES,
} from '@fitcore/types';

const PROHIBITED_DIAGNOSTIC_TERMS = [
  'depressed',
  'depression',
  'anxiety',
  'anxious',
  'mental health disorder',
  'bipolar',
  'eating disorder',
  'anorexia',
  'bulimia',
  'schizophrenia',
  'ptsd',
  'ocd',
  'adhd',
  'diagnosed with',
  'clinical depression',
  'medical condition',
  'psychological disorder',
  'burnout',
  'injured',
  'injury diagnosis',
];

const PROHIBITED_COMMERCIAL_TERMS = [
  'discount',
  '% off',
  'free membership',
  'waive fee',
  'price cut',
  'special price',
  'refund',
  'free month',
];

const PROMPT_INJECTION_PATTERNS = [
  /ignore previous instructions/i,
  /ignore all prior prompts/i,
  /system prompt/i,
  /developer mode/i,
  /you are now an unfiltered/i,
  /reveal your instructions/i,
  /jailbreak/i,
];

const VALID_STRATEGIES: Set<ReactivationStrategyType> = new Set([...REACTIVATION_STRATEGIES]);

@Injectable()
export class ReactivationSafetyService {
  private readonly logger = new Logger(ReactivationSafetyService.name);

  /**
   * Validates user-supplied text for prompt injection attempts.
   */
  validateInputText(text?: string): void {
    if (!text) return;

    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        this.logger.warn(`Prompt injection pattern detected in reactivation input: "${text.substring(0, 50)}..."`);
        throw new BadRequestException('Invalid input: prompt injection or forbidden control sequences detected.');
      }
    }
  }

  /**
   * Evaluates text for safety violations (clinical claims, commercial discounts).
   */
  evaluateSafety(text: string): { isSafe: boolean; violations: Array<{ category: string; term: string }> } {
    const violations: Array<{ category: string; term: string }> = [];
    const lower = (text || '').toLowerCase();

    for (const term of PROHIBITED_DIAGNOSTIC_TERMS) {
      if (lower.includes(term.toLowerCase())) {
        violations.push({ category: 'CLINICAL_MEDICAL_CLAIM', term });
      }
    }

    for (const term of PROHIBITED_COMMERCIAL_TERMS) {
      if (lower.includes(term.toLowerCase())) {
        violations.push({ category: 'UNAUTHORIZED_DISCOUNT', term });
      }
    }

    return {
      isSafe: violations.length === 0,
      violations,
    };
  }

  /**
   * Validates and sanitizes AI reactivation response before returning or persisting.
   */
  validateAndSanitizeOutput(output: ReactivationIntelligenceResponse): ReactivationIntelligenceResponse {
    // 1. Check for clinical/psychological diagnostic terms
    const textToCheck = `${output.summary} ${output.suggestedStaffMessage || ''} ${output.suggestedNextStep || ''} ${output.recommendedStrategies.map((s) => s.reason).join(' ')}`.toLowerCase();

    for (const term of PROHIBITED_DIAGNOSTIC_TERMS) {
      if (textToCheck.includes(term)) {
        this.logger.warn(`Prohibited diagnostic term '${term}' detected in reactivation output. Sanitizing.`);
        output.summary = output.summary.replace(new RegExp(term, 'gi'), 'observed routine changes');
        if (output.suggestedStaffMessage) {
          output.suggestedStaffMessage = output.suggestedStaffMessage.replace(new RegExp(term, 'gi'), 'routine adjustments');
        }
      }
    }

    // 2. Check for unauthorized commercial terms (discounts, fee waivers)
    for (const term of PROHIBITED_COMMERCIAL_TERMS) {
      if (textToCheck.includes(term)) {
        this.logger.warn(`Prohibited discount term '${term}' detected in reactivation output. Sanitizing.`);
        output.recommendedStrategies = output.recommendedStrategies.map((strat) => {
          if (strat.type === 'MEMBERSHIP_REVIEW') {
            return {
              ...strat,
              reason: 'Membership renewal or satisfaction review recommended; discuss current plan fit and scheduling options.',
            };
          }
          return strat;
        });
      }
    }

    // 3. Ensure recommended strategies strictly belong to approved taxonomy
    output.recommendedStrategies = output.recommendedStrategies.filter((strategy) => {
      if (!VALID_STRATEGIES.has(strategy.type)) {
        this.logger.warn(`Unapproved strategy type '${strategy.type}' discarded.`);
        return false;
      }
      return true;
    });

    if (output.recommendedStrategies.length === 0) {
      output.recommendedStrategies.push({
        type: 'GENERAL_SUPPORT',
        priority: 'LOW',
        reason: 'Offer general welcoming support and informal check-in during member next visit.',
        suggestedStaffMessage: 'Hi! We missed seeing you around the club. Let us know if we can help you get back into your groove.',
        suggestedNextStep: 'Staff to greet member on next visit and offer assistance.',
      });
    }

    return output;
  }
}
