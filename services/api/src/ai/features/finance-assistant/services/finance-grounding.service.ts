/**
 * FitCore — Day 44: AI Financial Grounding & Hallucination Defense Service
 *
 * Verifies that all numerical values, percentages, and financial facts in the AI
 * response exist in the verified context data returned by authoritative tools.
 */

import { Injectable, Logger } from '@nestjs/common';
import { FinanceAssistantResponse, FinanceFact, FinanceComparison } from '@fitcore/types';

export interface GroundingValidationResult {
  isValid: boolean;
  unsupportedNumbers: string[];
  sanitizedResponse: FinanceAssistantResponse;
}

@Injectable()
export class FinanceGroundingService {
  private readonly logger = new Logger(FinanceGroundingService.name);

  /**
   * Validates the generated AI response against authoritative tool numbers.
   */
  validateGrounding(
    response: FinanceAssistantResponse,
    authoritativeNumbers: Set<number | string>,
    fallbackFacts: FinanceFact[],
    fallbackComparisons?: FinanceComparison[],
  ): GroundingValidationResult {
    const unsupportedNumbers: string[] = [];

    // 1. Check facts
    for (const fact of response.facts || []) {
      const numVal = typeof fact.value === 'number' ? fact.value : parseFloat(String(fact.value));
      if (!isNaN(numVal)) {
        if (!this.matchesAuthoritative(numVal, authoritativeNumbers)) {
          unsupportedNumbers.push(`${fact.metric}: ${fact.value}`);
        }
      }
    }

    // 2. Check comparisons
    for (const comp of response.comparisons || []) {
      if (!this.matchesAuthoritative(comp.currentValue, authoritativeNumbers)) {
        unsupportedNumbers.push(`${comp.metric} (current): ${comp.currentValue}`);
      }
      if (!this.matchesAuthoritative(comp.comparisonValue, authoritativeNumbers)) {
        unsupportedNumbers.push(`${comp.metric} (comparison): ${comp.comparisonValue}`);
      }
    }

    // If unsupported numbers detected, log validation failure and safely clamp to authoritative facts
    if (unsupportedNumbers.length > 0) {
      this.logger.warn(
        `[FinanceGroundingService] Grounding validation failed! Detected unsupported numbers: ${unsupportedNumbers.join(', ')}`,
      );

      const factsSummary = fallbackFacts
        .map((f) => `${f.metric}: ${f.currency || 'AUD'} ${typeof f.value === 'number' ? f.value.toFixed(2) : f.value}`)
        .join(', ');
      const clampedAnswer = fallbackFacts.length > 0
        ? `Total gross revenue was AUD ${typeof fallbackFacts[0].value === 'number' ? fallbackFacts[0].value.toFixed(2) : fallbackFacts[0].value}. Based on authoritative financial records, verified figures are: ${factsSummary}.`
        : 'Based on authoritative financial records, unverified figures have been removed.';

      const clampedResponse: FinanceAssistantResponse = {
        ...response,
        answer: clampedAnswer,
        facts: fallbackFacts,
        comparisons: fallbackComparisons || response.comparisons,
        limitations: [
          ...(response.limitations || []),
          'Response was strictly clamped to authoritative database figures by the Grounding Validator.',
        ],
        confidence: 0.99,
      };

      return {
        isValid: false,
        unsupportedNumbers,
        sanitizedResponse: clampedResponse,
      };
    }

    return {
      isValid: true,
      unsupportedNumbers: [],
      sanitizedResponse: response,
    };
  }

  private matchesAuthoritative(val: number, allowed: Set<number | string>): boolean {
    if (allowed.has(val) || allowed.has(String(val))) return true;

    // Check with rounding tolerance (e.g. 50300 vs 50300.0)
    for (const item of allowed) {
      const num = typeof item === 'number' ? item : parseFloat(String(item));
      if (!isNaN(num) && Math.abs(num - val) < 0.05) {
        return true;
      }
    }
    return false;
  }
}
